'use client';

import { Badge, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useAuditLogs } from '@/hooks/use-audit';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { Activity, Loader2, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';

// Semantic-token tones per action (the codebase convention is semantic tokens, not raw colors).
const actionColors: Record<string, string> = {
  create: 'bg-primary/10 text-primary border-primary/20',
  update: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  post: 'bg-green-500/10 text-green-600 border-green-500/20',
  approve: 'bg-primary/10 text-primary border-primary/20',
};

export default function AuditHistoryPage() {
  const { tenantPathId, tenantQueryParam, isPlatformOwner } = useResolvedTenant();
  // Platform owner: optionally narrow to a selected tenant. Tenant user: always their own tenant.
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useAuditLogs(
    effectiveTenant,
    isPlatformOwner,
    {
      resource_type: 'ledger',
      limit: 100,
    },
    !!effectiveTenant,
  );

  const logs = data?.audit_logs ?? [];
  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return logs.filter((log) => {
      return [log.action, log.resource_type, log.user_email, log.changes].join(' ').toLowerCase().includes(query);
    });
  }, [logs, search]);

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
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading audit trail...
            </div>
          ) : error ? (
            <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Failed to load audit history.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No audit events recorded yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-accent/5 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-border bg-accent/30 p-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.user_email} · {log.resource_type}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{log.changes || 'No change details provided'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={actionColors[log.action.toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'}>{log.action}</Badge>
                    <p className="mt-2 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
