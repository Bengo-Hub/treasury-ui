'use client';

import { useState } from 'react';
import { useCapitalAllowanceSchedule, useCAAssets, useCreateCAAsset, useDeleteCAAsset, useUpdateCAAsset } from '@/hooks/use-tax';

interface Props { tenantSlug: string }

const label = 'text-xs text-muted-foreground';
const field = 'rounded border px-3 py-2 text-sm';

function money(v?: string) {
  return `KES ${Number(v ?? 0).toLocaleString()}`;
}

/**
 * Capital allowances — KRA wear-and-tear / investment-deduction schedule. Maintains a fixed-asset
 * register and computes the annual deductible allowance per asset class (reducing balance on the
 * written-down value for plant classes; straight line on cost for buildings).
 */
export function CapitalAllowancesTab({ tenantSlug }: Props) {
  const { data: schedule } = useCapitalAllowanceSchedule(tenantSlug);
  const { data: assetsData } = useCAAssets(tenantSlug);
  const createAsset = useCreateCAAsset(tenantSlug);
  const deleteAsset = useDeleteCAAsset(tenantSlug);
  const updateAsset = useUpdateCAAsset(tenantSlug);

  const [name, setName] = useState('');
  const [cls, setCls] = useState('');
  const [cost, setCost] = useState('');

  const classes = assetsData?.classes ?? [];

  const submit = () => {
    if (!name || !cls || !cost) return;
    const isBuilding = cls === 'CA_IBA' || cls === 'CA_COMMERCIAL_BLDG';
    createAsset.mutate(
      { name, ca_class_code: cls, cost: Number(cost), method: isBuilding ? 'straight_line' : 'reducing_balance' },
      { onSuccess: () => { setName(''); setCost(''); } },
    );
  };

  return (
    <div className="space-y-6">
      {/* Schedule summary */}
      {schedule && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-sm">
            Capital allowance schedule <span className="font-normal text-muted-foreground">({schedule.year})</span>
          </h3>
          {schedule.classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets yet — add a fixed asset below to compute allowances.</p>
          ) : (
            <table className="w-full text-sm border">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Assets</th>
                  <th className="px-3 py-2 text-right">Opening WDV</th>
                  <th className="px-3 py-2 text-right">Allowance</th>
                  <th className="px-3 py-2 text-right">Closing WDV</th>
                </tr>
              </thead>
              <tbody>
                {schedule.classes.map((c) => (
                  <tr key={c.class_code} className="border-t">
                    <td className="px-3 py-2">{c.class_name}</td>
                    <td className="px-3 py-2 text-right">{Number(c.rate)}%</td>
                    <td className="px-3 py-2 text-right">{c.asset_count}</td>
                    <td className="px-3 py-2 text-right">{money(c.opening_wdv)}</td>
                    <td className="px-3 py-2 text-right font-medium text-primary">{money(c.annual_allowance)}</td>
                    <td className="px-3 py-2 text-right">{money(c.closing_wdv)}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/50 font-semibold">
                  <td className="px-3 py-2" colSpan={4}>Total annual allowance</td>
                  <td className="px-3 py-2 text-right text-primary">{money(schedule.total_annual_allowance)}</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          )}
          {schedule.notes?.map((n, i) => <p key={i} className="text-xs text-muted-foreground">{n}</p>)}
        </div>
      )}

      {/* Add asset */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Add fixed asset</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className={label}>Asset name</label>
            <input className={`${field} w-full`} placeholder="e.g. Delivery van" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="min-w-[180px]">
            <label className={label}>KRA class</label>
            <select className={`${field} w-full`} value={cls} onChange={(e) => setCls(e.target.value)}>
              <option value="">Select class…</option>
              {classes.map((c) => <option key={c.code} value={c.code}>{c.name} ({Number(c.rate)}%)</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className={label}>Cost (KES)</label>
            <input className={`${field} w-full`} type="number" placeholder="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <button
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            disabled={!name || !cls || !cost || createAsset.isPending}
            onClick={submit}
          >{createAsset.isPending ? 'Adding…' : 'Add asset'}</button>
        </div>
      </div>

      {/* Asset register */}
      {assetsData && assetsData.assets.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Asset register ({assetsData.total})</h3>
          <table className="w-full text-sm border">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">WDV</th>
                <th className="px-3 py-2">Purchased</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {assetsData.assets.map((a) => {
                const unclassified = a.ca_class_code === 'UNCLASSIFIED' || !a.ca_class_code;
                return (
                <tr key={a.id} className={`border-t ${a.disposed ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2">
                    {a.name}
                    {a.source_asset_id && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">from inventory</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {/* Auto-synced inventory assets land UNCLASSIFIED — let the user assign a KRA class inline. */}
                    {unclassified ? (
                      <select
                        className={`${field} py-1 ${unclassified ? 'border-yellow-500/60' : ''}`}
                        defaultValue=""
                        disabled={updateAsset.isPending}
                        onChange={(e) => {
                          const code = e.target.value;
                          if (!code) return;
                          const isBuilding = code === 'CA_IBA' || code === 'CA_COMMERCIAL_BLDG';
                          updateAsset.mutate({ id: a.id, body: { ca_class_code: code, method: isBuilding ? 'straight_line' : 'reducing_balance' } });
                        }}
                      >
                        <option value="">Classify…</option>
                        {classes.map((c) => <option key={c.code} value={c.code}>{c.name} ({Number(c.rate)}%)</option>)}
                      </select>
                    ) : (
                      a.ca_class_code
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{money(a.cost)}</td>
                  <td className="px-3 py-2 text-right">{money(a.written_down_value)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{a.purchase_date?.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-right">
                    <button className="text-destructive hover:underline" onClick={() => deleteAsset.mutate(a.id)}>Remove</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
