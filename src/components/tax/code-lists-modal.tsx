'use client';

/**
 * CodeListsModal — a searchable, printable/downloadable view of the tenant's synced KRA
 * eTIMS code lists (grouped by type: TAX_TY, ITEM_CLS, PKG_UNIT, QTY_UNIT, RFD_RSN, …).
 * Reuses the same branded print + JSON/CSV download pattern as the eTIMS response modal.
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAllEtimsCodeLists } from '@/hooks/use-tax';
import { Download, Loader2, Printer, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Code { code_type: string; code: string; name: string; code_detail?: string }

const TYPE_LABELS: Record<string, string> = {
  TAX_TY: 'Tax bands', ITEM_CLS: 'Item classifications', PKG_UNIT: 'Packaging units',
  QTY_UNIT: 'Quantity units', ITEM_TY: 'Item types', PMNT_TY: 'Payment types',
  RFD_RSN: 'Refund reasons', SALES_STTS: 'Sales status', PCHS_STTS: 'Purchase status',
  RCPT_TY: 'Receipt types', SAR_TY: 'Stock I/O types', IMPORT_STTS: 'Import-item status',
  COUNTRY: 'Country codes', CURRENCY: 'Currency codes',
};

function printCodes(groups: [string, Code[]][]) {
  const body = groups.map(([type, codes]) =>
    `<h2>${TYPE_LABELS[type] ?? type} <span>(${type})</span></h2>
     <table><thead><tr><th>Code</th><th>Name</th></tr></thead><tbody>${
       codes.map((c) => `<tr><td class="mono">${c.code}</td><td>${c.name}</td></tr>`).join('')
     }</tbody></table>`).join('');
  const win = window.open('', '_blank', 'width=820,height=1000');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>KRA eTIMS Code Lists</title><style>
    body{font-family:ui-sans-serif,system-ui,sans-serif;color:#111;margin:32px}
    h1{font-size:16px;margin:0 0 4px} .sub{color:#666;font-size:11px;margin-bottom:20px}
    h2{font-size:12px;margin:18px 0 6px} h2 span{color:#999;font-weight:normal}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px}
    th{text-align:left;color:#666;border-bottom:2px solid #e5e5e5;padding:5px 8px}
    td{padding:4px 8px;border-bottom:1px solid #eee} td.mono{font-family:ui-monospace,monospace}
    .foot{margin-top:24px;color:#999;font-size:10px}
  </style></head><body><h1>KRA eTIMS Code Lists</h1>
  <div class="sub">Synced from KRA · generated ${new Date().toLocaleString()}</div>
  ${body}<div class="foot">Produced by Treasury · retain as filing/audit reference.</div>
  </body></html>`);
  win.document.close(); win.focus(); win.print();
}

function downloadCSV(codes: Code[]) {
  const rows = [['code_type', 'code', 'name'], ...codes.map((c) => [c.code_type, c.code, c.name])];
  const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = `kra-code-lists-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function CodeListsModal({ tenantSlug, open, onClose }: { tenantSlug: string; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const { data, isLoading } = useAllEtimsCodeLists(tenantSlug, q || undefined);
  const codes: Code[] = useMemo(() => data?.codes ?? [], [data]);

  const groups = useMemo(() => {
    const m = new Map<string, Code[]>();
    for (const c of codes) {
      if (!m.has(c.code_type)) m.set(c.code_type, []);
      m.get(c.code_type)!.push(c);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [codes]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent title="KRA eTIMS Code Lists" onClose={onClose}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search code or name…"
                className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button type="button" onClick={() => downloadCSV(codes)} disabled={!codes.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button type="button" onClick={() => printCodes(groups)} disabled={!codes.length}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading code lists…
            </div>
          ) : codes.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No code lists synced yet. Use “Refresh Code Lists” on the eTIMS Devices tab to pull them from KRA.
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto">
              {groups.map(([type, list]) => (
                <div key={type}>
                  <h4 className="sticky top-0 bg-card py-1 text-xs font-bold text-foreground">
                    {TYPE_LABELS[type] ?? type} <span className="font-normal text-muted-foreground">· {type} · {list.length}</span>
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-border/60">
                        {list.map((c) => (
                          <tr key={`${type}:${c.code}`}>
                            <td className="w-32 px-3 py-1.5 font-mono text-muted-foreground">{c.code}</td>
                            <td className="px-3 py-1.5">{c.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
