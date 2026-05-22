'use client';

import { Card, CardContent } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import {
  ArrowUpDown, ChevronDown, ChevronRight, Columns, Download,
  FolderArchive, MoreHorizontal, Pencil, Plus, Search, Star,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface DropdownItem { label: string; icon?: React.ReactNode; onClick: () => void; className?: string; }

interface ClientsTabProps {
  onAddClient: () => void;
  addClientDropOpen: boolean;
  setAddClientDropOpen: (v: boolean) => void;
  addClientDropItems: DropdownItem[];
  DropdownMenu: React.FC<{ items: DropdownItem[]; onClose: () => void }>;
}

export function ClientsTab({ onAddClient, addClientDropOpen, setAddClientDropOpen, addClientDropItems, DropdownMenu }: ClientsTabProps) {
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

  const visibleClients = mockClients.filter(
    c => !clientSearchQuery.trim() || c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-start justify-between">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Your Clients</h1>
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

      <div className="flex items-center gap-0 border-b border-slate-200">
        <button className="px-4 py-2.5 text-xs font-bold border-b-2 border-violet-600 text-violet-700 -mb-px transition-colors">
          All Clients
        </button>
        <button className="px-4 py-2.5 text-xs font-semibold text-slate-500 border-b-2 border-transparent hover:text-slate-800 -mb-px transition-colors flex items-center gap-1">
          Reports & More <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-center gap-6 pt-2 text-xs font-semibold">
        {(['active', 'archived'] as const).map(tab => (
          <button key={tab} onClick={() => setClientActiveTab(tab)}
            className={cn('pb-1 transition-colors border-b-2 capitalize',
              clientActiveTab === tab
                ? 'text-slate-900 border-slate-900 font-bold'
                : 'text-slate-400 border-transparent hover:text-slate-700')}>
            {tab} Clients
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <span className="text-xs font-semibold text-slate-500">
          Showing <span className="font-black text-slate-900">1</span> to{' '}
          <span className="font-black text-slate-900">{visibleClients.length}</span> of{' '}
          <span className="font-black text-slate-900">{mockClients.length}</span> Client
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
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-sm transition-all">
            <Columns className="h-3.5 w-3.5 text-slate-400" /> Show/Hide Columns
          </button>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold text-[11px]">
                <th className="p-3 pl-4 w-8"><input type="checkbox" className="rounded border-slate-300 focus:ring-0" disabled /></th>
                <th className="p-3 w-12 text-center">Logo</th>
                {['Name', 'Type', 'Industry', 'Phone', 'Email', 'Country', 'Status', 'Last Communication Date'].map(col => (
                  <th key={col} className="p-3">
                    <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
                      {col} <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </button>
                  </th>
                ))}
                <th className="p-3">Added to Portfolio</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {visibleClients.map((client, idx) => (
                <tr key={client.id} className="hover:bg-slate-50/40 transition-colors group">
                  <td className="p-3 pl-4 text-slate-400 text-[11px] font-mono">{idx + 1}</td>
                  <td className="p-3 text-center">
                    <div className="h-8 w-8 bg-slate-800 text-white font-black text-sm rounded-lg flex items-center justify-center shadow-sm mx-auto">
                      {client.name.charAt(0)}
                    </div>
                  </td>
                  <td className="p-3 text-slate-900 font-bold whitespace-nowrap">{client.name}</td>
                  <td className="p-3 text-slate-600 font-semibold">{client.type}</td>
                  <td className="p-3 text-slate-400">{client.industry}</td>
                  <td className="p-3 text-slate-400">{client.phone}</td>
                  <td className="p-3 text-slate-400 font-mono">{client.email}</td>
                  <td className="p-3 text-slate-700 font-bold">{client.country}</td>
                  <td className="p-3 text-slate-400">{client.status}</td>
                  <td className="p-3 text-slate-400 font-mono">{client.lastCommunication}</td>
                  <td className="p-3">
                    <button className="text-violet-600 hover:text-violet-800 font-semibold transition-colors text-xs">
                      Add to Portfolio
                    </button>
                  </td>
                  <td className="p-3 pr-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {[
                        { icon: <Star className="h-3.5 w-3.5 text-violet-500" />, label: 'Portfolio', hover: 'hover:text-violet-700', bg: 'bg-violet-50' },
                        { icon: <Pencil className="h-3.5 w-3.5 text-slate-500" />, label: 'Edit', hover: 'hover:text-slate-800', bg: 'bg-slate-100' },
                        { icon: <FolderArchive className="h-3.5 w-3.5 text-slate-500" />, label: 'Archive', hover: 'hover:text-amber-700', bg: 'bg-slate-100' },
                        { icon: <MoreHorizontal className="h-3.5 w-3.5 text-slate-500" />, label: 'More', hover: 'hover:text-slate-800', bg: 'bg-slate-100' },
                      ].map(({ icon, label, hover, bg }) => (
                        <button key={label} title={label} className={cn('flex flex-col items-center gap-0.5 text-slate-500 transition-colors', hover)}>
                          <div className={cn('p-1.5 rounded-md', bg)}>{icon}</div>
                          <span className="text-[9px] font-semibold text-slate-400">{label}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-semibold text-slate-500">
          Showing <span className="font-black text-slate-900">1</span> to{' '}
          <span className="font-black text-slate-900">{visibleClients.length}</span> of{' '}
          <span className="font-black text-slate-900">{mockClients.length}</span> Client
        </span>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-sm transition-all">
          <Columns className="h-3.5 w-3.5 text-slate-400" /> Show/Hide Columns
        </button>
      </div>
    </div>
  );
}
