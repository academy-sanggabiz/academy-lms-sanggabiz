/**
 * Validates a user-supplied post-login destination (e.g. the auth callback's
 * `?next=`). Only same-origin absolute paths are allowed: the value is later
 * concatenated onto the origin, so `@evil.com` or `.evil.com` would change
 * the host, and `//evil.com` / `/\evil.com` are protocol-relative in browsers.
 * Anything else yields `null` and the caller falls back to the role home page.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith("/")) return null
  if (next.startsWith("//") || next.startsWith("/\\")) return null
  // Control characters (tab/newline are stripped by URL parsers, which can
  // turn "/\t/evil.com" into "//evil.com").
  if (/[\u0000-\u001f\u007f]/.test(next)) return null
  try {
    const base = "http://same-origin.invalid"
    const resolved = new URL(next, base)
    if (resolved.origin !== base) return null
    return resolved.pathname + resolved.search + resolved.hash
  } catch {
    return null
  }
}
