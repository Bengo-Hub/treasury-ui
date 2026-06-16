'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useBackups,
  useBackupSettings,
  useCreateBackup,
  useDeleteBackup,
  useDownloadBackup,
  useUpdateBackupSettings,
} from '@/hooks/use-backups';
import type { Backup } from '@/lib/api/backups';
import { Database, Download, Info, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/** humanSize(1572864) -> "1.5 MB" */
function humanSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  const rounded = i === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

/** formatHour(14) -> "2:00 PM" */
function formatHour(h: number): string {
  const hour = ((h % 24) + 24) % 24;
  const period = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BackupsPage() {
  const { tenantPathId, orgSlug } = useResolvedTenant();
  const tenantSlug = tenantPathId || orgSlug;

  const { data, isLoading, error } = useBackups(tenantSlug);
  const createMutation = useCreateBackup(tenantSlug);
  const deleteMutation = useDeleteBackup(tenantSlug);
  const downloadMutation = useDownloadBackup(tenantSlug);

  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);

  const backups = data?.backups ?? [];

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.name, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backups</h1>
          <p className="text-muted-foreground mt-1">
            Create, download, and schedule backups of your organisation&apos;s treasury data.
          </p>
        </div>
        <Button
          className="gap-2 shadow-lg shadow-primary/20"
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create backup
        </Button>
      </div>

      {/* Auto-backup schedule */}
      <AutoBackupCard tenantSlug={tenantSlug} />

      {/* Info note */}
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            These backups contain only your organisation&apos;s data and are visible only to you.
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load backups. Check your connection and try again.
        </div>
      )}

      {/* Backups table */}
      <Card>
        <CardHeader className="flex items-center gap-2 py-4">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Available backups</h3>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No backups yet. Click &ldquo;Create backup&rdquo; to make your first one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3">File</th>
                    <th className="px-6 py-3">Size</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {backups.map((b) => (
                    <tr key={b.name} className="hover:bg-accent/5 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs">{b.name}</td>
                      <td className="px-6 py-3 text-muted-foreground">{humanSize(b.size)}</td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {formatDateTime(b.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Download"
                            disabled={
                              downloadMutation.isPending &&
                              downloadMutation.variables === b.name
                            }
                            onClick={() => downloadMutation.mutate(b.name)}
                            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                          >
                            {downloadMutation.isPending &&
                            downloadMutation.variables === b.name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteTarget(b)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent title="Delete backup" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to delete{' '}
            <span className="font-bold text-foreground font-mono">{deleteTarget?.name}</span>? This
            cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Auto-backup schedule card ────────────────────────────────────────────────

function AutoBackupCard({ tenantSlug }: { tenantSlug: string }) {
  const { data: settings, isLoading } = useBackupSettings(tenantSlug);
  const updateMutation = useUpdateBackupSettings(tenantSlug);

  // Local form state — OPT-IN, default OFF.
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(2);
  const [retention, setRetention] = useState(30);

  // Hydrate from API.
  useEffect(() => {
    if (!settings) return;
    setEnabled(!!settings.auto_enabled);
    setHour(typeof settings.schedule_hour === 'number' ? settings.schedule_hour : 2);
    setRetention(settings.retention_days > 0 ? settings.retention_days : 30);
  }, [settings]);

  const dirty =
    !!settings &&
    (enabled !== !!settings.auto_enabled ||
      hour !== settings.schedule_hour ||
      retention !== settings.retention_days);

  const inputClass =
    'bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  function handleSave() {
    updateMutation.mutate({
      auto_enabled: enabled,
      schedule_hour: hour,
      retention_days: retention,
    });
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-tight">Automatic backups</h3>
        </div>
        {/* Accessible switch (no Switch in this repo's component lib) */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Enable automatic backups"
          disabled={isLoading}
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors disabled:opacity-50',
            enabled ? 'bg-primary' : 'bg-accent',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
              enabled && 'translate-x-5',
            )}
          />
        </button>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <p className="text-xs text-muted-foreground">
          Off by default. When enabled, a backup of your organisation&apos;s data runs daily at the
          chosen hour and older backups are pruned automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Daily backup time">
            <select
              value={hour}
              disabled={!enabled}
              onChange={(e) => setHour(parseInt(e.target.value, 10))}
              className={cn(inputClass, 'w-full')}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Retention (days)"
            description="Backups older than this are pruned automatically."
          >
            <input
              type="number"
              min={1}
              max={365}
              value={retention}
              disabled={!enabled}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isNaN(v)) {
                  setRetention(1);
                } else {
                  setRetention(Math.min(365, Math.max(1, v)));
                }
              }}
              className={cn(inputClass, 'w-32 font-mono')}
            />
          </FormField>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-2"
            disabled={!dirty || updateMutation.isPending}
            onClick={handleSave}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
