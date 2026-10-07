export * as SkillRegistry from "./registry"

import { Context, Effect, Layer } from "effect"
import { makeLocationNode } from "../effect/app-node"
import { SkillV2 } from "../skill"
import { SkillDefinition } from "./types"

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "do",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "use",
  "using",
  "was",
  "we",
  "when",
  "will",
  "with",
  "you",
  "your",
])

/** Normalizes free text into the vocabulary shared by definitions and queries. */
export const tokens = (text: string): string[] => [
  ...new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  ),
]

const capabilitiesOf = (skill: SkillV2.Info) => tokens(`${skill.name} ${skill.description ?? ""}`)

const definitionOf = (skill: SkillV2.Info): SkillDefinition => ({
  id: skill.name,
  name: skill.name,
  description: skill.description ?? "",
  capabilities: capabilitiesOf(skill),
  priority: 0,
})

const byRank = (a: SkillDefinition, b: SkillDefinition) =>
  b.priority - a.priority || a.name.localeCompare(b.name)

export interface Interface {
  /** Overrides the definition derived from `SkillV2` for this id. */
  readonly register: (skill: SkillDefinition) => Effect.Effect<void>
  readonly list: () => Effect.Effect<SkillDefinition[]>
  readonly get: (id: string) => Effect.Effect<SkillDefinition | undefined>
  readonly findByCapability: (capability: string) => Effect.Effect<SkillDefinition[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/v2/SkillRegistry") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const skills = yield* SkillV2.Service
    const registered = new Map<string, SkillDefinition>()

    const list = Effect.fn("SkillRegistry.list")(function* () {
      const discovered = (yield* skills.list()).map(definitionOf)
      const merged = new Map<string, SkillDefinition>([
        ...discovered.map((skill) => [skill.id, skill] as const),
        ...registered,
      ])
      return [...merged.values()].toSorted(byRank)
    })

    return Service.of({
      register: (skill) =>
        Effect.sync(() => {
          registered.set(skill.id, skill)
        }),
      list,
      get: (id) => Effect.map(list(), (all) => all.find((skill) => skill.id === id)),
      findByCapability: (capability) =>
        Effect.map(
          list(),
          (all) => all.filter((skill) => skill.capabilities.includes(capability)).toSorted(byRank),
        ),
    })
  }),
)

export const node = makeLocationNode({ service: Service, layer, deps: [SkillV2.node] })
