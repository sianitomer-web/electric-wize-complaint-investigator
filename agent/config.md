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

`electric-wize-airtable`, with two environment-variable credentials. Both are limited to the host `api.airtable.com` and substituted in request headers only.

| Variable | Airtable token | Reaches |
|---|---|---|
| `AIRTABLE_OPS_READ` | `data.records:read` | Electric Wize - Operations, read only |
| `AIRTABLE_FINDINGS_WRITE` | `data.records:read` and `data.records:write` | Electric Wize - Findings |

The token values are never in this repository.

## Memory store

`charging-ops-notes`, read and write, mounted in the session at `/mnt/memory/charging-ops-notes/`. Added when the session is created, under Resources.

## Order of the first runs

1. Permission check, with message 1 in [test-messages.md](test-messages.md).
2. A first full run, with message 2. Read the transcript line by line.
3. The ten planted cases, as described in SPEC.md, each run recorded in `runs/`.
