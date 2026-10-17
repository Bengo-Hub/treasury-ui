// KRA eTIMS notices for the dashboard banner: parsing, expiry, ordering and the one week cache.
// Pure functions, no React, so the rules are unit tested.

/** A notice is re-fetched from KRA only when the cached copy is older than this. */
export const NOTICE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * KRA notices carry no end date in the selectNotices payload (noticeNo, title, cont, dtlUrl,
 * regrNm, regDt). When the payload does carry one it wins; otherwise a notice stops showing this
 * many days after it was registered.
 */
export const NOTICE_FALLBACK_DAYS = 30;

export interface KraNotice {
  no: number;
  title: string;
  content: string;
  url?: string;
  author?: string;
  /** ISO time the notice was registered at KRA; empty when KRA sent an unreadable date. */
  postedAt: string;
  /** ISO time after which the notice is no longer shown. */
  expiresAt: string;
}

const END_DATE_KEYS = ['endDt', 'expDt', 'expireDt', 'dispEndDt', 'noticeEndDt', 'validTo'];

/** Reads KRA's yyyyMMdd or yyyyMMddHHmmss stamp (East Africa Time, UTC+3) into a Date. */
export function parseKraDate(raw: unknown): Date | null {
  const s = String(raw ?? '').trim();
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', se = '00'] = m;
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 3, Number(mi), Number(se));
  return Number.isNaN(t) ? null : new Date(t);
}

/** Turns a selectNotices response into notices, newest first, each with its expiry. */
export function parseNotices(res: unknown): KraNotice[] {
  const data = (res as { data?: { noticeList?: unknown } } | undefined)?.data;
  const list = Array.isArray(data?.noticeList) ? (data!.noticeList as Record<string, unknown>[]) : [];
  const out: KraNotice[] = [];
  for (const n of list) {
    const title = String(n.title ?? '').trim();
    const content = String(n.cont ?? '').trim();
    if (!title && !content) continue;
    const posted = parseKraDate(n.regDt);
    let expires: Date | null = null;
    for (const k of END_DATE_KEYS) {
      expires = parseKraDate(n[k]);
      if (expires) break;
    }
    if (!expires && posted) expires = new Date(posted.getTime() + NOTICE_FALLBACK_DAYS * 86_400_000);
    out.push({
      no: Number(n.noticeNo) || 0,
      title: title || content.slice(0, 80),
      content,
      url: typeof n.dtlUrl === 'string' && n.dtlUrl ? n.dtlUrl : undefined,
      author: typeof n.regrNm === 'string' && n.regrNm ? n.regrNm : undefined,
      postedAt: posted ? posted.toISOString() : '',
      // A notice with no readable dates at all cannot be aged out; keep it for the cache window.
      expiresAt: expires ? expires.toISOString() : '',
    });
  }
  return sortNewestFirst(out);
}

export function sortNewestFirst(list: KraNotice[]): KraNotice[] {
  return [...list].sort((a, b) => {
    const ta = a.postedAt ? Date.parse(a.postedAt) : 0;
    const tb = b.postedAt ? Date.parse(b.postedAt) : 0;
    return tb - ta || b.no - a.no;
  });
}

/** Drops notices whose expiry has passed. A notice with no expiry date is kept. */
export function activeNotices(list: KraNotice[], now: number = Date.now()): KraNotice[] {
  return sortNewestFirst(list).filter((n) => !n.expiresAt || Date.parse(n.expiresAt) > now);
}

interface CacheEntry {
  fetchedAt: number;
  notices: KraNotice[];
}

const cacheKey = (tenant: string) => `kra-notices:v1:${tenant}`;

/** The cached notices for a tenant, or null when none or older than a week. */
export function readNoticeCache(tenant: string, now: number = Date.now()): CacheEntry | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(tenant));
    if (!raw) return null;
    const e = JSON.parse(raw) as CacheEntry;
    if (!e || typeof e.fetchedAt !== 'number' || !Array.isArray(e.notices)) return null;
    return now - e.fetchedAt < NOTICE_CACHE_MS ? e : null;
  } catch {
    return null;
  }
}

export function writeNoticeCache(tenant: string, notices: KraNotice[], now: number = Date.now()): void {
  try {
    window.localStorage.setItem(cacheKey(tenant), JSON.stringify({ fetchedAt: now, notices } satisfies CacheEntry));
  } catch {
    // Storage can be full or blocked; the banner still works from the in-memory query cache.
  }
}
