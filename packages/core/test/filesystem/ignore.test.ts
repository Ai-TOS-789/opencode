import { expect, test } from "bun:test"
import { Ignore } from "@opencode-ai/core/filesystem/ignore"

test("match nested and non-nested", () => {
  expect(Ignore.match("node_modules/index.js")).toBe(true)
  expect(Ignore.match("node_modules")).toBe(true)
  expect(Ignore.match("node_modules/")).toBe(true)
  expect(Ignore.match("node_modules/bar")).toBe(true)
  expect(Ignore.match("node_modules/bar/")).toBe(true)
})

test("match python virtualenv folders", () => {
  expect(Ignore.match(".venv")).toBe(true)
  expect(Ignore.match(".venv/")).toBe(true)
  expect(Ignore.match(".venv/lib/python3.12/site-packages/requests/api.py")).toBe(true)
  expect(Ignore.match("venv")).toBe(true)
  expect(Ignore.match("venv/bin/python")).toBe(true)
  expect(Ignore.match("project/venv/pyvenv.cfg")).toBe(true)
})

test("does not match virtualenv lookalikes", () => {
  expect(Ignore.match("src/main.py")).toBe(false)
  expect(Ignore.match("venvish/readme.md")).toBe(false)
  expect(Ignore.match("environment/config.ts")).toBe(false)
})

test("publishes virtualenv folders to the watcher patterns", () => {
  expect(Ignore.PATTERNS).toContain(".venv")
  expect(Ignore.PATTERNS).toContain("venv")
})
