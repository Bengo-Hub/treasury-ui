'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, Loader2, X } from 'lucide-react';

// ---- Simple localStorage-based column manager (used by SharedDocumentList) ----

export interface SimpleColumnDef {
  key: string;
  label: string;
  defaultTable: boolean;
  defaultCsv?: boolean;
}

export interface SimpleColumnPrefs {
  table: Record<string, boolean>;
  csv: Record<string, boolean>;
}

export function loadColumnPrefs(storageKey: string | undefined, cols: SimpleColumnDef[]): SimpleColumnPrefs {
  const defaults: SimpleColumnPrefs = {
    table: Object.fromEntries(cols.map(c => [c.key, c.defaultTable])),
    csv:   Object.fromEntries(cols.map(c => [c.key, c.defaultCsv ?? false])),
  };
  if (!storageKey) return defaults;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function saveColumnPrefs(storageKey: string | undefined, prefs: SimpleColumnPrefs) {
  if (!storageKey) return;
  try { localStorage.setItem(storageKey, JSON.stringify(prefs)); } catch {}
}

interface SimpleColumnManagerProps {
  columns: SimpleColumnDef[];
  storageKey?: string;
  onClose: () => void;
  onApply: (prefs: SimpleColumnPrefs) => void;
}

export function SimpleColumnManager({ columns, storageKey, onClose, onApply }: SimpleColumnManagerProps) {
  const [prefs, setPrefs] = useState<SimpleColumnPrefs>(() => loadColumnPrefs(storageKey, columns));

  const toggle = (key: string, type: 'table' | 'csv') =>
    setPrefs(p => ({ ...p, [type]: { ...p[type], [key]: !p[type][key] } }));

  const handleApply = () => {
    saveColumnPrefs(storageKey, prefs);
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
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-black text-foreground">Show / Hide Columns</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-2 px-5 pt-3 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
          <div>Column</div>
          <div className="text-center">Table</div>
          <div className="text-center">CSV</div>
        </div>
        <div className="overflow-y-auto flex-1 px-2 py-1">
          {columns.map(col => (
            <div key={col.key} className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-2 items-center px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors">
              <span className="text-xs font-semibold text-foreground truncate">{col.label}</span>
              {(['table', 'csv'] as const).map(type => (
                <div key={type} className="flex justify-center">
                  <input type="checkbox" checked={prefs[type][col.key] ?? false}
                    onChange={() => toggle(col.key, type)}
                    className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-0 cursor-pointer" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-all">Cancel</button>
          <button onClick={handleApply} className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-all shadow-sm">Apply</button>
        </div>
      </div>
    </div>
  );
}
import {
  useDocumentColumns,
  useSaveDocumentColumns,
  defaultPrefsFromDefs,
} from '@/hooks/use-document-columns';
import type { ColumnDef, ColumnPrefs } from '@/lib/api/document-columns';

/** localStorage prefs shape (mirrors ColumnPrefs but uses Record<string,bool> for easy checkbox binding) */
export interface LocalColumnPrefs {
  order: string[];
  table: Record<string, boolean>;
  csv: Record<string, boolean>;
  pdf: Record<string, boolean>;
}

function toLocal(prefs: ColumnPrefs, columns: ColumnDef[]): LocalColumnPrefs {
  const tableSet = new Set(prefs.table);
  const csvSet = new Set(prefs.csv);
  const pdfSet = new Set(prefs.pdf);
  return {
    order: prefs.table.length ? prefs.table : columns.map((c) => c.key),
    table: Object.fromEntries(columns.map((c) => [c.key, tableSet.has(c.key)])),
    csv: Object.fromEntries(columns.map((c) => [c.key, csvSet.has(c.key)])),
    pdf: Object.fromEntries(columns.map((c) => [c.key, pdfSet.has(c.key)])),
  };
}

function toRemote(local: LocalColumnPrefs): ColumnPrefs {
  return {
    table: local.order.filter((k) => local.table[k]),
    csv: local.order.filter((k) => local.csv[k]),
    pdf: local.order.filter((k) => local.pdf[k]),
  };
}

interface ColumnManagerProps {
  tenant: string;
  docType: string;
  onClose: () => void;
  /** Called after prefs are saved — passes visible table column keys */
  onApply: (tableKeys: string[]) => void;
}

export function ColumnManager({ tenant, docType, onClose, onApply }: ColumnManagerProps) {
  const { data, isLoading } = useDocumentColumns(tenant, docType);
  const saveMutation = useSaveDocumentColumns(tenant, docType);

  const columns: ColumnDef[] = data?.columns ?? [];
  const [prefs, setPrefs] = useState<LocalColumnPrefs | null>(null);
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);

  // Initialise prefs once column defs are loaded
  useEffect(() => {
    if (!columns.length) return;
    if (prefs) return;
    const remote = data?.userPrefs ?? defaultPrefsFromDefs(columns);
    setPrefs(toLocal(remote, columns));
  }, [columns, data?.userPrefs, prefs]);

  const toggle = useCallback((key: string, type: 'table' | 'csv' | 'pdf') => {
    setPrefs((p) => p ? { ...p, [type]: { ...p[type], [key]: !p[type][key] } } : p);
  }, []);

  const onDragStart = (idx: number) => { dragIdx.current = idx; };
  const onDragEnter = (idx: number) => { overIdx.current = idx; };
  const onDragEnd = () => {
    if (dragIdx.current === null || overIdx.current === null) return;
    if (dragIdx.current === overIdx.current) { dragIdx.current = overIdx.current = null; return; }
    setPrefs((p) => {
      if (!p) return p;
      const next = [...p.order];
      const [moved] = next.splice(dragIdx.current!, 1);
      next.splice(overIdx.current!, 0, moved);
      dragIdx.current = overIdx.current = null;
      return { ...p, order: next };
    });
  };

  const handleApply = () => {
    if (!prefs) return;
    const remote = toRemote(prefs);
    saveMutation.mutate(remote);
    onApply(remote.table);
    onClose();
  };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const orderedCols = prefs
    ? prefs.order.map((k) => columns.find((c) => c.key === k)).filter((c): c is ColumnDef => !!c)
    : columns;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-black text-foreground">Show / Hide Columns</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <>
            <div className="grid grid-cols-[1.5rem_1fr_4.5rem_4.5rem_4.5rem] gap-2 px-5 pt-3 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
              <div />
              <div>Column</div>
              <div className="text-center">Table</div>
              <div className="text-center">CSV</div>
              <div className="text-center">PDF</div>
            </div>

            <div className="overflow-y-auto flex-1 px-2 py-1">
              {orderedCols.map((col, idx) => (
                <div
                  key={col.key}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragEnter={() => onDragEnter(idx)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="grid grid-cols-[1.5rem_1fr_4.5rem_4.5rem_4.5rem] gap-2 items-center px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors cursor-grab active:cursor-grabbing group"
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-foreground truncate">{col.label}</span>
                  {(['table', 'csv', 'pdf'] as const).map((type) => (
                    <div key={type} className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={prefs?.[type][col.key] ?? false}
                        onChange={() => toggle(col.key, type)}
                        className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-0 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
              <button onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-all">
                Cancel
              </button>
              <button onClick={handleApply} disabled={saveMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-all shadow-sm disabled:opacity-50">
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />}
                Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
