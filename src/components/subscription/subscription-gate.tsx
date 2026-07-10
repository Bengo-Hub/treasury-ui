"use client";

import type { ReactNode } from "react";

import { FeatureLock, type FeatureLockMode } from "@bengo-hub/shared-ui-lib/subscription";

interface SubscriptionGateProps {
  /** Feature code required (e.g. "invoice_generation", "reconciliation") */
  feature?: string;
  /** Minimum plan required (e.g. "growth", "professional") — kept for signature compatibility */
  plan?: string;
  /**
   * How the lock renders: "block" (default) replaces a whole page/section with an upgrade
   * CTA card; "overlay" dims the content and intercepts clicks (good for a single form field
   * or button); "badge" shows content inline with a small "🔒 <tier>" chip (nav items).
   */
  mode?: FeatureLockMode;
  /** Content to render (always rendered — locked content shows an upgrade CTA instead of hiding) */
  children: ReactNode;
  /** Kept for signature compatibility; the shared FeatureLock upgrade CTA supersedes it */
  fallback?: ReactNode;
}

/**
 * Wraps content that requires a specific subscription feature.
 *
 * Show-don't-hide gating: delegates to the shared <FeatureLock>, which renders children as-is
 * (no badge, no banner) when the plan includes the feature — or the tenant is exempt / entitlements
 * are still loading — and otherwise shows an upgrade CTA naming the tier that unlocks the feature,
 * deep-linking to the pricing page.
 */
export function SubscriptionGate({
  feature,
  plan: _plan,
  mode = "block",
  children,
  fallback: _fallback,
}: SubscriptionGateProps) {
  if (!feature) return <>{children}</>;
  return (
    <FeatureLock feature={feature} mode={mode}>
      {children}
    </FeatureLock>
  );
}
