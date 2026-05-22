'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Pagination } from '@/components/ui/pagination';
import {
  useQuotations,
  useCreateQuotation,
  useSendQuotation,
  useAcceptQuotation,
  useDeclineQuotation,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { Quotation, CreateQuotationRequest, LineRequest } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import {
  Filter,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Check,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  CalendarRange,
  SlidersHorizontal,
  FileSpreadsheet,
  Users,
  Tag,
  Upload,
  Eye,
  ExternalLink,
  Pencil,
  Copy,
  ArrowLeft,
  Percent,
  Image as ImageIcon,
  Info,
  RefreshCw,
  Columns,
  Scale,
  Paperclip,
  UserPlus,
  FileDown,
  FileUp,
  ChevronRight,
  FolderArchive,
  Star,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ITEMS_PER_PAGE = 20;

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' {
  switch (status?.toLowerCase()) {
    case 'accepted': return 'success';
    case 'sent': return 'default';
    case 'draft': return 'secondary';
    case 'expired': return 'warning';
    case 'declined': return 'error';
    case 'converted': return 'success';
    default: return 'outline';
  }
}

interface ExtendedLineRequest extends LineRequest {
  tax_rate: number;
}

const emptyLine = (): ExtendedLineRequest => ({ description: '', quantity: 1, unit_price: 1, tax_rate: 0 });

const TABS = [
  { id: 'overview',        label: 'Overview',         icon: FileSpreadsheet },
  { id: 'manage-clients',  label: 'Manage Clients',   icon: Users },
  { id: 'tag-wise-report', label: 'Tag-wise Report',  icon: Tag },
];

interface DropdownItem { label: string; icon?: React.ReactNode; onClick: () => void; className?: string; }

function DropdownMenu({ items, onClose }: { items: DropdownItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 z-50 min-w-[240px] rounded-xl border border-slate-200/80 bg-white shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
      {items.map((item, idx) => (
        <button key={idx} onClick={() => { item.onClick(); onClose(); }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left",
            item.className
          )}>
          {item.icon && <span className="text-slate-400">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

interface FiltersPanelProps {
  statusFilter: string; onStatusChange: (v: string) => void;
  clientSearch: string; onClientSearchChange: (v: string) => void;
  dateFrom: string; onDateFromChange: (v: string) => void;
  dateTo: string; onDateToChange: (v: string) => void;
  onClearAll: () => void;
}

function FiltersPanel({ statusFilter, onStatusChange, clientSearch, onClientSearchChange,
  dateFrom, onDateFromChange, dateTo, onDateToChange, onClearAll }: FiltersPanelProps) {
  const [open, setOpen] = useState(true);
  const hasActive = statusFilter !== 'all' || !!clientSearch.trim() || !!dateFrom || !!dateTo;
  const tags: string[] = [];
  if (statusFilter !== 'all') tags.push(`Status: ${statusFilter}`);
  if (clientSearch.trim())    tags.push(`Client: ${clientSearch}`);
  if (dateFrom)               tags.push(`From: ${dateFrom}`);
  if (dateTo)                 tags.push(`To: ${dateTo}`);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden transition-all">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-xs font-bold text-slate-700 hover:bg-slate-50/60 transition-colors">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <span className="text-slate-900 text-sm font-bold">Filters</span>
          {hasActive && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">{tags.length}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {hasActive && (
            <span role="button" tabIndex={0}
              onClick={e => { e.stopPropagation(); onClearAll(); }}
              className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 cursor-pointer transition-colors font-semibold">
              <X className="h-3 w-3" /> Clear All Filters
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-6 pt-2 border-t border-slate-100 bg-slate-50/20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Quotation Status</label>
              <select value={statusFilter} onChange={e => onStatusChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all shadow-sm">
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
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search Client</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input placeholder="All Clients" value={clientSearch} onChange={e => onClientSearchChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-700 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all shadow-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Date Range</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-700 focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all shadow-sm" />
                </div>
                <span className="text-slate-300 font-medium text-xs">—</span>
                <input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-700 focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tag-wise Report Component ──────────────────────────────────────────────
function TagWiseReport() {
  const [dateFrom, setDateFrom] = useState('2026-02-21');
  const [dateTo, setDateTo]     = useState('2026-05-21');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(['all']);

  const statusOptions = ['All', 'Draft', 'Sent', 'Accepted', 'Declined', 'Expired', 'Converted'];

  const toggleStatus = (s: string) => {
    const key = s.toLowerCase();
    if (key === 'all') { setSelectedStatus(['all']); return; }
    setSelectedStatus(prev => {
      const without = prev.filter(x => x !== 'all');
      return without.includes(key) ? (without.filter(x => x !== key).length ? without.filter(x => x !== key) : ['all']) : [...without, key];
    });
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page heading */}
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Tag Wise Report</h2>
      </div>

      {/* Filters row */}
      <div className="space-y-4">
        {/* Date Range */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Invoice Date</label>
          <div className="relative inline-flex items-center gap-2">
            <div
              onClick={() => setShowDatePicker(o => !o)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-300 shadow-sm transition-all min-w-[210px]">
              <span>{formatDisplayDate(dateFrom)} - {formatDisplayDate(dateTo)}</span>
              <Calendar className="h-3.5 w-3.5 text-slate-400 ml-1" />
            </div>
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4 space-y-3 min-w-[260px]">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900" />
                </div>
                <button onClick={() => setShowDatePicker(false)}
                  className="w-full py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all">
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Select Invoice Status</label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(s => {
              const key = s.toLowerCase();
              const isActive = selectedStatus.includes(key);
              return (
                <button key={s} onClick={() => toggleStatus(s)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all',
                    isActive
                      ? 'bg-white border-violet-400 text-violet-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  )}>
                  {isActive && <Check className="h-3 w-3 text-violet-500" />}
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table toolbar */}
      <div className="flex items-center justify-end gap-2">
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
          <Download className="h-3.5 w-3.5 text-slate-400" /> Download CSV
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
          <Columns className="h-3.5 w-3.5 text-slate-400" /> Show/Hide Columns
        </button>
      </div>

      {/* Table */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold text-[11px]">
                <th className="p-3 pl-4 w-8"><input type="checkbox" className="rounded border-slate-300 focus:ring-0" disabled /></th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors font-bold uppercase tracking-wide">
                    Tag Name <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors font-bold uppercase tracking-wide">
                    Last Quotation Date <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors font-bold uppercase tracking-wide">
                    Total Quotation <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors font-bold uppercase tracking-wide">
                    Total Quotation Amount <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3 pr-4">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors font-bold uppercase tracking-wide">
                    Total GST <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="p-0">
                  {/* Empty state */}
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    {/* Inbox illustration */}
                    <div className="mb-4 relative">
                      <div className="h-20 w-24 rounded-2xl bg-violet-100/60 flex items-center justify-center">
                        <div className="relative">
                          <div className="h-10 w-14 bg-violet-200/80 rounded-md border-2 border-violet-300/60" />
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-3 w-8 bg-violet-300/60 rounded-t-md" />
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 bg-violet-400/40 rounded-full" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No Data</p>
                    <p className="text-xs text-slate-400 mt-1">No records found for the selected filters.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Manage Clients Component ────────────────────────────────────────────────
function ManageClients({ onAddClient, addClientDropOpen, setAddClientDropOpen, addClientDropItems }: {
  onAddClient: () => void;
  addClientDropOpen: boolean;
  setAddClientDropOpen: (v: boolean) => void;
  addClientDropItems: DropdownItem[];
}) {
  const [clientActiveTab, setClientActiveTab] = useState<'active' | 'archived'>('active');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const mockClients = useMemo(() => [
    {
      id: '1',
      name: 'Rotary Club Migori',
      type: 'Prospect',
      industry: '—',
      phone: '—',
      email: '—',
      country: 'KE',
      status: '—',
      lastCommunication: '—',
    }
  ], []);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">

      {/* Header row — title + Add Client button (matching screenshot top-right placement) */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Your Clients</h1>
        </div>
        <div className="relative flex items-center shadow-md">
          <button onClick={onAddClient}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-l-lg transition-all">
            <Plus className="h-3.5 w-3.5" /> Add Client
          </button>
          <button onClick={() => setAddClientDropOpen(!addClientDropOpen)}
            className="flex items-center px-2 py-2 text-white bg-rose-600 border-l border-rose-500 rounded-r-lg hover:bg-rose-700 transition-all">
            <ChevronDown className="h-3.5 w-3.5 text-slate-200" />
          </button>
          {addClientDropOpen && <DropdownMenu items={addClientDropItems} onClose={() => setAddClientDropOpen(false)} />}
        </div>
      </div>

      {/* "All Clients | Reports & More" top nav — matching screenshot */}
      <div className="flex items-center gap-0 border-b border-slate-200">
        <button className="px-4 py-2.5 text-xs font-bold border-b-2 border-violet-600 text-violet-700 -mb-px transition-colors">
          All Clients
        </button>
        <button className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b-2 border-transparent hover:text-slate-800 -mb-px transition-colors flex items-center gap-1">
          Reports & More <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Active / Archived sub-tabs */}
      <div className="flex items-center gap-6 pt-2 text-xs font-semibold">
        <button onClick={() => setClientActiveTab('active')}
          className={cn("pb-1 transition-colors border-b-2",
            clientActiveTab === 'active'
              ? "text-slate-900 border-slate-900 font-bold"
              : "text-slate-400 border-transparent hover:text-slate-700")}>
          Active Clients
        </button>
        <button onClick={() => setClientActiveTab('archived')}
          className={cn("pb-1 transition-colors border-b-2",
            clientActiveTab === 'archived'
              ? "text-slate-900 border-slate-900 font-bold"
              : "text-slate-400 border-transparent hover:text-slate-700")}>
          Archived Clients
        </button>
      </div>

      {/* Toolbar row */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <span className="text-xs font-semibold text-slate-500">
          Showing <span className="font-black text-slate-900">1</span> to <span className="font-black text-slate-900">1</span> of <span className="font-black text-slate-900">{mockClients.length}</span> Client
        </span>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
            <Download className="h-3.5 w-3.5 text-slate-400" /> Download CSV
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              placeholder="Search Clients"
              className="bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-8 text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-all shadow-sm w-52"
              value={clientSearchQuery}
              onChange={e => setClientSearchQuery(e.target.value)} />
            <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-sm transition-all">
            <Columns className="h-3.5 w-3.5 text-slate-400" /> Show/Hide Columns
          </button>
        </div>
      </div>

      {/* Client Table — columns matching screenshot exactly */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold text-[11px]">
                <th className="p-3 pl-4 w-8"><input type="checkbox" className="rounded border-slate-300 focus:ring-0" disabled /></th>
                <th className="p-3 w-12 text-center">Logo</th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
                    Name <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3">Select Clients/Prospects</th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
                    Industry <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3">Added to Portfolio</th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
                    Phone <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
                    Email <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
                    Country <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3">Status</th>
                <th className="p-3">
                  <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
                    Last Communication Date <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {mockClients
                .filter(c => !clientSearchQuery.trim() || c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()))
                .map((client, idx) => (
                  <tr key={client.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="p-3 pl-4 text-slate-400 text-[11px] font-mono">{idx + 1}</td>
                    <td className="p-3 text-center">
                      <div className="h-8 w-8 bg-navy-800 text-white font-black text-sm rounded-lg flex items-center justify-center shadow-sm mx-auto">
                        {client.name.charAt(0)}
                      </div>
                    </td>
                    <td className="p-3 text-slate-900 font-bold whitespace-nowrap">{client.name}</td>
                    <td className="p-3 text-slate-600 font-semibold">{client.type}</td>
                    <td className="p-3 text-slate-400">{client.industry}</td>
                    <td className="p-3">
                      <button className="text-violet-600 hover:text-violet-800 font-semibold transition-colors text-xs">
                        Add to Portfolio
                      </button>
                    </td>
                    <td className="p-3 text-slate-400">{client.phone}</td>
                    <td className="p-3 text-slate-400 font-mono">{client.email}</td>
                    <td className="p-3 text-slate-700 font-bold">{client.country}</td>
                    <td className="p-3 text-slate-400">{client.status}</td>
                    <td className="p-3 text-slate-400 font-mono">{client.lastCommunication}</td>
                    <td className="p-3 pr-4 text-right whitespace-nowrap">
                      {/* Action icons matching screenshot — folder/add-portfolio, pencil/edit, archive, more */}
                      <div className="inline-flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button title="Add to Portfolio" className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-violet-700 transition-colors">
                          <div className="p-1.5 bg-violet-50 rounded-md">
                            <Star className="h-3.5 w-3.5 text-violet-500" />
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400">Portfolio</span>
                        </button>
                        <button title="Edit" className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 transition-colors">
                          <div className="p-1.5 bg-slate-100 rounded-md">
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400">Edit</span>
                        </button>
                        <button title="Archive" className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-amber-700 transition-colors">
                          <div className="p-1.5 bg-slate-100 rounded-md">
                            <FolderArchive className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400">Archive</span>
                        </button>
                        <button title="More" className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 transition-colors">
                          <div className="p-1.5 bg-slate-100 rounded-md">
                            <MoreHorizontal className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400">More</span>
                        </button>
                      </div>
                      {/* Fallback always-visible minimal actions */}
                      <div className="inline-flex items-center gap-2 group-hover:hidden">
                        <button className="p-1 text-slate-300 hover:text-violet-600 transition-colors"><Star className="h-3.5 w-3.5" /></button>
                        <button className="p-1 text-slate-300 hover:text-slate-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button className="p-1 text-slate-300 hover:text-amber-600 transition-colors"><FolderArchive className="h-3.5 w-3.5" /></button>
                        <button className="p-1 text-slate-300 hover:text-slate-600 transition-colors"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Footer count + show/hide columns */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-semibold text-slate-500">
          Showing <span className="font-black text-slate-900">1</span> to <span className="font-black text-slate-900">1</span> of <span className="font-black text-slate-900">{mockClients.length}</span> Client
        </span>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-sm transition-all">
          <Columns className="h-3.5 w-3.5 text-slate-400" /> Show/Hide Columns
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function QuotationsPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;

  const [searchQuery,  setSearchQuery]  = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page,         setPage]         = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');

  const [activeTab,           setActiveTab]           = useState('overview');
  const [quotationType,       setQuotationType]       = useState<'active' | 'deleted'>('active');
  const [quotationTypeOpen,   setQuotationTypeOpen]   = useState(false);

  const [createDropOpen,    setCreateDropOpen]    = useState(false);
  const [downloadDropOpen,  setDownloadDropOpen]  = useState(false);
  const [addClientDropOpen, setAddClientDropOpen] = useState(false);

  const [createOpen,          setCreateOpen]          = useState(false);
  const [viewQuotation,       setViewQuotation]       = useState<Quotation | null>(null);
  const [editQuotation,       setEditQuotation]       = useState<Quotation | null>(null);
  const [duplicateQuotation,  setDuplicateQuotation]  = useState<Quotation | null>(null);

  const [displayUnitAs,       setDisplayUnitAs]       = useState('Merge with quantity');
  const [showTaxSummary,      setShowTaxSummary]      = useState('Do not show');
  const [hideCountryOfSupply, setHideCountryOfSupply] = useState(false);
  const [addOriginalImages,   setAddOriginalImages]   = useState(false);
  const [showThumbnailsSep,   setShowThumbnailsSep]   = useState(false);
  const [showDescFullWidth,   setShowDescFullWidth]   = useState(false);
  const [hideSubtotalGroup,   setHideSubtotalGroup]   = useState(false);
  const [showSkuInQuote,      setShowSkuInQuote]      = useState(false);
  const [showSerialNumbers,   setShowSerialNumbers]   = useState(false);
  const [displayBatchDetails, setDisplayBatchDetails] = useState(false);

  const [quoteNumber, setQuoteNumber] = useState('A00023');

  const handleClearAllFilters = useCallback(() => {
    setStatusFilter('all'); setClientSearch(''); setDateFrom(''); setDateTo(''); setSearchQuery(''); setPage(1);
  }, []);

  const filters = useMemo(() => ({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    page,
    limit: ITEMS_PER_PAGE,
  }), [statusFilter, page]);

  const { data, isLoading } = useQuotations(effectiveTenant, filters, !!effectiveTenant);
  const quotations  = data?.quotations ?? [];
  const total       = data?.total      ?? 0;

  const filtered = useMemo(() => {
    let result = quotations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((qt: Quotation) =>
        qt.quote_number?.toLowerCase().includes(q) ||
        qt.customer_name?.toLowerCase().includes(q));
    }
    if (clientSearch.trim()) {
      const c = clientSearch.toLowerCase();
      result = result.filter((qt: Quotation) => qt.customer_name?.toLowerCase().includes(c));
    }
    if (dateFrom) result = result.filter((qt: Quotation) => qt.quote_date >= dateFrom);
    if (dateTo)   result = result.filter((qt: Quotation) => qt.quote_date <= dateTo);
    return result;
  }, [quotations, searchQuery, clientSearch, dateFrom, dateTo]);

  const [newQuote, setNewQuote] = useState<{
    customer_name: string; customer_email: string; quote_date: string;
    valid_until: string; currency: string; notes: string; terms: string; lines: ExtendedLineRequest[];
  }>({
    customer_name: '', customer_email: '',
    quote_date:  new Date().toISOString().slice(0, 10),
    valid_until: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    currency: 'KES', notes: '', terms: 'Thanks for doing business with us', lines: [emptyLine()],
  });

  const createMutation  = useCreateQuotation(effectiveTenant);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    const computedLines = newQuote.lines.map(line => {
      const qty = Number(line.quantity || 0);
      const rate = Number(line.unit_price || 0);
      const tx = Number(line.tax_rate || 0);
      const net = qty * rate;
      const taxComponent = net * (tx / 100);
      subtotal += net;
      totalTax += taxComponent;
      return { ...line, amount: net, taxAmount: taxComponent, total: net + taxComponent };
    });
    return { lines: computedLines, subtotal, totalTax, grandTotal: subtotal + totalTax };
  }, [newQuote.lines]);

  const handleCreate = useCallback(() => {
    const body: CreateQuotationRequest = {
      customer_name:  newQuote.customer_name,
      customer_email: newQuote.customer_email,
      quote_date:     newQuote.quote_date,
      valid_until:    newQuote.valid_until,
      currency:       newQuote.currency,
      notes:          newQuote.notes,
      terms:          newQuote.terms,
      lines:          newQuote.lines.map(({ description, quantity, unit_price }) => ({
        description, quantity, unit_price
      })).filter(l => l.description.trim()),
    };
    createMutation.mutate(body, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewQuote({
          customer_name: '', customer_email: '',
          quote_date:  new Date().toISOString().slice(0, 10),
          valid_until: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
          currency: 'KES', notes: '', terms: 'Thanks for doing business with us', lines: [emptyLine()],
        });
      },
    });
  }, [newQuote, createMutation]);

  const addLine    = () => setNewQuote(p => ({ ...p, lines: [...p.lines, emptyLine()] }));
  const removeLine = (idx: number) => setNewQuote(p => ({ ...p, lines: p.lines.length > 1 ? p.lines.filter((_, i) => i !== idx) : p.lines }));
  const updateLine = (idx: number, field: keyof ExtendedLineRequest, value: any) =>
    setNewQuote(p => ({ ...p, lines: p.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l) }));

  const createDropItems: DropdownItem[] = [
    { label: 'Create New Quotation',    icon: <FileSpreadsheet className="h-4 w-4" />, onClick: () => setCreateOpen(true) },
    { label: 'Create New Proforma Invoice', icon: <FileText className="h-4 w-4" />,   onClick: () => {} },
    { label: 'Bulk Upload Quotations',  icon: <Upload className="h-4 w-4" />,          onClick: () => {} },
  ];
  const downloadDropItems: DropdownItem[] = [
    { label: 'Download PDF',                icon: <FileDown className="h-4 w-4" />,        onClick: () => {} },
    { label: 'Export Excel Spreadsheet',    icon: <FileSpreadsheet className="h-4 w-4" />, onClick: () => {} },
  ];
  const addClientDropItems: DropdownItem[] = [
    { label: 'Import Clients via CSV',  icon: <FileUp className="h-4 w-4" />,  onClick: () => {} },
    { label: 'Sync Google Contacts',    icon: <Users className="h-4 w-4" />,   onClick: () => {} },
  ];

  // ── Create Quotation View ──────────────────────────────────────────────────
  if (createOpen) {
    return (
      <div className="min-h-screen bg-slate-50/60 pb-24 font-sans antialiased text-slate-800">
        <div className="sticky top-0 z-50 bg-navy-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setCreateOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <h1 className="text-base font-black text-white tracking-tight">Create New Quotation</h1>
              <p className="text-[11px] text-slate-400 font-medium">Draft Node Instance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCreate} disabled={createMutation.isPending}
              className="px-4 py-2 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-all shadow-sm">
              Save As Draft
            </button>
            <button onClick={handleCreate} disabled={createMutation.isPending || !newQuote.customer_name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-lg transition-all shadow-md disabled:opacity-50">
              {createMutation.isPending ? 'Processing...' : 'Save & Continue'}
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
          <Card className="border border-slate-200/80 bg-white rounded-xl shadow-md p-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-4 w-full max-w-sm">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quotation No<span className="text-red-500">*</span></label>
                  <input className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} />
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Last No: A00022 (May 16, 2026)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Quotation Date<span className="text-red-500">*</span></label>
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      value={newQuote.quote_date} onChange={e => setNewQuote(p => ({ ...p, quote_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Valid Till Date<span className="text-red-500">*</span></label>
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      value={newQuote.valid_until} onChange={e => setNewQuote(p => ({ ...p, valid_until: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-4 flex flex-col items-center justify-center text-center w-64 h-36 shrink-0 hover:bg-slate-50 shadow-sm">
                <div className="text-sm font-black text-slate-800 tracking-tight">Codevertex IT Solutions</div>
                <div className="text-[10px] text-slate-400 mt-3 flex items-center gap-3 font-semibold">
                  <span className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer">✕ Remove</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer">✎ change</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-200/60 space-y-3">
                <span className="text-xs font-bold text-slate-900 border-b-2 border-slate-900 pb-0.5 block w-fit">Quotation From</span>
                <select className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none">
                  <option>Codevertex IT Solutions</option>
                </select>
                <div className="text-xs space-y-1 text-slate-600 pt-1 leading-relaxed">
                  <div className="flex justify-between font-medium"><span className="text-slate-400">Business Name</span><span className="text-slate-900 font-bold">Codevertex IT Solutions</span></div>
                  <div className="flex justify-between font-medium"><span className="text-slate-400">Address</span><span className="text-slate-800 text-right">OGINGA STREET, PIONEER HSE, 2ND FLOOR, Kisumu, Kenya - 40100</span></div>
                  <div className="flex justify-between font-medium"><span className="text-slate-400">Email</span><span className="text-slate-800 font-mono">codevertexitsolutions@gmail.com</span></div>
                  <div className="flex justify-between font-medium"><span className="text-slate-400">Phone</span><span className="text-slate-800 font-mono">+254 743 793901</span></div>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-200/60 flex flex-col justify-between space-y-3">
                <span className="text-xs font-bold text-slate-900 border-b-2 border-slate-900 pb-0.5 block w-fit">Quotation For</span>
                <div className="space-y-3 my-auto py-2">
                  <select className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none shadow-sm">
                    <option>Select a Client</option>
                  </select>
                  <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg bg-white shadow-inner">
                    <p className="text-xs text-slate-400 font-medium mb-2.5">Select Client/Business from the list<br/>OR</p>
                    <button className="inline-flex items-center gap-1 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-lg transition-all shadow-sm">
                      <UserPlus className="h-3.5 w-3.5" /> Add New Client
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-bold text-slate-700 transition-all flex items-center gap-1">
                <Percent className="h-3 w-3 text-slate-500" /> Configure TAX
              </button>
              <select value={newQuote.currency} onChange={e => setNewQuote(p => ({ ...p, currency: e.target.value }))}
                className="bg-slate-100 hover:bg-slate-200/80 border border-transparent rounded-lg py-1.5 px-3 text-xs font-bold text-slate-700 focus:outline-none transition-all">
                <option value="KES">Kenyan Shilling(KES, Ksh)</option>
                <option value="USD">US Dollar(USD, $)</option>
              </select>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-bold text-slate-700 transition-all flex items-center gap-1">
                <Scale className="h-3 w-3 text-slate-500" /> Number and Currency Format
              </button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-bold text-slate-700 transition-all flex items-center gap-1">
                <Columns className="h-3 w-3 text-slate-500" /> Edit Columns/Formulas
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-navy-900 px-4 py-2.5 text-xs font-bold text-white grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">Item</div>
                <div className="col-span-2 text-center">TAX Rate</div>
                <div className="col-span-1 text-center">Quantity</div>
                <div className="col-span-1 text-center">Rate</div>
                <div className="col-span-1 text-right">Amount</div>
                <div className="col-span-1 text-right">TAX</div>
                <div className="col-span-1 text-right">Total</div>
              </div>
              <div className="p-4 space-y-4 divide-y divide-slate-100 bg-white">
                {calculations.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-start pt-3 first:pt-0 group relative">
                    <div className="col-span-5 space-y-2">
                      <span className="text-xs font-black text-slate-900 block">{idx + 1}.</span>
                      <input placeholder="Item Name / SKU Id" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 font-semibold focus:outline-none focus:border-slate-400 shadow-sm" />
                    </div>
                    <div className="col-span-2 pt-6">
                      <div className="relative rounded-lg">
                        <input type="number" value={line.tax_rate || ''} onChange={e => updateLine(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-6 text-xs text-center font-mono font-bold text-slate-800 focus:outline-none" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                    <div className="col-span-1 pt-6">
                      <input type="number" min="1" value={line.quantity} onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-1 text-xs text-center font-mono font-bold text-slate-900 focus:outline-none" />
                    </div>
                    <div className="col-span-1 pt-6">
                      <input type="number" value={line.unit_price || ''} onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-1 text-xs text-center font-mono font-bold text-slate-900 focus:outline-none" />
                    </div>
                    <div className="col-span-1 pt-8 text-right font-mono font-semibold text-xs text-slate-600">{line.amount.toFixed(2)}</div>
                    <div className="col-span-1 pt-8 text-right font-mono font-semibold text-xs text-slate-500">{line.taxAmount.toFixed(2)}</div>
                    <div className="col-span-1 pt-8 text-right font-mono font-black text-xs text-slate-900 flex items-center justify-end gap-1">
                      <span>{line.total.toFixed(2)}</span>
                      {calculations.lines.length > 1 && (
                        <button onClick={() => removeLine(idx)} className="p-1 text-slate-300 hover:text-red-600 rounded-md transition-all ml-1">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
                <button onClick={addLine} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-navy-900 rounded-lg shadow-sm transition-all">
                  <Plus className="h-3.5 w-3.5" /> Add New Line
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-6 space-y-3">
                <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-900 underline block border-b border-slate-100 pb-1.5">Terms and Conditions</span>
                  <div className="text-xs font-semibold text-slate-700">
                    <div className="flex items-center hover:bg-slate-100/50 p-1 rounded transition-colors">
                      <span><span className="font-mono text-slate-400 mr-1.5">01</span>Thanks for doing business with us</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-6 space-y-4">
                <Card className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 space-y-3 shadow-inner">
                  <div className="space-y-1.5 text-xs font-semibold text-slate-600 border-b border-slate-200/60 pb-3">
                    <div className="flex justify-between">
                      <span>Amount</span>
                      <span className="font-mono font-bold text-slate-900">Ksh {calculations.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TAX</span>
                      <span className="font-mono font-bold text-slate-900">Ksh {calculations.totalTax.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-bold text-slate-900">Total ({newQuote.currency})</span>
                    <span className="font-mono font-black text-lg text-slate-900">Ksh {calculations.grandTotal.toFixed(2)}</span>
                  </div>
                </Card>
              </div>
            </div>

            <Card className="border border-slate-200 bg-slate-50/20 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Advanced options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Display unit as</label>
                  <select value={displayUnitAs} onChange={e => setDisplayUnitAs(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none transition-all">
                    <option>Merge with quantity</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Show tax summary in invoice</label>
                  <select value={showTaxSummary} onChange={e => setShowTaxSummary(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none transition-all">
                    <option>Do not show</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-semibold text-slate-600">
                {[
                  [hideCountryOfSupply, setHideCountryOfSupply, 'Hide place/country of supply'],
                  [addOriginalImages,   setAddOriginalImages,   'Add original images in line items'],
                  [showThumbnailsSep,   setShowThumbnailsSep,   'Show thumbnails in separate column'],
                  [showDescFullWidth,   setShowDescFullWidth,   'Show description in full width'],
                  [hideSubtotalGroup,   setHideSubtotalGroup,   'Hide subtotal for group items'],
                  [showSkuInQuote,      setShowSkuInQuote,      'Show SKU in Quotation'],
                  [showSerialNumbers,   setShowSerialNumbers,   'Show Serial Numbers in Quotation'],
                  [displayBatchDetails, setDisplayBatchDetails, 'Display Batch Details in columns'],
                ].map(([val, setter, label]: any) => (
                  <label key={label} className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5 focus:ring-0" />
                    <span className="group-hover:text-slate-900 transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </Card>

            <div className="flex flex-wrap items-center justify-start gap-3 pt-4 border-t border-slate-100">
              <button onClick={handleCreate} className="px-5 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-lg transition-all">Save & Continue</button>
              <button onClick={handleCreate} className="px-5 py-2 text-xs font-bold text-navy-900 bg-white border border-navy-900 hover:bg-slate-50 rounded-lg transition-all">Save & Create New</button>
              <button onClick={handleCreate} className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-all">Save As Draft</button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main Layout ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans antialiased text-slate-800 bg-background/40 min-h-screen">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
        <span>Codevertex IT Solutions</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600">
          {activeTab === 'manage-clients' ? 'Your Clients' : activeTab === 'tag-wise-report' ? 'Tag-wise Report' : 'Quotations Pipeline'}
        </span>
      </div>

      {/* Page header — hide for manage-clients (it renders its own) */}
      {activeTab !== 'manage-clients' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Quotations</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">Create and manage sales quotations and estimates.</p>
          </div>
          {activeTab === 'overview' && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="relative flex items-center shadow-sm">
                <button className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200/80 rounded-l-lg hover:bg-slate-50 transition-all">
                  <Download className="h-3.5 w-3.5 text-slate-400" /> Download As
                </button>
                <button onClick={() => { setDownloadDropOpen(o => !o); setCreateDropOpen(false); }}
                  className="flex items-center px-2 py-2 bg-white border border-l-0 border-slate-200/80 rounded-r-lg hover:bg-slate-50 transition-all">
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {downloadDropOpen && <DropdownMenu items={downloadDropItems} onClose={() => setDownloadDropOpen(false)} />}
              </div>
              <div className="relative flex items-center shadow-md">
                <button onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-l-lg transition-all">
                  <Plus className="h-3.5 w-3.5" /> Create New Quotation
                </button>
                <button onClick={() => { setCreateDropOpen(o => !o); setDownloadDropOpen(false); }}
                  className="flex items-center px-2 py-2 text-white bg-navy-900 border-l border-slate-800 rounded-r-lg hover:bg-navy-800 transition-all">
                  <ChevronDown className="h-3.5 w-3.5 text-slate-200" />
                </button>
                {createDropOpen && <DropdownMenu items={createDropItems} onClose={() => setCreateDropOpen(false)} />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200/80">
        <nav className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all duration-150 -mb-px',
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900 bg-white/50 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200')}>
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card className="border border-slate-200/80 bg-white shadow-sm overflow-hidden rounded-xl">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Lifetime Data</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </Card>

          <div className="flex items-center justify-between bg-white/60 border border-slate-200 p-2 rounded-xl shadow-sm">
            <div className="relative">
              <button onClick={() => setQuotationTypeOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all min-w-[160px] justify-between">
                <span>{quotationType === 'active' ? 'Active Quotation' : 'Archived Quotation'}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {quotationTypeOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-slate-200 bg-white shadow-xl py-1">
                  <button onClick={() => { setQuotationType('active'); setQuotationTypeOpen(false); }} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-700">Active Quotation</button>
                  <button onClick={() => { setQuotationType('deleted'); setQuotationTypeOpen(false); }} className="w-full text-left px-4 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-700">Archived Folders</button>
                </div>
              )}
            </div>
          </div>

          <FiltersPanel
            statusFilter={statusFilter}   onStatusChange={v => { setStatusFilter(v); setPage(1); }}
            clientSearch={clientSearch}   onClientSearchChange={v => { setClientSearch(v); setPage(1); }}
            dateFrom={dateFrom}           onDateFromChange={v => { setDateFrom(v); setPage(1); }}
            dateTo={dateTo}               onDateToChange={v => { setDateTo(v); setPage(1); }}
            onClearAll={handleClearAllFilters}
          />

          <Card className="border border-slate-200/80 bg-white shadow-sm rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Quotation Summary</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </Card>

          <Card className="border border-slate-200/80 bg-white shadow-sm rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Quotation Graph</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </Card>

          <div className="flex justify-end pt-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-sm transition-all">
              <Columns className="h-3.5 w-3.5 text-slate-400" /> Show/Hide Columns
            </button>
          </div>

          <Card className="border border-slate-200 shadow-md rounded-xl overflow-hidden bg-white">
            <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-3.5 px-4 border-b border-slate-200/60 bg-slate-50/50">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input placeholder="Search by quote number or customer..."
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-all shadow-sm"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 uppercase tracking-wider"><Filter className="h-3 w-3" /> Status:</span>
                {['All', 'Draft', 'Sent', 'Accepted', 'Declined', 'Expired', 'Converted'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s === 'All' ? 'all' : s.toLowerCase())}
                    className={cn('px-2.5 py-1 rounded text-xs font-bold transition-all',
                      (statusFilter === s.toLowerCase() || (s === 'All' && statusFilter === 'all'))
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}>
                    {s}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 pl-4">QUOTE NUMBER</th>
                    <th className="p-3">CUSTOMER DESIGNATION</th>
                    <th className="p-3 text-right">FINANCIAL AMOUNT</th>
                    <th className="p-3 text-center">STATUS FLAG</th>
                    <th className="p-3 text-center">GENERATION DATE</th>
                    <th className="p-3 text-center">VALID UNTIL DEADLINE</th>
                    <th className="p-3 text-center pr-4">ACTIONS CONTROL PIPELINE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 font-medium">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" /> Loading folders...
                      </td>
                    </tr>
                  ) : filtered.length > 0 ? (
                    filtered.map((quote) => (
                      <tr key={quote.id} className="hover:bg-slate-50/50 transition-colors duration-150 font-medium text-slate-600">
                        <td className="p-3 pl-4 font-mono font-bold text-slate-900">{quote.quote_number}</td>
                        <td className="p-3 text-slate-900 font-bold">{quote.customer_name || quote.customer_email || '—'}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {quote.currency} {Number(quote.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={statusBadgeVariant(quote.status)} className="capitalize font-bold text-[10px] px-2 py-0.5">
                            {quote.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">{quote.quote_date?.slice(0, 10) || '—'}</td>
                        <td className="p-3 text-center font-mono text-slate-500">{quote.valid_until?.slice(0, 10) || '—'}</td>
                        <td className="p-3 pr-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setViewQuotation(quote)} title="View" className="text-slate-400 hover:text-slate-900 transition-colors"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => window.open(`#/view/${quote.quote_number}`, '_blank')} title="Open" className="text-slate-400 hover:text-slate-900 transition-colors"><ExternalLink className="h-4 w-4" /></button>
                            <button onClick={() => setEditQuotation(quote)} title="Edit" className="text-slate-400 hover:text-slate-900 transition-colors"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDuplicateQuotation(quote)} title="Copy" className="text-slate-400 hover:text-slate-900 transition-colors"><Copy className="h-4 w-4" /></button>
                            <div className="relative">
                              <button onClick={() => setActionMenuId(actionMenuId === quote.id ? null : quote.id)}
                                className={cn('p-0.5 rounded transition-all text-slate-400 hover:text-slate-900', actionMenuId === quote.id && 'bg-slate-100')}>
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {actionMenuId === quote.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                                  <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 p-1 rounded-xl shadow-xl z-20 text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                    <button onClick={() => { setViewQuotation(quote); setActionMenuId(null); }} className="w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2">
                                      <Eye className="h-3.5 w-3.5 text-slate-400" /> Preview File Map
                                    </button>
                                    <button onClick={() => setActionMenuId(null)} className="w-full text-left px-3 py-1.5 text-xs font-bold text-navy-900 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                                      <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Convert to Invoice
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold bg-slate-50/20 italic">
                        No structural configurations align with your selected parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500 font-semibold">Showing {filtered.length} to {filtered.length} of {total} Quotation</span>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-sm transition-all">
              <Columns className="h-3.5 w-3.5 text-slate-400" /> Show/Hide Columns
            </button>
          </div>
        </div>
      )}

      {/* ── Manage Clients Tab ── */}
      {activeTab === 'manage-clients' && (
        <ManageClients
          onAddClient={() => {}}
          addClientDropOpen={addClientDropOpen}
          setAddClientDropOpen={setAddClientDropOpen}
          addClientDropItems={addClientDropItems}
        />
      )}

      {/* ── Tag-wise Report Tab ── */}
      {activeTab === 'tag-wise-report' && <TagWiseReport />}
    </div>
  );
}