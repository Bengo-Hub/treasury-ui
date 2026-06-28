'use client';

/**
 * ShippingTransportSection — Refrens-style "Add Shipping Details" + Transport Details capture for a
 * document. Captures a customer-charged shipping amount (→ Shipping Recovery 4500 in the GL) and a
 * transport block: transporter (OWN FLEET or a THIRD-PARTY courier name e.g. Wells Fargo / G4S),
 * mode, distance, vehicle, and transport doc no/date. Pure data capture (no courier API) — the
 * parent persists `transport` (JSON) + `shipping_amount` on the invoice/quotation.
 */
export interface TransportDetails {
  transporter_type?: 'own_fleet' | 'third_party';
  transporter_name?: string;
  transport_mode?: string;
  distance?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  transport_doc_number?: string;
  transport_date?: string;
  shipped_from?: string;
  shipped_to?: string;
}

interface Props {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  shippingAmount: number;
  onShippingAmountChange: (v: number) => void;
  transport: TransportDetails;
  onTransportChange: (t: TransportDetails) => void;
  currency?: string;
}

const inputCls =
  'w-full rounded-lg py-2 px-3 text-sm bg-background border border-input text-foreground focus:ring-1 focus:ring-ring';
const labelCls = 'text-xs font-medium text-muted-foreground mb-1 block';

export function ShippingTransportSection({
  enabled, onToggle, shippingAmount, onShippingAmountChange, transport, onTransportChange, currency = 'KES',
}: Props) {
  const set = (patch: Partial<TransportDetails>) => onTransportChange({ ...transport, ...patch });

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 accent-primary" />
        Add Shipping &amp; Transport Details
      </label>

      {enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Shipped From</label>
              <input className={inputCls} value={transport.shipped_from ?? ''} onChange={(e) => set({ shipped_from: e.target.value })} placeholder="Warehouse / origin address" />
            </div>
            <div>
              <label className={labelCls}>Shipped To</label>
              <input className={inputCls} value={transport.shipped_to ?? ''} onChange={(e) => set({ shipped_to: e.target.value })} placeholder="Delivery address" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fleet</label>
              <select
                className={inputCls}
                value={transport.transporter_type ?? 'own_fleet'}
                onChange={(e) => set({ transporter_type: e.target.value as TransportDetails['transporter_type'] })}
              >
                <option value="own_fleet">Own fleet</option>
                <option value="third_party">Third-party courier</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Transporter</label>
              <input className={inputCls} value={transport.transporter_name ?? ''} onChange={(e) => set({ transporter_name: e.target.value })} placeholder="e.g. Wells Fargo, G4S, own driver" />
            </div>
            <div>
              <label className={labelCls}>Mode of transport</label>
              <select className={inputCls} value={transport.transport_mode ?? ''} onChange={(e) => set({ transport_mode: e.target.value })}>
                <option value="">—</option>
                <option value="road">Road</option>
                <option value="rail">Rail</option>
                <option value="air">Air</option>
                <option value="sea">Sea</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Distance</label>
              <input className={inputCls} value={transport.distance ?? ''} onChange={(e) => set({ distance: e.target.value })} placeholder="e.g. 282 km" />
            </div>
            <div>
              <label className={labelCls}>Vehicle type</label>
              <input className={inputCls} value={transport.vehicle_type ?? ''} onChange={(e) => set({ vehicle_type: e.target.value })} placeholder="Regular / Reefer / ..." />
            </div>
            <div>
              <label className={labelCls}>Vehicle number</label>
              <input className={inputCls} value={transport.vehicle_number ?? ''} onChange={(e) => set({ vehicle_number: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <label className={labelCls}>Transport doc #</label>
              <input className={inputCls} value={transport.transport_doc_number ?? ''} onChange={(e) => set({ transport_doc_number: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <label className={labelCls}>Transport date</label>
              <input type="date" className={inputCls} value={transport.transport_date ?? ''} onChange={(e) => set({ transport_date: e.target.value })} />
            </div>
          </div>

          <div className="sm:max-w-xs">
            <label className={labelCls}>Shipping charged to customer ({currency})</label>
            <input
              type="number" min={0} step="0.01" className={inputCls}
              value={shippingAmount || ''}
              onChange={(e) => onShippingAmountChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Adds to the invoice total · posts to Shipping Recovery (4500).</p>
          </div>
        </div>
      )}
    </div>
  );
}
