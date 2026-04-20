'use client';

import { Badge, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import { useAuditLogs } from '@/hooks/use-audit';
import type { AuditLogEntry } from '@/lib/api/audit';
import { cn } from '@/lib/utils';
import { Filter, Loader2, Search, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 50;

function defaultDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const actionVariant: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  create: 'success',
  update: 'default',
  delete: 'error',
  approve: 'success',
  reject: 'error',
};

const ACTION_OPTIONS = ['all', 'create', 'update', 'delete', 'approve', 'reject'];
const RESOURCE_OPTIONS = [
  'all', 'payment_intent', 'invoice', 'expense', 'equity_holder',
  'ledger_transaction', 'journal_entry', 'payout_config', 'gateway_config',
  'tenant', 'treasury_user',
];

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const dateRange = useMemo(() => defaultDateRange(), []);

  const queryParams = useMemo(() => ({
    from: dateRange.from,
    to: dateRange.to,
    limit: 200,
    ...(actionFilter !== 'all' ? { action: actionFilter } : {}),
    ...(resourceFilter !== 'all' ? { resource_type: resourceFilter } : {}),
  }), [dateRange, actionFilter, resourceFilter]);

  const { data, isLoading, error } = useAuditLogs(queryParams);
  const list: AuditLogEntry[] = data?.audit_logs ?? [];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (e) =>
        e.user_email.toLowerCase().includes(q) ||
        e.resource_id.toLowerCase().includes(q) ||
        e.resource_type.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q),
    );
  }, [list, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useMemo(() => { setPage(1); }, [searchQuery, actionFilter, resourceFilter]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Platform-level activity log for compliance and security review.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load audit logs. Check your connection and try again.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                placeholder="Search by user, resource, action..."
                className="w-full bg-accent/30 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-wider">Action:</span>
            </div>
            {ACTION_OPTIONS.map((a) => (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold capitalize transition-all',
                  actionFilter === a
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">Resource:</span>
            </div>
            {RESOURCE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setResourceFilter(r)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold capitalize transition-all',
                  resourceFilter === r
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {r.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading audit logs…
              </div>
            )}
            {!isLoading && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/5">
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Time</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">User</th>
                    <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Action</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Resource</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Resource ID</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">IP</th>
                    <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((entry) => (
                    <tr key={entry.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-xs font-medium">{entry.user_email}</div>
                        <div className="text-xs text-muted-foreground font-mono">{entry.user_id.slice(0, 8)}…</div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Badge variant={actionVariant[entry.action] ?? 'default'}>
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-xs capitalize">{entry.resource_type.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{entry.resource_id.slice(0, 16)}{entry.resource_id.length > 16 ? '…' : ''}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{entry.ip_address ?? '—'}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {entry.changes ? (
                          <span title={entry.changes} className="cursor-help">
                            {entry.changes.slice(0, 60)}{entry.changes.length > 60 ? '…' : ''}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">No audit log entries match your filters.</div>
            )}
          </div>
          {!isLoading && filtered.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
