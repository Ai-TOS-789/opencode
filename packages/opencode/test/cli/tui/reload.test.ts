import { describe, expect, test } from "bun:test"
import { decide, defaultPolicy, wait } from "../../../src/cli/tui/reload"

const policy = { maxAttempts: 3, backoffMs: 500, stableMs: 30_000 }
const quick = { elapsedMs: 10 }
const crashed = { ...quick, resolved: false }

describe("TuiReload.decide", () => {
  test("never reopens a clean quit", () => {
    expect(decide({ resolved: true, elapsedMs: 0 }, 0, policy)).toEqual({ reload: false })
  })

  test("reopens an error exit with growing backoff until the budget is spent", () => {
    const errorExit = { resolved: true, reason: new Error("bootstrap failed"), ...quick }
    expect(decide(errorExit, 0, policy)).toEqual({ reload: true, delayMs: 500, attempt: 1 })
    expect(decide(errorExit, 1, policy)).toEqual({ reload: true, delayMs: 1000, attempt: 2 })
    expect(decide(errorExit, 2, policy)).toEqual({ reload: true, delayMs: 2000, attempt: 3 })
    expect(decide(errorExit, 3, policy)).toEqual({ reload: false })
  })

  test("reopens a crash", () => {
    expect(decide(crashed, 0, policy)).toEqual({ reload: true, delayMs: 500, attempt: 1 })
  })

  test("restores the budget once a run has been healthy", () => {
    expect(decide({ ...crashed, elapsedMs: 30_000 }, 3, policy)).toEqual({ reload: true, delayMs: 0, attempt: 0 })
  })

  test("caps the backoff so a failing run cannot stall the terminal", () => {
    const capped = { ...policy, maxAttempts: 10, backoffMs: 5_000 }
    expect(decide(crashed, 0, capped)).toMatchObject({ reload: true, delayMs: 5_000 })
    expect(decide(crashed, 1, capped)).toMatchObject({ reload: true, delayMs: 8_000 })
    expect(decide(crashed, 2, capped)).toMatchObject({ reload: true, delayMs: 8_000 })
  })

  test("stays shut when reload is disabled", () => {
    expect(decide(crashed, 0)).toEqual({ reload: false })
    expect(decide({ resolved: true, reason: "boom", ...quick }, 0)).toEqual({ reload: false })
  })

  test("ships bounded defaults", () => {
    expect(defaultPolicy.maxAttempts).toBeGreaterThan(0)
    expect(defaultPolicy.backoffMs).toBeGreaterThan(0)
    expect(defaultPolicy.stableMs).toBeGreaterThan(0)
  })
})

test("wait honors the requested delay", async () => {
  const started = Date.now()
  await wait(10)
  expect(Date.now() - started).toBeGreaterThanOrEqual(5)
  await expect(wait(0)).resolves.toBeUndefined()
})
