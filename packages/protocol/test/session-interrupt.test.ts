import { describe, expect, test } from "bun:test"
import { Effect, Schema } from "effect"
import { Session } from "@opencode-ai/schema/session"
import { SessionInterruptInput, SessionInterruptResult } from "../src/groups/session"

describe("Session interrupt contract", () => {
  test("decodes a non-empty batch", async () => {
    const input = await Effect.runPromise(
      Schema.decodeUnknownEffect(SessionInterruptInput)({
        sessionIDs: [Session.ID.make("ses_first"), Session.ID.make("ses_second")],
      }),
    )

    expect(input).toEqual({
      sessionIDs: [Session.ID.make("ses_first"), Session.ID.make("ses_second")],
    })
  })

  test("rejects an empty batch", async () => {
    const error = await Effect.runPromise(
      Effect.flip(Schema.decodeUnknownEffect(SessionInterruptInput)({ sessionIDs: [] })),
    )

    expect(error).toBeDefined()
  })

  test("rejects a batch larger than the production limit", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        Schema.decodeUnknownEffect(SessionInterruptInput)({
          sessionIDs: Array.from({ length: 101 }, (_, index) => Session.ID.make(`ses_${index}`)),
        }),
      ),
    )

    expect(error).toBeDefined()
  })

  test("decodes each interrupt status", async () => {
    const result = await Effect.runPromise(
      Schema.decodeUnknownEffect(SessionInterruptResult)({
        sessionID: Session.ID.make("ses_test"),
        status: "interrupted",
      }),
    )

    expect(result).toEqual({ sessionID: Session.ID.make("ses_test"), status: "interrupted" })
  })
})
