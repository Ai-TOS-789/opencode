---
description: Independently review a learning implementation without modifying files
agent: improvement-reviewer
subtask: true
---

Review proposal `$ARGUMENTS` and its current implementation. Verify owner approval, proposal fidelity, scope, correctness, security, privacy, generated-code rules, test placement, validation evidence, rollback, and unrelated changes. Run only relevant deterministic checks and return `PASS`, `CHANGES_REQUESTED`, or `REJECT` with severity-ordered file and line findings. Do not edit any file or make the final adoption decision.
