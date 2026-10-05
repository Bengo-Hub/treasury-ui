'use client';

import { Button } from '@/components/ui/base';
import { SettingsSection } from '@/components/ui/settings-section';
import { payheroApi } from '@/lib/api/payhero';
import { formatCurrency } from '@/lib/utils/currency';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const errMessage = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
const kes = (v: string | number) => formatCurrency(Number(v), 'KES');

/**
 * PayHero's fee schedule as treasury prices collections from it: mirrored daily from PayHero's
 * published schedule (a flat fee per amount band). Tenants choose whether their customers pay it.
 * Shown under Platform, Fee Configuration, with the other gateways' fee rules.
 */
export function PayHeroTariff() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['payhero-platform-settings'], queryFn: () => payheroApi.platformSettings(), retry: false });
  const syncedAt = settings.data?.tariff_synced_at;
  const tariff = useQuery({ queryKey: ['payhero-tariff'], queryFn: () => payheroApi.tariff(), retry: false });
  const sync = useMutation({
    mutationFn: () => payheroApi.syncTariff(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['payhero-tariff'] });
      qc.invalidateQueries({ queryKey: ['payhero-platform-settings'] });
      toast.success(`PayHero fees synced: ${r.bands.length} bands${r.skipped ? `, ${r.skipped} malformed skipped` : ''}`);
    },
    onError: (e: any) => toast.error(errMessage(e, 'Could not sync PayHero fees')),
  });
  const bands = tariff.data?.bands ?? [];

  return (
    <SettingsSection
      icon={<Coins className="h-4 w-4" />}
      title="PayHero fees"
      description={`PayHero's published fee per payment, mirrored daily${syncedAt ? `; last synced ${new Date(syncedAt).toLocaleString()}` : ''}. Shared-account tenants are billed these monthly.`}
      action={
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => sync.mutate()} disabled={sync.isPending}>
          {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync now
        </Button>
      }
    >
      {tariff.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : bands.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fee schedule yet. Sync now to load PayHero&apos;s published fees.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {bands.map((b) => (
            <div key={b.amount_from} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{kes(b.amount_from)}{Number(b.amount_to) > 0 ? ` to ${kes(b.amount_to)}` : ' and up'}</span>
              <span className="font-semibold">{Number(b.price) === 0 ? 'Free' : kes(b.price)}</span>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
