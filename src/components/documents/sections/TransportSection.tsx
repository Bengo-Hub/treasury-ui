'use client';

import { Truck } from 'lucide-react';
import { useCarriers } from '@/hooks/use-inventory';

interface TransportSectionProps {
  tenant: string;
  carrierId?: string;
  carrierName?: string;
  trackingNumber?: string;
  onCarrierChange: (id: string, name: string) => void;
  onTrackingChange: (v: string) => void;
}

export function TransportSection({
  tenant,
  carrierId,
  carrierName,
  trackingNumber,
  onCarrierChange,
  onTrackingChange,
}: TransportSectionProps) {
  const { data } = useCarriers(tenant);
  const carriers = data?.carriers ?? [];

  const inputCls = 'w-full rounded-lg py-2 px-3 text-xs border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const labelCls = 'text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1';

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-4">
      <div className="flex items-center gap-2 text-xs font-black text-foreground">
        <Truck className="h-4 w-4 text-primary" />
        Transport / Shipping
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Carrier</label>
          {carriers.length > 0 ? (
            <select
              value={carrierId ?? ''}
              onChange={e => {
                const c = carriers.find(c => c.id === e.target.value);
                if (c) onCarrierChange(c.id, c.name);
              }}
              className={inputCls}>
              <option value="">— Select carrier —</option>
              {carriers.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>
              ))}
            </select>
          ) : (
            <input
              placeholder="Carrier name…"
              value={carrierName ?? ''}
              onChange={e => onCarrierChange('', e.target.value)}
              className={inputCls} />
          )}
        </div>
        <div>
          <label className={labelCls}>Tracking Number</label>
          <input placeholder="e.g. 1Z999AA10123456784"
            value={trackingNumber ?? ''}
            onChange={e => onTrackingChange(e.target.value)}
            className={inputCls} />
        </div>
      </div>
    </div>
  );
}
