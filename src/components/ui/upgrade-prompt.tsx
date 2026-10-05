'use client';

import { Lock, Zap } from 'lucide-react';
import Link from 'next/link';

const SUBSCRIBE_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || 'https://pricing.codevertexafrica.com';

/** A plan-locked feature: what it does and the upgrade link. One look for every locked page. */
export function UpgradePrompt({ title, description, cta = 'Upgrade to Growth' }: { title: string; description: string; cta?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="size-6 text-primary" />
      </div>
      <div className="max-w-sm space-y-1.5">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        href={`${SUBSCRIBE_URL}/plans?service=complete`}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Zap className="size-4" />
        {cta}
      </Link>
    </div>
  );
}
