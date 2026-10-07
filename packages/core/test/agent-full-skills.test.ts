import path from "path"
import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { AgentFullSkills } from "@opencode-ai/core/agent-full-skills/index"
import { Planner, getParallelGroups } from "@opencode-ai/core/agent-full-skills/planner"
import { ResilienceManager } from "@opencode-ai/core/agent-full-skills/resilience"
import { SkillRegistry } from "@opencode-ai/core/agent-full-skills/registry"
import { SkillRouter } from "@opencode-ai/core/agent-full-skills/router"
import { AppNodeBuilder } from "@opencode-ai/core/effect/app-node-builder"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { AbsolutePath } from "@opencode-ai/core/schema"
import { SkillV2 } from "@opencode-ai/core/skill"
import { it } from "./lib/effect"

const effect = SkillV2.Info.make({
  name: "effect",
  description: "Build applications with Effect",
  location: AbsolutePath.make(path.resolve("/skills/effect/SKILL.md")),
  content: "Effect guidance",
})

const deploy = SkillV2.Info.make({
  name: "deploy",
  description: "Deploy to production",
  location: AbsolutePath.make(path.resolve("/skills/deploy/SKILL.md")),
  content: "Deploy guidance",
})

const skillSource = (list: SkillV2.Info[]): LayerNode.Replacements => [
  [SkillV2.node, Layer.mock(SkillV2.Service, { list: () => Effect.succeed(list) })],
]

const registryLayer = (list: SkillV2.Info[]) => AppNodeBuilder.build(SkillRegistry.node, skillSource(list))
const routerLayer = (list: SkillV2.Info[]) => AppNodeBuilder.build(SkillRouter.node, skillSource(list))
const plannerLayer = (list: SkillV2.Info[]) => AppNodeBuilder.build(Planner.node, skillSource(list))
const fullSkillsLayer = (list: SkillV2.Info[]) => AppNodeBuilder.build(AgentFullSkills.node, skillSource(list))

describe("SkillRegistry", () => {
  it.effect("derives routable definitions from installed skills", () =>
    Effect.gen(function* () {
      const registry = yield* SkillRegistry.Service
      expect((yield* registry.list()).map((skill) => skill.id)).toEqual(["deploy", "effect"])
      expect(yield* registry.get("effect")).toMatchObject({
        description: "Build applications with Effect",
        capabilities: ["effect", "build", "applications"],
        priority: 0,
      })
    }).pipe(Effect.provide(registryLayer([effect, deploy]))),
  )

  it.effect("lets an explicit registration override the derived definition", () =>
    Effect.gen(function* () {
      const registry = yield* SkillRegistry.Service
      yield* registry.register({
        id: "effect",
        name: "effect",
        description: "Tuned by hand",
        capabilities: ["tuned"],
        priority: 40,
      })
      expect(yield* registry.get("effect")).toMatchObject({ description: "Tuned by hand", priority: 40 })
      expect(yield* registry.findByCapability("tuned")).toHaveLength(1)
      expect(yield* registry.findByCapability("build")).toHaveLength(0)
      expect(yield* registry.findByCapability("effect")).toHaveLength(0)
    }).pipe(Effect.provide(registryLayer([effect, deploy]))),
  )
})

