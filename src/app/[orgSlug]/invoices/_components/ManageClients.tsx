'use client';

import { useState } from 'react';
import { useCRMContacts } from '@/hooks/use-crm-contacts';
import { Search, Users, Mail, Phone, Loader2 } from 'lucide-react';

interface ManageClientsProps {
  effectiveTenant: string;
}

export function ManageClients({ effectiveTenant }: ManageClientsProps) {
  const [search, setSearch] = useState('');
  const { data: contacts = [], isLoading } = useCRMContacts(effectiveTenant, search);

  if (!effectiveTenant) return null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-sm font-bold text-foreground">Manage Clients</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          View and manage your invoice clients from the CRM.
        </p>
      </div>

      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading clients…
        </div>
      )}

      {!isLoading && contacts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-accent/30 px-6 py-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No clients found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? 'Try a different search term.' : 'Add clients via the CRM to invoice them here.'}
          </p>
        </div>
      )}

      {!isLoading && contacts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contacts.map((c) => {
            const displayName =
              [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || '?';
            return (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {displayName[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                    {c.contact_type && (
                      <p className="text-[10px] text-muted-foreground capitalize">{c.contact_type}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
