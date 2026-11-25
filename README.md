# Electric Wize Complaint Investigator

An AI agent that reads customer complaints of a fictional EV charging network every morning, finds problems that hit several customers at once, and reports the likely cause with evidence to the Head of Customer Operations.

Electric Wize is a fictional company. All customers, stations and tickets are invented.

## Read in this order

1. [SPEC.md](SPEC.md) - what the agent does and does not do, its five parts, data, confidence rules, memory, instructions, guardrails, planted test cases, and what "done" means.
2. [Architecture.md](Architecture.md) - where information comes from and where it goes: system diagram, triggers, the two tracks for a ticket, one morning run, the feedback loop, trust boundaries and platform settings.
3. [Practice.md](Practice.md) - how work on this repository is done, by a person or by a coding agent.

## Status

Built: the seed script (fictional data in Airtable), the agent in the Claude Console (instructions, environment, vault, memory store) and four recorded runs (`runs/`). The permissions model (vault, limited network, read-only key) was checked in a smoke test and on the real bases on 2026-11-25. The model choice is provisional (`agent/config.md`).

Not built yet: the Make fast track for urgent tickets (so the email half of case C4 is untested), the 06:30 scheduled deployment and the Airtable Interface. `SPEC.md` and `Architecture.md` describe the full design, including these three.

## Platform

Claude Managed Agents (agent, environment, vault, memory store, scheduled deployment), Airtable (two bases and an Interface), Make (fast track for urgent tickets).
