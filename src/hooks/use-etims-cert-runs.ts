// API-triggered KRA OSCU certification runs (2026-09-16) — replaces hand-running
// scripts/kra_oscu_test_suite.py from a terminal with a trigger/history flow whose score and
// per-case results persist server-side (certification_runner.go). Mirrors use-tax.ts's
// useEtimsDevices/useInitEtimsDevice conventions exactly.
import * as taxApi from '@/lib/api/tax';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useEtimsCertRuns(tenantSlug: string) {
  return useQuery({
    queryKey: ['etims-cert-runs', tenantSlug],
    queryFn: () => taxApi.listEtimsCertRuns(tenantSlug),
    enabled: !!tenantSlug,
  });
}

// Polls every 5s while the run is pending/running (a full pass takes 1-3+ minutes with KRA's
// required human-paced cooldown between calls) and stops once it lands on a terminal status.
export function useEtimsCertRun(tenantSlug: string, runId: string | undefined) {
  return useQuery({
    queryKey: ['etims-cert-run', tenantSlug, runId],
    queryFn: () => taxApi.getEtimsCertRun(tenantSlug, runId as string),
    enabled: !!tenantSlug && !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.run.status;
      return status === 'pending' || status === 'running' ? 5000 : false;
    },
  });
}

export function useTriggerEtimsCertRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantSlug, body }: { tenantSlug: string; body: taxApi.TriggerCertRunRequest }) =>
      taxApi.triggerEtimsCertRun(tenantSlug, body),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ['etims-cert-runs', vars.tenantSlug] });
      toast.success('Certification run queued — it will start within a few seconds.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to start certification run'),
  });
}
