'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approvalsApi,
  type ApprovalModule,
  type ApprovalRequestListParams,
  type ApprovalRuleInput,
} from '@/lib/api/approvals';

const RULES_KEY = 'approval-rules';
const REQS_KEY = 'approval-requests';

// ─── Rules ────────────────────────────────────────────────────────────────────

export function useApprovalRules(tenant: string | undefined, module?: ApprovalModule) {
  return useQuery({
    queryKey: [RULES_KEY, tenant ?? '', module ?? 'all'],
    queryFn: () => approvalsApi.listRules(tenant!, module),
    enabled: !!tenant,
    staleTime: 30_000,
  });
}

export function useCreateApprovalRule(tenant: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApprovalRuleInput) => approvalsApi.createRule(tenant!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RULES_KEY, tenant ?? ''] }),
  });
}

export function useUpdateApprovalRule(tenant: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApprovalRuleInput }) =>
      approvalsApi.updateRule(tenant!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RULES_KEY, tenant ?? ''] }),
  });
}

export function useDeleteApprovalRule(tenant: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvalsApi.deleteRule(tenant!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RULES_KEY, tenant ?? ''] }),
  });
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export function useApprovalRequests(tenant: string | undefined, params?: ApprovalRequestListParams) {
  return useQuery({
    queryKey: [REQS_KEY, tenant ?? '', params ?? {}],
    queryFn: () => approvalsApi.listRequests(tenant!, params),
    enabled: !!tenant,
    staleTime: 15_000,
  });
}

/** Latest approval request for a specific document (invoice / expense / …), or undefined. */
export function useApprovalForObject(tenant: string | undefined, objectId: string | undefined) {
  return useQuery({
    queryKey: [REQS_KEY, tenant ?? '', 'object', objectId],
    queryFn: async () => {
      const rows = await approvalsApi.listRequests(tenant!, { object_id: objectId });
      return rows[0]; // server returns most-recent first
    },
    enabled: !!tenant && !!objectId,
    staleTime: 10_000,
  });
}

function invalidateRequests(tenant: string | undefined, qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [REQS_KEY, tenant ?? ''] });
}

export function useApproveRequest(tenant: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      approvalsApi.approve(tenant!, id, comment),
    onSuccess: () => invalidateRequests(tenant, qc),
  });
}

export function useRejectRequest(tenant: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      approvalsApi.reject(tenant!, id, comment),
    onSuccess: () => invalidateRequests(tenant, qc),
  });
}

/** Submit any treasury document (invoice/expense/…) for approval. */
export function useSubmitForApproval(tenant: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ module, objectId }: { module: ApprovalModule; objectId: string }) =>
      approvalsApi.submitForApproval(tenant!, module, objectId),
    onSuccess: () => {
      invalidateRequests(tenant, qc);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
