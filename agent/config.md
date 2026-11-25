# Agent configuration

The settings of the agent as they are set in the Claude Console. This file is the source of truth. Change it first, commit, then change the platform to match, and write the new agent version in `runs/`.

## Agent

| Setting | Value |
|---|---|
| Name | `electric-wize-investigator` |
| Model | `claude-haiku-5-5` while building. The final choice is the cheapest model that passes every planted case (see SPEC.md) |
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

Same instructions, effort and data in both runs. The instructions had a sentence that contradicted the spec on case C3 (repaired in the pull request after this table); the comparison on C3 therefore says little about the models. One difference besides the model: Haiku's memory store held notes from run 1, and Sonnet's was empty. Details in `runs/`.

| | `claude-haiku-5-5` | `claude-sonnet-5-5` |
|---|---|---|
| Planted cases | 8 pass, C3 partial, C4 report half only | 8 pass, C3 fail, C4 report half only |
| Clean runs with the corrected instructions (2 required) | 1 (run 5), cases: 9 pass, C4 report half only | 0 |
| Cost per run | $0.06 | $0.34 |
| A month, one run a day | about $1.8 | about $10 |

**Provisional: `claude-haiku-5-5`.** It does no worse than Sonnet at about a sixth of the cost. The choice is final only after two clean runs of each model, and after the email half of C4 is built.
