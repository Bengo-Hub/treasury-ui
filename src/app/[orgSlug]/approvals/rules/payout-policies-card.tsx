'use client';

import { Card, CardContent } from '@/components/ui/base';
import { Select } from '@/components/ui/input';
import { approvalsApi, type PayoutFlow, type PayoutPolicy } from '@/lib/api/approvals';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const FLOWS: { flow: PayoutFlow; label: string; hint: string }[] = [
  { flow: 'disbursement', label: 'Payouts you start', hint: 'Single and bulk disbursements started by a person.' },
  { flow: 'escrow_release', label: 'Escrow releases', hint: 'Pot releases to beneficiaries and refunds on cancel. A pot can override this.' },
  { flow: 'settlement', label: 'Scheduled settlements', hint: 'Platform owner only: what the platform pays tenants.' },
  { flow: 'equity_payout', label: 'Equity payouts', hint: 'Platform owner only: holder payouts, scheduled and manual.' },
];

const LABELS: Record<PayoutPolicy, string> = {
  threshold: 'By amount (approval rules decide)',
  always: 'Always needs approval',
  auto: 'Automatic once its conditions are met',
};

/** How each payout flow goes through approval for this tenant. */
export function PayoutPoliciesCard({ tenant, canChange }: { tenant: string; canChange: boolean }) {
  const qc = useQueryClient();
  const key = ['payout-policies', tenant];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => approvalsApi.payoutPolicies(tenant), enabled: !!tenant });
  const save = useMutation({
    mutationFn: (v: { flow: PayoutFlow; policy: PayoutPolicy }) => approvalsApi.setPayoutPolicy(tenant, v.flow, v.policy),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success('Payout policy saved'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Could not save the policy'),
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Payout approval policy</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          &quot;By amount&quot; uses the payout rules below: below your minimum approval amount a payout goes out, above it waits for approval.
          A payout waiting for approval goes out on its next attempt once approved.
        </p>
        {isLoading || !data ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <div className="space-y-3">
            {FLOWS.map(({ flow, label, hint }) => {
              const options: PayoutPolicy[] = data.auto_capable.includes(flow) ? ['threshold', 'always', 'auto'] : ['threshold', 'always'];
              return (
                <div key={flow} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                  <Select
                    value={data.policies[flow]}
                    disabled={!canChange || save.isPending}
                    onChange={(e) => save.mutate({ flow, policy: e.target.value as PayoutPolicy })}
                  >
                    {options.map((p) => <option key={p} value={p}>{LABELS[p]}</option>)}
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
