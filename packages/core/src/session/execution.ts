export * as SessionExecution from "./execution"

import { Context, Effect, Layer } from "effect"
import { LayerNode } from "../effect/layer-node"
import { Node } from "../effect/app-node"
import { SessionRunner } from "./runner/index"
import { SessionSchema } from "./schema"

export type InterruptStatus = "interrupted" | "idle"

export type InterruptResult = {
  readonly sessionID: SessionSchema.ID
  readonly status: InterruptStatus
}

export interface Interface {
  /** Snapshots active execution owned by this process. */
  readonly active: Effect.Effect<ReadonlySet<SessionSchema.ID>>
  /** Starts execution while idle or joins the active execution. */
  readonly resume: (sessionID: SessionSchema.ID) => Effect.Effect<void, SessionRunner.RunError>
  /** Registers newly recorded work. Repeated wakeups may coalesce. */
  readonly wake: (sessionID: SessionSchema.ID) => Effect.Effect<void>
  /** Interrupt active work owned by this process. Idle interruption is a no-op. */
  readonly interrupt: (sessionID: SessionSchema.ID) => Effect.Effect<void>
  /** Interrupt multiple sessions and report whether each was active at lookup. */
  readonly interruptMany: (sessionIDs: ReadonlyArray<SessionSchema.ID>) => Effect.Effect<ReadonlyArray<InterruptResult>>
}

/** Routes execution from a Session ID to the runner owned by that Session's Location. */
export class Service extends Context.Service<Service, Interface>()("@opencode/v2/SessionExecution") {}

export const node = LayerNode.unbound(Service, Node.tags.values.global)

/** Low-level compatibility layer for callers that only need durable Session recording. */
export const noopLayer = Layer.succeed(
  Service,
  Service.of({
    active: Effect.succeed(new Set()),
    resume: () => Effect.void,
    wake: () => Effect.void,
    interrupt: () => Effect.void,
    interruptMany: (sessionIDs) =>
      Effect.succeed(
        sessionIDs.map((sessionID) => ({
          sessionID,
          status: "idle" as const,
        })),
      ),
  }),
)
