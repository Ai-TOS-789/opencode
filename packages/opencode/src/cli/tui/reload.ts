/**
 * Bounded auto-reload policy for the TUI.
 *
 * The TUI runs in-process against a long-lived worker, so a reload re-runs the
 * UI effect while the backend — and therefore the session — stays up. That is
 * what makes reopening cheap: no service restart, no re-admission of input.
 */
export interface Policy {
  /** Reload at most this many times in a row without a healthy run between them. */
  readonly maxAttempts: number
  /** Delay before the first reload; doubles on each subsequent attempt. */
  readonly backoffMs: number
  /** A run that stays up this long counts as healthy and restores the budget. */
  readonly stableMs: number
}

export const defaultPolicy: Policy = { maxAttempts: 3, backoffMs: 500, stableMs: 30_000 }

const backoffCeilingMs = 8_000

export interface Outcome {
  /** False when the TUI effect failed instead of returning. */
  readonly resolved: boolean
  /** Present when the app stopped itself because of an error. */
  readonly reason?: unknown
  /** How long the attempt stayed up. */
  readonly elapsedMs: number
}

export type Decision =
  | { readonly reload: false }
  | { readonly reload: true; readonly delayMs: number; readonly attempt: number }

/**
 * Decides whether an attempt should be reopened.
 *
 * A clean quit always ends the loop, and so does a failure once the budget is
 * spent. An attempt that stayed up long enough to be healthy starts a fresh
 * budget, so a long-lived session that later dies is never mistaken for a
 * crash loop, while a tight loop is stopped after `maxAttempts`.
 */
export const decide = (outcome: Outcome, attempt: number, policy?: Policy): Decision => {
  if (outcome.resolved && outcome.reason === undefined) return { reload: false }
  if (policy === undefined) return { reload: false }
  const next = outcome.elapsedMs >= policy.stableMs ? 0 : attempt + 1
  if (next > policy.maxAttempts) return { reload: false }
  return {
    reload: true,
    delayMs: next === 0 ? 0 : Math.min(policy.backoffMs * 2 ** (next - 1), backoffCeilingMs),
    attempt: next,
  }
}

export const wait = (ms: number) =>
  ms <= 0 ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, ms))

export * as TuiReload from "./reload"
