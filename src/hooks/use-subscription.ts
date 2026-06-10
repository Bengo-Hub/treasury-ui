"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import type { SubscriptionInfo } from "@/lib/auth/subscription";
import { fetchSubscriptionInfo } from "@/lib/auth/subscription";
import { useSubscriptionStore } from "@/store/subscription";

export function useSubscription() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const subscriptionInfo = useAuthStore((s) => s.subscriptionInfo);
  const setSubscriptionInfo = useAuthStore((s) => s.setSubscriptionInfo);

  const subStore = useSubscriptionStore();

  const tenantId = (user as any)?.tenantId ?? (user as any)?.tenant_id ?? null;
  const tenantSlug = (user as any)?.tenantSlug ?? (user as any)?.tenant_slug ?? null;
  const roles = (((user as any)?.roles ?? []) as string[]).map((r) => String(r).toLowerCase());
  const isSuperuser = roles.includes("superuser") || roles.includes("super_admin");
  const isPlatformOwner = !!(user as any)?.isPlatformOwner || !!(user as any)?.is_platform_owner || isSuperuser || tenantSlug === "codevertex";
  const isServiceCharge = (user as any)?.billing_mode === "service_charge";
  const isDemo = !!(user as any)?.is_demo || tenantSlug === "codevertex-demo";
  const isExempt = isPlatformOwner || isDemo || isServiceCharge;

  // Hydrate store from IDB on auth
  useEffect(() => {
    if (status !== "authenticated" || !tenantSlug) return;
    useSubscriptionStore.getState().loadFromIDB(tenantSlug);
  }, [status, tenantSlug]);

  // Fetch from API once per session
  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken || !user) return;
    if (subscriptionInfo !== undefined) return;
    setSubscriptionInfo(null);

    if (!tenantId || isPlatformOwner) {
      const platformRaw = { plan: "ENTERPRISE", status: "ACTIVE", features: [], limits: {} };
      setSubscriptionInfo({ status: "active", planCode: "enterprise", planName: "Enterprise", features: [], limits: {} } as any);
      useSubscriptionStore.getState().setFromRaw(platformRaw, tenantSlug ?? "");
      return;
    }

    fetchSubscriptionInfo(tenantId, tenantSlug ?? "", session.accessToken)
      .then((info) => {
        const resolved = info ?? { status: "none", planCode: "", planName: "", features: [], limits: {} };
        setSubscriptionInfo(resolved as any);
        useSubscriptionStore.getState().setFromRaw(
          {
            plan: resolved.planCode || null,
            status: resolved.status || null,
            expiresAt: (resolved as any).currentPeriodEnd ?? (resolved as any).trialEndsAt ?? null,
            features: resolved.features,
            limits: resolved.limits,
          },
          tenantSlug ?? "",
        );
      })
      .catch(() => setSubscriptionInfo({ status: "none", planCode: "", planName: "", features: [], limits: {} } as any));
  }, [status, session?.accessToken, user, subscriptionInfo, setSubscriptionInfo, tenantId, tenantSlug, isPlatformOwner]);

  // Re-fetch when tab becomes visible (user returned from renewal/billing tab)
  const lastHiddenAt = useRef<number | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const REFRESH_AFTER_MS = 5 * 60 * 1000;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { lastHiddenAt.current = Date.now(); return; }
      if (document.visibilityState === "visible" && lastHiddenAt.current !== null) {
        const awayMs = Date.now() - lastHiddenAt.current;
        lastHiddenAt.current = null;
        if (awayMs >= REFRESH_AFTER_MS && tenantId && tenantSlug && session?.accessToken) {
          fetchSubscriptionInfo(tenantId, tenantSlug, session.accessToken)
            .then((info) => {
              if (!info) return;
              setSubscriptionInfo(info as any);
              useSubscriptionStore.getState().setFromRaw(
                { plan: info.planCode || null, status: info.status || null, expiresAt: info.currentPeriodEnd ?? info.trialEndsAt ?? null, features: info.features, limits: info.limits },
                tenantSlug,
              );
            })
            .catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [tenantId, tenantSlug, session?.accessToken, setSubscriptionInfo]);

  const info = subscriptionInfo as SubscriptionInfo | null | undefined;
  const subStatus = info?.status ?? null;

  return {
    info,
    status: subStatus,
    plan: info?.planCode ?? null,
    isActive: subStatus === "active" || subStatus === "trial" || isExempt,
    isPastDue: subStatus === "past_due" || subStatus === "suspended",
    isExpired: subStatus === "expired" || subStatus === "cancelled",
    needsSubscription: subStatus === "none" && !isExempt,
    isLoading: subscriptionInfo === null || subscriptionInfo === undefined,
    isPlatformOwner,
    isServiceCharge,
    isDemo,
    hasFeature: (code: string) => isExempt || (info?.features?.includes(code) ?? false),
    getLimit: (key: string) => (isExempt ? Infinity : (info?.limits?.[key] ?? Infinity)),
    store: subStore,
  };
}
