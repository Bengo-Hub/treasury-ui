'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import {
  buildProgramColumns,
  buildReferralColumns,
  buildRewardColumns,
  buildRewardsByReferralColumns,
} from './referral-columns';
import { ReferralProgramDetailModal } from './program-detail-modal';
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
  IssueRewardRequest,
} from '@/lib/api/referrals';
import { cn } from '@/lib/utils';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const REWARD_TYPES = [
  { value: 'revenue_share', label: 'Revenue Share' },
  { value: 'fixed_monetary', label: 'Fixed Monetary' },
  { value: 'discount', label: 'Discount' },
  { value: 'gift_card', label: 'Gift Card' },
  { value: 'coupon', label: 'Coupon' },
] as const;

// Reward-type labels and status variants live in referral-columns.tsx now — the
// tables there own every badge, so the duplicates that used to sit here are gone.

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
  // The shared program-detail modal, opened from either table's Program column.
  const [programDetail, setProgramDetail] = useState<{ program: ReferralProgram | null; referral: Referral | null } | null>(null);

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

  // Opens the program-detail modal for a referral, pairing the referral with its
  // (possibly missing) program record.
  const openProgramForReferral = useCallback(
    (rf: Referral) => setProgramDetail({ program: programs.find((p) => p.id === rf.program_id) ?? null, referral: rf }),
    [programs],
  );

  const programColumns = useMemo(
    () =>
      buildProgramColumns({
        onEdit: (p) => setEditingProgram(p),
        onToggleActive: (p) => updateProgram.mutate({ id: p.id, data: { is_active: !p.is_active } }),
        onDelete: (p) => deleteProgram.mutate(p.id),
        onViewDetails: (p) => setProgramDetail({ program: p, referral: null }),
      }),
    [updateProgram, deleteProgram],
  );

  const referralColumns = useMemo(
    () =>
      buildReferralColumns(programs, {
        onIssueReward: (rf) => setShowIssueReward(rf.id),
        onViewRewards: (rf) => setSelectedReferralId(rf.id),
        onConvert: (rf) => convertToEquity.mutate({ referralId: rf.id, data: {} }),
        convertPending: convertToEquity.isPending,
        onActivate: (rf) => updateReferral.mutate({ id: rf.id, data: { status: 'active' } }),
        onExpire: (rf) => updateReferral.mutate({ id: rf.id, data: { status: 'expired' } }),
        onRevoke: (rf) => updateReferral.mutate({ id: rf.id, data: { status: 'revoked' } }),
        onViewProgram: openProgramForReferral,
      }),
    [programs, convertToEquity, updateReferral, openProgramForReferral],
  );

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
              <div className="px-2 pb-2">
                <DataTable
                  columns={programColumns}
                  rows={programs}
                  rowKey={(p) => p.id}
                  loading={loadingPrograms}
                  loadingRows={8}
                  error={programsError}
                  storageKey="referral-programs-table"
                  emptyText="No referral programs yet. Create one to get started."
                />
              </div>
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
              <div className="px-2 pb-2">
                <DataTable
                  columns={referralColumns}
                  rows={referrals}
                  rowKey={(r) => r.id}
                  loading={loadingReferrals}
                  loadingRows={8}
                  error={referralsError}
                  storageKey="referrals-table"
                  emptyText="No referrals yet. Create one to track a referral."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="mt-6">
          <RewardsPanel
            referrals={referrals}
            programs={programs}
            loading={loadingReferrals}
            error={referralsError}
            onViewProgram={openProgramForReferral}
          />
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

      {/* Shared program-detail modal (Programs table name, Referrals table Program column) */}
      {programDetail && (
        <ReferralProgramDetailModal
          program={programDetail.program}
          referral={programDetail.referral}
          onClose={() => setProgramDetail(null)}
        />
      )}
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
  const { data, isLoading, isError } = useReferralRewards(referralId);
  const rewards = data?.rewards ?? [];
  const columns = useMemo(() => buildRewardColumns(), []);

  return (
    <DialogContent title="Rewards" onClose={onClose} className="max-w-2xl">
      <DataTable
        columns={columns}
        rows={rewards}
        rowKey={(r) => r.id}
        loading={isLoading}
        loadingRows={3}
        error={isError}
        storageKey="referral-rewards-dialog-table"
        emptyText="No rewards issued for this referral yet."
      />
    </DialogContent>
  );
}

/* ------------------------------------------------------------------ */
/* Rewards Panel (Tab)                                                 */
/* ------------------------------------------------------------------ */

/**
 * RewardsPanel lists every referral in the shared DataTable and expands a row
 * into that referral's rewards (also a DataTable) — replacing the hand-rolled
 * accordion + bespoke <table> this panel used to render.
 */
function RewardsPanel({
  referrals,
  programs,
  loading,
  error,
  onViewProgram,
}: {
  referrals: Referral[];
  programs: ReferralProgram[];
  loading?: boolean;
  error?: boolean;
  onViewProgram: (referral: Referral) => void;
}) {
  const columns = useMemo(
    () => buildRewardsByReferralColumns(programs, onViewProgram),
    [programs, onViewProgram],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Rewards by Referral</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-2 pb-2">
          <DataTable
            columns={columns}
            rows={referrals}
            rowKey={(r) => r.id}
            loading={loading}
            loadingRows={6}
            error={error}
            storageKey="referral-rewards-by-referral-table"
            renderExpanded={(r) => <ReferralRewardsList referralId={r.id} />}
            emptyState={
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Award className="h-10 w-10 opacity-30" />
                <p className="text-sm">No referrals exist yet. Rewards will appear here once referrals are created.</p>
              </div>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ReferralRewardsList({ referralId }: { referralId: string }) {
  const { data, isLoading, isError } = useReferralRewards(referralId);
  const rewards = data?.rewards ?? [];
  const columns = useMemo(() => buildRewardColumns(), []);

  return (
    <div className="bg-accent/5 px-4 py-3">
      <DataTable
        columns={columns}
        rows={rewards}
        rowKey={(r) => r.id}
        loading={isLoading}
        loadingRows={2}
        error={isError}
        gridLines="rows"
        dense
        emptyText="No rewards issued for this referral."
      />
    </div>
  );
}
