# Electric Wize Complaint Investigator

An AI agent that reads customer complaints of a fictional EV charging network every morning, finds problems that hit several customers at once, and reports the likely cause with evidence to the Head of Customer Operations.

Electric Wize is a fictional company. All customers, stations and tickets are invented.

## Read in this order

1. [SPEC.md](SPEC.md) - what the agent does and does not do, its five parts, data, confidence rules, memory, instructions, guardrails, planted test cases, and what "done" means.
2. [Architecture.md](Architecture.md) - where information comes from and where it goes: system diagram, triggers, the two tracks for a ticket, one morning run, the feedback loop, trust boundaries and platform settings.
3. [Practice.md](Practice.md) - how work on this repository is done, by a person or by a coding agent.

## Status

Design stage. The permissions model (vault, limited network, read-only key) was smoke-tested on a throwaway base on 2026-11-25. The agent, the seed script and the Make fast track are not built yet.

## Platform

Claude Managed Agents (agent, environment, vault, memory store, scheduled deployment), Airtable (two bases and an Interface), Make (fast track for urgent tickets).
