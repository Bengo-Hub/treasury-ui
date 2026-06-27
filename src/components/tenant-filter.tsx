'use client';

import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';
import type { TenantOption } from '@/store/tenant-filter';
import { useQuery } from '@tanstack/react-query';
import { Building2, Check, ChevronDown, X } from 'lucide-react';
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
  return tenants.filter((t) => t.slug !== 'codevertex');
}

/**
 * TenantFilter — multi-select dropdown for platform owners to filter views by tenant(s).
 * Hidden for regular tenant users.
 */
export function TenantFilter({ className }: { className?: string }) {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isPlatformOwner = orgSlug === 'codevertex' || user?.isPlatformOwner;

  const { selectedTenants, toggleTenant, clearTenants, selectAllTenants, allTenants } =
    useTenantFilterStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: tenants = [] } = useQuery({
    queryKey: ['platform_tenants_list'],
    queryFn: () => fetchTenants(session?.accessToken ?? ''),
    enabled: !!isPlatformOwner && !!session?.accessToken,
    staleTime: 10 * 60_000,
  });

  if (!isPlatformOwner) return null;

  const filtered = search
    ? tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : tenants;

  const count = selectedTenants.length;
  const isSelected = (id: string) => selectedTenants.some((t) => t.id === id);
  // Default (no specific selection + not aggregate) = the platform owner's OWN tenant.
  const isOwnDefault = count === 0 && !allTenants;

  let label: string;
  if (allTenants) label = 'All Tenants';
  else if (isOwnDefault) label = 'My Treasury';
  else if (count === 1) label = selectedTenants[0].name;
  else label = `${count} tenants`;

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
        <span className="truncate flex-1 text-left">{label}</span>
        {!isOwnDefault && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearTenants(); }}
            className="p-0.5 rounded hover:bg-muted-foreground/20"
            aria-label="Reset to my treasury"
          >
            <X className="size-3" />
          </button>
        )}
        <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} aria-hidden />
          <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-xl border border-border bg-popover shadow-xl flex flex-col">
            {/* Search */}
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                placeholder="Search tenants…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-accent/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Default: the platform owner's OWN treasury (codevertex) */}
            <button
              type="button"
              onClick={() => { clearTenants(); setOpen(false); setSearch(''); }}
              className={cn(
                'flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors',
                isOwnDefault && 'bg-primary/10 text-primary',
              )}
            >
              {isOwnDefault ? <Check className="size-3.5 shrink-0" /> : <span className="size-3.5 shrink-0" />}
              My Treasury
            </button>

            {/* Explicit cross-tenant aggregate */}
            <button
              type="button"
              onClick={() => { selectAllTenants(); setOpen(false); setSearch(''); }}
              className={cn(
                'flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors border-b border-border',
                allTenants && 'bg-primary/10 text-primary',
              )}
            >
              {allTenants ? <Check className="size-3.5 shrink-0" /> : <span className="size-3.5 shrink-0" />}
              All Tenants
            </button>

            <div className="max-h-60 overflow-y-auto">
              {filtered.map((t) => {
                const sel = isSelected(t.id);
                const opt: TenantOption = { id: t.id, slug: t.slug, name: t.name };
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTenant(opt)}
                    className={cn(
                      'flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors',
                      sel && 'bg-primary/5',
                    )}
                  >
                    <span className={cn(
                      'size-3.5 shrink-0 rounded border flex items-center justify-center',
                      sel ? 'bg-primary border-primary' : 'border-border',
                    )}>
                      {sel && <Check className="size-2.5 text-primary-foreground" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{t.name}</span>
                      <span className="block text-xs text-muted-foreground">{t.slug}</span>
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">No tenants found</div>
              )}
            </div>

            {/* Footer: count + apply */}
            {count > 0 && (
              <div className="p-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{count} selected</span>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setSearch(''); }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
