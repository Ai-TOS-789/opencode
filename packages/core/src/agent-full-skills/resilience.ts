export * as ResilienceManager from "./resilience"

import { Context, Effect, Layer } from "effect"
import { makeLocationNode } from "../effect/app-node"

export interface RetryOptions {
  readonly maxRetries: number
  readonly backoffMs: number
}

export interface Interface {
  readonly retry: <A, E>(fn: () => Effect.Effect<A, E>, options: RetryOptions) => Effect.Effect<A, E>
  /** Runs `primary` to exhaustion, then falls back to `fallback`. */
  readonly executeWithFallback: <A, E>(
    primary: () => Effect.Effect<A, E>,
    fallback: () => Effect.Effect<A, E>,
    options: RetryOptions,
  ) => Effect.Effect<A, E>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/v2/ResilienceManager") {}

const retry = <A, E>(fn: () => Effect.Effect<A, E>, options: RetryOptions): Effect.Effect<A, E> =>
  fn().pipe(
    Effect.catch((error) =>
      options.maxRetries <= 0
        ? Effect.fail(error)
        : retry(fn, { ...options, maxRetries: options.maxRetries - 1 }).pipe(Effect.delay(options.backoffMs)),
    ),
  )

const layer = Layer.succeed(
  Service,
  Service.of({
    retry,
    executeWithFallback: (primary, fallback, options) =>
      retry(primary, options).pipe(Effect.catch(() => retry(fallback, options))),
  }),
)

export const node = makeLocationNode({ service: Service, layer, deps: [] })
