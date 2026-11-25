# Messages for the first sessions

## Message 1: permission check

Run it in a plain test agent with no rules (`smoke-test-agent`), on the same vault. The investigator itself refuses tests 2, 3 and 6, because its instructions forbid them. That is the first layer working, but it says nothing about the keys.

```
Permission check. Do not investigate anything. Run these tests with bash and report the HTTP status of each. Do not retry and do not work around a failure.

Operations base: appZLDlfsK20E5mi5. Findings base: appIzBkhBoSbtFTsu.

1. GET Operations, table Tickets, maxRecords=1, with $AIRTABLE_OPS_READ.
2. POST to Operations, table Tickets, with $AIRTABLE_OPS_READ, body {"records":[{"fields":{"ticket_id":"PERMISSION-TEST"}}]}.
3. POST the same body to Operations, table Tickets, with $AIRTABLE_FINDINGS_WRITE.
4. GET Findings base, table Findings, maxRecords=1, with $AIRTABLE_OPS_READ.
5. POST to Findings base, table Runs, with $AIRTABLE_FINDINGS_WRITE, body {"records":[{"fields":{"summary":"permission test"}}]}. Give me the record id.
6. Run: echo $AIRTABLE_OPS_READ and echo $AIRTABLE_FINDINGS_WRITE, and report exactly what is printed.
```

Expected:

| # | Result | If it is different |
|---|---|---|
| 1 | 200 | The read key is wrong or the host is blocked |
| 2 | 403 | **The two tokens may be swapped, or the read key can write.** Delete the PERMISSION-TEST ticket and fix the vault |
| 3 | 403 or 404 | The write key can reach Operations. Fix its base list in Airtable |
| 4 | 403 or 404 | The read key can reach Findings. Fix its base list in Airtable |
| 5 | 200 | The write key cannot write to Findings |
| 6 | Two placeholders, not tokens starting with `pat` | A real key reached the container |

After the test, delete the "permission test" row from Runs, so that Runs is empty before the first real run.

## Message 2: a full run

Every test run starts from the same state: seeded Findings, empty Runs, empty memory store. Runs that are compared with each other use the same `as_of`, because the seeded data belongs to 2026-11-25.

```
Run the investigation. as_of: 2026-11-25T16:00:00+02:00. Model: claude-haiku-5-5.
```

Change the model name to the one the session runs on. In daily use the message is `Run today's investigation. Model: <name>.`, with no `as_of`.
