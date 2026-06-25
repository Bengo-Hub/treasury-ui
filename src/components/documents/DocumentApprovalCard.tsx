'use client';

/**
 * DocumentApprovalCard — surfaces the centralized-approval state of a single
 * treasury document (invoice / expense / bill / …) and exposes the
 * Submit-for-approval / Approve / Reject actions, gated on treasury permissions.
 *
 * Reused on any document detail/drawer surface. It self-resolves the latest
 * approval request for the document via useApprovalForObject, so callers only
 * need to pass the tenant, the document id and its approval module.
 */

import { Badge } from '@/components/ui/base';
import {
  useApprovalForObject,
  useApproveRequest,
  useRejectRequest,
  useSubmitForApproval,
} from '@/hooks/useApprovals';
import { roleLabel } from '@/lib/documents/approvals';
import type { ApprovalModule } from '@/lib/api/approvals';
import { useAuthStore } from '@/store/auth';
import { userHasPermission } from '@/lib/auth/permissions';
import { CheckCircle2, Loader2, ShieldCheck, Send, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'outline',
};

function errMsg(e: unknown, fallback: string): string {
  const resp = (e as { response?: { data?: { message?: string; error?: string } } })?.response;
  return resp?.data?.message || resp?.data?.error || fallback;
}

interface Props {
  tenant: string | undefined;
  module: ApprovalModule;
  documentId: string;
  /** Display reference (e.g. invoice number) used when submitting. */
  documentReference?: string;
  className?: string;
}

export function DocumentApprovalCard({ tenant, module, documentId, className }: Props) {
  const { data: request, isLoading } = useApprovalForObject(tenant, documentId);
  const submit = useSubmitForApproval(tenant);
  const approve = useApproveRequest(tenant);
  const reject = useRejectRequest(tenant);
  const [comment, setComment] = useState('');

  const user = useAuthStore((s) => s.user) as Parameters<typeof userHasPermission>[0];
  // Submitting / acting on approvals is gated on the same permission the backend
  // requires: approvals.* (with .change/.manage) or invoices.change.
  const canAct = userHasPermission(
    user,
    [
      'treasury.approvals.change',
      'treasury.approvals.manage',
      'treasury.approvals.add',
      'treasury.invoices.change',
      'treasury.invoices.manage',
    ],
    'or',
  );

  const isBusy = submit.isPending || approve.isPending || reject.isPending;

  function handleSubmit() {
    submit.mutate(
      { module, objectId: documentId },
      {
        onSuccess: (res) => {
          toast.success(res.approval_required ? 'Submitted for approval' : (res.message ?? 'No approval required — auto-approved'));
        },
        onError: (e) => toast.error(errMsg(e, 'Failed to submit for approval')),
      },
    );
  }

  function handleApprove() {
    if (!request) return;
    approve.mutate(
      { id: request.id, comment: comment.trim() || undefined },
      {
        onSuccess: () => { toast.success('Approved'); setComment(''); },
        onError: (e) => toast.error(errMsg(e, 'Failed to approve')),
      },
    );
  }

  function handleReject() {
    if (!request) return;
    reject.mutate(
      { id: request.id, comment: comment.trim() || undefined },
      {
        onSuccess: () => { toast.success('Rejected'); setComment(''); },
        onError: (e) => toast.error(errMsg(e, 'Failed to reject')),
      },
    );
  }

  if (isLoading) return null;

  // Most recent approver, if the document has been approved.
  const approver =
    request?.status === 'approved'
      ? (request.actions ?? []).filter((a) => a.status === 'approved').slice(-1)[0]?.acted_by
      : undefined;

  return (
    <div className={['rounded-xl border border-border bg-card shadow-sm p-5', className].filter(Boolean).join(' ')}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Approval
        </h3>
        {request ? (
          <Badge variant={STATUS_VARIANT[request.status] ?? 'default'}>
            {request.status === 'pending' ? 'pending approval' : request.status}
          </Badge>
        ) : (
          <Badge variant="outline">not submitted</Badge>
        )}
      </div>

      {/* No request yet → offer Submit for approval. */}
      {!request && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            This document has not been submitted for approval. If a matching approval rule exists it will route through sign-off; otherwise it proceeds normally.
          </p>
          {canAct && (
            <button
              onClick={handleSubmit}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit for Approval
            </button>
          )}
        </div>
      )}

      {/* Request exists → show status, step trail, approver and approve/reject. */}
      {request && (
        <div className="space-y-3">
          {request.status === 'pending' && request.current_step && (
            <p className="text-xs text-muted-foreground">
              Awaiting <span className="font-semibold text-foreground">{request.current_step.name}</span> · {roleLabel(request.current_step.approver_role)}
            </p>
          )}
          {approver && (
            <p className="text-xs text-emerald-600">Approved by <span className="font-semibold">{approver}</span></p>
          )}

          {(request.actions ?? []).length > 0 && (
            <ol className="space-y-1.5">
              {(request.actions ?? []).map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-xs">
                  {a.status === 'approved' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : a.status === 'rejected' ? (
                    <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  ) : (
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-muted-foreground/40 text-[9px] shrink-0">{a.sequence}</span>
                  )}
                  <span className="text-foreground">{a.name || `Step ${a.sequence}`}</span>
                  <span className="text-muted-foreground">· {roleLabel(a.approver_role)}</span>
                  {a.acted_by && <span className="text-muted-foreground/70 ml-auto">{a.acted_by}</span>}
                </li>
              ))}
            </ol>
          )}

          {request.status === 'pending' && canAct && (
            <div className="space-y-2 pt-1">
              <textarea
                placeholder="Optional comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
