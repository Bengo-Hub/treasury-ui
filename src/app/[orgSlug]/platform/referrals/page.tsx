'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RowActionMenu, type RowAction } from '@/components/ui/action-menu';
import { HolderFormModal } from '@/components/platform/equity-holder-form';
import { useEquityHolders, useCreateEquityHolder } from '@/hooks/use-equity';
import { usePlatformTenants } from '@/hooks/use-platform-tenants';
import {
  useReferralPrograms,
  useCreateReferralProgram,
  useUpdateReferralProgram,
  useDeleteReferralProgram,
  useReferrals,
  useCreateReferral,
  useUpdateReferral,
  useReferralRewards,
  useIssueReward,
  useConvertToEquity,
} from '@/hooks/use-referrals';
import { useMe } from '@/hooks/useMe';
import type {
  ReferralProgram,
  CreateReferralProgramRequest,
  Referral,
  CreateReferralRequest,
  ReferralReward,
  IssueRewardRequest,
} from '@/lib/api/referrals';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Award,
  ChevronDown,
  Gift,
  Loader2,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const REWARD_TYPES = [
  { value: 'revenue_share', label: 'Revenue Share' },
  { value: 'fixed_monetary', label: 'Fixed Monetary' },
  { value: 'discount', label: 'Discount' },
  { value: 'gift_card', label: 'Gift Card' },
  { value: 'coupon', label: 'Coupon' },
] as const;

