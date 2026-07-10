'use client';

/**
 * Per-tenant Payment Details — the tenant's own business identity + payment account
 * that prints as the issuer block / "How to pay" section on THEIR documents.
 *
 * Mirrors the platform "Platform Payment Details" page but is tenant-scoped: stored
 * under the `tenant_payment_account` ServiceConfig key (the same key treasury-api's
 * tenant-identity consumer seeds from auth.tenant.* events). KRA PIN / VAT are pulled
 * in from the org profile; bank + paybill details are entered here.
 */

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import {
  PaymentAccountFields,
  EMPTY_PAYMENT_ACCOUNT,
  type PaymentAccount,
} from '@/components/payments/payment-account-form';
import { useSettings, useUpdateSetting, getSettingValue } from '@/hooks/use-settings';
import { fetchTenantDefaults } from '@/lib/api/tenant';
import { Banknote, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CONFIG_KEY = 'tenant_payment_account';

export function PaymentDetailsTab({ orgSlug, tenantSlug }: { orgSlug: string; tenantSlug: string }) {
  const { data: settingsData, isLoading } = useSettings(tenantSlug);
  const updateSetting = useUpdateSetting(tenantSlug);

  const [acct, setAcct] = useState<PaymentAccount>(EMPTY_PAYMENT_ACCOUNT);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once: saved config (incl. auth-synced KRA/VAT) wins over org-profile
  // defaults, which fill in identity fields not yet saved (tagline, address…).
  useEffect(() => {
    if (hydrated || isLoading) return;
    const saved = getSettingValue(settingsData?.settings, CONFIG_KEY, {}) as Partial<PaymentAccount>;
    let cancelled = false;
    (async () => {
      const def = await fetchTenantDefaults(orgSlug).catch(() => null);
      if (cancelled) return;
      setAcct({
        ...EMPTY_PAYMENT_ACCOUNT,
        ...(def
          ? {
              business_name: def.name,
              tagline: def.tagline,
              address: def.address,
              country: def.country,
              tax_pin: def.taxPin,
              vat_registered: def.vatRegistered,
              vat_registered_on: def.vatRegisteredOn,
            }
          : {}),
        ...saved,
      });
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsData, isLoading, hydrated, orgSlug]);

  const onChange = (k: keyof PaymentAccount, v: string | boolean) =>
    setAcct((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    updateSetting.mutate(
      { key: CONFIG_KEY, value: acct, configType: 'json' },
      {
        onSuccess: () => toast.success('Payment details saved — applied to your new invoices & receipts'),
        onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to save payment details'),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-4 border-b border-border/50">
        <Banknote className="h-4 w-4 text-primary" />
        <div>
          <h3 className="font-bold text-sm uppercase tracking-tight">Payment Details</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Business identity + payment account shown on your invoices, receipts &amp; statements (issuer block + &quot;How to pay&quot;).
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {isLoading || !hydrated ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <PaymentAccountFields acct={acct} onChange={onChange} showVat orgSlug={orgSlug} />
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateSetting.isPending}>
                {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Payment Details
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
