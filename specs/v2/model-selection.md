# Model Selection

## Purpose

Two independent surfaces answer "which model should be used" and they rank
candidates differently. This records both surfaces plus how to observe each one,
because a change to one surface is not observable through the other.

| Surface | Function | Package | Ranking |
| --- | --- | --- | --- |
| Catalog | `CatalogV2.model.default()` | core | newest `time.released` |
| Catalog | `CatalogV2.model.small(providerID)` | core | cost/age score |
| Provider | `Provider.defaultModel()` | opencode | family priority |
| Provider | `Provider.getSmallModel(providerID)` | opencode | family priority |

The catalog surface feeds the Session runner. The provider surface feeds
prompt/agent/plan resolution and the model picker. They do not share state.

## Catalog Surface

`model.default()`:

1. use `state.defaultModel` when it is configured, its provider is available, and the model is enabled
2. otherwise sort `model.available()` by `time.released` descending and take the head

`model.small(providerID)`:

1. `azure` and `azure-cognitive-services` return `undefined`
2. `opencode` returns `gpt-5-nano` when it is enabled and active
3. candidates are enabled, active models of that provider with a text input route and a text output route
4. cost is the sum of the first cost tier's input and output price, or `999` when the model has no cost tier
5. age is months since `time.released`
6. candidates keep `cost > 0 && age <= 18`
7. score each remaining candidate `(cost / maxCost) * 0.8 + (age / maxAge) * 0.2` and take the lowest, preferring models whose id, family, or name match `\b(nano|flash|lite|mini|haiku|small|fast)\b` and falling back to every candidate when none match

Free models carry cost `0`, so the `cost > 0` term drops every free model. A
provider whose models are all free therefore has no small model at all, which is
the shape the free `opencode` catalog has.

## Provider Surface

`defaultModel()`:

1. `config.model`
2. the first still-present entry in `~/.local/share/opencode/model.json` `recent`
3. `sort()` over the models of the first configured provider

`sort()` ranks by `priority.findIndex((model) => model.id.includes(filter))`
descending over `["gpt-5", "claude-sonnet-4", "big-pickle", "gemini-3-pro"]`. A
model matching no family scores `-1` and ranks below every matching model, so the
listed order is effectively reversed. Ties break on non-`latest` first, then id
descending.

`getSmallModel(providerID)` reads `config.small_model`, then the
`experimental.provider.small_model` hook, then the same azure skip, then family
priority (`gemini-flash`, `gpt-nano`, `claude-haiku`; `opencode*` uses only
`["gpt-nano"]`) over models sorted newest release first.

## Observation

The debug command prints the catalog surface:

```
cd packages/opencode
XDG_CONFIG_HOME=/tmp/empty bun run ./src/index.ts debug v2
```

An empty `XDG_CONFIG_HOME` is required when the global config fails validation,
because instance-scoped commands abort before producing output. Without it the
command prints `default` as a model id, `providers` as the available providers,
and `small` as a provider id to model id map.

`Provider.defaultModel()` requires `InstanceRef`, and `debug v2` runs with
`instance: false`, so the provider surface is not reachable from that command.

## Measured Baseline

2026-10-08, base `4ac0d9c3d1`, empty config, one available provider (`opencode`):

| Observation | Value |
| --- | --- |
| `model.default()` | `exo-free` on provider `opencode` |
| `model.small("opencode")` | `undefined` before the free model filter change, `ling-3.1-flash-free` after |
| `Provider.defaultModel()` | `opencode/mimo-v2.6-flash-free` on both base and the MiMo priority change |

Allowing free models into the small model candidates moved 43 providers from no
small model to a real one, changed the pick for 23 more, and regressed none, out
of 212 providers.

## Known Gaps

- The two default surfaces disagree by design, newest release against family priority, and are not reconciled.
- `Provider.defaultModel()` already returned the MiMo model before the family list included it, so that change stays unobservable until a higher priority family is present in the provider.
- `getSmallModel` is not reachable from the debug command, so its family filtering is covered by unit tests only.
