"use client";

import type { ReactNode } from "react";

import { FeatureLock } from "@bengo-hub/shared-ui-lib/subscription";

interface SubscriptionGateProps {
  /** Feature code required (e.g. "invoice_generation", "reconciliation") */
  feature?: string;
  /** Minimum plan required (e.g. "growth", "professional") — kept for signature compatibility */
  plan?: string;
  /** Content to render (always rendered — locked content shows an upgrade CTA instead of hiding) */
  children: ReactNode;
  /** Kept for signature compatibility; the shared FeatureLock upgrade CTA supersedes it */
  fallback?: ReactNode;
}

/**
 * Wraps content that requires a specific subscription feature.
 *
 * Show-don't-hide gating: delegates to the shared <FeatureLock mode="block">, which renders
 * children as-is when the plan includes the feature (or the tenant is exempt / entitlements
 * are still loading), and otherwise shows an upgrade CTA that opens an UpgradeDialog naming
 * the tier that unlocks the feature, deep-linking to the pricing page.
 */
export function SubscriptionGate({
  feature,
  plan: _plan,
  children,
  fallback: _fallback,
}: SubscriptionGateProps) {
  if (!feature) return <>{children}</>;
  return (
    <FeatureLock feature={feature} mode="block">
      {children}
    </FeatureLock>
  );
}
