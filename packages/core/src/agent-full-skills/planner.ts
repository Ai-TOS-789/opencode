export * as Planner from "./planner"

import { Context, Effect, Layer } from "effect"
import { makeLocationNode } from "../effect/app-node"
import { SkillRouter } from "./router"
import { ExecutionGraph, NoSkillsError, PlanStep, Task } from "./types"

/**
 * Skill materialization is a pure read of a stored document, so a failure is
 * deterministic rather than transient. Plans therefore schedule no retries and
 * rely on the fallback path instead; callers may raise this per step.
 */
const STEP_MAX_RETRIES = 0

export interface Interface {
  /** Flattens the task and its constraints into a dependency-ordered DAG. */
  readonly decompose: (task: Task) => Effect.Effect<PlanStep[], NoSkillsError>
  readonly createExecutionPlan: (steps: PlanStep[]) => ExecutionGraph
}

export class Service extends Context.Service<Service, Interface>()("@opencode/v2/Planner") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const router = yield* SkillRouter.Service

    return Service.of({
      decompose: (task) =>
        Effect.gen(function* () {
          const matched = (yield* router.rank(task.description)).filter((entry) => entry.relevance > 0)
          if (matched.length === 0) return yield* Effect.fail(new NoSkillsError({ task: task.id }))

          const main: PlanStep = {
            id: `${task.id}-step-1`,
            task: task.description,
            skillId: matched[0].skill.id,
            dependencies: [],
            fallbackSkillId: matched[1]?.skill.id,
            maxRetries: STEP_MAX_RETRIES,
          }

          const constraintRanks = yield* Effect.forEach(task.constraints ?? [], (constraint) =>
            Effect.map(router.rank(constraint), (matches) => ({ constraint, matches })),
          )

          // A constraint no skill covers still runs, validated by the task's own
          // skill, so requirements are never silently dropped from the plan.
          const validation = constraintRanks.map((entry, index) => {
            const covered = entry.matches.filter((match) => match.relevance > 0)
            return {
              id: `${task.id}-step-${index + 2}`,
              task: entry.constraint,
              skillId: covered[0]?.skill.id ?? main.skillId,
              dependencies: [main.id],
              fallbackSkillId: covered[1]?.skill.id,
              maxRetries: STEP_MAX_RETRIES,
            }
          })

          return [main, ...validation]
        }),
      createExecutionPlan: (steps) => ({ steps }),
    })
  }),
)

/**
 * Buckets steps so every step sits in the first group that has none of its
 * dependencies scheduled yet.
 *
 * @throws RangeError when the graph contains a cycle, because silently dropping
 * an unreachable step would produce an incomplete execution.
 */
export const getParallelGroups = (plan: ExecutionGraph): PlanStep[][] => {
  const groups: PlanStep[][] = []
  const placed = new Set<string>()
  let pending = plan.steps

  while (pending.length > 0) {
    const ready = pending.filter((step) => step.dependencies.every((id) => placed.has(id)))
    if (ready.length === 0) {
      throw new RangeError(`Skill execution graph contains a cycle at step ${pending[0].id}`)
    }
    groups.push(ready)
    ready.forEach((step) => placed.add(step.id))
    pending = pending.filter((step) => !placed.has(step.id))
  }

  return groups
}

export const node = makeLocationNode({ service: Service, layer, deps: [SkillRouter.node] })
