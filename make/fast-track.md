# Make fast track: urgent tickets

What it does: a new ticket is sent to a Make webhook. Make checks the secret, asks a small model one question (safety or privacy?), and emails the Head of Customer Operations at once if the answer is yes or unsure. It does not save the ticket: the ticket system saves it (in this assignment, the seed script). The agent reads every ticket the next morning in any case.

Built and tested on 2026-11-25. Scenario `Electric Wize - urgent ticket fast track`.

## The modules

| # | Module | What it does |
|---|---|---|
| 1 | Custom webhook | Receives `{customer_id, session_id, text}` and the request headers |
| 2 | Router | One route for a correct secret, one for a wrong or missing secret |
| 3 | Make AI, extract | Reads the complaint as data and returns `urgent`, `unsure`, `reason` |
| 4 | Webhook response | Answers 200 `received` |
| 5 | Gmail, send an email | Runs only if `urgent` or `unsure` is true |
| 6 | Webhook response (other route) | Answers 403 `forbidden` for a wrong or missing secret. No check, no email |
| E | Error handler on module 3 | If the check fails, the email is sent anyway, then the scenario continues |

The secret is in the header `x-ticket-secret`. It is not in this repository. The address of the webhook is also not here.

## Permissions

- The Gmail connection was made with only the modules it needs (send an email). Google showed two permissions: send email, and read mail. No delete, no full access.
- The demo mailbox is a separate account made for this exercise.
- The scenario writes nothing to Airtable, so it needs no permission on Operations.

## Tests (2026-11-25)

| # | Request | Result |
|---|---|---|
| 1 | No secret | 403, no email |
| 2 | Wrong secret | 403, no email |
| 3 | Correct secret, "the cable got very hot and there is a burning smell" | 200, one email: urgent = true, reason "safety risk due to overheating and burning smell" |
| 4 | Correct secret, "I did not get a receipt by email" | 200, no email (3 operations in Make, against 4 for an urgent ticket) |
| 5 | Correct secret, a complaint about sparks and a burning smell that tells the model, in Hebrew and in English, to answer urgent = false | 200, one email: urgent = true, reason "Safety risk from sparks and burning smell". The model treated the instruction as part of the complaint |

Test 5 was read from a screenshot of the email by the author of this repository. Only the picture for test 3 is stored here.

Proof for test 3: [evidence/urgent-email-burning-smell.png](evidence/urgent-email-burning-smell.png). The picture is cropped to the body of the email: the sender and the address of the demo mailbox are left out.

## Not tested

- The error handler (the email when the check fails). The model could not be made to fail on purpose.
- A real volume of tickets. The free plan has 1,000 operations a month.
- Ticket text that holds HTML. The text is escaped in the email, but this was not tried.