describe("SkillRouter", () => {
  it.effect("ranks by name and capability relevance and ignores unrelated queries", () =>
    Effect.gen(function* () {
      const router = yield* SkillRouter.Service
      const ranked = yield* router.rank("Build applications with Effect")
      expect(ranked[0].skill.id).toBe("effect")
      expect(ranked[0].relevance).toBeGreaterThan(0)
      expect(ranked[0].score).toBe(ranked[0].relevance)
      expect(ranked[1].skill.id).toBe("deploy")
      expect(ranked[1].relevance).toBe(0)
      expect(yield* router.resolve("Build applications with Effect")).toMatchObject({ name: "effect" })
      expect(yield* router.resolve("sing a song about bananas")).toBeUndefined()
      expect(yield* router.validateSkillCoverage("Build applications with Effect", [ranked[1].skill])).toBe(false)
      expect(yield* router.validateSkillCoverage("Deploy to production", [ranked[1].skill])).toBe(true)
    }).pipe(Effect.provide(routerLayer([effect, deploy]))),
  )

  it.effect("fails when no installed skill can serve the task", () =>
    Effect.gen(function* () {
      const router = yield* SkillRouter.Service
      const failure = yield* router.selectSkill("sing a song about bananas").pipe(
        Effect.map(() => "selected"),
        Effect.catch((error) => Effect.succeed(error.message)),
      )
      expect(failure).toBe("No skill can serve task sing a song about bananas")
    }).pipe(Effect.provide(routerLayer([effect, deploy]))),
  )

  it.effect("materializes skill content and reports an unavailable skill", () =>
    Effect.gen(function* () {
      const router = yield* SkillRouter.Service
      const skill = (yield* router.rank("Build applications with Effect"))[0].skill
      const step = { id: "step-1", task: "Build applications", skillId: skill.id, dependencies: [], maxRetries: 0 }
      expect(yield* router.executeSkill(skill, step)).toContain("Effect guidance")
      expect(yield* router.executeSkill(skill, step)).toContain(
        `Base directory for this skill: ${path.dirname(effect.location)}`,
      )
      const failure = yield* router.executeSkill({ ...skill, name: "ghost" }, step).pipe(
        Effect.map(() => "loaded"),
        Effect.catch((error) => Effect.succeed(error.message)),
      )
      expect(failure).toBe("Unable to load skill ghost")
    }).pipe(Effect.provide(routerLayer([effect, deploy]))),
  )
})

describe("Planner", () => {
  it.effect("decomposes a task into a dependency-ordered plan", () =>
    Effect.gen(function* () {
      const planner = yield* Planner.Service
      const steps = yield* planner.decompose({
        id: "task-1",
        description: "Build applications with Effect",
        constraints: ["Deploy to production", "Keep it simple"],
      })
      expect(steps.map((step) => step.id)).toEqual(["task-1-step-1", "task-1-step-2", "task-1-step-3"])
      expect(steps[0]).toMatchObject({ skillId: "effect", dependencies: [], maxRetries: 0 })
      expect(steps[1]).toMatchObject({ skillId: "deploy", dependencies: ["task-1-step-1"] })
      expect(steps[2]).toMatchObject({ skillId: "effect", dependencies: ["task-1-step-1"] })
      expect(getParallelGroups(planner.createExecutionPlan(steps))).toHaveLength(2)
    }).pipe(Effect.provide(plannerLayer([effect, deploy]))),
  )

  it.effect("refuses to plan a task no skill matches", () =>
    Effect.gen(function* () {
      const planner = yield* Planner.Service
      const failure = yield* planner.decompose({ id: "task-2", description: "sing a song about bananas" }).pipe(
        Effect.map(() => "planned"),
        Effect.catch((error) => Effect.succeed(error.message)),
      )
      expect(failure).toBe("No skill can serve task task-2")
    }).pipe(Effect.provide(plannerLayer([effect, deploy]))),
  )
})

test("buckets independent steps so they can run in parallel", () => {
  const groups = getParallelGroups({
    steps: [
      { id: "a", task: "a", skillId: "s", dependencies: [], maxRetries: 0 },
      { id: "b", task: "b", skillId: "s", dependencies: [], maxRetries: 0 },
      { id: "c", task: "c", skillId: "s", dependencies: ["a", "b"], maxRetries: 0 },
    ],
  })
  expect(groups).toHaveLength(2)
  expect(groups[0].map((step) => step.id)).toEqual(["a", "b"])
  expect(groups[1].map((step) => step.id)).toEqual(["c"])
})

test("refuses to schedule a cyclic graph", () => {
  expect(() =>
    getParallelGroups({
      steps: [
        { id: "a", task: "a", skillId: "s", dependencies: ["b"], maxRetries: 0 },
        { id: "b", task: "b", skillId: "s", dependencies: ["a"], maxRetries: 0 },
      ],
    }),
  ).toThrow(RangeError)
})

