'use strict';

// Tests for seed/push.js. No network and no real token: Airtable is replaced by a fake.

const test = require('node:test');
const assert = require('node:assert/strict');
const { generate } = require('../seed/generate');
const { SELECT_CHOICES, chunk, toPlan, createClient, seedAirtable } = require('../seed/push');

const NOW = Date.parse('2026-12-01T06:30:00Z');
const data = generate({ now: NOW });
const plan = toPlan(data);
const config = { operationsBaseId: 'appOPS', findingsBaseId: 'appFIND' };

test('plan: every seed record goes to the right table, and Runs starts empty', () => {
  assert.equal(plan.operations.Stations.length, 60);
  assert.equal(plan.operations.Sessions.length, data.sessions.length);
  assert.equal(plan.operations.Tickets.length, data.tickets.length);
  assert.equal(plan.operations.Changes.length, data.changes.length);
  assert.equal(plan.findings.Findings.length, 4);
  assert.deepEqual(plan.findings.Runs, []);
});

test('plan: no empty value is sent (Airtable rejects "" in a select field)', () => {
  for (const group of [plan.operations, plan.findings]) {
    for (const rows of Object.values(group)) {
      for (const row of rows) {
        for (const [key, value] of Object.entries(row)) {
          assert.ok(value !== '' && value !== null && value !== undefined, `${key} is empty`);
        }
      }
    }
  }
  // A ticket without a session simply has no session_id field.
  assert.ok(plan.operations.Tickets.some((t) => !('session_id' in t)));
});

test('plan: every value of a select field is one of the choices created in Airtable', () => {
  for (const row of plan.findings.Findings) {
    for (const [field, choices] of Object.entries(SELECT_CHOICES)) {
      if (field in row) assert.ok(choices.includes(row[field]), `${field}: "${row[field]}" is not a choice`);
    }
  }
});

test('chunk: batches of at most 10, nothing lost, order kept', () => {
  const list = Array.from({ length: 23 }, (_, i) => i);
  const parts = chunk(list);
  assert.deepEqual(parts.map((p) => p.length), [10, 10, 3]);
  assert.deepEqual(parts.flat(), list);
});

function fakeFetch(responses, calls = []) {
  return async (url, options) => {
    calls.push({ url, options });
    const next = responses.shift();
    return { status: next.status, ok: next.status < 400, text: async () => JSON.stringify(next.body || {}) };
  };
}
const noSleep = async () => {};

test('client: retries after 429 and then succeeds', async () => {
  const calls = [];
  const client = createClient({ token: 'secret-token', sleep: noSleep, fetchImpl: fakeFetch([{ status: 429 }, { status: 200, body: { records: [] } }], calls) });
  assert.equal(await client.count('appX', 'Tickets'), 0);
  assert.equal(calls.length, 2);
});

test('client: an error message never contains the token', async () => {
  const token = 'patSECRET1234567890.abcdef';
  const client = createClient({ token, sleep: noSleep, fetchImpl: fakeFetch([{ status: 403, body: { error: { type: 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND', message: 'Invalid permissions' } } }]) });
  await assert.rejects(() => client.insert('appX', 'Tickets', [{ a: 1 }]), (err) => {
    assert.match(err.message, /403/);
    assert.ok(!err.message.includes('SECRET'));
    return true;
  });
});

test('client: writes in batches of 10 and counts what it wrote', async () => {
  const calls = [];
  const responses = Array.from({ length: 3 }, () => ({ status: 200, body: {} }));
  const client = createClient({ token: 't', sleep: noSleep, fetchImpl: fakeFetch(responses, calls) });
  const rows = Array.from({ length: 23 }, (_, i) => ({ n: i }));
  assert.equal(await client.insert('appX', 'Tickets', rows), 23);
  assert.deepEqual(calls.map((c) => JSON.parse(c.options.body).records.length), [10, 10, 3]);
  assert.ok(calls.every((c) => c.options.method === 'POST'));
});

function fakeAirtable(existing = {}) {
  const tables = { ...existing };
  const log = [];
  const key = (base, table) => `${base}/${table}`;
  return {
    log,
    tables,
    async count(base, table) { return (tables[key(base, table)] || []).length; },
    async clear(base, table) { const n = (tables[key(base, table)] || []).length; tables[key(base, table)] = []; log.push(`clear ${table}`); return n; },
    async insert(base, table, rows) { tables[key(base, table)] = [...(tables[key(base, table)] || []), ...rows]; log.push(`insert ${table}`); return rows.length; },
  };
}

test('seed: writes every table, and the counts match the plan', async () => {
  const client = fakeAirtable();
  const result = await seedAirtable({ client, config, plan });
  assert.equal(result.Tickets, data.tickets.length);
  assert.equal(result.Findings, 4);
  assert.equal(result.Runs, 0);
  assert.equal(client.tables['appOPS/Stations'].length, 60);
});

test('seed: refuses when a table already has records, and changes nothing', async () => {
  const client = fakeAirtable({ 'appFIND/Findings': [{ issue_key: 'x' }] });
  await assert.rejects(() => seedAirtable({ client, config, plan }), /already has 1 records.*Nothing was changed/);
  assert.deepEqual(client.log, []);
});

test('seed: with reset it clears first, so the same data is not written twice', async () => {
  const client = fakeAirtable();
  await seedAirtable({ client, config, plan });
  await seedAirtable({ client, config, plan, reset: true });
  assert.equal(client.tables['appOPS/Tickets'].length, data.tickets.length);
  assert.ok(client.log.includes('clear Runs'));
});
