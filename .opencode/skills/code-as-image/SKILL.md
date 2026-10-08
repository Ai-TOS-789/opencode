---
name: code-as-image
description: Read and write code as mental images — boxes, data flow, boundaries — instead of line-by-line text. Use when onboarding to an unfamiliar module, reasoning about behavior before running anything, comparing structural alternatives, writing code from a design, or when reading feels slow or wrong despite knowing the syntax.
---

# Code As Image

A source file is a **linear projection** of a structure that is not linear. Objects, data flow, boundaries, and invariants live in many dimensions; the file forces them into line 1 → line N.

- **Reading = reconstruction** — text back into the structure
- **Writing = projection** — structure out into text

They are one skill, not two: **hold the structure, not the text.**

## Why the structure gives the code back

The structure fixes the **skeleton** — what blocks exist, in what order, what flows in and out. That is most of the work, and it converts back to code deterministically.

Syntax and API names are **vocabulary**. Vocabulary is lookup-able; it does not need to be memorized.

> Structure fixes the skeleton · lookup fixes the words · no structure means guessing both.

## Diagnostic: what did you actually keep?

Close the file and answer:

1. **What boxes exist?** — the nodes/objects
2. **Which way do the arrows point?** — what flows into what
3. **Where are the seams?** — which lines separate concerns that must not be mixed
4. **What must hold?** — the invariant whose break changes behavior

Five boxes or fewer. If they will not come out, you read **prose**, not **code** — the fix is compression, not more reading.

## What only the image can see

Line-by-line reading structurally cannot reveal these; each is a property of a shape:

- **Holes.** `ModelV2.Info` exposes 12 fields. A list shows what *is* there; only the shape of "a model card" shows that `reasoning`, `interleaved`, `attachment`, and `temperature` are *absent*.
- **Precedence.** `isContextOverflow` is 28 patterns gated by 3 exclusions. Whether a `403 free tier` response lands in overflow depends on which layer runs first — invisible in any single regex.
- **Sentinel semantics.** `sort()`'s `findIndex(...)` returning `-1` reads as "no match" in text. As an ordered preference ladder with a basement below position 0, it directly predicts the outcome: a non-matching model loses to everyone, then ties break alphabetically.

## Images this repo already publishes

Reuse these instead of rebuilding them each session. Each is stated in an `AGENTS.md` or verified against source — re-verify after structural changes.

| Image | Shape |
|---|---|
| **Dependency layers** | `Schema <- Protocol <- Server`; `Schema -> Core, Protocol -> Server`; client runtime uses Schema+Protocol only, never Core or Server; `sdk-next` composes Client+Core+Server |
| **Four axes** | Protocol / Endpoint / Auth / Framing — why OpenAI-compatible providers reuse `OpenAIChat.protocol` verbatim in 5-15 lines instead of cloning 300-400 |
| **Location hub** | SessionRunner, model resolution, tool registry, permissions, and filesystem all hang off `Location` |
| **V2 prompt pipeline** | `prompt` admits a durable `session_input` → `wake` → at the boundary `cutoff = EventV2.latestSequence` → `promoteSteers` (one batch, one step reset) → reload history → build request; `queue` promotes one at a time |
| **Two question paths** | Path A: `question.ask` blocks in a forked fiber and returns `toolResult` at once. Path B: a steer waits for the boundary. Same visible face today — a known gap |
| **Two-layer classifier** | `isContextOverflow`: exclusions gate patterns |
| **Preference ladder** | `priority` ordered best-first → `findIndex(id.includes)` → `-1` = last place → `id` descending |
| **Cheap-model score** | `small()`: `(cost/maxCost)*0.8 + (age/maxAge)*0.2`, lowest wins; cost `0` or a missing tier behaves differently from a positive cost |

## Practice

Three levels with pass conditions. They are **not** interchangeable.

**Level 1 — compression (text → image)**

Read one function, close the file, draw 3-5 boxes and arrows.

- *Pass*: the four diagnostic answers come out.
- *Test*: **predict behavior before running**, then run. A miss means the image is wrong — repair the image, not the explanation.

**Level 2 — expansion (image → text)**

Take the drawing and write the code **without looking**. Diff against the original.

- *Pass*: the diff is small.
- *Read the diff*: structural differences mean the image was wrong; naming and boilerplate differences mean the image was right and only the vocabulary is thin.

**Level 3 — vocabulary (a separate deficit)**

Image correct but code will not come out → the problem is vocabulary: API names, signatures, error shapes. Fix it with reference and repetition.

> Drilling the wrong level for a week produces nothing. Establish which deficit you have first.

## One rule

> **Read = decode an image. Write = encode an image.**
> Two hundred lines with no drawing means you read prose, not code.

When an explanation cannot be drawn, it is not yet understood — including your own.
