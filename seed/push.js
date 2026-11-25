'use strict';

// Loads the seed data into the two Airtable bases (see SPEC.md, "Seed data").
//
//   node seed/push.js --dry-run     shows what would be written, touches nothing, needs no token
//   node seed/push.js               writes; refuses if a table already has records
//   node seed/push.js --reset       empties the tables first (Findings and Runs too), then writes
//
// The token comes only from the environment variable AIRTABLE_SEED_TOKEN. It is never printed,
// never written to a file, and never put in an error message. It is a different token from the
// agent's own keys: it can write to both bases, so it must never be stored in the agent's vault.
// Base ids come from seed/airtable-config.js (git-ignored; see airtable-config.example.js).

const { generate } = require('./generate');

const API = 'https://api.airtable.com/v0';

// Fixed choices of the single-select fields in the Findings base.
const SELECT_CHOICES = {
  status: ['New', 'Accepted', 'Rejected', 'Fixed', 'Resolved', 'Improved', 'Reopened', 'Returned'],
  confidence: ['High', 'Medium'],
  route_to: ['Station Maintenance', 'Software', 'Billing'],
  fix_check: ['Too early', 'Resolved', 'Improved', 'Not improved'],
  user_mark: ['Accepted', 'Rejected', 'Fixed'],
};

// Airtable rejects an empty string in a select field, so empty values are left out.
function clean(record) {
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === '' || value === null || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

function chunk(list, size = 10) {
  const parts = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
}

// What goes where. `clear` lists tables that are emptied on --reset but receive no seed rows.
function toPlan(data) {
  return {
    operations: {
      Stations: data.stations.map(clean),
      Sessions: data.sessions.map(clean),
      Tickets: data.tickets.map(clean),
      Changes: data.changes.map(clean),
    },
    findings: {
      Findings: data.findings.map(clean),
      Runs: [],
    },
  };
}

function createClient({ token, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), gapMs = 250, retryWaitMs = 30000 }) {
  async function request(method, path, body) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetchImpl(API + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      await sleep(gapMs); // Airtable allows 5 requests a second per base
      if (res.status === 429) {
        await sleep(retryWaitMs);
        continue;
      }
      const text = await res.text();
      let json = {};
      try { json = JSON.parse(text); } catch { /* not JSON */ }
      if (!res.ok) {
        const err = json.error || {};
        // Only the method, the path without query, the status and Airtable's own words. Never headers.
        throw new Error(`Airtable ${method} ${path.split('?')[0]} -> ${res.status} ${err.type || ''} ${err.message || ''}`.trim());
      }
      return json;
    }
    throw new Error(`Airtable kept answering 429 for ${method} ${path.split('?')[0]}`);
  }

  const tablePath = (baseId, table) => `/${baseId}/${encodeURIComponent(table)}`;

  async function listIds(baseId, table) {
    const ids = [];
    let offset;
    do {
      const query = `?pageSize=100${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
      const page = await request('GET', tablePath(baseId, table) + query);
      for (const r of page.records || []) ids.push(r.id);
      offset = page.offset;
    } while (offset);
    return ids;
  }

  return {
    async count(baseId, table) {
      return (await listIds(baseId, table)).length;
    },
    async clear(baseId, table) {
      const ids = await listIds(baseId, table);
      for (const part of chunk(ids)) {
        const query = '?' + part.map((id) => `records[]=${encodeURIComponent(id)}`).join('&');
        await request('DELETE', tablePath(baseId, table) + query);
      }
      return ids.length;
    },
    async insert(baseId, table, rows) {
      let written = 0;
      for (const part of chunk(rows)) {
        await request('POST', tablePath(baseId, table), { records: part.map((fields) => ({ fields })) });
        written += part.length;
      }
      return written;
    },
  };
}

// Checks every table first, so a refusal changes nothing. Then clears (on reset), writes, and counts again.
async function seedAirtable({ client, config, plan, reset = false, log = () => {} }) {
  const targets = [
    ...Object.entries(plan.operations).map(([table, rows]) => ({ baseId: config.operationsBaseId, table, rows })),
    ...Object.entries(plan.findings).map(([table, rows]) => ({ baseId: config.findingsBaseId, table, rows })),
  ];

  if (!reset) {
    for (const t of targets) {
      const existing = await client.count(t.baseId, t.table);
      if (existing > 0) {
        throw new Error(`Table ${t.table} already has ${existing} records. Nothing was changed. Run again with --reset to replace them.`);
      }
    }
  }

  const result = {};
  for (const t of targets) {
    if (reset) {
      const removed = await client.clear(t.baseId, t.table);
      log(`${t.table}: removed ${removed}`);
    }
    if (t.rows.length) await client.insert(t.baseId, t.table, t.rows);
    const now = await client.count(t.baseId, t.table);
    if (now !== t.rows.length) throw new Error(`Table ${t.table} has ${now} records, expected ${t.rows.length}`);
    log(`${t.table}: ${now} records`);
    result[t.table] = now;
  }
  return result;
}

module.exports = { SELECT_CHOICES, clean, chunk, toPlan, createClient, seedAirtable };

if (require.main === module) {
  (async () => {
    const args = new Set(process.argv.slice(2));
    const now = process.env.AS_OF ? new Date(process.env.AS_OF) : new Date();
    const plan = toPlan(generate({ now }));
    const counts = (group) => Object.entries(group).map(([t, rows]) => `${t} ${rows.length}`).join(', ');

    if (args.has('--dry-run')) {
      console.log(`Dry run, nothing is sent. "Now" is ${now.toISOString()}`);
      console.log(`Operations: ${counts(plan.operations)}`);
      console.log(`Findings: ${counts(plan.findings)}`);
      return;
    }

    const token = process.env.AIRTABLE_SEED_TOKEN;
    if (!token) {
      throw new Error('AIRTABLE_SEED_TOKEN is not set. Set it in your own terminal (typed hidden), never in a file or in chat.');
    }
    let config;
    try {
      config = require('./airtable-config');
    } catch {
      throw new Error('seed/airtable-config.js is missing. Copy seed/airtable-config.example.js and fill in the two base ids.');
    }
    const client = createClient({ token });
    await seedAirtable({ client, config, plan, reset: args.has('--reset'), log: (line) => console.log(line) });
    console.log('Done. The answer key is in seed/out/answer-key.json (run node seed/generate.js to create it).');
  })().catch((err) => {
    console.error(String(err.message || err));
    process.exitCode = 1;
  });
}
