"use client"

import { useEffect, useState } from "react"
import DOMPurify from "dompurify"

/**
 * Renders admin-authored HTML (lesson content, quiz prompts, landing page
 * copy) sanitized with DOMPurify. Sanitization is deferred to a client-only
 * effect rather than running during render: DOMPurify needs `window`, and
 * both Server Components and the initial SSR pass every "use client"
 * component also gets have none. jsdom, the usual server-side substitute for
 * DOMPurify (see isomorphic-dompurify), doesn't run on the Cloudflare
 * Workers runtime this app deploys to -- same constraint documented on
 * SubmissionPreviewDialog's identical use of DOMPurify for learner-authored
 * essay answers. Renders nothing until the effect runs, so the untrusted
 * HTML is never present in the server-rendered markup at all -- only
 * injected after DOMPurify has actually run, in the browser.
 */
export function SanitizedHtml({ html, className }: { html: string; className?: string }) {
  const [clean, setClean] = useState<string | null>(null)

  // DOMPurify is a browser-only API (needs `window`), so this can't move into
  // a lazy useState initializer either -- that also runs during SSR. Same
  // documented exception useDraftAutosave.ts uses for its own browser-only
  // (localStorage) read: syncing from a client-only external capability on
  // mount, not syncing from React state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClean(DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }))
  }, [html])

  if (clean === null) return null
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
}
