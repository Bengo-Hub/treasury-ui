'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone } from 'lucide-react';
import { useKraNotices } from '@/hooks/use-kra-notices';
import { cn } from '@/lib/utils';

/** How long each notice stays up before the banner moves to the next one. */
const ROTATE_MS = 8000;

/**
 * KRA notices for the taxpayer, shown on the dashboard when the user signs in. With more than one
 * notice the banner advances by itself (paused while the pointer is over it); the newest notice
 * comes first and expired ones never show. Renders nothing when KRA has no current notice.
 */
export function KraNoticesBanner({ tenant }: { tenant: string }) {
  const notices = useKraNotices(tenant);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = notices.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;
  const current = notices[index % count];
  const posted = current.postedAt ? new Date(current.postedAt) : null;

  return (
    <section
      aria-label="KRA notices"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300">
            KRA notice{count > 1 ? ` ${(index % count) + 1} of ${count}` : ''}
            {posted && <span className="ml-2 font-normal normal-case text-muted-foreground">{posted.toLocaleDateString()}</span>}
          </p>
          <p className="text-sm font-semibold">{current.title}</p>
          {current.content && current.content !== current.title && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{current.content}</p>
          )}
          {current.url && (
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline dark:text-sky-300"
            >
              Read the full notice <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {count > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Previous notice"
              onClick={() => setIndex((i) => (i - 1 + count) % count)}
              className="rounded-md p-1 hover:bg-sky-500/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              {notices.map((n, i) => (
                <button
                  key={n.no || i}
                  type="button"
                  aria-label={`Show notice ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn('h-1.5 w-1.5 rounded-full', i === index % count ? 'bg-sky-600' : 'bg-sky-600/30')}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next notice"
              onClick={() => setIndex((i) => (i + 1) % count)}
              className="rounded-md p-1 hover:bg-sky-500/20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
