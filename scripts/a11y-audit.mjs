// WCAG 2.2 A/AA audit of every main page with axe-core, run in a real browser.
//
//   npm run build && npm run start          (in another terminal)
//   AUDIT_LEARNER_EMAIL=... AUDIT_LEARNER_PASSWORD=... \
//   AUDIT_ADMIN_EMAIL=... AUDIT_ADMIN_PASSWORD=... npm run audit:a11y
//
// Needs Playwright with Chromium (`npm i -D playwright && npx playwright
// install chromium` if it is not installed globally). Exits with code 1 when
// any page has a violation, so it can gate a release (definition of done in
// docs/V2-UPGRADE.md). Automated checks find only part of the barriers: keep
// the manual keyboard and screen-reader pass as well.

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

// require() rather than import: it also honours NODE_PATH, so a globally
// installed Playwright works as well as a project-local one.
const require = createRequire(import.meta.url)
const { chromium } = require("playwright")
const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8")
const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3000"
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

const results = []

async function audit(page, name) {
  await page.addScriptTag({ content: AXE_SOURCE })
  const violations = await page.evaluate(
    async (tags) =>
      (await window.axe.run(document, { runOnly: { type: "tag", values: tags } })).violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target.join(" ")),
      })),
    TAGS
  )
  results.push({ name, violations })
  const mark = violations.length === 0 ? "ok  " : "FAIL"
  console.log(`${mark} ${name}${violations.map((v) => `\n       ${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]}`).join("")}`)
}

async function visit(page, path) {
  await page.goto(BASE + path)
  await page.waitForLoadState("networkidle").catch(() => {})
  await audit(page, path)
}

async function login(browser, loginPath, email, password) {
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage()
  await page.goto(BASE + loginPath)
  await page.fill("input[name=email]", email)
  await page.fill("input[name=password]", password)
  await page.click("button[type=submit]")
  await page.waitForURL(/dashboard/, { timeout: 20000 })
  return page
}

const browser = await chromium.launch()
try {
  const anon = await (await browser.newContext()).newPage()
  for (const path of ["/", "/auth/login", "/auth/learner/signup", "/auth/admin/login"]) await visit(anon, path)

  const { AUDIT_LEARNER_EMAIL, AUDIT_LEARNER_PASSWORD, AUDIT_ADMIN_EMAIL, AUDIT_ADMIN_PASSWORD } = process.env

  if (AUDIT_LEARNER_EMAIL && AUDIT_LEARNER_PASSWORD) {
    const page = await login(browser, "/auth/login", AUDIT_LEARNER_EMAIL, AUDIT_LEARNER_PASSWORD)
    for (const path of [
      "/learner/dashboard",
      "/learner/courses",
      "/learner/purchase",
      "/learner/profile",
      "/learner/settings",
      "/learner/notifications",
    ])
      await visit(page, path)
    await page.goto(BASE + "/learner/courses")
    const courseHref = await page.locator('a[href^="/learner/courses/"]').first().getAttribute("href").catch(() => null)
    if (courseHref) {
      await visit(page, courseHref)
      await visit(page, courseHref.replace("/learner/courses/", "/learn/"))
    }
  } else {
    console.log("skip learner pages (set AUDIT_LEARNER_EMAIL / AUDIT_LEARNER_PASSWORD)")
  }

  if (AUDIT_ADMIN_EMAIL && AUDIT_ADMIN_PASSWORD) {
    const page = await login(browser, "/auth/admin/login", AUDIT_ADMIN_EMAIL, AUDIT_ADMIN_PASSWORD)
    for (const path of [
      "/admin/dashboard",
      "/admin/courses",
      "/admin/learners",
      "/admin/purchases",
      "/admin/grading",
      "/admin/tracking",
      "/admin/landing",
      "/admin/settings",
      "/admin/profile",
    ])
      await visit(page, path)
    await page.goto(BASE + "/admin/courses")
    const editHref = await page.locator('a[href$="/edit"]').first().getAttribute("href").catch(() => null)
    if (editHref) {
      await visit(page, editHref)
      for (const tab of ["Pelajaran", "Pengaturan", "Peserta", "Pratinjau"]) {
        await page.click(`[role=tab]:has-text("${tab}")`)
        await page.waitForTimeout(500)
        await audit(page, `${editHref} [${tab}]`)
      }
    }
  } else {
    console.log("skip admin pages (set AUDIT_ADMIN_EMAIL / AUDIT_ADMIN_PASSWORD)")
  }
} finally {
  await browser.close()
}

const failed = results.filter((r) => r.violations.length > 0)
console.log(`\n${results.length - failed.length}/${results.length} pages without WCAG 2.2 A/AA violations`)
process.exit(failed.length > 0 ? 1 : 0)
