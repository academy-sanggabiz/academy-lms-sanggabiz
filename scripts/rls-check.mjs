#!/usr/bin/env node
// REST-level RLS regression test: signs in as anon / a non-enrolled learner /
// an enrolled learner / the owning admin / a non-owning admin and asserts who
// can read and write what through the Supabase API -- the same surface an
// attacker would use, bypassing the Next.js app entirely.
//
//   npm run test:rls
//
// Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (and,
// optionally, SUPABASE_SERVICE_ROLE_KEY) from the environment or .env.local.
// Needs the seed course below and an owner admin account (RLS_ADMIN_EMAIL,
// default admin@test.local). Creates throwaway users named c-rls-*@test.local
// and deletes them again when a service-role key is available. Exits 1 on any
// failed assertion.

import { readFileSync, existsSync } from "node:fs"

function loadEnv() {
  if (!existsSync(".env.local")) return
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
loadEnv()

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const COURSE = process.env.RLS_COURSE_ID ?? "11111111-1111-4111-8111-111111111111"
const QUIZ = process.env.RLS_QUIZ_ID ?? "44444444-4444-4444-8444-444444444441"
const ADMIN_EMAIL = process.env.RLS_ADMIN_EMAIL ?? "admin@test.local"
const ADMIN_PASSWORD = process.env.RLS_ADMIN_PASSWORD ?? "Passw0rd!123"
const PASSWORD = "Passw0rd!123"
const RUN = Date.now().toString(36)

if (!URL_ || !ANON) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing")
  process.exit(2)
}

let failures = 0
let passes = 0
function check(name, ok, detail = "") {
  if (ok) {
    passes++
    console.log(`  ok   ${name}`)
  } else {
    failures++
    console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`)
  }
}

async function req(method, path, { token, body, headers = {}, key = ANON } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token ?? key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: res.status, ok: res.ok, json }
}

const rows = (r) => (r.ok && Array.isArray(r.json) ? r.json : [])
const denied = (r) => !r.ok || (Array.isArray(r.json) && r.json.length === 0)

async function signIn(email, password) {
  const r = await req("POST", "/auth/v1/token?grant_type=password", { body: { email, password } })
  if (!r.ok) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(r.json)}`)
  return { token: r.json.access_token, id: r.json.user.id, email }
}

async function signUp(label) {
  const email = `c-rls-${label}-${RUN}@test.local`
  const r = await req("POST", "/auth/v1/signup", { body: { email, password: PASSWORD } })
  if (!r.ok) throw new Error(`signup failed for ${email}: ${JSON.stringify(r.json)}`)
  return signIn(email, PASSWORD)
}

const created = []

