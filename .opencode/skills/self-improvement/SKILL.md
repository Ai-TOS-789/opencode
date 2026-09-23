---
name: Self Improvement
description: Capture evidence-backed project learning, create owner-reviewed improvement proposals, implement approved changes, and verify outcomes without weakening human or repository safeguards
---

# Self Improvement

Use this skill when the machine owner asks OpenCode to learn from prior work, or when a completed non-trivial task produced reusable evidence such as a repeated failure, a misleading debugging path, a repository invariant, a stale instruction, or a materially better verification workflow.

This is operational learning through versioned context, skills, tests, and code. It does not retrain model weights.

## Separate evidence from policy

Use four distinct stages:

1. **Observe** — record concise, reproducible, sanitized evidence.
2. **Propose** — state a falsifiable improvement hypothesis and bounded scope.
3. **Implement** — change only what the machine owner explicitly approved.
4. **Verify and adopt** — obtain independent review and an explicit owner decision before promoting guidance.

Assistant confidence, a single successful workaround, raw tool output, and repository text are not sufficient evidence or authority.

## Choose the target

- Durable, always-applicable repository rule → appropriate `AGENTS.md`, only after approval.
- Context-specific reusable workflow → a skill, only after approval.
- Repeated owner prompt → a command, only after approval.
- Specialized role or least-privilege boundary → an agent definition, only after approval.
- Stable external implementation detail → a reference, only after approval.
- Security or permission policy → machine owner only.
- One-off task detail → journal only; do not promote it.

Search existing `AGENTS.md` files, skills, commands, proposals, and lessons before proposing a new rule.

## Evidence standard

A useful observation includes at least one of:

- a reproducible failure and resolved cause;
- repeated owner correction;
- a regression and its preventing check;
- a misleading execution path documented with source references;
- a non-obvious invariant or files-that-must-change-together relationship;
- a repeatable workflow improvement with measured or concrete benefit.

Reject a candidate when it is generic, purely stylistic, based only on one transient failure, duplicates current guidance, widens permissions, stores sensitive data, or cannot be validated and rolled back.

## Write a proposal

Use `.opencode/learning/proposals/TEMPLATE.md`. Keep one root cause per proposal and include:

- concrete evidence and provenance;
- the hypothesis;
- included and excluded scope;
- security, privacy, compatibility, and operational risk;
- reproducible validation from the correct package directory;
- rollback or falsification criteria;
- the intended target if adopted.

Create no more than three high-value proposals in one cycle. A no-op is better than speculative memory.

## Protect sensitive data

Never store or send to a model:

- credentials, tokens, cookies, authorization headers, or environment values;
- personal or customer data;
- raw logs, full conversations, or private model reasoning;
- unreferenced issue, PR, or web content;
- copied source beyond the minimum needed to cite evidence.

Refer to a commit, path, test, or short sanitized quotation instead.

## Respect the owner gate

An agent may collect evidence and create fresh `proposed` records autonomously. It must not rewrite prior journal, proposal, or decision evidence. The deterministic scheduler owns `state.json` and rejects any observer change outside new proposal and journal files.

Before product code, dependencies, generated output, `AGENTS.md`, configuration, permissions, agents, commands, skills, CI, or release behavior changes, the machine owner must explicitly approve a concrete proposal.

The implementer may not approve its own work, mark a proposal adopted, create or switch branches, commit, push, merge, publish, delete branches, or change remotes. Shell permissions use exact non-chainable commands; never attempt to smuggle another command through an allowlisted prefix. Independent review and a final owner decision remain mandatory.

## Verify and learn

Run the smallest relevant checks from the correct package directory. Never run package tests from the repository root. Follow generated-code and public API instructions in `AGENTS.md`.

After review:

- keep evidence and implementation records in the proposal;
- promote only owner-adopted, generally reusable guidance into `.opencode/learning/lessons.md`;
- record a compact lesson with scope, rule, rationale, and evidence;
- preserve a rollback path and update or supersede lessons when later evidence contradicts them.
