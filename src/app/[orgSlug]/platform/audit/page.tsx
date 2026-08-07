'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { useAuditLogs } from '@/hooks/use-audit';
import type { AuditLogEntry } from '@/lib/api/audit';
import { cn } from '@/lib/utils';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildPlatformAuditLogColumns } from './audit-log-columns';
import { Filter, Search, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 50;

function defaultDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

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

  // Platform-owner cross-tenant audit log: no tenant scoping (empty tenant + platform flag).
  const { data, isLoading, error } = useAuditLogs('', true, queryParams);
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

  const columns = useMemo(() => buildPlatformAuditLogColumns(), []);

  return (
    <div className="p-6 space-y-6">
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
          <div className="px-2 pb-2">
            <DataTable<AuditLogEntry>
              columns={columns}
              rows={paginated}
              rowKey={(entry) => entry.id}
              loading={isLoading}
              storageKey="platform-audit-log-table"
              emptyText="No audit log entries match your filters."
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={filtered.length}
              pageSize={ITEMS_PER_PAGE}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
