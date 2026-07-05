'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import {
  useApprovalRequests,
  useApproveRequest,
  useRejectRequest,
  useRequestApprovalOtp,
} from '@/hooks/useApprovals';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { MODULE_LABEL, roleLabel } from '@/lib/documents/approvals';
import type { ApprovalRequest, ApprovalRequestStatus } from '@/lib/api/approvals';
import { AlertTriangle, CheckCircle2, ClipboardList, Inbox, ShieldCheck, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'outline',
};

type Tab = 'inbox' | 'pending' | 'all';

// Money-movement modules whose approval requires the emailed OTP second factor (REQ-004).
// Mirrors treasury-api approvals.OTPRequired.
const OTP_MODULES = new Set(['payout', 'vendor_bill', 'expense']);

export default function ApprovalsInboxPage() {
  const { orgSlug, tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const tenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : (tenantPathId ?? orgSlug);
  const [tab, setTab] = useState<Tab>('inbox');
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [comment, setComment] = useState('');

  const listParams =
    tab === 'inbox'
      ? { inbox: true }
      : tab === 'pending'
      ? { status: 'pending' as ApprovalRequestStatus }
      : {};
  const { data: requests, isLoading, isError, refetch } = useApprovalRequests(tenant, listParams);

  const approve = useApproveRequest(tenant);
  const reject = useRejectRequest(tenant);
  const requestOtp = useRequestApprovalOtp(tenant);
  const isActing = approve.isPending || reject.isPending;

  // OTP second factor for money-movement approvals (payout / vendor bill / expense).
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  function closeDetail() {
    setSelected(null);
    setComment('');
    setOtpCode('');
    setOtpSent(false);
  }

  function handleSendOtp(req: ApprovalRequest) {
    requestOtp.mutate(req.id, {
      onSuccess: (res) => {
        setOtpSent(true);
        toast.success(`Code sent by ${res.channel} — valid for ${res.expires_minutes} minutes`);
      },
      onError: (e: unknown) => toast.error(errMsg(e, 'Failed to send the OTP code')),
    });
  }

  function handleApprove(req: ApprovalRequest) {
    const needsOtp = OTP_MODULES.has(req.module);
    if (needsOtp && !otpCode.trim()) {
      toast.error('Enter the OTP code sent to your email — approving this moves money.');
      return;
    }
    approve.mutate(
      { id: req.id, comment: comment.trim() || undefined, otpCode: needsOtp ? otpCode.trim() : undefined },
      {
        onSuccess: () => {
          toast.success('Step approved');
          closeDetail();
        },
        onError: (e: unknown) => toast.error(errMsg(e, 'Failed to approve')),
      },
    );
  }

  function handleReject(req: ApprovalRequest) {
    reject.mutate(
      { id: req.id, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Request rejected');
          closeDetail();
        },
        onError: (e: unknown) => toast.error(errMsg(e, 'Failed to reject')),
      },
    );
  }

  const rows = requests ?? [];

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" /> Approvals
            </h1>
            <p className="text-muted-foreground mt-1">Review and sign off on documents awaiting approval across invoicing, expenses, payables &amp; more</p>
          </div>
          <Link href={`/${orgSlug}/approvals/rules`}>
            <Button variant="outline"><ClipboardList className="h-4 w-4 mr-2" /> Approval Rules</Button>
          </Link>
        </div>

        <div className="flex gap-2">
          {([
            ['inbox', 'My Inbox'],
            ['pending', 'All Pending'],
            ['all', 'All'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
                (tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted')
              }
            >
              {label}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Document</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Awaiting</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading approvals...</td></tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <AlertTriangle className="h-10 w-10 mx-auto text-destructive/60 mb-3" />
                        <p className="text-muted-foreground">Couldn&apos;t load approvals</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Retry</Button>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">
                          {tab === 'inbox' ? 'Nothing awaiting your approval' : 'No approval requests'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((req) => (
                      <tr
                        key={req.id}
                        className="hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => { setSelected(req); setComment(''); }}
                      >
                        <td className="px-6 py-4 font-mono text-xs font-medium">{req.object_reference || req.object_id.slice(0, 8)}</td>
                        <td className="px-6 py-4">{MODULE_LABEL[req.module] ?? req.module}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{req.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {req.status === 'pending' && req.current_step
                            ? `${req.current_step.name} · ${roleLabel(req.current_step.approver_role)}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={STATUS_VARIANT[req.status] ?? 'default'}>{req.status}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative z-50 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.object_reference || 'Approval Request'}</h2>
                    <p className="text-sm text-muted-foreground">
                      {MODULE_LABEL[selected.module] ?? selected.module} · {selected.amount.toLocaleString()}
                    </p>
                  </div>
                  <button onClick={closeDetail} className="p-1 rounded-lg hover:bg-accent transition-colors">
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step trail */}
                <ol className="space-y-2">
                  {(selected.actions ?? []).map((a) => {
                    const isCurrent = selected.status === 'pending' && a.sequence === selected.current_sequence;
                    return (
                      <li
                        key={a.id}
                        className={
                          'flex items-start gap-3 p-3 rounded-lg border ' +
                          (isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border')
                        }
                      >
                        <div className="mt-0.5">
                          {a.status === 'approved' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : a.status === 'rejected' ? (
                            <XCircle className="h-4 w-4 text-rose-500" />
                          ) : (
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px]">{a.sequence}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{a.name || `Step ${a.sequence}`}</p>
                          <p className="text-xs text-muted-foreground">{roleLabel(a.approver_role)}</p>
                          {a.acted_by && a.status === 'approved' && (
                            <p className="text-[11px] text-emerald-600 mt-0.5">Approved by {a.acted_by}</p>
                          )}
                          {a.comment && <p className="text-xs italic mt-1">&ldquo;{a.comment}&rdquo;</p>}
                        </div>
                        <Badge variant={STATUS_VARIANT[a.status] ?? 'outline'} className="shrink-0">{a.status}</Badge>
                      </li>
                    );
                  })}
                </ol>

                {selected.status === 'pending' ? (
                  <>
                    <textarea
                      placeholder="Optional comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none resize-none"
                    />
                    {OTP_MODULES.has(selected.module) && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                        <p className="text-xs text-amber-800 font-medium">
                          Approving this {MODULE_LABEL[selected.module] ?? selected.module} moves money — a one-time code is required.
                        </p>
                        <div className="flex gap-2">
                          <input
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit code"
                            inputMode="numeric"
                            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tracking-widest focus:ring-1 focus:ring-ring focus:outline-none"
                          />
                          <Button variant="outline" disabled={requestOtp.isPending} onClick={() => handleSendOtp(selected)}>
                            {requestOtp.isPending ? 'Sending…' : otpSent ? 'Resend code' : 'Email me a code'}
                          </Button>
                        </div>
                        <p className="text-[11px] text-amber-700">
                          The code is valid for 5 minutes and locks after 3 wrong attempts.
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={isActing}
                        onClick={() => handleReject(selected)}
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                      <Button className="flex-1" disabled={isActing} onClick={() => handleApprove(selected)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      You can only approve a step your role is assigned to.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-center text-muted-foreground">
                    This request is <span className="font-medium">{selected.status}</span>.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function errMsg(e: unknown, fallback: string): string {
  const resp = (e as { response?: { data?: { message?: string; error?: string } } })?.response;
  return resp?.data?.message || resp?.data?.error || fallback;
}
