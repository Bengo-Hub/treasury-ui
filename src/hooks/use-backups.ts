'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listBackups,
  createBackup,
  deleteBackup,
  downloadBackup,
  getBackupSettings,
  updateBackupSettings,
  type Backup,
  type BackupSettings,
} from '@/lib/api/backups';

const STALE_MS = 60 * 1000;

export const backupKeys = {
  all: (tenantSlug: string) => ['backups', tenantSlug] as const,
  settings: (tenantSlug: string) => ['backup-settings', tenantSlug] as const,
};

function errMessage(err: any, fallback: string): string {
  return err?.response?.data?.message || err?.message || fallback;
}

export function useBackups(tenantSlug: string) {
  return useQuery<{ backups: Backup[] }>({
    queryKey: backupKeys.all(tenantSlug),
    queryFn: () => listBackups(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}

export function useCreateBackup(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createBackup(tenantSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.all(tenantSlug) });
      toast.success('Backup created');
    },
    onError: (err: any) => toast.error(errMessage(err, 'Failed to create backup')),
  });
}

export function useDeleteBackup(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteBackup(tenantSlug, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupKeys.all(tenantSlug) });
      toast.success('Backup deleted');
    },
    onError: (err: any) => toast.error(errMessage(err, 'Failed to delete backup')),
  });
}

export function useDownloadBackup(tenantSlug: string) {
  return useMutation({
    mutationFn: (name: string) => downloadBackup(tenantSlug, name),
    onError: (err: any) => toast.error(errMessage(err, 'Failed to download backup')),
  });
}

export function useBackupSettings(tenantSlug: string) {
  return useQuery<BackupSettings>({
    queryKey: backupKeys.settings(tenantSlug),
    queryFn: () => getBackupSettings(tenantSlug),
    enabled: !!tenantSlug,
    staleTime: STALE_MS,
  });
}

export function useUpdateBackupSettings(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BackupSettings) => updateBackupSettings(tenantSlug, data),
    onSuccess: (settings) => {
      queryClient.setQueryData(backupKeys.settings(tenantSlug), settings);
      toast.success('Backup schedule saved');
    },
    onError: (err: any) => toast.error(errMessage(err, 'Failed to save backup schedule')),
  });
}
