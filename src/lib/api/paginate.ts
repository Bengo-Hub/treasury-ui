import { apiClient } from './client';

/**
 * Canonical list-page envelope emitted by the shared Go `pagination` lib
 * (`pagination.NewResponse`): { data, total, limit, page, hasMore }. `hasMore` is the
 * authoritative "another page exists" signal — the UI must key off it, not re-derive it.
 */
export interface PageEnvelope<T> {
  data?: T[];
  total?: number;
  hasMore?: boolean;
}

/** One materialized page: rows + whether the backend says more remain. */
export interface Page<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

/**
 * paginateAll — page through ANY shared-pagination source until it is exhausted, concatenating
 * every row. The backend clamps a page at MaxLimit=100, so any "load the whole directory" read
 * MUST paginate; this is the ONE helper that does it, so every caller stays in lock-step with the
 * backend envelope (drives off `hasMore`, falls back to total, and stops on a short page).
 * `maxPages` is a hard backstop so a runaway `hasMore` can never loop forever.
 */
export async function paginateAll<T>(
  fetchPage: (limit: number, offset: number) => Promise<Page<T>>,
  pageSize = 100,
  maxPages = 200,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const { data, total, hasMore } = await fetchPage(pageSize, page * pageSize);
    all.push(...data);
    const more = hasMore ?? all.length < total;
    if (data.length < pageSize || !more) break;
  }
  return all;
}

/**
 * fetchAllViaApiClient — paginateAll specialized to a treasury-api list endpoint reached through
 * the shared apiClient (Bearer + tenant handled there). Tolerates a bare-array (non-paginated)
 * response by treating it as a single complete page.
 */
export async function fetchAllViaApiClient<T>(
  path: string,
  params: Record<string, unknown> = {},
  pageSize = 100,
): Promise<T[]> {
  return paginateAll<T>(async (limit, offset) => {
    const res = await apiClient.get<PageEnvelope<T> | T[]>(path, { ...params, limit, offset });
    if (Array.isArray(res)) return { data: res, total: res.length, hasMore: false };
    const data = res.data ?? [];
    return { data, total: Number(res.total ?? data.length), hasMore: res.hasMore ?? false };
  }, pageSize);
}
