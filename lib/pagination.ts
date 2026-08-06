/**
 * Client-safe pagination helpers shared by every admin list. Deliberately has
 * no imports from lib/supabase/server -- Client Components (toolbars,
 * pagination controls) import this module directly, and that import chain
 * must never reach next/headers (see lib/courses.ts vs lib/courses-server.ts
 * for the same split elsewhere in the app).
 */

export type SortDir = "asc" | "desc"

export const PAGE_SIZES = [10, 25, 50, 100] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 25
export const MAX_Q_LENGTH = 100

export type RawSearchParams = Record<string, string | string[] | undefined>

export type ListParamSpec<F extends Record<string, string> = Record<string, never>> = {
  /** URL key prefix, for pages hosting more than one paginated list (e.g. "roster"). */
  prefix?: string
  sortable: readonly string[]
  defaultSort: string
  defaultDir?: SortDir
  defaultPageSize?: number
  /** Allowed values per filter; index 0 is the default. */
  filters?: { [K in keyof F]: readonly string[] }
}

export type ListParams<F extends Record<string, string> = Record<string, never>> = {
  page: number
  pageSize: number
  q: string
  sort: string
  dir: SortDir
  filters: F
}

export type Paginated<T> = {
  rows: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function rangeFor(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize
  return [from, from + pageSize - 1]
}

function keyFor(key: string, prefix?: string): string {
  return prefix ? `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key
}

function firstValue(raw: RawSearchParams, key: string): string | undefined {
  const value = raw[key]
  return Array.isArray(value) ? value[0] : value
}

/**
 * PostgREST's .or() filter list is comma-separated, and each filter's value
 * ends at the next comma -- so a comma in user input would split one filter
 * into two malformed ones. %/_ are ilike wildcards, and parens would break
 * out of the filter group. Strip all of them rather than trying to escape,
 * since none are meaningful in a name/email/title search. Promoted out of
 * lib/learners-admin.ts so every surface shares one sanitizer.
 */
export function escapeForOrFilter(value: string): string {
  return value.replace(/[,()%_\\]/g, " ").trim()
}

export function parseListParams<F extends Record<string, string>>(
  raw: RawSearchParams,
  spec: ListParamSpec<F>
): ListParams<F> {
  const prefix = spec.prefix

  const rawPage = Number(firstValue(raw, keyFor("page", prefix)))
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1

  const rawPageSize = Number(firstValue(raw, keyFor("pageSize", prefix)))
  const pageSize = (PAGE_SIZES as readonly number[]).includes(rawPageSize)
    ? rawPageSize
    : (spec.defaultPageSize ?? DEFAULT_PAGE_SIZE)

  const rawQ = firstValue(raw, keyFor("q", prefix)) ?? ""
  const q = escapeForOrFilter(rawQ).slice(0, MAX_Q_LENGTH)

  const rawSort = firstValue(raw, keyFor("sort", prefix))
  const sort = rawSort && spec.sortable.includes(rawSort) ? rawSort : spec.defaultSort

  const rawDir = firstValue(raw, keyFor("dir", prefix))
  const dir: SortDir = rawDir === "asc" || rawDir === "desc" ? rawDir : (spec.defaultDir ?? "desc")

  const filters = {} as F
  if (spec.filters) {
    for (const key of Object.keys(spec.filters) as (keyof F)[]) {
      const allowed = spec.filters[key]
      const rawValue = firstValue(raw, keyFor(String(key), prefix))
      filters[key] = (rawValue && allowed.includes(rawValue) ? rawValue : allowed[0]) as F[keyof F]
    }
  }

  return { page, pageSize, q, sort, dir, filters }
}

export function paginated<T>(
  rows: T[],
  count: number | null,
  p: { page: number; pageSize: number }
): Paginated<T> {
  const total = count ?? 0
  return {
    rows,
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  }
}

/** Page-number window with ellipsis markers, e.g. [1,"…",4,5,6,"…",20]. */
export function pageWindow(page: number, totalPages: number, span = 1): (number | "…")[] {
  if (totalPages <= 1) return [1]

  const pages = new Set<number>([1, totalPages, page])
  for (let i = 1; i <= span; i++) {
    if (page - i >= 1) pages.add(page - i)
    if (page + i <= totalPages) pages.add(page + i)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | "…")[] = []
  let prev = 0
  for (const n of sorted) {
    if (prev && n - prev > 1) result.push("…")
    result.push(n)
    prev = n
  }
  return result
}
