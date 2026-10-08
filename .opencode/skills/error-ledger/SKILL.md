---
name: error-ledger
description: Recorded error classes from user-caught mistakes in this repo, each with its guard. Use before reporting a measurement, count, or baseline; before citing a contract's field set or a byte/unit base; when a finding still rests on a suspicion; or before touching a path outside the repository.
---

# Error Ledger

Every entry below was caught by a human, not by a test. They are recorded so the next occurrence converts from recall into verification.

## Ledger

| # | What happened | Root cause | Guard |
|---|---|---|---|
| 1 | Reported `catalog.model.default()` results while the claim was about `provider.defaultModel()` | claim outran source — measured a different target than the claim | restate the claim with the exact symbol, locate that symbol before measuring |
| 2 | Baseline reported as 1106 when it was 1104 (branch still stacked under another) | invalid measurement context — stale base | preflight before measuring: clean tree, expected parent commit, pinned snapshot hash |
| 3 | Invented `ModelV2.Info`'s fields instead of reading them, so every trait returned `0` and the conclusion nearly became "OpenCode knows no model traits" | claim outran source — contract never loaded | read the contract from source; run `bun typecheck` on any measurement script before trusting its output |
| 4 | Reported 781,579 bytes as "781 KB" under a 1024-byte rule (correct: 763.26 KiB) | claim outran source — no unit frame | state the base alongside the number; this repo's own constants are `* 1024` throughout |
| 5 | Attributed 6 catalog failures to my own change while only *suspecting* the `gpt-5-nano` hardcode | suspicion presented as a finding | label hypotheses as hypotheses; only measured results may be reported as findings |
| 6 | Nearly edited `~/.config/opencode/opencode.jsonc` — outside the repo, would have broken `mimo-phone` | boundary unchecked — destination never resolved | resolve the path first; outside the working tree means hands off |
| 7 | Nearly modified turn-checkpoint code that is deliberately deferred pending a recovery policy | design intent not loaded — absence read as a gap | look for a stated deferral before treating missing functionality as missing work |
| 8 | Planned model-characteristics plumbing from a summary claiming temperature/attachment/reasoning_options were "dropped"; re-measurement showed the runtime path already populates and consumes all three (`provider.ts:1340` populate, `request.ts` temperature gate, `transform.ts` reasoningVariants), and the recalled "6,253 reasoning_options" was actually the `reasoning:true` count (non-empty reasoning_options = 5,063) | claim outran source — stale belief reused without re-measuring | re-measure from a pinned snapshot and read the consuming symbol before planning; grep the consumer first |

## Root-cause classes

1. **Claim outran source** (1, 3, 4, 7, 8) — asserted or proceeded before the contract, unit frame, measurement, or design intent was loaded.
2. **Invalid measurement context** (2) — wrong base, scope, or target.
3. **Suspicion as finding** (5) — an unverified hypothesis reported as if measured.
4. **Boundary unchecked** (6) — an action whose destination was never resolved.

Only class 1 has a mechanical guard for code paths (`bun typecheck`), and only entry 3 has a repository test. The rest are discipline — **count them as unguarded, not as solved.**

## Mechanical guard

`packages/schema/test/contract-hygiene.test.ts` → `model info pins its exact field set` locks the 13 top-level fields of `Model.Info`, including the ones absent today: `reasoning`, `interleaved`, `attachment`, `temperature`.

Verified to fire, not merely to pass: adding a `reasoning` field turns it red with `+ "reasoning"`; reverting returns 6 pass / 0 fail.

> A guard that has never been observed failing is a hypothesis, not a guard. The `gpt-5-nano` hardcode was long assumed load-bearing and measured to never fire.

## Before claiming

1. Restate the claim with the exact symbol, file, or unit base.
2. Load it from source — never reconstruct a contract from memory.
3. Run `bun typecheck` before reading any measurement output.
4. Label anything unmeasured as a hypothesis.
5. Resolve the path; outside the working tree → hands off.

## On provenance

The code can be copied. The root cause, the guard, and the proof that the guard fires cannot — a copy inherits the artifact without the immunity. Recording them is what keeps correctness a property of the repository rather than of anyone's memory, including a model's.
