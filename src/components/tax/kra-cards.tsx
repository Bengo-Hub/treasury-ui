import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Reusable Tax & Compliance building blocks — centralize the checker/result/banner markup
 * that was re-inlined across ~10 tabs. Tone colors are the ONE place these live now.
 */

export type Tone = 'info' | 'success' | 'warning' | 'error';

const toneStyles: Record<Tone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: 'border-primary/30 bg-primary/5', icon: 'text-primary', Icon: Info },
  success: { box: 'border-green-600/30 bg-green-600/5', icon: 'text-green-600', Icon: CheckCircle2 },
  warning: { box: 'border-amber-500/30 bg-amber-500/5', icon: 'text-amber-600', Icon: AlertTriangle },
  error: { box: 'border-destructive/40 bg-destructive/5', icon: 'text-destructive', Icon: XCircle },
};

/** Tone-driven callout with an icon + title + body. Replaces the ad-hoc reconciliation/VAA/note banners. */
export function StatusBanner({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const t = toneStyles[tone];
  return (
    <div className={cn('rounded-lg border px-4 py-3', t.box, className)}>
      <div className="flex items-start gap-2">
        <t.Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.icon)} />
        <div className="min-w-0 text-xs">
          {title && <p className="font-semibold text-foreground">{title}</p>}
          {children && <div className="text-muted-foreground [&_strong]:text-foreground">{children}</div>}
        </div>
      </div>
    </div>
  );
}

/** Muted result block (the `rounded bg-muted p-3` cards) — pass a KeyValueList or free content. */
export function ResultCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-lg bg-muted p-3 text-sm', className)}>{children}</div>;
}

/** Label/value rows for a ResultCard. `value` renders bold; pass a node for custom (e.g. a Badge). */
export function KeyValueList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="space-y-1">
      {items.map((it, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-2">
          <dt className="font-medium text-muted-foreground">{it.label}:</dt>
          <dd className="font-medium text-foreground">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A KRA checker/action card: title + optional description, a form slot (inputs + action button),
 * and a result/error slot. Collapses the repeated "input + button + result card" checker blocks.
 */
export function KraCheckerCard({
  title,
  description,
  children,
  result,
  error,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  result?: ReactNode;
  error?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3 rounded-lg border p-4', className)}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result}
    </div>
  );
}
