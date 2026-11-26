# Agent configuration

The settings of the agent as they are set in the Claude Console. This file is the source of truth. Change it first, commit, then change the platform to match, and write the new agent version in `runs/`.

## Agent

| Setting | Value |
|---|---|
| Name | `electric-wize-investigator` |
| Model | `claude-haiku-5-5`. Chosen as the cheapest model that passes the planted cases (see "Model choice" below) |
| Effort | High |
| System prompt | The full text of [instructions.md](instructions.md), pasted as it is |
| Tools | `bash`, `read`, `write`, `edit`, `grep`, `glob` on Auto. `web_fetch` and `web_search` denied |
| Skills | None. The Airtable calls are written in the instructions |
| MCP servers | None |
| Budget per run | $2 |

## Environment

| Setting | Value |
|---|---|
| Name | `electric-wize-closed` |
| Type | Cloud |
| Networking | Limited |
| Allowed hosts | `api.airtable.com` only |
| Allow package managers | Off |
| Allow MCP servers | Off |

## Vault

`electric-wize-airtable` (its display name in the Console is still `Airtable ops read-only`), with two environment-variable credentials. Both are limited to the host `api.airtable.com` and substituted in request headers only.

| Variable | Airtable token | Reaches |
|---|---|---|
| `AIRTABLE_OPS_READ` | `data.records:read` | Electric Wize - Operations, read only |
| `AIRTABLE_FINDINGS_WRITE` | `data.records:read` and `data.records:write` | Electric Wize - Findings |

Each token's access list in Airtable must show one base only. On 2026-11-25 the read token also had "All current and future bases", and the permission check caught it.

The token values are never in this repository.

## Memory store

`charging-ops-notes`, read and write, mounted in the session at `/mnt/memory/charging-ops-notes/`. Added when the session is created, under Resources.

## Order of the first runs

1. Permission check, with message 1 in [test-messages.md](test-messages.md), in a plain test agent on the same vault.
2. A first full run, with message 2. Read the transcript line by line.
3. The ten planted cases, as described in SPEC.md, each run recorded in `runs/`.

## Model choice

Effort and data were the same for both models. The first comparison (run 2 against run 4) used instructions with a sentence that contradicted the spec on case C3, so it says little about C3. Haiku then ran twice more with the corrected instructions (runs 5 and 6). Sonnet did not. Details in `runs/`.

| | `claude-haiku-5-5` | `claude-sonnet-5-5` |
|---|---|---|
| Planted cases, first comparison (runs 2 and 4) | 8 pass, C3 partial, C4 report half only | 8 pass, C3 fail, C4 report half only |
| Clean runs with the corrected instructions (2 required) | 2 (runs 5 and 6): C1-C3 and C5-C10 pass in both, C4 report half only. The urgent ticket was rated differently in the two | 0 |
| Cost per run | $0.05 to $0.06 | $0.34 |
| A month, one run a day | about $1.8 | about $10 |

**Production: `claude-haiku-5-5`.** It passed two clean runs (5 and 6) at $0.05 each, so it is the cheapest model that passes, and Sonnet is tried only if Haiku fails. Sonnet ran once (run 4), before the instructions were corrected, so there is no clean Sonnet run to compare with. The email half of C4 was built and tested after these runs, outside the agent: see [../make/fast-track.md](../make/fast-track.md).
