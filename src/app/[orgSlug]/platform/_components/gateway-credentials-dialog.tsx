'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { useState } from 'react';
import { GATEWAY_KINDS, gatewayKind } from './gateway-catalog';

const isSensitiveField = (key: string) => /secret|password|key/i.test(key);
const fieldLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Activate a gateway (pick a type from tiles, name it, enter its credentials) or, with editType,
 * replace an existing gateway's credentials. Blank fields keep the stored value when editing.
 * Types already configured are shown but cannot be picked again.
 */
export function GatewayCredentialsDialog({
  editType,
  editName,
  configuredTypes = [],
  submitting,
  onClose,
  onSubmit,
}: {
  editType?: string;
  editName?: string;
  configuredTypes?: string[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (type: string, name: string, credentials: Record<string, string>) => void;
}) {
  const editing = !!editType;
  const firstFree = GATEWAY_KINDS.find((k) => !configuredTypes.includes(k.value))?.value ?? 'paystack';
  const [type, setType] = useState(editType ?? firstFree);
  const kind = gatewayKind(type);
  const [name, setName] = useState(editName ?? kind.label);
  const [nameTouched, setNameTouched] = useState(editing);
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const pick = (value: string) => {
    setType(value);
    setValues({});
    if (!nameTouched) setName(gatewayKind(value).label);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const creds: Record<string, string> = {};
    kind.credentialKeys.forEach((k) => { if (values[k]?.trim()) creds[k] = values[k].trim(); });
    onSubmit(type, name.trim(), creds);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        title={editing ? `Edit ${kind.label}` : 'Activate a gateway'}
        description={editing ? 'Leave a field blank to keep its current value.' : 'Pick the gateway, then add the keys from its dashboard.'}
        onClose={onClose}
        className="max-w-2xl"
      >
        <form onSubmit={submit} className="space-y-5">
          {!editing && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gateway</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {GATEWAY_KINDS.map((k) => {
                  const taken = configuredTypes.includes(k.value);
                  const active = type === k.value;
                  const Icon = k.icon;
                  return (
                    <button
                      key={k.value}
                      type="button"
                      disabled={taken}
                      aria-pressed={active}
                      onClick={() => pick(k.value)}
                      className={cn(
                        'flex min-h-[64px] items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40 hover:bg-accent/40',
                        taken && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {k.label}
                          {taken && <span className="text-[10px] font-medium uppercase text-muted-foreground">added</span>}
                          {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{k.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="space-y-1">
            <label htmlFor="gw-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Display name</label>
            <input
              id="gw-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameTouched(true); }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {kind.credentialKeys.length > 0 ? (
            <fieldset className="space-y-3">
              <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" /> Credentials
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {kind.credentialKeys.map((k) => {
                  const pem = k === 'cert_pem';
                  const optional = k.endsWith('_base_url') || k === 'webhook_secret';
                  const sensitive = isSensitiveField(k);
                  const shown = visible[k] ?? false;
                  const id = `cred-${k}`;
                  return (
                    <div key={k} className={cn('space-y-1', pem && 'sm:col-span-2')}>
                      <label htmlFor={id} className="text-xs font-medium text-foreground">
                        {fieldLabel(k)} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
                      </label>
                      {pem ? (
                        <>
                          <textarea
                            id={id}
                            value={values[k] ?? ''}
                            onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                            placeholder={editing ? 'Leave blank to keep current' : '-----BEGIN CERTIFICATE-----'}
                            rows={4}
                            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                            autoComplete="off"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Safaricom&apos;s public certificate. It encrypts the initiator password for B2C, B2B, balance,
                            status and reversal; production rejects an unencrypted password.
                          </p>
                        </>
                      ) : (
                        <div className="relative">
                          <input
                            id={id}
                            type={sensitive && !shown ? 'password' : 'text'}
                            value={values[k] ?? ''}
                            onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                            placeholder={editing ? 'Leave blank to keep current' : ''}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            autoComplete="off"
                            required={!editing && !optional}
                          />
                          {sensitive && (
                            <button
                              type="button"
                              onClick={() => setVisible({ ...visible, [k]: !shown })}
                              className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                              aria-label={shown ? `Hide ${fieldLabel(k)}` : `Show ${fieldLabel(k)}`}
                            >
                              {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" /> Encrypted at rest (AES-256-GCM) and never shown again.
              </p>
            </fieldset>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{kind.label} needs no credentials.</p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting || (!editing && configuredTypes.includes(type))}>
              {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editing ? 'Save' : 'Activate'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
