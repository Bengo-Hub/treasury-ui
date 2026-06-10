'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEquityHolders, useHolderPayouts } from '@/hooks/use-equity';
import { useEquityEntitlements } from '@/hooks/use-equity-entitlements';
import { useReferrals } from '@/hooks/use-referrals';
import { useMe } from '@/hooks/useMe';
import type { EquityHolder } from '@/lib/api/equity';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, Gift, Loader2, Shield, Wallet } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function EquityHolderDetailPage() {
    const { data: user } = useMe();
    const router = useRouter();
    const params = useParams();
    const orgSlug = params?.orgSlug as string;
    const holderId = params?.holderId as string;

    const { data: holdersData, isLoading } = useEquityHolders();
    const holder = holdersData?.holders.find((h) => h.id === holderId);

    const isSuperAdmin = user?.isPlatformOwner || user?.isSuperUser;
    if (!isSuperAdmin) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <Shield className="h-12 w-12 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-bold">Access Restricted</h2>
                <Button variant="outline" onClick={() => router.push(`/${orgSlug}`)}>Go Back</Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading holder...
            </div>
        );
    }

    if (!holder) {
        return (
            <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">Holder not found.</p>
                <Button variant="outline" onClick={() => router.push(`/${orgSlug}/platform/equity`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Equity
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/${orgSlug}/platform/equity`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center border border-border bg-primary/5 text-primary">
                    {holder.holder_type === 'shareholder' ? <Shield className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                        {holder.name}
                        {holder.is_active
                            ? <Badge variant="success">Active</Badge>
                            : <Badge variant="outline">Inactive</Badge>}
                    </h1>
                    <p className="text-sm text-muted-foreground">{holder.percentage_share}% · {holder.holder_type}</p>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="flex flex-wrap gap-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="payouts">Payouts</TabsTrigger>
                    <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
                    <TabsTrigger value="agreement">Agreement</TabsTrigger>
                    <TabsTrigger value="referral">Linked Referral</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <OverviewTab holder={holder} />
                </TabsContent>
                <TabsContent value="payouts" className="mt-6">
                    <PayoutsTab holderId={holder.id} />
                </TabsContent>
                <TabsContent value="entitlements" className="mt-6">
                    <EntitlementsTab holderId={holder.id} />
                </TabsContent>
                <TabsContent value="agreement" className="mt-6">
                    <AgreementTab holder={holder} />
                </TabsContent>
                <TabsContent value="referral" className="mt-6">
                    <LinkedReferralTab holder={holder} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-background/50 border border-border/50 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value}</span>
        </div>
    );
}

function OverviewTab({ holder }: { holder: EquityHolder }) {
    return (
        <Card className="border-none shadow-xl shadow-black/5 max-w-2xl">
            <CardContent className="p-6 grid grid-cols-1 gap-2">
                <Field label="Holder Type" value={holder.holder_type} />
                <Field label="Compensation Model" value={holder.compensation_model ?? 'equity_revenue_share'} />
                <Field label="Percentage Share" value={`${holder.percentage_share}%`} />
                <Field label="Tax Residency" value={holder.tax_residency === 'non_resident' ? 'Non-resident' : 'Resident'} />
                <Field label="Tax Treatment" value={holder.payout_tax_treatment ?? 'auto'} />
                <Field label="Payout Method" value={holder.payout_method} />
                <Field label="Source Services" value={(holder.source_services && holder.source_services.length > 0) ? holder.source_services.join(', ') : 'All services'} />
                <Field label="Linked Tenants" value={holder.linked_tenant_ids?.length ? `${holder.linked_tenant_ids.length} tenant(s)` : 'None'} />
                <Field label="Email" value={holder.email || '—'} />
            </CardContent>
        </Card>
    );
}

function PayoutsTab({ holderId }: { holderId: string }) {
    const { data, isLoading } = useHolderPayouts(holderId);
    const payouts = data?.payouts ?? [];
    if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    if (payouts.length === 0) return <p className="text-sm text-muted-foreground">No payouts yet.</p>;
    return (
        <Card className="border-none shadow-xl shadow-black/5">
            <CardContent className="p-0 divide-y divide-border/50">
                {payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-4 text-sm">
                        <div>
                            <p className="font-semibold">KES {Number(p.net_payout ?? p.payout_amount).toLocaleString('en-KE', { maximumFractionDigits: 2 })}</p>
                            <p className="text-xs text-muted-foreground">{p.period_start?.slice(0, 10)} → {p.period_end?.slice(0, 10)}</p>
                        </div>
                        <Badge variant={p.status === 'completed' ? 'success' : p.status === 'failed' ? 'error' : 'outline'}>{p.status}</Badge>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function EntitlementsTab({ holderId }: { holderId: string }) {
    const { data, isLoading } = useEquityEntitlements(holderId);
    const entitlements = data?.entitlements ?? [];
    if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    if (entitlements.length === 0) return <p className="text-sm text-muted-foreground">No per-service entitlements. The flat percentage share applies.</p>;
    return (
        <Card className="border-none shadow-xl shadow-black/5">
            <CardContent className="p-0 divide-y divide-border/50">
                {entitlements.map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-6 py-4 text-sm">
                        <div>
                            <p className="font-semibold">{e.service_id === '*' ? 'All services' : e.service_id} · {e.equity_pct}%</p>
                            <p className="text-xs text-muted-foreground">{e.vesting_type} vesting from {e.vesting_start?.slice(0, 10)}{e.cliff_months ? ` · ${e.cliff_months}mo cliff` : ''}</p>
                        </div>
                        {e.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function AgreementTab({ holder }: { holder: EquityHolder }) {
    const treatment = holder.payout_tax_treatment && holder.payout_tax_treatment !== 'auto'
        ? holder.payout_tax_treatment
        : (holder.holder_type === 'royalty' ? 'royalty' : 'dividend');
    return (
        <Card className="border-none shadow-xl shadow-black/5 max-w-2xl">
            <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                    {holder.application_id
                        ? <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Onboarded via EPA workflow</Badge>
                        : <Badge variant="outline">Quick-add (internal / founder)</Badge>}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    This holder is a contractual revenue/profit-share participant under an Equity Participation Agreement (EPA),
                    not a registered shareholder. KRA withholding tax is applied at payout based on the holder&apos;s tax profile.
                </p>
                <div className="grid gap-2">
                    <Field label="Tax Treatment" value={treatment} />
                    <Field label="Tax Residency" value={holder.tax_residency === 'non_resident' ? 'Non-resident' : 'Resident'} />
                    <Field label="Application ID" value={holder.application_id || '—'} />
                </div>
            </CardContent>
        </Card>
    );
}

function LinkedReferralTab({ holder }: { holder: EquityHolder }) {
    const { data } = useReferrals();
    const referrals = data?.referrals ?? [];
    const linked = referrals.find((r) => r.id === holder.referral_id);
    if (!holder.referral_id) {
        return <p className="text-sm text-muted-foreground">This holder is not linked to a referral.</p>;
    }
    return (
        <Card className="border-none shadow-xl shadow-black/5 max-w-2xl">
            <CardHeader className="bg-transparent border-none">
                <h3 className="font-bold flex items-center gap-2"><Gift className="h-4 w-4 text-primary" /> Linked Referral</h3>
            </CardHeader>
            <CardContent className="p-6 pt-0 grid gap-2">
                <Field label="Referral Code" value={linked?.referral_code ?? holder.referral_id.slice(0, 8)} />
                <Field label="Status" value={linked?.status ?? '—'} />
                <Field label="Referred Tenant" value={linked?.referred_tenant_id?.slice(0, 8) ?? '—'} />
                <Field label="Attributed" value={linked?.attributed_at ? format(new Date(linked.attributed_at), 'yyyy-MM-dd') : '—'} />
            </CardContent>
        </Card>
    );
}