const REWARD_TYPE_LABELS: Record<string, string> = {
  revenue_share: 'Revenue Share',
  fixed_monetary: 'Fixed Monetary',
  discount: 'Discount',
  gift_card: 'Gift Card',
  coupon: 'Coupon',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'outline' | 'default'> = {
  active: 'success',
  pending: 'warning',
  expired: 'outline',
  revoked: 'error',
  converted: 'success',
  issued: 'default',
  redeemed: 'success',
  cancelled: 'error',
};

export default function ReferralsPage() {
  const { data: user } = useMe();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [activeTab, setActiveTab] = useState('programs');
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ReferralProgram | null>(null);
  const [showCreateReferral, setShowCreateReferral] = useState(false);
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [showIssueReward, setShowIssueReward] = useState<string | null>(null);

  // isSuperUser is a TENANT-scoped role, not platform-wide — excluded here too.
  const isPlatformOwner = user?.isPlatformOwner || orgSlug === 'codevertex';

  const { data: programsData, isLoading: loadingPrograms, isError: programsError } = useReferralPrograms();
  const { data: referralsData, isLoading: loadingReferrals, isError: referralsError } = useReferrals();
  const createProgram = useCreateReferralProgram();
  const updateProgram = useUpdateReferralProgram();
  const deleteProgram = useDeleteReferralProgram();
  const createReferral = useCreateReferral();
  const updateReferral = useUpdateReferral();
  const issueReward = useIssueReward();
  const convertToEquity = useConvertToEquity();

  const programs = programsData?.programs ?? [];
  const referrals = referralsData?.referrals ?? [];


  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="warning">Platform Admin</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Referral Programs</h1>
        <p className="text-muted-foreground mt-1">Manage referral programs, track referrals, and issue rewards.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="programs">
            <Gift className="h-4 w-4 inline mr-2" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <Users className="h-4 w-4 inline mr-2" />
            Referrals
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Award className="h-4 w-4 inline mr-2" />
            Rewards
          </TabsTrigger>
        </TabsList>

        {/* Programs Tab */}
        <TabsContent value="programs" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-tight">Referral Programs</h3>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setShowCreateProgram(true)}>
                <Plus className="h-3.5 w-3.5" /> Create Program
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPrograms ? (
                <div className="px-6 py-8 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading programs...
                </div>
              ) : programsError ? (
                <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Failed to load referral programs. Check your connection and try again.
                </div>
              ) : programs.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No referral programs yet. Create one to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3 font-medium">Name</th>
                        <th className="px-6 py-3 font-medium">Reward Type</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Created</th>
                        <th className="px-6 py-3 font-medium w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {programs.map((program) => (
                        <tr key={program.id} className="hover:bg-accent/5 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium">{program.name}</p>
                            {program.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{program.description}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="default">{REWARD_TYPE_LABELS[program.reward_type] || program.reward_type}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={program.is_active ? 'success' : 'outline'}>
                              {program.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground text-xs">
                            {formatDate(program.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <RowActionMenu
                              row={program}
                              actions={[
                                {
                                  label: 'Edit',
                                  onClick: (p) => setEditingProgram(p),
                                },
                                {
                                  label: program.is_active ? 'Deactivate' : 'Activate',
                                  onClick: (p) => updateProgram.mutate({ id: p.id, data: { is_active: !p.is_active } }),
                                },
                                {
                                  label: 'Delete',
                                  destructive: true,
                                  onClick: (p) => deleteProgram.mutate(p.id),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-tight">Referrals</h3>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setShowCreateReferral(true)}>
                <Plus className="h-3.5 w-3.5" /> Create Referral
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingReferrals ? (
                <div className="px-6 py-8 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading referrals...
                </div>
              ) : referralsError ? (
                <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Failed to load referrals. Check your connection and try again.
                </div>
              ) : referrals.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No referrals yet. Create one to track a referral.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3 font-medium">Referral Code</th>
                        <th className="px-6 py-3 font-medium">Referrer</th>
                        <th className="px-6 py-3 font-medium">Referred</th>
                        <th className="px-6 py-3 font-medium">Program</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {referrals.map((referral) => {
                        const program = programs.find((p) => p.id === referral.program_id);
                        return (
                          <tr key={referral.id} className="hover:bg-accent/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs">{referral.referral_code}</td>
                            <td className="px-6 py-4 text-xs text-muted-foreground truncate max-w-[140px]">
                              {referral.referrer_name
                                ? <span title={referral.referrer_email}>{referral.referrer_name} <span className="text-[10px] opacity-60">(external)</span></span>
                                : <span className="font-mono">{referral.referrer_tenant_id}</span>}
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                              {referral.referred_tenant_id}
                            </td>
                            <td className="px-6 py-4 text-xs">{program?.name || referral.program_id}</td>
                            <td className="px-6 py-4">
                              <Badge variant={STATUS_VARIANT[referral.status] || 'outline'}>{referral.status}</Badge>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground text-xs">{formatDate(referral.created_at)}</td>
                            <td className="px-6 py-4">
                              {(() => {
                                // An equity referral (type_b, or already linked to an equity holder) is
                                // paid its revenue share via the equity-holder allocation (its percentage
                                // share against the referred tenant's revenue), shown on the Equity tab /
                                // Preview Payouts. Issuing an issue-reward here too would double-pay, so we
                                // hide "Issue Reward" for equity referrals. Type-A (compensation) referrals
                                // keep the full Issue Reward action. This mirrors the backend 400 guard.
                                const isEquityReferral =
                                  program?.referral_type === 'type_b' || !!referral.equity_holder_id;
                                const canConvert =
                                  program?.referral_type === 'type_b' &&
                                  referral.status === 'active' &&
                                  !referral.equity_holder_id;

                                const actions: RowAction<Referral>[] = [
                                  {
                                    label: 'Activate',
                                    onClick: (rf) => updateReferral.mutate({ id: rf.id, data: { status: 'active' } }),
                                  },
                                  {
                                    label: 'Expire',
                                    onClick: (rf) => updateReferral.mutate({ id: rf.id, data: { status: 'expired' } }),
                                  },
                                  {
                                    label: 'Revoke',
                                    destructive: true,
                                    onClick: (rf) => updateReferral.mutate({ id: rf.id, data: { status: 'revoked' } }),
                                  },
                                ];
                                // Issue Reward only for non-equity (type_a compensation) referrals.
                                if (!isEquityReferral) {
                                  actions.push({
                                    label: 'Issue Reward',
                                    onClick: (rf) => setShowIssueReward(rf.id),
                                  });
                                }
                                actions.push({
                                  label: 'View Rewards',
                                  onClick: (rf) => setSelectedReferralId(rf.id),
                                });
                                if (canConvert) {
                                  actions.push({
                                    label: 'Convert to Equity →',
                                    disabled: () => convertToEquity.isPending,
                                    onClick: (rf) => convertToEquity.mutate({ referralId: rf.id, data: {} }),
                                  });
                                }
                                return <RowActionMenu row={referral} actions={actions} />;
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="mt-6">
          <RewardsPanel referrals={referrals} programs={programs} />
        </TabsContent>
      </Tabs>

      {/* Create Program Dialog */}
      <Dialog open={showCreateProgram} onOpenChange={setShowCreateProgram}>
        <ProgramFormDialog
          title="Create Referral Program"
          onClose={() => setShowCreateProgram(false)}
          onSubmit={async (data) => {
            await createProgram.mutateAsync(data);
            setShowCreateProgram(false);
          }}
          isSubmitting={createProgram.isPending}
        />
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={!!editingProgram} onOpenChange={(open) => { if (!open) setEditingProgram(null); }}>
        {editingProgram && (
          <ProgramFormDialog
            title="Edit Referral Program"
            initialData={editingProgram}
            onClose={() => setEditingProgram(null)}
            onSubmit={async (data) => {
              await updateProgram.mutateAsync({ id: editingProgram.id, data });
              setEditingProgram(null);
            }}
            isSubmitting={updateProgram.isPending}
          />
        )}
      </Dialog>

      {/* Create Referral Dialog */}
      <Dialog open={showCreateReferral} onOpenChange={setShowCreateReferral}>
        <ReferralFormDialog
          programs={programs}
          onClose={() => setShowCreateReferral(false)}
          onSubmit={async (data) => {
            await createReferral.mutateAsync(data);
            setShowCreateReferral(false);
          }}
          isSubmitting={createReferral.isPending}
        />
      </Dialog>

      {/* Issue Reward Dialog */}
      <Dialog open={!!showIssueReward} onOpenChange={(open) => { if (!open) setShowIssueReward(null); }}>
        {showIssueReward && (
          <IssueRewardDialog
            referralId={showIssueReward}
            onClose={() => setShowIssueReward(null)}
            onSubmit={async (data) => {
              await issueReward.mutateAsync({ referralId: showIssueReward, data });
              setShowIssueReward(null);
            }}
            isSubmitting={issueReward.isPending}
          />
        )}
      </Dialog>

      {/* View Rewards Dialog */}
      <Dialog open={!!selectedReferralId} onOpenChange={(open) => { if (!open) setSelectedReferralId(null); }}>
        {selectedReferralId && (
          <RewardsDetailDialog
            referralId={selectedReferralId}
            onClose={() => setSelectedReferralId(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Program Form Dialog                                                 */
/* ------------------------------------------------------------------ */

function ProgramFormDialog({
  title,
  initialData,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  title: string;
  initialData?: ReferralProgram;
  onClose: () => void;
  onSubmit: (data: CreateReferralProgramRequest) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [rewardType, setRewardType] = useState(initialData?.reward_type ?? 'revenue_share');
  const [revenueSharePercentage, setRevenueSharePercentage] = useState(initialData?.revenue_share_percentage ?? '');
  const [fixedRewardAmount, setFixedRewardAmount] = useState(initialData?.fixed_reward_amount ?? '');
  const [currency, setCurrency] = useState(initialData?.currency ?? 'KES');
  const [discountPercentage, setDiscountPercentage] = useState(initialData?.discount_percentage ?? '');
  const [discountDurationMonths, setDiscountDurationMonths] = useState(initialData?.discount_duration_months ?? 0);
  const [giftCardValue, setGiftCardValue] = useState(initialData?.gift_card_value ?? '');
  const [couponCodePrefix, setCouponCodePrefix] = useState(initialData?.coupon_code_prefix ?? '');
  const [referralType, setReferralType] = useState(initialData?.referral_type ?? 'type_a');
  const [equityGrantPct, setEquityGrantPct] = useState(initialData?.equity_grant_pct ?? '');

  const num = (v: string | number | undefined): number | undefined => {
    if (v === undefined || v === '') return undefined;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateReferralProgramRequest = {
      name,
      description: description || undefined,
      reward_type: rewardType,
      currency,
      referral_type: referralType,
    };
    if (rewardType === 'revenue_share') data.revenue_share_percentage = num(revenueSharePercentage);
    if (rewardType === 'fixed_monetary') data.fixed_reward_amount = num(fixedRewardAmount);
    if (rewardType === 'discount') {
      data.discount_percentage = num(discountPercentage);
      data.discount_duration_months = discountDurationMonths || undefined;
    }
    if (rewardType === 'gift_card') data.gift_card_value = num(giftCardValue);
    if (rewardType === 'coupon') data.coupon_code_prefix = couponCodePrefix;
    if (referralType === 'type_b') data.equity_grant_pct = num(equityGrantPct);
    onSubmit(data);
  };

  return (
    <DialogContent title={title} onClose={onClose} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Launch Referral Bonus"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
          />
        </FormField>

        <FormField label="Referral Type" required>
          <select
            value={referralType}
            onChange={(e) => setReferralType(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="type_a">Type A — existing tenant refers (subscription credit)</option>
            <option value="type_b">Type B — external referrer (revenue-share equity)</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {referralType === 'type_b'
              ? 'Referrals on this program can be converted into a revenue-share equity holder scoped to the referred tenant.'
              : 'Referrers are rewarded with a subscription credit on their own account.'}
          </p>
        </FormField>

        <FormField label="Reward Type" required>
          <select
            value={rewardType}
            onChange={(e) => setRewardType(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {REWARD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>

        {referralType === 'type_b' && (
          <FormField label="Equity Grant % (optional)">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={equityGrantPct}
              onChange={(e) => setEquityGrantPct(e.target.value)}
              placeholder="e.g. 1.00 — vesting equity grant on conversion"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </FormField>
        )}

        <FormField label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {['KES', 'NGN', 'GHS', 'ZAR', 'USD'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormField>

        {rewardType === 'revenue_share' && (
          <FormField label="Revenue Share Percentage" required>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={revenueSharePercentage}
              onChange={(e) => setRevenueSharePercentage(e.target.value)}
              placeholder="e.g. 10.00"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </FormField>
        )}

        {rewardType === 'fixed_monetary' && (
          <FormField label="Fixed Reward Amount" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fixedRewardAmount}
              onChange={(e) => setFixedRewardAmount(e.target.value)}
              placeholder="e.g. 500.00"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </FormField>
        )}

        {rewardType === 'discount' && (
          <>
            <FormField label="Discount Percentage" required>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                placeholder="e.g. 20.00"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Discount Duration (months)">
              <input
                type="number"
                min="0"
                value={discountDurationMonths || ''}
                onChange={(e) => setDiscountDurationMonths(Number(e.target.value))}
                placeholder="e.g. 3"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </FormField>
          </>
        )}

        {rewardType === 'gift_card' && (
          <FormField label="Gift Card Value" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={giftCardValue}
              onChange={(e) => setGiftCardValue(e.target.value)}
              placeholder="e.g. 1000.00"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </FormField>
        )}

        {rewardType === 'coupon' && (
          <FormField label="Coupon Code Prefix" required>
            <input
              type="text"
              value={couponCodePrefix}
              onChange={(e) => setCouponCodePrefix(e.target.value)}
              placeholder="e.g. REF-"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </FormField>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {initialData ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/* Referral Form Dialog                                                */
/* ------------------------------------------------------------------ */

/**
 * HolderCombobox is a searchable single-select over existing equity holders with a sticky
 * "+ Add Holder" footer that opens the shared Add/Edit Holder form inline. Creating a holder
 * selects it immediately — mirroring the supplier-form "+Add vendor" UX. It links the referral
 * to the holder at creation (the parent submits equity_holder_id).
 */
function HolderCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (holderId: string) => void;
}) {
  const { data: holdersData, isLoading } = useEquityHolders();
  const createHolder = useCreateEquityHolder();
  const holders = holdersData?.holders ?? [];

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showAddHolder, setShowAddHolder] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const selected = holders.find((h) => h.id === value) ?? null;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? holders.filter((h) => h.name.toLowerCase().includes(q) || (h.email ?? '').toLowerCase().includes(q))
    : holders;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-left min-h-[38px]',
          open && 'ring-1 ring-ring',
        )}
      >
        {selected ? (
          <span className="flex-1 min-w-0 truncate">
            {selected.name}
            {selected.email && <span className="text-muted-foreground ml-2 text-xs">{selected.email}</span>}
          </span>
        ) : (
          <span className="text-muted-foreground flex-1">Select an equity holder…</span>
        )}
        <span className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search holders by name or email…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading holders…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">No equity holders match.</div>
            ) : (
              filtered.map((h) => {
                const isSelected = h.id === value;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => { onChange(h.id); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors',
                      isSelected && 'bg-accent/30',
                    )}
                  >
                    <span className="flex-1 min-w-0 truncate">{h.name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{h.percentage_share}%</span>
                  </button>
                );
              })
            )}
          </div>
          {/* Sticky add-holder footer — opens the shared Add Holder form inline. */}
          <div className="sticky bottom-0 border-t border-border bg-card p-1">
            <button
              type="button"
              onClick={() => { setOpen(false); setShowAddHolder(true); }}
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-accent/50 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Holder
            </button>
          </div>
        </div>
      )}

      <HolderFormModal
        title="Add holder"
        open={showAddHolder}
        initial={null}
        onClose={() => setShowAddHolder(false)}
        onSubmit={async (data) => {
          const holder = await createHolder.mutateAsync(data);
          // Select the newly created holder so the referral links to it at creation.
          if (holder?.id) onChange(holder.id);
          setShowAddHolder(false);
        }}
        isSubmitting={createHolder.isPending}
      />
    </div>
  );
}

function ReferralFormDialog({
  programs,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  programs: ReferralProgram[];
  onClose: () => void;
  onSubmit: (data: CreateReferralRequest) => Promise<void>;
  isSubmitting: boolean;
}) {
  const activePrograms = programs.filter((p) => p.is_active);
  const [programId, setProgramId] = useState(activePrograms[0]?.id ?? '');
  const [referrerTenantId, setReferrerTenantId] = useState('');
  const [equityHolderId, setEquityHolderId] = useState('');
  const [referredTenantId, setReferredTenantId] = useState('');
  const [notes, setNotes] = useState('');

  const selectedProgram = activePrograms.find((p) => p.id === programId);
  const isTypeB = selectedProgram?.referral_type === 'type_b';

  const { data: tenants, isLoading: loadingTenants } = usePlatformTenants();
  const tenantOptions: ComboboxOption[] = (tenants ?? []).map((t) => ({
    value: t.id,
    label: t.name || t.slug,
    hint: t.slug,
  }));

  // Type-B (equity) links to an equity holder; Type-A (compensation) needs a referring tenant.
  const referrerReady = isTypeB ? !!equityHolderId : !!referrerTenantId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      program_id: programId,
      referred_tenant_id: referredTenantId,
      ...(isTypeB
        ? { equity_holder_id: equityHolderId }
        : { referrer_tenant_id: referrerTenantId }),
      notes: notes || undefined,
    });
  };

  return (
    <DialogContent title="Create Referral" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Program" required>
          <select
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="" disabled>Select a program</option>
            {activePrograms.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProgram && (
            <p className="text-xs text-muted-foreground mt-1">
              {isTypeB
                ? 'Type B — Referral Equity: the referrer is an equity holder, linked and equity-active on create.'
                : 'Type A — Referral Compensation: an existing tenant earns the reward (subscription credit).'}
            </p>
          )}
        </FormField>

        {isTypeB ? (
          <FormField
            label="Equity Holder"
            required
            description="Search existing equity holders, or add a new one. The referral links to this holder on create — no separate conversion step."
          >
            <HolderCombobox value={equityHolderId} onChange={setEquityHolderId} />
          </FormField>
        ) : (
          <FormField label="Referrer Tenant" required description="The tenant making the referral (earns the reward).">
            <Combobox
              options={tenantOptions}
              value={referrerTenantId}
              onChange={setReferrerTenantId}
              loading={loadingTenants}
              placeholder="Select the referring tenant…"
              searchPlaceholder="Search tenants by name or slug…"
            />
          </FormField>
        )}

        <FormField label="Referred Tenant" required description="The tenant who was referred.">
          <Combobox
            options={tenantOptions.filter((t) => t.value !== referrerTenantId)}
            value={referredTenantId}
            onChange={setReferredTenantId}
            loading={loadingTenants}
            placeholder="Select the referred tenant…"
            searchPlaceholder="Search tenants by name or slug…"
          />
        </FormField>

        <FormField label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
          />
        </FormField>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || !programId || !referrerReady || !referredTenantId}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Create
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/* Issue Reward Dialog                                                 */
/* ------------------------------------------------------------------ */

function IssueRewardDialog({
  referralId,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  referralId: string;
  onClose: () => void;
  onSubmit: (data: IssueRewardRequest) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [rewardType, setRewardType] = useState('fixed_monetary');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      reward_type: rewardType,
      amount: amount || undefined,
      currency,
      description: description || undefined,
    });
  };

  return (
    <DialogContent title="Issue Reward" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Reward Type" required>
          <select
            value={rewardType}
            onChange={(e) => setRewardType(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {REWARD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Amount">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500.00"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </FormField>

        <FormField label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {['KES', 'NGN', 'GHS', 'ZAR', 'USD'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </FormField>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Issue Reward
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/* Rewards Detail Dialog                                               */
/* ------------------------------------------------------------------ */

function RewardsDetailDialog({
  referralId,
  onClose,
}: {
  referralId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useReferralRewards(referralId);
  const rewards = data?.rewards ?? [];

  return (
    <DialogContent title="Rewards" onClose={onClose} className="max-w-lg">
      {isLoading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading rewards...
        </div>
      ) : rewards.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No rewards issued for this referral yet.</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {rewards.map((reward) => (
            <div key={reward.id} className="border border-border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant="default">{REWARD_TYPE_LABELS[reward.reward_type] || reward.reward_type}</Badge>
                <Badge variant={STATUS_VARIANT[reward.status] || 'outline'}>{reward.status}</Badge>
              </div>
              {reward.amount && (
                <p className="text-sm font-medium">{reward.currency} {reward.amount}</p>
              )}
              {reward.description && (
                <p className="text-xs text-muted-foreground">{reward.description}</p>
              )}
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                {reward.issued_at && <span>Issued: {formatDate(reward.issued_at)}</span>}
                {reward.redeemed_at && <span>Redeemed: {formatDate(reward.redeemed_at)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/* Rewards Panel (Tab)                                                 */
/* ------------------------------------------------------------------ */

function RewardsPanel({
  referrals,
  programs,
}: {
  referrals: Referral[];
  programs: ReferralProgram[];
}) {
  // We aggregate rewards by fetching for each referral with rewards
  // For simplicity, show a per-referral expandable list
  const [expandedReferral, setExpandedReferral] = useState<string | null>(null);

  if (referrals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Award className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No referrals exist yet. Rewards will appear here once referrals are created.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Rewards by Referral</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border">
        {referrals.map((referral) => {
          const program = programs.find((p) => p.id === referral.program_id);
          const isExpanded = expandedReferral === referral.id;
          return (
            <div key={referral.id}>
              <button
                type="button"
                onClick={() => setExpandedReferral(isExpanded ? null : referral.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-mono">{referral.referral_code}</p>
                    <p className="text-xs text-muted-foreground">{program?.name || 'Unknown program'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[referral.status] || 'outline'}>{referral.status}</Badge>
                  <X className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded ? 'rotate-0' : 'rotate-45')} />
                </div>
              </button>
              {isExpanded && <ReferralRewardsList referralId={referral.id} />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ReferralRewardsList({ referralId }: { referralId: string }) {
  const { data, isLoading } = useReferralRewards(referralId);
  const rewards = data?.rewards ?? [];

  if (isLoading) {
    return (
      <div className="px-6 py-4 flex items-center gap-2 text-muted-foreground bg-accent/5">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading rewards...
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-muted-foreground bg-accent/5">
        No rewards issued for this referral.
      </div>
    );
  }

  return (
    <div className="bg-accent/5 px-6 py-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Amount</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Issued</th>
            <th className="py-2 font-medium">Redeemed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rewards.map((reward) => (
            <tr key={reward.id}>
              <td className="py-2 pr-4">
                <Badge variant="default">{REWARD_TYPE_LABELS[reward.reward_type] || reward.reward_type}</Badge>
              </td>
              <td className="py-2 pr-4 font-medium">
                {reward.amount ? `${reward.currency} ${reward.amount}` : '-'}
              </td>
              <td className="py-2 pr-4">
                <Badge variant={STATUS_VARIANT[reward.status] || 'outline'}>{reward.status}</Badge>
              </td>
              <td className="py-2 pr-4 text-xs text-muted-foreground">{reward.issued_at ? formatDate(reward.issued_at) : '-'}</td>
              <td className="py-2 text-xs text-muted-foreground">{reward.redeemed_at ? formatDate(reward.redeemed_at) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}
