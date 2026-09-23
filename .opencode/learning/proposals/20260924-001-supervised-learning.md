---
id: LRN-20260924-001
title: Establish a supervised OpenCode self-learning loop
status: proposed
risk: medium
created_at: 2026-09-23T18:36:06Z
created_by: owner-requested-bootstrap
source_commit: 610df0b56674fa0ebcae89093ada08b98731bea6
owner_decision: pending
owner_decision_at: ""
owner_decision_by: ""
review_verdict: pending
reviewed_at: ""
---

# Summary

Establish a versioned, evidence-based learning loop in which OpenCode leads observation, proposal, implementation, and review while the machine owner explicitly controls approval, adoption, Git, and release operations.

## Evidence

- Owner request in the active session — create an OpenCode context and self-learning source that OpenCode can improve autonomously with machine-owner oversight and joint verification.
- `.opencode/command/learn.md` at `610df0b56674fa0ebcae89093ada08b98731bea6` — the prior command directly changed `AGENTS.md` from session claims without a durable proposal, owner gate, independent review, or rollback record.
- `SECURITY.md:15-19` — OpenCode is not sandboxed and permission prompts are UX safeguards rather than an isolation boundary.
- Official OpenCode V2 agent, command, skill, permission, and headless-run behavior — bounded agents and commands can separate observation, implementation, and review, but scheduling and final authority remain external.
- Independent `improvement-reviewer` review during this bootstrap — the first candidate was rejected because wildcard shell permissions allowed command chaining, the observer could alter existing records, lifecycle checks were incomplete, version compatibility and cron hardening were insufficient, and the candidate lacked an auditable proposal.

## Why this matters

Without a durable evidence and decision boundary, a self-improving coding agent can turn a transient mistake, prompt injection, or unverified assistant claim into permanent instructions. The owner also loses the ability to determine what was learned, why it changed, how it was validated, and how to roll it back.

The repository already has strong local instructions and specialized OpenCode assets. A narrow local learning loop can make OpenCode more useful over time without introducing a new Core feature, changing public APIs, weakening tests, or granting unattended write and Git authority.

## Hypothesis

A proposal-first learning loop with a least-privilege observer, deterministic scheduler validation, an explicit owner decision agent, a bounded implementer, an independent read-only reviewer, and no active remote automation will let OpenCode continuously identify improvements safely while keeping the machine owner as the final authority.

## Scope

### Included

- Root project context in `AGENTS.md`.
- The project-local learning reference in `.opencode/opencode.jsonc` and pause rules in `.opencode/.gitignore`.
- A proposal-only replacement for `.opencode/command/learn.md` plus owner-review commands under `.opencode/commands/`.
- `self-improvement` skill instructions and observer, approver, implementer, and reviewer agents under `.opencode/`.
- Versioned policy, state, journal, proposal, decision, and lesson records under `.opencode/learning/`.
- Deterministic validation and bounded scheduling scripts under `script/`.
- A disabled-by-default host cron entry that may be installed only after explicit owner approval.

### Excluded

- OpenCode product/Core/Protocol/Server source and public APIs.
- Dependencies, generated files, CI, release behavior, architecture, and database persistence.
- Automatic changes to `CODEOWNERS` or branch protection because the owner's GitHub identity and remote policy are not configured.
- Automatic commits by a model or agent, Git push, merge, publication, remote changes, or credential handling.
- A background plugin that automatically rewrites active instructions.
- Automatic model fine-tuning or claims that the LLM retrains its own weights.

## Risk and safeguards

- **Command chaining:** the observer has no shell access. Implementer and reviewer shell permissions contain only exact, non-chainable commands; broad prefixes and branch-changing commands are denied.
- **Record tampering:** the unattended observer may create only new proposal and journal files. The scheduler rejects modifications to tracked records and templates, validates new records, rejects common secret patterns and symlinks, and exclusively stamps `state.json`.
- **Owner authority:** invoking a command is not consent. The approver must show a decision packet and receive an explicit owner response before creating a decision record.
- **Separation of duties:** the implementer cannot approve or adopt its work, and the reviewer is read-only and cannot edit files.
- **Version skew:** the scheduler requires an exact `opencode` version, currently `2.0.15`, before invoking a model.
- **Sensitive output:** raw model output is discarded by default and metadata logs rotate at 1 MiB. Optional debug output requires an explicit path outside the repository.
- **Scheduling:** cron is absent while this proposal is pending. Manual and scheduled runs require an explicit branch, a clean worktree, and a held lock.
- **No sandbox:** permissions remain defense in depth only. The owner should run the scheduler as an unprivileged user or inside a container/VM for stronger isolation.
- **Remote governance:** fork URL, `origin`, GitHub authentication, `CODEOWNERS`, and branch protection remain separate owner-controlled setup.

## Validation

1. Parse the shell and Python helpers with `bash -n` and Python without writing bytecode.
2. Parse `state.json` and run `script/opencode-learning-check validate` in a clean test checkout.
3. Use `opencode debug agents` to confirm all four agents load with the intended modes, step limits, and exact final permission rules.
4. Use the location-scoped API to confirm the learning reference and all six commands register.
5. Confirm the cron table is empty until owner approval.
6. In an isolated temporary clone on a disposable branch, commit the candidate, run one full `opencode run` cycle, verify deterministic validation and local-only commit behavior, run the cycle a second time to prove the no-op source guard, and confirm no remote ref changed.
7. Run an independent read-only `improvement-reviewer` pass after remediation.
8. Ask the machine owner to review the exact diff and choose approval or rejection; invoking `/approve-improvement` alone is insufficient.

Package tests and type checks are not yet run because Bun is not installed in the current environment. This proposal changes only project-local OpenCode configuration and scripts, not package runtime code.

## Implementation record

A bootstrap candidate is present in the working tree for owner review. It is not an approved or adopted proposal, cron has been removed, and no product, dependency, generated, CI, release, or remote change is included.

The first independent review returned `REJECT`. Remediation removed wildcard shell access from the observer, replaced implementation and review shell prefixes with exact commands, denied grep and broad glob access, moved state ownership to the scheduler, added new-record-only enforcement, added deterministic structural and secret checks, pinned the active OpenCode version, hardened paths and logging, disabled cron, and added an auditable bootstrap proposal.

A second independent review and isolated end-to-end smoke test remain required before requesting the owner decision.

## Review

Initial verdict: `REJECT` — critical shell-prefix chaining, mutable evidence, owner-audit, version, no-op-loop, logging, and end-to-end validation gaps.

Remediation is implemented in the current candidate. Final verdict: pending.

## Owner decision

Pending. Do not enable cron or use the implementation and approval commands for unattended product changes until the owner explicitly approves the exact scope above.
