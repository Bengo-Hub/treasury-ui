'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * A single per-row document action runner shared by every document list page. Each action
 * is supplied as a thunk that calls the relevant api fn with the row's resolved tenant
 * (so it works in both tenant-scoped and platform all-tenants modes). On success it
 * invalidates every document query family and toasts. Pages call `run(fn, successLabel)`.
 */
export function useDocRowAction() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ fn }: { fn: () => Promise<unknown>; label: string }) => fn(),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['platform-invoices'] });
      qc.invalidateQueries({ queryKey: ['platform-quotations'] });
      toast.success(vars.label);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Action failed'),
  });
  const run = useCallback(
    (fn: () => Promise<unknown>, label: string) => mutation.mutate({ fn, label }),
    [mutation],
  );
  return { run, isPending: mutation.isPending };
}
