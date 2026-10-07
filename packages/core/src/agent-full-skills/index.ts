export * as AgentFullSkills from "./index"

import { Context, Effect, Layer } from "effect"
import { makeLocationNode } from "../effect/app-node"
import { Planner, getParallelGroups } from "./planner"
import { ResilienceManager } from "./resilience"
import { SkillRegistry } from "./registry"
import { SkillRouter } from "./router"
import {
  NoSkillsError,
  PlanStep,
  SkillDefinition,
  SkillUnavailableError,
  StepResult,
  Task,
  TaskResult,
} from "./types"

export { ExecutionGraph, PlanStep, SkillDefinition, StepResult, Task, TaskResult } from "./types"
export { NoSkillsError, SkillUnavailableError } from "./types"

/** Fixed backoff for planned steps: failures are deterministic, so never long. */
const STEP_BACKOFF_MS = 1_000
const STEP_CONCURRENCY = 4

export interface Interface {
  readonly execute: (task: Task) => Effect.Effect<TaskResult, NoSkillsError>
  readonly resolve: (query: string) => Effect.Effect<SkillDefinition | undefined>
  readonly registerSkill: (skill: SkillDefinition) => Effect.Effect<void>
  readonly listSkills: () => Effect.Effect<SkillDefinition[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/v2/AgentFullSkills") {}

const executeParallelGroups = (
  groups: PlanStep[][],
  registry: SkillRegistry.Interface,
  router: SkillRouter.Interface,
  resilience: ResilienceManager.Interface,
): Effect.Effect<StepResult[]> =>
  Effect.forEach(groups, (group) =>
    Effect.forEach(
      group,
      (step) => {
        const started = Date.now()
        return Effect.gen(function* () {
          const skill = yield* registry.get(step.skillId)
          if (skill === undefined) return yield* Effect.fail(new SkillUnavailableError({ skill: step.skillId }))
          const fallbackId = step.fallbackSkillId ?? step.skillId
          const fallback = yield* registry.get(fallbackId)
          if (fallback === undefined) return yield* Effect.fail(new SkillUnavailableError({ skill: fallbackId }))
          const output = yield* resilience.executeWithFallback(
            () => router.executeSkill(skill, step),
            () => router.executeSkill(fallback, step),
            { maxRetries: step.maxRetries, backoffMs: STEP_BACKOFF_MS },
          )
          return {
            skillId: skill.id,
            status: "success" as const,
            output,
            duration: Date.now() - started,
          }
        }).pipe(
          Effect.catch((error) =>
            Effect.succeed<StepResult>({
              skillId: step.skillId,
              status: "failed",
              output: error.message,
              duration: Date.now() - started,
            }),
          ),
        )
      },
      { concurrency: STEP_CONCURRENCY },
    ),
  ).pipe(Effect.map((results) => results.flat()))

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registry = yield* SkillRegistry.Service
    const router = yield* SkillRouter.Service
    const planner = yield* Planner.Service
    const resilience = yield* ResilienceManager.Service

    return Service.of({
      execute: (task) =>
        Effect.gen(function* () {
          const started = Date.now()
          const plan = yield* planner.decompose(task)
          // Groups are dependency-ordered, so they run sequentially while steps
          // inside each group run in parallel.
          const groups = getParallelGroups(planner.createExecutionPlan(plan))
          const steps = yield* executeParallelGroups(groups, registry, router, resilience)
          return {
            taskId: task.id,
            success: steps.every((step) => step.status === "success"),
            output: steps.map((step) => step.output).join("\n\n"),
            steps,
            totalDuration: Date.now() - started,
          }
        }),
      resolve: (query) => router.resolve(query),
      registerSkill: (skill) => registry.register(skill),
      listSkills: () => registry.list(),
    })
  }),
)

export const node = makeLocationNode({
  service: Service,
  layer,
  deps: [SkillRegistry.node, SkillRouter.node, Planner.node, ResilienceManager.node],
})
