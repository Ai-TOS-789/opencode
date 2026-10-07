export * as SkillRouter from "./router"

import path from "path"
import { Context, Effect, Layer } from "effect"
import { makeLocationNode } from "../effect/app-node"
import { SkillV2 } from "../skill"
import { SkillRegistry } from "./registry"
import { NoSkillsError, PlanStep, SkillDefinition, SkillUnavailableError } from "./types"

export interface RankedSkill {
  readonly skill: SkillDefinition
  /** Match-only signal: 0 means the skill says nothing about the query. */
  readonly relevance: number
  /** Ranking signal: relevance plus the definition's priority. */
  readonly score: number
}

export interface Interface {
  readonly rank: (task: string) => Effect.Effect<RankedSkill[]>
  readonly selectSkill: (task: string) => Effect.Effect<SkillDefinition, NoSkillsError>
  readonly resolve: (query: string) => Effect.Effect<SkillDefinition | undefined>
  readonly executeSkill: (skill: SkillDefinition, step: PlanStep) => Effect.Effect<string, SkillUnavailableError>
  readonly validateSkillCoverage: (task: string, skills: SkillDefinition[]) => Effect.Effect<boolean>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/v2/SkillRouter") {}

const NAME_MATCH = 10
const CAPABILITY_MATCH = 3

const relevanceOf = (skill: SkillDefinition, task: string, words: ReadonlySet<string>) =>
  (task.toLowerCase().includes(skill.name.toLowerCase()) ? NAME_MATCH : 0) +
  skill.capabilities.filter((capability) => words.has(capability)).length * CAPABILITY_MATCH

const rankSkills = (skills: SkillDefinition[], task: string): RankedSkill[] => {
  const words = new Set(SkillRegistry.tokens(task))
  return skills
    .map((skill) => {
      const relevance = relevanceOf(skill, task, words)
      return { skill, relevance, score: skill.priority + relevance }
    })
    .toSorted((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* SkillRegistry.Service
    const skills = yield* SkillV2.Service

    const rank = (task: string) => Effect.map(registry.list(), (all) => rankSkills(all, task))

    return Service.of({
      rank,
      selectSkill: (task) =>
        Effect.gen(function* () {
          const matched = (yield* rank(task)).filter((entry) => entry.relevance > 0)
          if (matched.length === 0) return yield* Effect.fail(new NoSkillsError({ task }))
          return matched[0].skill
        }),
      resolve: (query) => Effect.map(rank(query), (ranked) => ranked.find((entry) => entry.relevance > 0)?.skill),
      executeSkill: (skill, step) =>
        Effect.gen(function* () {
          const current = yield* skills.list()
          const found = current.find((candidate) => candidate.name === skill.name)
          if (found === undefined) return yield* Effect.fail(new SkillUnavailableError({ skill: skill.name }))
          return [
            `## ${found.name}`,
            "",
            `Applied to: ${step.task}`,
            "",
            found.content.trim(),
            "",
            `Base directory for this skill: ${path.dirname(found.location)}`,
          ].join("\n")
        }),
      validateSkillCoverage: (task, selected) => {
        const words = new Set(SkillRegistry.tokens(task))
        return Effect.succeed(selected.some((skill) => relevanceOf(skill, task, words) > 0))
      },
    })
  }),
)

export const node = makeLocationNode({ service: Service, layer, deps: [SkillRegistry.node, SkillV2.node] })
