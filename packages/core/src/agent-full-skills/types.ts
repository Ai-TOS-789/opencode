import { Schema } from "effect"

/** A unit of work handed to the planner. */
export const Task = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  constraints: Schema.optional(Schema.Array(Schema.String)),
})
export type Task = typeof Task.Type

export const StepResult = Schema.Struct({
  skillId: Schema.String,
  status: Schema.Literals(["success", "failed", "skipped"]),
  output: Schema.String,
  duration: Schema.Number,
})
export type StepResult = typeof StepResult.Type

export const TaskResult = Schema.Struct({
  taskId: Schema.String,
  success: Schema.Boolean,
  output: Schema.String,
  steps: Schema.Array(StepResult),
  totalDuration: Schema.Number,
})
export type TaskResult = typeof TaskResult.Type

/** A routable skill. Derived from `SkillV2.Info` unless explicitly registered. */
export const SkillDefinition = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  capabilities: Schema.Array(Schema.String),
  priority: Schema.Number,
  dependencies: Schema.optional(Schema.Array(Schema.String)),
})
export type SkillDefinition = typeof SkillDefinition.Type

/** One node of the execution DAG. `dependencies` lists step ids, not skills. */
export const PlanStep = Schema.Struct({
  id: Schema.String,
  task: Schema.String,
  skillId: Schema.String,
  dependencies: Schema.Array(Schema.String),
  fallbackSkillId: Schema.optional(Schema.String),
  maxRetries: Schema.Number,
})
export type PlanStep = typeof PlanStep.Type

export const ExecutionGraph = Schema.Struct({
  steps: Schema.Array(PlanStep),
})
export type ExecutionGraph = typeof ExecutionGraph.Type

/** Raised when the registry holds no skill that could serve the task. */
export class NoSkillsError extends Schema.TaggedErrorClass<NoSkillsError>()("AgentFullSkills.NoSkillsError", {
  task: Schema.String,
}) {
  override get message() {
    return `No skill can serve task ${this.task}`
  }
}

/** Raised when a routed skill cannot be materialized from `SkillV2`. */
export class SkillUnavailableError extends Schema.TaggedErrorClass<SkillUnavailableError>()(
  "AgentFullSkills.SkillUnavailableError",
  { skill: Schema.String },
) {
  override get message() {
    return `Unable to load skill ${this.skill}`
  }
}
