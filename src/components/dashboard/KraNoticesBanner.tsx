'use client';

import { useMemo } from 'react';
import { NoticeCarousel, type NoticeItem } from '@bengo-hub/shared-ui-lib/announcements';
import { useKraNotices } from '@/hooks/use-kra-notices';

/** How long each notice stays up before the next one slides in. */
const ROTATE_MS = 15_000;

/**
 * KRA notices for the taxpayer, shown on the dashboard when the user signs in. The notices come
 * newest first with expired ones already removed (see useKraNotices); the shared NoticeCarousel
 * rotates them, lets each be dismissed, and remembers the dismissal per person on this device.
 * Renders nothing when KRA has no current notice.
 */
export function KraNoticesBanner({ tenant, viewerKey }: { tenant: string; viewerKey?: string }) {
  const notices = useKraNotices(tenant);
  const items: NoticeItem[] = useMemo(
    () =>
      notices.map((n) => {
        const posted = n.postedAt ? new Date(n.postedAt).toLocaleDateString() : '';
        return {
          id: `kra-${n.no}`,
          title: n.title,
          summary: n.content && n.content !== n.title ? n.content : undefined,
          tone: 'info',
          badge: 'KRA',
          cta: n.url ? { label: 'Read the full notice', href: n.url, external: true } : undefined,
          meta: [posted && `Posted ${posted}`, n.author].filter(Boolean).join(' by ') || undefined,
        };
      }),
    [notices],
  );

  return <NoticeCarousel notices={items} storageKey={`kra-notices-dismissed:${tenant}:${viewerKey ?? 'anon'}`} rotateMs={ROTATE_MS} />;
}
