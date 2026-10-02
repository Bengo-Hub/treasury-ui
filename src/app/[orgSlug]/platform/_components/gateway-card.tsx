'use client';

import { Badge, Button, Card } from '@/components/ui/base';
import type { GatewayConfig } from '@/lib/api/gateways';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronDown, KeyRound, Link2, Loader2, PlugZap, RefreshCw, Send, Star, XCircle } from 'lucide-react';
import { useState } from 'react';
import { CopyableUrl } from './copyable-url';
import { gatewayKind, isMpesaType } from '@/components/payments/gateway-catalog';

export interface GatewayCheckResult {
  success: boolean;
  /** Short outcome text, e.g. "Connected" or the error. */
  message: string;
  /** Capability chips shown after a successful test. */
  capabilities?: { label: string; on: boolean }[];
}

/** Status pill: one badge, worded for people (no duplicate "ACTIVE ACTIVE"). */
function statusBadge(gw: GatewayConfig) {
  if (!gw.is_active) return <Badge variant="secondary">Inactive</Badge>;
  if (gw.status === 'pending_verification') return <Badge variant="warning">Needs a test</Badge>;
  if (gw.status === 'error') return <Badge variant="error">Error</Badge>;
  return <Badge variant="success">Live</Badge>;
}

/**
 * One configured gateway: identity, status, actions, the last check's result and its integration
 * URLs (collapsed until needed).
 */
export function GatewayCard({
  gw,
  checking,
  result,
  registeringC2B,
  onCheck,
  onEditCredentials,
  onRegisterC2B,
  onSaveUrl,
  onSetActive,
  onMakePrimary,
  saving,
}: {
  gw: GatewayConfig;
  checking: boolean;
  result?: GatewayCheckResult;
  registeringC2B?: boolean;
  onCheck: () => void;
  onEditCredentials: () => void;
  onRegisterC2B?: () => void;
  onSaveUrl?: (field: 'webhook_url' | 'callback_url', url: string) => void;
  /** Turns the gateway on or off for every tenant (off: tenants no longer see or use it). */
  onSetActive?: (active: boolean) => void;
  onMakePrimary?: () => void;
  saving?: boolean;
}) {
  const kind = gatewayKind(gw.gateway_type);
  const Icon = kind.icon;
  const mpesa = isMpesaType(gw.gateway_type);
  const forex = gw.gateway_type === 'forex_provider';
  const urls = [
    gw.webhook_url && { label: mpesa ? 'C2B confirmation' : 'Webhook', url: gw.webhook_url, field: 'webhook_url' as const },
    gw.callback_url && {
      label: mpesa ? 'Result URL base' : 'Payer return URL',
      url: gw.callback_url,
      field: 'callback_url' as const,
      hint: mpesa ? 'Base for every M-Pesa result URL (B2C, B2B, balance, status, reversal). Editing it changes all of them.' : undefined,
    },
    mpesa && gw.mpesa_callback_url && { label: 'STK callback', url: gw.mpesa_callback_url },
    mpesa && gw.mpesa_validation_url && { label: 'C2B validation', url: gw.mpesa_validation_url },
  ].filter(Boolean) as { label: string; url: string; field?: 'webhook_url' | 'callback_url'; hint?: string }[];
  const [showUrls, setShowUrls] = useState(false);

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-base font-semibold">{gw.name}</h4>
            {statusBadge(gw)}
            {gw.is_primary && <Badge>Primary</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{kind.description || kind.label}</p>
        </div>
        {onSetActive && (
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="hidden sm:inline">{gw.is_active ? 'On for tenants' : 'Off'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={gw.is_active}
              aria-label={gw.is_active ? `Turn ${gw.name} off for tenants` : `Turn ${gw.name} on for tenants`}
              disabled={saving}
              onClick={() => onSetActive(!gw.is_active)}
              className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50', gw.is_active ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('inline-block h-4 w-4 rounded-full bg-background shadow transition-transform', gw.is_active ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </label>
        )}
      </div>

      {result && !checking && (
        <div
          role="status"
          className={cn(
            'mx-5 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-sm',
            result.success ? 'border-green-500/20 bg-green-500/10 text-green-700' : 'border-destructive/20 bg-destructive/10 text-destructive',
          )}
        >
          {result.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          <span className="font-medium">{result.message}</span>
          {result.capabilities?.map((c) => (
            <span key={c.label} className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', c.on ? 'bg-green-500/15' : 'bg-muted text-muted-foreground line-through')}>
              {c.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-5 py-3">
        <Button size="sm" variant="outline" onClick={onCheck} disabled={checking} className="gap-1.5">
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : forex ? <RefreshCw className="h-3.5 w-3.5" /> : <PlugZap className="h-3.5 w-3.5" />}
          {forex ? 'Fetch rates' : 'Test connection'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onEditCredentials} className="gap-1.5">
          <KeyRound className="h-3.5 w-3.5" /> {kind.credentialKeys.length ? 'Credentials' : 'Rename'}
        </Button>
        {onMakePrimary && gw.is_active && !gw.is_primary && (
          <Button size="sm" variant="ghost" onClick={onMakePrimary} disabled={saving} className="gap-1.5">
            <Star className="h-3.5 w-3.5" /> Make primary
          </Button>
        )}
        {onRegisterC2B && (
          <Button size="sm" variant="ghost" onClick={onRegisterC2B} disabled={registeringC2B} className="gap-1.5" title="Send the C2B validation and confirmation URLs to Safaricom">
            {registeringC2B ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Register C2B
          </Button>
        )}
        {urls.length > 0 && (
          <button
            type="button"
            onClick={() => setShowUrls((v) => !v)}
            aria-expanded={showUrls}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Link2 className="h-3.5 w-3.5" /> URLs <span className="rounded-full bg-muted px-1.5 text-[10px]">{urls.length}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showUrls && 'rotate-180')} />
          </button>
        )}
      </div>

      {showUrls && urls.length > 0 && (
        <div className="space-y-3 border-t border-border px-5 py-4">
          {kind.setupHint && <p className="text-xs text-muted-foreground">{kind.setupHint}</p>}
          {urls.map((u) => (
            <CopyableUrl key={u.label} label={u.label} url={u.url} hint={u.hint} onSave={u.field && onSaveUrl ? (v) => onSaveUrl(u.field!, v) : undefined} />
          ))}
        </div>
      )}
    </Card>
  );
}
