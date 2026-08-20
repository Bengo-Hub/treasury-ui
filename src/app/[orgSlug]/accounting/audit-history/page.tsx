'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/base';
import { useAuditLogs } from '@/hooks/use-audit';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import { buildAuditLogColumns } from './audit-log-columns';
import { Shield } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function AuditHistoryPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Platform owner: load the cross-tenant (platform) audit trail by default; narrow to the
  // selected tenant on drill-down. Tenant user: always their own tenant.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useAuditLogs(
    effectiveTenant,
    isPlatformOwner,
    {
      resource_type: 'ledger',
      limit: 100,
    },
    isPlatformOwner || !!effectiveTenant,
  );

  const logs = data?.audit_logs ?? [];
  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return logs.filter((log) => {
      return [log.action, log.resource_type, log.user_email, log.changes].join(' ').toLowerCase().includes(query);
    });
  }, [logs, search]);
  const columns = useMemo(() => buildAuditLogColumns(), []);

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-background/80 p-3 shadow-sm">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Audit trail</p>
              <h1 className="text-3xl font-bold tracking-tight">Audit History</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Review the ledger and system activity that shaped your financial records.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-tight">Recent activity</h3>
              <p className="text-sm text-muted-foreground">Ledger-related actions and changes</p>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, user, or change"
              className="w-full rounded-lg border border-border bg-accent/30 py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-primary md:max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-2 pb-2">
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(log) => log.id}
              loading={isLoading}
              loadingRows={8}
              error={!!error}
              storageKey="audit-history-table"
              emptyText="No audit events recorded yet."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