async function main() {
  console.log(`RLS check against ${URL_} (course ${COURSE})`)

  const admin = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
  const outsider = await signUp("outsider")
  const enrolled = await signUp("enrolled")
  created.push(outsider, enrolled)

  let otherAdmin = null
  if (SERVICE) {
    otherAdmin = await signUp("otheradmin")
    created.push(otherAdmin)
    const r = await req("PATCH", `/rest/v1/profiles?id=eq.${otherAdmin.id}`, {
      key: SERVICE,
      body: { role: "admin" },
    })
    if (!r.ok) throw new Error(`could not promote non-owner admin: ${JSON.stringify(r.json)}`)
  }

  // Fixture: a resource on the course's first lesson (owner admin writes it).
  const publicLessons = rows(
    await req("GET", `/rest/v1/lessons_public?course_id=eq.${COURSE}&select=*&order=position`)
  )
  const lessonIds = publicLessons.map((l) => l.id)
  const inLessons = `in.(${lessonIds.join(",")})`
  const res = await req("POST", "/rest/v1/resources", {
    token: admin.token,
    body: { lesson_id: lessonIds[0], title: `c-rls ${RUN}`, file_url: `https://example.com/secret-${RUN}.pdf` },
  })
  const resourceId = rows(res)[0]?.id
  if (!resourceId) throw new Error(`fixture resource insert failed: ${JSON.stringify(res.json)}`)

  // Enrolled learner enrolls themselves through the normal self-enroll path.
  const enr = await req("POST", "/rest/v1/enrollments", {
    token: enrolled.token,
    body: { learner_id: enrolled.id, course_id: COURSE },
  })
  const enrollmentId = rows(enr)[0]?.id
  if (!enrollmentId) throw new Error(`self-enroll failed: ${JSON.stringify(enr.json)}`)

  console.log("\n[anon]")
  check("course row readable", rows(await req("GET", `/rest/v1/courses?id=eq.${COURSE}&select=id`)).length === 1)
  check("public curriculum (lessons_public) lists lessons", publicLessons.length > 0, `${publicLessons.length} rows`)
  check(
    "lessons_public exposes no content/video_url",
    publicLessons.every((l) => !("content" in l) && !("video_url" in l))
  )
  const withResource = rows(await req("GET", `/rest/v1/lessons_public?id=eq.${lessonIds[0]}&select=resource_count`))
  check("lessons_public counts resources", withResource[0]?.resource_count > 0)
  check(
    "lessons (content/video_url) not readable",
    denied(await req("GET", `/rest/v1/lessons?id=${inLessons}&select=id,content,video_url`))
  )
  check("resources not readable", denied(await req("GET", `/rest/v1/resources?id=eq.${resourceId}&select=file_url`)))
  check("questions not readable", denied(await req("GET", `/rest/v1/questions?quiz_id=eq.${QUIZ}&select=prompt`)))
  check("question_options_public empty", denied(await req("GET", `/rest/v1/question_options_public?select=id`)))
  check("question_options not readable", denied(await req("GET", `/rest/v1/question_options?select=is_correct`)))
  check("question_explanations not readable", denied(await req("GET", `/rest/v1/question_explanations?select=*`)))
  check("enrollments not readable", denied(await req("GET", `/rest/v1/enrollments?select=id`)))
  check("quiz_attempts not readable", denied(await req("GET", `/rest/v1/quiz_attempts?select=id`)))
  check("profiles not readable", denied(await req("GET", `/rest/v1/profiles?select=id`)))

  console.log("\n[non-enrolled learner]")
  const o = { token: outsider.token }
  check("lessons_public lists lessons", rows(await req("GET", `/rest/v1/lessons_public?course_id=eq.${COURSE}`, o)).length === lessonIds.length)
  check("lessons not readable", denied(await req("GET", `/rest/v1/lessons?id=${inLessons}&select=content,video_url`, o)))
  check("resources not readable", denied(await req("GET", `/rest/v1/resources?id=eq.${resourceId}&select=file_url`, o)))
  check("questions not readable", denied(await req("GET", `/rest/v1/questions?quiz_id=eq.${QUIZ}&select=prompt`, o)))
  check("question_options_public empty", denied(await req("GET", `/rest/v1/question_options_public?select=id`, o)))
  check("question_explanations not readable", denied(await req("GET", `/rest/v1/question_explanations?select=*`, o)))
  check(
    "cannot open a quiz attempt without enrollment",
    !(await req("POST", "/rest/v1/quiz_attempts", { ...o, body: { quiz_id: QUIZ, learner_id: outsider.id, attempt_number: 1 } })).ok
  )
  check(
    "cannot forge a graded attempt (unlocks explanations)",
    !(
      await req("POST", "/rest/v1/quiz_attempts", {
        ...o,
        body: { quiz_id: QUIZ, learner_id: outsider.id, attempt_number: 9, status: "graded", score: 100, passed: true },
      })
    ).ok
  )
  const esc = await req("PATCH", `/rest/v1/profiles?id=eq.${outsider.id}`, { ...o, body: { role: "superadmin" } })
  const roleNow = rows(await req("GET", `/rest/v1/profiles?id=eq.${outsider.id}&select=role`, o))[0]?.role
  check("cannot change own role", !esc.ok && roleNow === "learner", `status ${esc.status}, role ${roleNow}`)
  check(
    "can still update own full_name",
    (await req("PATCH", `/rest/v1/profiles?id=eq.${outsider.id}`, { ...o, body: { full_name: "C RLS Outsider" } })).ok
  )
  check(
    "cannot read other learners' enrollments",
    denied(await req("GET", `/rest/v1/enrollments?learner_id=eq.${enrolled.id}&select=id`, o))
  )
  check(
    "cannot read other learners' progress",
    denied(await req("GET", `/rest/v1/lesson_progress?enrollment_id=eq.${enrollmentId}&select=id`, o))
  )
  check(
    "cannot read other learners' attempts",
    denied(await req("GET", `/rest/v1/quiz_attempts?learner_id=eq.${enrolled.id}&select=id`, o))
  )
  check(
    "cannot enroll another learner",
    !(await req("POST", "/rest/v1/enrollments", { ...o, body: { learner_id: enrolled.id, course_id: COURSE } })).ok
  )

  console.log("\n[enrolled learner]")
  const e = { token: enrolled.token }
  const fullLessons = rows(await req("GET", `/rest/v1/lessons?id=${inLessons}&select=id,content,video_url`, e))
  check("lessons readable", fullLessons.length === lessonIds.length, `${fullLessons.length}/${lessonIds.length}`)
  check("lesson content/video_url present", fullLessons.some((l) => l.content || l.video_url))
  check("resource file_url readable", rows(await req("GET", `/rest/v1/resources?id=eq.${resourceId}&select=file_url`, e)).length === 1)
  const qs = rows(await req("GET", `/rest/v1/questions?quiz_id=eq.${QUIZ}&select=id,prompt`, e))
  check("questions readable", qs.length > 0)
  const opts = rows(await req("GET", `/rest/v1/question_options_public?select=id,question_id`, e))
  check("question_options_public readable", opts.length > 0)
  check("question_options.is_correct still hidden", denied(await req("GET", `/rest/v1/question_options?select=is_correct`, e)))
  check("explanations hidden before submitting", denied(await req("GET", `/rest/v1/question_explanations?select=*`, e)))

  const start = await req("POST", "/rest/v1/quiz_attempts", {
    ...e,
    body: { quiz_id: QUIZ, learner_id: enrolled.id, attempt_number: 1 },
  })
  const attemptId = rows(start)[0]?.id
  check("can open an in-progress attempt", !!attemptId, JSON.stringify(start.json))
  check(
    "can save draft answers",
    rows(await req("PATCH", `/rest/v1/quiz_attempts?id=eq.${attemptId}`, { ...e, body: { draft_answers: { a: "b" } } })).length === 1
  )
  check(
    "cannot write own score/passed/status",
    !(await req("PATCH", `/rest/v1/quiz_attempts?id=eq.${attemptId}`, { ...e, body: { score: 100, passed: true, status: "graded" } })).ok
  )
  check(
    "cannot insert quiz_responses directly",
    !(
      await req("POST", "/rest/v1/quiz_responses", {
        ...e,
        body: { attempt_id: attemptId, question_id: qs[0]?.id, response: "x", is_correct: true, points_awarded: 999 },
      })
    ).ok
  )
  const answers = Object.fromEntries(qs.map((q) => [q.id, opts.find((op) => op.question_id === q.id)?.id ?? ""]))
  const graded = await req("POST", "/rest/v1/rpc/grade_attempt", { ...e, body: { p_attempt_id: attemptId, p_answers: answers } })
  check("grade_attempt RPC still works", graded.ok && typeof graded.json?.total === "number", JSON.stringify(graded.json))
  check("explanations readable after submitting", rows(await req("GET", `/rest/v1/question_explanations?select=*`, e)).length > 0)
  check(
    "cannot edit a submitted attempt",
    !(await req("PATCH", `/rest/v1/quiz_attempts?id=eq.${attemptId}`, { ...e, body: { draft_answers: {} } })).ok
  )
  for (const n of [2, 3]) {
    await req("POST", "/rest/v1/quiz_attempts", { ...e, body: { quiz_id: QUIZ, learner_id: enrolled.id, attempt_number: n } })
  }
  check(
    "attempt cap (3) enforced in the database",
    !(await req("POST", "/rest/v1/quiz_attempts", { ...e, body: { quiz_id: QUIZ, learner_id: enrolled.id, attempt_number: 4 } })).ok
  )
  const move = await req("PATCH", `/rest/v1/enrollments?id=eq.${enrollmentId}`, {
    ...e,
    body: { course_id: "00000000-0000-4000-8000-000000000000" },
  })
  check("cannot move own enrollment to another course", !move.ok && JSON.stringify(move.json).includes("cannot be moved"))
  check(
    "cannot insert a fake paid transaction",
    !(
      await req("POST", "/rest/v1/transactions", {
        ...e,
        body: { learner_id: enrolled.id, course_id: COURSE, enrollment_id: enrollmentId, amount: 999999, status: "completed" },
      })
    ).ok
  )
  check(
    "can insert the matching free transaction",
    (
      await req("POST", "/rest/v1/transactions", {
        ...e,
        body: { learner_id: enrolled.id, course_id: COURSE, enrollment_id: enrollmentId, amount: 0, status: "free" },
      })
    ).ok
  )

  console.log("\n[owner admin]")
  const a = { token: admin.token }
  check("lessons readable", rows(await req("GET", `/rest/v1/lessons?id=${inLessons}&select=content`, a)).length === lessonIds.length)
  check("question_options incl. is_correct readable", rows(await req("GET", `/rest/v1/question_options?select=is_correct&limit=1`, a)).length === 1)
  check("question_explanations readable", rows(await req("GET", `/rest/v1/question_explanations?select=*`, a)).length > 0)
  check("learner attempts readable", rows(await req("GET", `/rest/v1/quiz_attempts?learner_id=eq.${enrolled.id}&select=id`, a)).length > 0)
  check("learner enrollments readable", rows(await req("GET", `/rest/v1/enrollments?id=eq.${enrollmentId}&select=id`, a)).length === 1)

  const objectName = `c-rls-${RUN}.png`
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  )
  const up = await fetch(`${URL_}/storage/v1/object/lesson-content/${objectName}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${admin.token}`, "Content-Type": "image/png" },
    body: png,
  })
  check("admin can upload to lesson-content", up.ok, `status ${up.status}`)
  const pub = await fetch(`${URL_}/storage/v1/object/public/lesson-content/${objectName}`)
  check("public URL of lesson image still serves", pub.ok, `status ${pub.status}`)
  const list = await req("POST", "/storage/v1/object/list/lesson-content", { body: { prefix: "", limit: 100 } })
  check("anon cannot list lesson-content bucket", denied(list), JSON.stringify(list.json).slice(0, 120))
  const listCert = await req("POST", "/storage/v1/object/list/certificate-assets", { body: { prefix: "certificates", limit: 100 } })
  check("anon cannot list certificate-assets bucket", denied(listCert))
  await req("DELETE", `/storage/v1/object/lesson-content`, { token: admin.token, body: { prefixes: [objectName] } })

  if (otherAdmin) {
    console.log("\n[non-owner admin]")
    const x = { token: otherAdmin.token }
    check("lessons_public lists lessons", rows(await req("GET", `/rest/v1/lessons_public?course_id=eq.${COURSE}`, x)).length === lessonIds.length)
    check("lesson content not readable", denied(await req("GET", `/rest/v1/lessons?id=${inLessons}&select=content`, x)))
    check("question_options not readable", denied(await req("GET", `/rest/v1/question_options?select=is_correct`, x)))
    check("learner attempts not readable", denied(await req("GET", `/rest/v1/quiz_attempts?learner_id=eq.${enrolled.id}&select=id`, x)))
  } else {
    console.log("\n[non-owner admin] skipped (no SUPABASE_SERVICE_ROLE_KEY)")
  }

  await req("DELETE", `/rest/v1/resources?id=eq.${resourceId}`, { token: admin.token })
}

async function cleanup() {
  if (!SERVICE) {
    if (created.length) console.log(`\n(no service-role key: left ${created.length} c-rls-* users behind)`)
    return
  }
  for (const u of created) {
    await req("DELETE", `/auth/v1/admin/users/${u.id}`, { key: SERVICE })
  }
}

try {
  await main()
} catch (err) {
  failures++
  console.error(`\nERROR ${err.message}`)
} finally {
  await cleanup()
}

console.log(`\n${passes} passed, ${failures} failed`)
process.exit(failures > 0 ? 1 : 0)