describe("ResilienceManager", () => {
  const layer = AppNodeBuilder.build(ResilienceManager.node)

  it.live("retries a flaky operation with backoff before reporting exhaustion", () =>
    Effect.gen(function* () {
      const resilience = yield* ResilienceManager.Service
      const attempts = { count: 0 }
      const flaky = Effect.gen(function* () {
        attempts.count += 1
        if (attempts.count < 3) return yield* Effect.fail("boom")
        return "ok"
      })
      expect(yield* resilience.retry(() => flaky, { maxRetries: 5, backoffMs: 1 })).toBe("ok")
      expect(attempts.count).toBe(3)

      const spent = { count: 0 }
      const alwaysFails = Effect.gen(function* () {
        spent.count += 1
        return yield* Effect.fail("boom")
      })
      const failure = yield* resilience.retry(() => alwaysFails, { maxRetries: 2, backoffMs: 1 }).pipe(
        Effect.map(() => "recovered"),
        Effect.catch((error) => Effect.succeed(error)),
      )
      expect(failure).toBe("boom")
      expect(spent.count).toBe(3)
    }).pipe(Effect.provide(layer)),
  )

  it.live("falls back when the primary is exhausted", () =>
    Effect.gen(function* () {
      const resilience = yield* ResilienceManager.Service
      expect(
        yield* resilience.executeWithFallback(
          () => Effect.fail("primary"),
          () => Effect.succeed("fallback"),
          { maxRetries: 1, backoffMs: 1 },
        ),
      ).toBe("fallback")
      expect(
        yield* resilience.executeWithFallback(
          () => Effect.succeed("primary"),
          () => Effect.succeed("fallback"),
          { maxRetries: 1, backoffMs: 1 },
        ),
      ).toBe("primary")
    }).pipe(Effect.provide(layer)),
  )
})

describe("AgentFullSkills", () => {
  it.effect("executes a plan end to end and reports per-step results", () =>
    Effect.gen(function* () {
      const fullSkills = yield* AgentFullSkills.Service
      const result = yield* fullSkills.execute({
        id: "task-1",
        description: "Build applications with Effect and deploy to production",
        constraints: ["Deploy to production"],
      })
      expect(result.taskId).toBe("task-1")
      expect(result.success).toBe(true)
      expect(result.steps).toHaveLength(2)
      expect(result.steps.every((step) => step.status === "success")).toBe(true)
      expect(result.output).toContain("Effect guidance")
      expect(result.output).toContain("Deploy guidance")
      expect(result.totalDuration).toBeGreaterThanOrEqual(0)
    }).pipe(Effect.provide(fullSkillsLayer([effect, deploy]))),
  )

  it.effect("falls back to another relevant skill when the preferred one is unavailable", () =>
    Effect.gen(function* () {
      const fullSkills = yield* AgentFullSkills.Service
      yield* fullSkills.registerSkill({
        id: "phantom",
        name: "phantom",
        description: "Build applications with Effect",
        capabilities: ["build", "applications", "effect"],
        priority: 100,
      })
      const result = yield* fullSkills.execute({ id: "task-2", description: "Build applications with Effect" })
      expect(result.success).toBe(true)
      expect(result.steps).toHaveLength(1)
      expect(result.steps[0]).toMatchObject({ skillId: "phantom", status: "success" })
      expect(result.steps[0].output).toContain("Effect guidance")
    }).pipe(Effect.provide(fullSkillsLayer([effect, deploy]))),
  )

  it.effect("resolves a routed skill by name and reports nothing for an unknown query", () =>
    Effect.gen(function* () {
      const fullSkills = yield* AgentFullSkills.Service
      expect(yield* fullSkills.resolve("Build applications with Effect")).toMatchObject({ name: "effect" })
      expect(yield* fullSkills.resolve("sing a song about bananas")).toBeUndefined()
      expect(yield* fullSkills.listSkills()).toHaveLength(2)
    }).pipe(Effect.provide(fullSkillsLayer([effect, deploy]))),
  )
})
