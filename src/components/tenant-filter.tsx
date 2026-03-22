'use client';

import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronDown, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  process.env.NEXT_PUBLIC_SSO_URL ||
  'https://sso.codevertexitsolutions.com';

interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status?: string;
}

async function fetchTenants(accessToken: string): Promise<TenantListItem[]> {
  const res = await fetch(`${AUTH_API_URL}/api/v1/admin/tenants`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const tenants: TenantListItem[] = Array.isArray(data) ? data : data.tenants ?? data.data ?? [];
  // Filter out the platform org itself
  return tenants.filter((t) => t.slug !== 'codevertex');
}

/**
 * TenantFilter — a dropdown for platform owners to select which tenant's data to view.
 * Regular tenant users don't see this component.
 * Renders nothing if the user is not a platform owner.
 */
export function TenantFilter({ className }: { className?: string }) {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isPlatformOwner = orgSlug === 'codevertex' || user?.isPlatformOwner;

  const { selectedTenant, setSelectedTenant } = useTenantFilterStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: tenants = [] } = useQuery({
    queryKey: ['platform_tenants_list'],
    queryFn: () => fetchTenants(session?.accessToken ?? ''),
    enabled: !!isPlatformOwner && !!session?.accessToken,
    staleTime: 10 * 60_000,
  });

  // Don't render for non-platform owners
  if (!isPlatformOwner) return null;

  const displayLabel = selectedTenant ? selectedTenant.name : 'All Tenants';

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors min-w-[180px]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Building2 className="size-4 text-muted-foreground shrink-0" />
        <span className="truncate flex-1 text-left">{displayLabel}</span>
        {selectedTenant && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTenant(null);
            }}
            className="p-0.5 rounded hover:bg-muted-foreground/20"
            aria-label="Clear filter"
          >
            <X className="size-3" />
          </button>
        )}
        <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
            <button
              type="button"
              onClick={() => {
                setSelectedTenant(null);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors',
                !selectedTenant && 'bg-primary/10 text-primary'
              )}
            >
              All Tenants
            </button>
            {tenants.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTenant({ id: t.id, slug: t.slug, name: t.name });
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors',
                  selectedTenant?.id === t.id && 'bg-primary/10 text-primary font-medium'
                )}
              >
                <span className="block truncate">{t.name}</span>
                <span className="block text-xs text-muted-foreground">{t.slug}</span>
              </button>
            ))}
            {tenants.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">No tenants found</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
