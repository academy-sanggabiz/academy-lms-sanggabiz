#!/usr/bin/env node
// Unit check for safeNextPath (lib/auth/safe-next.ts), the guard on the auth
// callback's ?next= parameter. Run via `npm run test:rls`.
import { safeNextPath } from "../lib/auth/safe-next.ts"

const cases = [
  ["/learner/dashboard", "/learner/dashboard"],
  ["/learn/abc?lesson=1#x", "/learn/abc?lesson=1#x"],
  [null, null],
  ["", null],
  ["@evil.com", null],
  [".evil.com", null],
  ["evil.com", null],
  ["//evil.com", null],
  ["/\\evil.com", null],
  ["/\t/evil.com", null],
  ["https://evil.com", null],
  ["javascript:alert(1)", null],
]

let failed = 0
for (const [input, expected] of cases) {
  const got = safeNextPath(input)
  const ok = got === expected
  if (!ok) failed++
  console.log(`  ${ok ? "ok  " : "FAIL"} safeNextPath(${JSON.stringify(input)}) -> ${JSON.stringify(got)}`)
}
console.log(`redirect check: ${cases.length - failed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
