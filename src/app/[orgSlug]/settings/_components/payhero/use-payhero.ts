'use client';

import { payheroApi, type PayHeroStatus } from '@/lib/api/payhero';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const payheroKey = (tenant: string) => ['payhero', tenant] as const;

export const errMessage = (e: any, fallback: string) =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

export function usePayHeroStatus(tenant: string) {
  return useQuery<PayHeroStatus>({ queryKey: payheroKey(tenant), queryFn: () => payheroApi.status(tenant), enabled: !!tenant });
}

/** A PayHero write that stores the returned setup and toasts the outcome. */
export function usePayHeroMutation<T>(tenant: string, fn: (v: T) => Promise<PayHeroStatus>, ok: string, fail: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (d: PayHeroStatus) => {
      qc.setQueryData(payheroKey(tenant), d);
      toast.success(ok);
    },
    onError: (e: any) => toast.error(errMessage(e, fail)),
  });
}

export const MODES = [
  { value: 'platform_team', label: 'Own Team', badge: 'Recommended', hint: 'Your own PayHero Team and wallet under the platform account. Needed for escrow.' },
  { value: 'platform_root', label: 'Shared platform account', hint: 'Your channels sit on the platform account. No wallet of your own.' },
  { value: 'own_account', label: 'Own PayHero account', hint: 'Use the API keys of your own PayHero account.' },
] as const;

export const modeLabel = (mode?: string) => MODES.find((m) => m.value === mode)?.label ?? mode ?? '';
