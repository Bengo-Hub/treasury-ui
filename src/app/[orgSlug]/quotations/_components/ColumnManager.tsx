'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';

export interface ColumnDef {
  key: string;
  label: string;
  defaultTable: boolean;
  defaultCsv: boolean;
}

export const ALL_COLUMNS: ColumnDef[] = [
  { key: 'date',                   label: 'Date',                         defaultTable: true,  defaultCsv: true  },
  { key: 'expand',                 label: 'Expand Line Items',            defaultTable: true,  defaultCsv: true  },
  { key: 'quote_number',           label: 'Quotation',                    defaultTable: true,  defaultCsv: true  },
  { key: 'customer',               label: 'Quoted To',                    defaultTable: true,  defaultCsv: true  },
  { key: 'currency',               label: 'Currency',                     defaultTable: false, defaultCsv: true  },
  { key: 'amount',                 label: 'Amount',                       defaultTable: true,  defaultCsv: true  },
  { key: 'status',                 label: 'Status',                       defaultTable: true,  defaultCsv: true  },
  { key: 'place_of_supply',        label: 'Place Of Supply',              defaultTable: false, defaultCsv: true  },
  { key: 'valid_until',            label: 'Valid Till Date',              defaultTable: false, defaultCsv: true  },
  { key: 'due_amount',             label: 'Due Amount',                   defaultTable: false, defaultCsv: true  },
  { key: 'tds_pct',                label: 'TDS (%)',                      defaultTable: false, defaultCsv: true  },
  { key: 'tds',                    label: 'TDS',                          defaultTable: false, defaultCsv: true  },
  { key: 'payment_date',           label: 'Payment Date',                 defaultTable: true,  defaultCsv: true  },
  { key: 'tax_rate',               label: 'TAX Rate',                     defaultTable: false, defaultCsv: true  },
  { key: 'tax_amount',             label: 'Tax Amount',                   defaultTable: false, defaultCsv: true  },
  { key: 'acceptance_status',      label: 'Acceptance Status',            defaultTable: true,  defaultCsv: true  },
  { key: 'vat_recipient',          label: 'VAT of Recipient',             defaultTable: false, defaultCsv: true  },
  { key: 'client_email',           label: 'Client Email',                 defaultTable: false, defaultCsv: true  },
  { key: 'client_phone',           label: 'Client Phone',                 defaultTable: false, defaultCsv: true  },
  { key: 'quotation_email',        label: 'Quotation Email',              defaultTable: true,  defaultCsv: true  },
  { key: 'tax_invoice',            label: 'Tax Invoice',                  defaultTable: false, defaultCsv: true  },
  { key: 'reverse_charge',         label: 'Reverse Charge Applicable',    defaultTable: true,  defaultCsv: true  },
  { key: 'amount_kes',             label: 'Amount Due in KES',            defaultTable: false, defaultCsv: true  },
  { key: 'sub_total',              label: 'Sub Total',                    defaultTable: true,  defaultCsv: true  },
  { key: 'discount',               label: 'Discount',                     defaultTable: false, defaultCsv: true  },
  { key: 'taxable_value',          label: 'Taxable Value',                defaultTable: false, defaultCsv: true  },
  { key: 'hsn_sac',                label: 'HSN/SAC list',                 defaultTable: false, defaultCsv: true  },
  { key: 'sku_list',               label: 'SKU ID list',                  defaultTable: false, defaultCsv: true  },
  { key: 'quotation_amount_kes',   label: 'Quotation Amount in KES',      defaultTable: true,  defaultCsv: true  },
  { key: 'additional_charges',     label: 'Total Additional Charges',     defaultTable: false, defaultCsv: true  },
  { key: 'transporter_mode',       label: 'Transporter Mode',             defaultTable: false, defaultCsv: true  },
  { key: 'distance',               label: 'Distance',                     defaultTable: false, defaultCsv: true  },
  { key: 'workflow_name',          label: 'Workflow Name',                defaultTable: true,  defaultCsv: true  },
  { key: 'current_assignee',       label: 'Current Assignee',             defaultTable: true,  defaultCsv: true  },
  { key: 'current_stage',          label: 'Current Stage',                defaultTable: true,  defaultCsv: true  },
  { key: 'current_status',         label: 'Current Status',               defaultTable: true,  defaultCsv: true  },
  { key: 'linked_documents',       label: 'Linked Documents',             defaultTable: false, defaultCsv: false },
  { key: 'quotation_title',        label: 'Quotation Title',              defaultTable: false, defaultCsv: true  },
  { key: 'actions',                label: 'Actions',                      defaultTable: true,  defaultCsv: false },
];

const STORAGE_KEY = 'quotation-column-prefs';

export interface ColumnPrefs {
  order:  string[];          // ordered list of column keys
  table:  Record<string, boolean>;
  csv:    Record<string, boolean>;
}

function defaultPrefs(): ColumnPrefs {
  return {
    order: ALL_COLUMNS.map(c => c.key),
    table: Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultTable])),
    csv:   Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultCsv])),
  };
}

export function loadColumnPrefs(): ColumnPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultPrefs(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultPrefs();
}

function saveColumnPrefs(prefs: ColumnPrefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

interface ColumnManagerProps {
  onClose: () => void;
  onApply: (prefs: ColumnPrefs) => void;
}

export function ColumnManager({ onClose, onApply }: ColumnManagerProps) {
  const [prefs, setPrefs] = useState<ColumnPrefs>(loadColumnPrefs);
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);

  const orderedCols = prefs.order
    .map(key => ALL_COLUMNS.find(c => c.key === key))
    .filter((c): c is ColumnDef => !!c);

  const toggle = useCallback((key: string, type: 'table' | 'csv') => {
    setPrefs(p => ({ ...p, [type]: { ...p[type], [key]: !p[type][key] } }));
  }, []);

  const onDragStart = (idx: number) => { dragIdx.current = idx; };
  const onDragEnter = (idx: number) => { overIdx.current = idx; };
  const onDragEnd   = () => {
    if (dragIdx.current === null || overIdx.current === null) return;
    if (dragIdx.current === overIdx.current) { dragIdx.current = overIdx.current = null; return; }
    setPrefs(p => {
      const next = [...p.order];
      const [moved] = next.splice(dragIdx.current!, 1);
      next.splice(overIdx.current!, 0, moved);
      dragIdx.current = overIdx.current = null;
      return { ...p, order: next };
    });
  };

  const handleApply = () => {
    saveColumnPrefs(prefs);
    onApply(prefs);
    onClose();
  };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900">Show / Hide Columns</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1.5rem_1fr_5rem_5rem] gap-3 px-5 pt-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <div />
          <div>Column</div>
          <div className="text-center">Show in Table</div>
          <div className="text-center">Show in CSV</div>
        </div>

        {/* Scrollable column list */}
        <div className="overflow-y-auto flex-1 px-2 py-1">
          {orderedCols.map((col, idx) => (
            <div
              key={col.key}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragEnter={() => onDragEnter(idx)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
              className="grid grid-cols-[1.5rem_1fr_5rem_5rem] gap-3 items-center px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-grab active:cursor-grabbing group"
            >
              <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-700 truncate">{col.label}</span>
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={prefs.table[col.key] ?? col.defaultTable}
                  onChange={() => toggle(col.key, 'table')}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={prefs.csv[col.key] ?? col.defaultCsv}
                  onChange={() => toggle(col.key, 'csv')}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button onClick={handleApply}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
