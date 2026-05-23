'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

interface FiltersPanelProps {
  statusFilter: string;
  onStatusChange: (v: string) => void;
  clientSearch: string;
  onClientSearchChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  onClearAll: () => void;
}

export function FiltersPanel({
  statusFilter, onStatusChange,
  clientSearch, onClientSearchChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  onClearAll,
}: FiltersPanelProps) {
  const [open, setOpen] = useState(true);
  const tags: string[] = [];
  if (statusFilter !== 'all') tags.push(`Status: ${statusFilter}`);
  if (clientSearch.trim())    tags.push(`Client: ${clientSearch}`);
  if (dateFrom)               tags.push(`From: ${dateFrom}`);
  if (dateTo)                 tags.push(`To: ${dateTo}`);
  const hasActive = tags.length > 0;

  const inputCls =
    'w-full bg-background border border-input rounded-lg py-2 px-3 text-xs text-foreground font-medium focus:ring-1 focus:ring-ring focus:border-ring focus:outline-none transition-all shadow-sm';

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-all">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-xs font-bold text-foreground hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground text-sm font-bold">Filters</span>
          {hasActive && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-foreground text-background text-[10px] font-bold">
              {tags.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {hasActive && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); onClearAll(); }}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer transition-colors font-semibold"
            >
              <X className="h-3 w-3" /> Clear All Filters
            </span>
          )}
          {open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-6 pt-2 border-t border-border bg-accent/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Select Quotation Status
              </label>
              <select
                value={statusFilter}
                onChange={e => onStatusChange(e.target.value)}
                className={inputCls}
              >
                <option value="all">Select</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Search Client
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  placeholder="All Clients"
                  value={clientSearch}
                  onChange={e => onClientSearchChange(e.target.value)}
                  className={cn(inputCls, 'pl-9')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Select Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => onDateFromChange(e.target.value)}
                  className={cn(inputCls, 'flex-1 font-mono')}
                />
                <span className="text-muted-foreground font-medium text-xs">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => onDateToChange(e.target.value)}
                  className={cn(inputCls, 'flex-1 font-mono')}
                />
              </div>
            </div>
          </div>

          {hasActive && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider self-center">
                Applied Filters:
              </span>
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-foreground text-[11px] font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
