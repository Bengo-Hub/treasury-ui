'use client';

/**
 * ReferralProgramDetailModal — the reusable "what does this program actually
 * pay, and what is this specific referral?" surface.
 *
 * Opened from the Program column of the Referrals table (with the referral in
 * hand) and from the Programs table (program only). Referrer / referred-tenant
 * names come from the resolved `referrer_tenant_name` / `referred_tenant_name` /
 * `program_name` fields on Referral — a bare UUID is only ever shown when the
 * backend supplied no name.
 */

import { Badge } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Referral, ReferralProgram } from '@/lib/api/referrals';
import { REFERRAL_STATUS_VARIANT, REWARD_TYPE_LABELS } from './referral-columns';
import { format } from 'date-fns';
import { Gift, Users } from 'lucide-react';
import type { ReactNode } from 'react';

const REFERRAL_TYPE_LABELS: Record<string, string> = {
    type_a: 'Type A — existing tenant refers (subscription credit)',
    type_b: 'Type B — external referrer (revenue-share equity)',
};

function fmtDate(dateStr?: string) {
    if (!dateStr) return '—';
    try {
        return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
        return dateStr;
    }
}

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 px-4 py-2.5 rounded-xl bg-background/50 border border-border/50 text-sm">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="font-medium text-right min-w-0 break-words">{value}</span>
        </div>
    );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                {icon} {title}
            </h4>
            <div className="grid gap-2">{children}</div>
        </div>
    );
}

export function ReferralProgramDetailModal({
    program,
    referral,
    onClose,
}: {
    /** The full program record, when it's loaded. */
    program?: ReferralProgram | null;
    /** The specific referral this was opened from, when there is one. */
    referral?: Referral | null;
    onClose: () => void;
}) {
    // Fall back to the referral's denormalised program_name when the program
    // record itself isn't in the loaded list (e.g. an archived program).
    const programName = program?.name ?? referral?.program_name ?? 'Unknown program';

    const rewardValue = (() => {
        if (!program) return null;
        switch (program.reward_type) {
            case 'revenue_share':
                return program.revenue_share_percentage != null ? `${program.revenue_share_percentage}%` : '—';
            case 'fixed_monetary':
                return program.fixed_reward_amount != null ? `${program.currency} ${program.fixed_reward_amount}` : '—';
            case 'discount':
                return program.discount_percentage != null
                    ? `${program.discount_percentage}%${program.discount_duration_months ? ` for ${program.discount_duration_months} month(s)` : ''}`
                    : '—';
            case 'gift_card':
                return program.gift_card_value != null ? `${program.currency} ${program.gift_card_value}` : '—';
            case 'coupon':
                return program.coupon_code_prefix ? `Prefix ${program.coupon_code_prefix}` : '—';
            default:
                return '—';
        }
    })();

    const referrerLabel = (() => {
        if (!referral) return null;
        if (referral.referrer_name) {
            return (
                <span>
                    {referral.referrer_name}
                    <span className="text-[10px] opacity-60 ml-1">(external)</span>
                    {referral.referrer_email && (
                        <span className="block text-xs text-muted-foreground font-normal">{referral.referrer_email}</span>
                    )}
                </span>
            );
        }
        if (referral.referrer_tenant_name) return referral.referrer_tenant_name;
        return referral.referrer_tenant_id
            ? <span className="font-mono text-xs">{referral.referrer_tenant_id}</span>
            : '—';
    })();

    return (
        <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent
                title={programName}
                description={referral ? `Referral ${referral.referral_code}` : 'Referral program details'}
                onClose={onClose}
                className="max-w-2xl"
            >
                <div className="space-y-6">
                    <Section title="Program" icon={<Gift className="h-3.5 w-3.5 text-primary" />}>
                        {program ? (
                            <>
                                <Row label="Name" value={program.name} />
                                {program.description && <Row label="Description" value={program.description} />}
                                <Row
                                    label="Reward Type"
                                    value={<Badge variant="default">{REWARD_TYPE_LABELS[program.reward_type] || program.reward_type}</Badge>}
                                />
                                <Row label="Reward Value" value={rewardValue} />
                                <Row label="Currency" value={program.currency} />
                                <Row
                                    label="Referral Type"
                                    value={REFERRAL_TYPE_LABELS[program.referral_type ?? 'type_a'] ?? program.referral_type ?? '—'}
                                />
                                {program.referral_type === 'type_b' && program.equity_grant_pct != null && (
                                    <Row label="Equity Grant" value={`${program.equity_grant_pct}%`} />
                                )}
                                <Row
                                    label="Status"
                                    value={<Badge variant={program.is_active ? 'success' : 'outline'}>{program.is_active ? 'Active' : 'Inactive'}</Badge>}
                                />
                                <Row label="Created" value={fmtDate(program.created_at)} />
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground px-1">
                                The full program record isn&apos;t loaded — only the name recorded on the referral is available.
                            </p>
                        )}
                    </Section>

                    {referral && (
                        <Section title="This Referral" icon={<Users className="h-3.5 w-3.5 text-primary" />}>
                            <Row label="Referral Code" value={<span className="font-mono text-xs">{referral.referral_code}</span>} />
                            <Row label="Referrer" value={referrerLabel} />
                            <Row
                                label="Referred Tenant"
                                value={referral.referred_tenant_name ?? <span className="font-mono text-xs">{referral.referred_tenant_id}</span>}
                            />
                            <Row
                                label="Status"
                                value={<Badge variant={REFERRAL_STATUS_VARIANT[referral.status] || 'outline'}>{referral.status}</Badge>}
                            />
                            <Row label="Created" value={fmtDate(referral.created_at)} />
                            <Row label="Attributed" value={fmtDate(referral.attributed_at)} />
                            <Row label="Expires" value={fmtDate(referral.expires_at)} />
                            {referral.equity_holder_id && (
                                <Row
                                    label="Equity Holder"
                                    value={<span className="font-mono text-xs">{referral.equity_holder_id}</span>}
                                />
                            )}
                            {referral.notes && <Row label="Notes" value={referral.notes} />}
                        </Section>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
