'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import {
  useCreatePlatformGateway,
  usePlatformGateways,
  useTestPlatformGateway,
  useUpdatePlatformGateway,
} from '@/hooks/use-gateways';
import {
  usePlatformFeeRules,
  useCreatePlatformFeeRule,
  useUpdatePlatformFeeRule,
} from '@/hooks/use-fee-rules';
import { useMe } from '@/hooks/useMe';
import type { GatewayConfig } from '@/lib/api/gateways';
import type { FeeRule, CreateFeeRuleRequest } from '@/lib/api/fee-rules';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { fetchTenantDefaults } from '@/lib/api/tenant';
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Database,
  DollarSign,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Shield,
  Smartphone,
  Wrench,
  X,
  XCircle
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { type ChangeEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

const GATEWAY_TYPES = [
  { value: 'paystack', label: 'Paystack' },
  { value: 'mpesa_paybill', label: 'M-Pesa Paybill' },
  { value: 'mpesa_till', label: 'M-Pesa Till' },
  { value: 'cod', label: 'Cash on Delivery (COD)' },
] as const;

const CREDENTIAL_KEYS: Record<string, string[]> = {
  paystack: ['secret_key', 'public_key', 'webhook_secret'],
  mpesa_paybill: ['consumer_key', 'consumer_secret', 'passkey', 'shortcode', 'initiator_name', 'initiator_password'],
  mpesa_till: ['consumer_key', 'consumer_secret', 'passkey', 'shortcode', 'initiator_name', 'initiator_password'],
  cod: [],
};

const FEE_GATEWAY_LABELS: Record<string, string> = {
  paystack: 'Paystack',
  mpesa_paybill: 'M-Pesa Paybill',
  mpesa_till: 'M-Pesa Till',
  cod: 'Cash on Delivery',
  all: 'All Gateways',
};

const FEE_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  fixed: 'Fixed',
  tiered: 'Tiered',
};

const FEE_GATEWAY_OPTIONS = [
  { value: 'all', label: 'All Gateways' },
  { value: 'paystack', label: 'Paystack' },
  { value: 'mpesa_paybill', label: 'M-Pesa Paybill' },
  { value: 'mpesa_till', label: 'M-Pesa Till' },
  { value: 'cod', label: 'Cash on Delivery' },
] as const;

const FEE_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'tiered', label: 'Tiered' },
] as const;

function getGatewayIcon(gatewayType: string) {
  if (gatewayType === 'paystack') {
    return <CreditCard className="h-5 w-5 text-blue-600" />;
  }
  if (gatewayType === 'mpesa_paybill' || gatewayType === 'mpesa_till') {
    return <Smartphone className="h-5 w-5 text-green-600" />;
  }
  if (gatewayType === 'cod') {
    return <Banknote className="h-5 w-5 text-amber-600" />;
  }
  return <CreditCard className="h-5 w-5 text-primary" />;
}

function getGatewayIconBg(gatewayType: string) {
  if (gatewayType === 'paystack') return 'bg-blue-100 dark:bg-blue-900/30';
  if (gatewayType === 'mpesa_paybill' || gatewayType === 'mpesa_till') return 'bg-green-100 dark:bg-green-900/30';
  if (gatewayType === 'cod') return 'bg-amber-100 dark:bg-amber-900/30';
  return 'bg-primary/10';
}

function getIntegrationTip(gatewayType: string) {
  if (gatewayType === 'paystack') return 'Configure these URLs in your Paystack dashboard';
  if (gatewayType === 'mpesa_paybill' || gatewayType === 'mpesa_till') return 'Configure these URLs in your Safaricom portal';
  return '';
}

function isMpesa(gatewayType: string) {
  return gatewayType === 'mpesa_paybill' || gatewayType === 'mpesa_till';
}

function CopyableUrl({ label, url, onSave }: { label: string; url?: string; onSave?: (newUrl: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(url ?? '');

  if (!url && !editing) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url ?? editValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSave && editValue.trim()) {
      onSave(editValue.trim());
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditValue(url ?? '');
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}:</span>
      {editing ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="text-xs bg-background border border-input px-2 py-1 rounded font-mono flex-1 min-w-0 focus:ring-1 focus:ring-primary/30 outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <button type="button" onClick={handleSave} className="p-1 rounded hover:bg-accent shrink-0" title="Save">
            <Check className="h-3.5 w-3.5 text-green-600" />
          </button>
          <button type="button" onClick={handleCancel} className="p-1 rounded hover:bg-accent shrink-0" title="Cancel">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <>
          <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono truncate flex-1">{url}</code>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:bg-accent shrink-0"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {onSave && (
            <button
              type="button"
              onClick={() => { setEditValue(url ?? ''); setEditing(true); }}
              className="p-1 rounded hover:bg-accent shrink-0"
              title="Edit URL"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface TestResult {
  success: boolean;
  error?: string;
  supports_stk?: boolean;
  supports_refund?: boolean;
}

export default function PlatformPage() {
  const { data: user } = useMe();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [activeTab, setActiveTab] = useState<'gateways' | 'fees' | 'etims' | 'payments' | 'encryption' | 'backups'>('gateways');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [showAddGateway, setShowAddGateway] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayConfig | null>(null);
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [showAddFeeRule, setShowAddFeeRule] = useState(false);
  const [editingFeeRule, setEditingFeeRule] = useState<FeeRule | null>(null);
  const [feeMenuOpen, setFeeMenuOpen] = useState<string | null>(null);

  const isPlatformOwner = user?.isPlatformOwner || user?.isSuperUser || orgSlug === 'codevertex';
  const { data: gatewaysData, isLoading: loading, error: queryError, refetch: fetchGateways } = usePlatformGateways(!!isPlatformOwner);
  const gateways = gatewaysData?.gateways ?? [];
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load gateways') : null;

  const testMutation = useTestPlatformGateway();
  const createGateway = useCreatePlatformGateway();
  const updateGateway = useUpdatePlatformGateway();

  const { data: feeRulesData, isLoading: loadingFeeRules } = usePlatformFeeRules();
  const feeRules = feeRulesData?.fee_rules ?? [];
  const createFeeRule = useCreatePlatformFeeRule();
  const updateFeeRule = useUpdatePlatformFeeRule();


  const handleTestGateway = async (gw: GatewayConfig) => {
    setTestingId(gw.id);
    // Clear previous result for this gateway
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[gw.id];
      return next;
    });
    try {
      const result = await testMutation.mutateAsync(gw.id);
      setTestResults((prev) => ({ ...prev, [gw.id]: result }));
      await fetchGateways();
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [gw.id]: { success: false, error: e?.response?.data?.error || e?.message || 'Connection failed' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="warning">Platform Admin</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Configuration</h1>
          <p className="text-muted-foreground mt-1">System-wide gateway settings, API secrets, and fee structures.</p>
        </div>
      </div>

      <div className="flex bg-accent/30 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('gateways')}
          className={cn("px-6 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'gateways' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <CreditCard className="h-4 w-4 inline mr-2" />
          System Gateways
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          className={cn("px-6 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'fees' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Wrench className="h-4 w-4 inline mr-2" />
          Fee Configuration
        </button>
        <button
          onClick={() => setActiveTab('etims')}
          className={cn("px-6 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'etims' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Receipt className="h-4 w-4 inline mr-2" />
          eTIMS / KRA
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={cn("px-6 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'payments' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Banknote className="h-4 w-4 inline mr-2" />
          Payments
        </button>
        <button
          onClick={() => setActiveTab('encryption')}
          className={cn("px-6 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'encryption' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <KeyRound className="h-4 w-4 inline mr-2" />
          Encryption
        </button>
        <button
          onClick={() => setActiveTab('backups')}
          className={cn("px-6 py-2 rounded-md text-sm font-medium transition-all", activeTab === 'backups' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Database className="h-4 w-4 inline mr-2" />
          Backups
        </button>
      </div>

      {activeTab === 'gateways' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-tight">Platform payment gateways</h3>
              </div>
              <Button size="sm" className="gap-2" onClick={() => { setShowAddGateway(true); setCredentialValues({}); }}>
                <Plus className="h-3.5 w-3.5" /> Activate gateway
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-6 py-8 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading gateways…
                </div>
              ) : error ? (
                <div className="px-6 py-4 text-sm text-destructive">{error}</div>
              ) : gateways.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No platform gateways configured. Use &quot;Activate gateway&quot; to add Paystack, M-Pesa, or COD with credentials.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {gateways.map((gw) => {
                    const tip = getIntegrationTip(gw.gateway_type);
                    const testResult = testResults[gw.id];
                    const isTesting = testingId === gw.id;

                    return (
                      <div key={gw.id} className="px-6 py-5 hover:bg-accent/5 transition-colors space-y-3">
                        {/* Header row */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", getGatewayIconBg(gw.gateway_type))}>
                              {getGatewayIcon(gw.gateway_type)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{gw.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{gw.gateway_type}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={gw.is_active ? 'success' : 'outline'}>{gw.is_active ? 'Active' : 'Inactive'}</Badge>
                                <Badge variant="outline">{gw.status}</Badge>
                                {gw.is_primary && <Badge variant="secondary">Primary</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setEditingGateway(gw); setCredentialValues({}); }}
                            >
                              Edit credentials
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isTesting || testMutation.isPending}
                              onClick={() => handleTestGateway(gw)}
                            >
                              {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                              Test
                            </Button>
                          </div>
                        </div>

                        {/* Test result feedback */}
                        {isTesting && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-13">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Testing connection...
                          </div>
                        )}
                        {testResult && !isTesting && (
                          <div className={cn(
                            "rounded-lg border px-4 py-3",
                            testResult.success
                              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                          )}>
                            {testResult.success ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Connected</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6">
                                  {testResult.supports_stk !== undefined && (
                                    <span className="flex items-center gap-1">
                                      {testResult.supports_stk ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                                      STK Push
                                    </span>
                                  )}
                                  {testResult.supports_refund !== undefined && (
                                    <span className="flex items-center gap-1">
                                      {testResult.supports_refund ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                                      Refunds
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                                  {testResult.error || 'Connection failed'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* URLs section */}
                        {(gw.webhook_url || gw.callback_url || (isMpesa(gw.gateway_type) && (gw.mpesa_callback_url || gw.mpesa_validation_url || gw.mpesa_confirmation_url))) && (
                          <div className="space-y-2 bg-muted/30 rounded-lg p-3 border border-border/50">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Integration URLs</span>
                              {tip && (
                                <span className="group relative">
                                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border whitespace-nowrap z-10">
                                    {tip}
                                  </span>
                                </span>
                              )}
                            </div>
                            <CopyableUrl
                              label="Webhook URL"
                              url={gw.webhook_url}
                              onSave={async (newUrl) => {
                                try {
                                  await updateGateway.mutateAsync({ id: gw.id, body: { webhook_url: newUrl } });
                                  toast.success('Webhook URL updated');
                                  fetchGateways();
                                } catch (e: any) {
                                  toast.error(e?.response?.data?.message || 'Failed to update webhook URL');
                                }
                              }}
                            />
                            <CopyableUrl
                              label="Callback URL"
                              url={gw.callback_url}
                              onSave={async (newUrl) => {
                                try {
                                  await updateGateway.mutateAsync({ id: gw.id, body: { callback_url: newUrl } });
                                  toast.success('Callback URL updated');
                                  fetchGateways();
                                } catch (e: any) {
                                  toast.error(e?.response?.data?.message || 'Failed to update callback URL');
                                }
                              }}
                            />
                            {isMpesa(gw.gateway_type) && (
                              <>
                                <CopyableUrl label="M-Pesa Callback" url={gw.mpesa_callback_url} />
                                <CopyableUrl label="M-Pesa Validation" url={gw.mpesa_validation_url} />
                                <CopyableUrl label="M-Pesa Confirm" url={gw.mpesa_confirmation_url} />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add gateway modal */}
          {showAddGateway && (
            <GatewayCredentialsModal
              title="Activate gateway"
              gatewayType={null}
              name=""
              credentialKeys={[]}
              credentialValues={credentialValues}
              setCredentialValues={setCredentialValues}
              onClose={() => setShowAddGateway(false)}
              onSubmit={async (type, name, creds) => {
                try {
                  await createGateway.mutateAsync({ gateway_type: type, name, credentials: creds });
                  toast.success('Gateway created');
                  setShowAddGateway(false);
                  fetchGateways();
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || e?.message || 'Failed to create gateway');
                }
              }}
              isSubmitting={createGateway.isPending}
              gatewayTypes={GATEWAY_TYPES}
              credentialKeysByType={CREDENTIAL_KEYS}
            />
          )}

          {/* Edit credentials modal */}
          {editingGateway && (
            <GatewayCredentialsModal
              title="Update credentials"
              gatewayType={editingGateway.gateway_type}
              name={editingGateway.name}
              credentialKeys={CREDENTIAL_KEYS[editingGateway.gateway_type] ?? []}
              credentialValues={credentialValues}
              setCredentialValues={setCredentialValues}
              onClose={() => setEditingGateway(null)}
              onSubmit={async (_type, _name, creds) => {
                if (!editingGateway) return;
                try {
                  await updateGateway.mutateAsync({ id: editingGateway.id, body: { credentials: creds } });
                  toast.success('Credentials updated');
                  setEditingGateway(null);
                  fetchGateways();
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || e?.message || 'Failed to update');
                }
              }}
              isSubmitting={updateGateway.isPending}
              editMode
            />
          )}
          
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-tight">Fee Structures</h3>
              </div>
              <Button size="sm" className="gap-2" onClick={() => { setShowAddFeeRule(true); setEditingFeeRule(null); }}>
                <Plus className="h-3.5 w-3.5" /> Add Fee Rule
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingFeeRules ? (
                <div className="px-6 py-8 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading fee rules...
                </div>
              ) : feeRules.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No fee rules configured yet. Use &quot;Add Fee Rule&quot; to define platform-wide fee structures.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3 font-medium">Gateway</th>
                        <th className="px-6 py-3 font-medium">Fee Type</th>
                        <th className="px-6 py-3 font-medium">Percentage</th>
                        <th className="px-6 py-3 font-medium">Fixed Amount</th>
                        <th className="px-6 py-3 font-medium">Min / Max</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {feeRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-accent/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-xs">{FEE_GATEWAY_LABELS[rule.gateway_type] || rule.gateway_type}</td>
                          <td className="px-6 py-4">
                            <Badge variant="default">{FEE_TYPE_LABELS[rule.fee_type] || rule.fee_type}</Badge>
                          </td>
                          <td className="px-6 py-4 text-xs">{rule.percentage ? `${rule.percentage}%` : '-'}</td>
                          <td className="px-6 py-4 text-xs">{rule.fixed_amount ? `${rule.currency} ${rule.fixed_amount}` : '-'}</td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {rule.min_amount || rule.max_amount
                              ? `${rule.min_amount ? `${rule.currency} ${rule.min_amount}` : '-'} / ${rule.max_amount ? `${rule.currency} ${rule.max_amount}` : '-'}`
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={rule.is_active ? 'success' : 'outline'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setFeeMenuOpen(feeMenuOpen === rule.id ? null : rule.id)}
                                className="p-1 rounded hover:bg-accent"
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </button>
                              {feeMenuOpen === rule.id && (
                                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                                  <button
                                    type="button"
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent"
                                    onClick={() => { setEditingFeeRule(rule); setShowAddFeeRule(true); setFeeMenuOpen(null); }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent"
                                    onClick={() => {
                                      updateFeeRule.mutate({ id: rule.id, data: { is_active: !rule.is_active } });
                                      setFeeMenuOpen(null);
                                    }}
                                  >
                                    {rule.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                </div>
                              )}
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

          {/* Add / Edit fee rule dialog */}
          <Dialog open={showAddFeeRule} onOpenChange={setShowAddFeeRule}>
            <FeeRuleFormDialog
              initialData={editingFeeRule}
              onClose={() => { setShowAddFeeRule(false); setEditingFeeRule(null); }}
              onSubmit={async (data) => {
                if (editingFeeRule) {
                  await updateFeeRule.mutateAsync({ id: editingFeeRule.id, data });
                } else {
                  await createFeeRule.mutateAsync(data);
                }
                setShowAddFeeRule(false);
                setEditingFeeRule(null);
              }}
              isSubmitting={createFeeRule.isPending || updateFeeRule.isPending}
            />
          </Dialog>
        </div>
      )}

      {activeTab === 'etims' && (
        <EtimsConfigSection orgSlug={orgSlug} />
      )}

      {activeTab === 'payments' && (
        <PlatformPaymentsSection orgSlug={orgSlug} />
      )}

      {activeTab === 'encryption' && (
        <EncryptionKeySection />
      )}

      {activeTab === 'backups' && (
        <BackupDestinationSection />
      )}
    </div>
  );
}

// ── Platform Payments — invoice business identity + payment account ─────────────
// Stored as a single JSON platform setting (platform_payment_account). Used on
// platform→tenant subscription invoices for the issuer block + "How to pay" section.

interface PlatformPayAccount {
  business_name: string;
  tagline: string;
  // Structured address — each part renders on its own line on the document.
  building: string;
  street: string;
  city: string;
  po_box: string;
  postal_code: string;
  country: string;
  address: string; // legacy single-line fallback
  tax_pin: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  mpesa_paybill: string;
  mpesa_till: string;
  instructions: string;
}

const EMPTY_PAY_ACCOUNT: PlatformPayAccount = {
  business_name: '', tagline: '', building: '', street: '', city: '', po_box: '',
  postal_code: '', country: '', address: '', tax_pin: '', bank_name: '', account_name: '',
  account_number: '', branch_code: '', mpesa_paybill: '', mpesa_till: '', instructions: '',
};

function PlatformPaymentsSection({ orgSlug }: { orgSlug: string }) {
  const [acct, setAcct] = useState<PlatformPayAccount>(EMPTY_PAY_ACCOUNT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      let saved: Partial<PlatformPayAccount> = {};
      try {
        const data = await apiClient.get<{ settings: Array<{ config_key: string; config_value: string }> }>(
          `/api/v1/platform/settings`
        );
        const row = (data.settings ?? []).find((s) => s.config_key === 'platform_payment_account');
        if (row?.config_value) { try { saved = JSON.parse(row.config_value); } catch { /* ignore */ } }
      } catch { /* none yet */ }
      // Pre-fill identity defaults from the logged-in tenant's auth-api profile, so the form
      // reflects the real tenant (name, slogan, address, …) without manual re-entry. Saved
      // values always win.
      const def = await fetchTenantDefaults(orgSlug).catch(() => null);
      setAcct({
        ...EMPTY_PAY_ACCOUNT,
        ...(def ? {
          business_name: def.name,
          tagline: def.tagline,
          address: def.address,
          country: def.country,
          tax_pin: def.taxPin,
        } : {}),
        ...saved,
      });
      setLoading(false);
    }
    load();
  }, [orgSlug]);

  const set = (k: keyof PlatformPayAccount) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setAcct((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/api/v1/platform/settings/platform_payment_account`, {
        config_value: JSON.stringify(acct),
        config_type: 'json',
        description: 'Platform business identity + payment account shown on subscription invoices',
        is_secret: false,
      });
      toast.success('Platform payment details saved — applied to new subscription invoices');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save payment details');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, k: keyof PlatformPayAccount, placeholder = '') => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={acct[k]}
        onChange={set(k)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Banknote className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-bold text-sm uppercase tracking-tight">Platform Payment Details</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Business identity + payment account shown on platform subscription invoices (issuer block + &quot;How to pay&quot;).
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Business Identity</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {field('Business / Legal Name', 'business_name', 'Codevertex Africa Limited')}
                  {field('Slogan / Tagline', 'tagline', 'Tangible Solutions for Businesses')}
                  {field('Tax PIN', 'tax_pin', 'P051XXXXXXX')}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Address</p>
                <p className="text-[11px] text-muted-foreground -mt-2 mb-3">Each part prints on its own line on the document (building, then street/city/country, then P.O. Box).</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {field('Building / Floor / Suite', 'building', '2nd Floor, Pioneer Hse')}
                  {field('Street', 'street', 'Oginga Street')}
                  {field('City / Town', 'city', 'Kisumu')}
                  {field('P.O. Box', 'po_box', '547')}
                  {field('Postal Code', 'postal_code', '40100')}
                  {field('Country', 'country', 'Kenya')}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Bank Account</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {field('Bank Name', 'bank_name', 'Equity Bank')}
                  {field('Branch / IBAN / Swift', 'branch_code')}
                  {field('Account Name', 'account_name')}
                  {field('Account Number', 'account_number')}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Mobile Money</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {field('M-Pesa Paybill', 'mpesa_paybill')}
                  {field('M-Pesa Till', 'mpesa_till')}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Payment Instructions (optional)</label>
                <textarea
                  value={acct.instructions}
                  onChange={set('instructions')}
                  rows={2}
                  placeholder="e.g. Use your invoice number as the payment reference."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Payment Details
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Credential Encryption Key ──────────────────────────────────────────────────
// Manages the credential-encryption key used by treasury-api to encrypt gateway
// secrets (and other credentials) at rest. The raw key is never returned by the
// API — only a fingerprint + source. Rotating encrypts NEW credentials with the
// new key; existing credentials remain readable (decryption tries previous keys).

interface EncryptionKeyStatus {
  configured: boolean;
  source: 'db' | 'env' | 'dev';
  key_fingerprint: string;
  updated_at: string | null;
}

function EncryptionKeySection() {
  const [status, setStatus] = useState<EncryptionKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const loadStatus = async () => {
    try {
      const data = await apiClient.get<EncryptionKeyStatus>('/api/v1/platform/encryption-key');
      setStatus(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load encryption key status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiClient.put('/api/v1/platform/encryption-key', { generate: true });
      await loadStatus();
      toast.success('New encryption key generated and activated');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setSavingKey(true);
    try {
      await apiClient.put('/api/v1/platform/encryption-key', { key: keyInput.trim() });
      await loadStatus();
      setKeyInput('');
      toast.success('Encryption key saved and activated');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Invalid key — provide a base64-encoded 32-byte key');
    } finally {
      setSavingKey(false);
    }
  };

  const statusBadge = () => {
    if (!status) return null;
    if (status.source === 'db') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Configured (database)
        </span>
      );
    }
    if (status.source === 'env') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <Info className="h-3.5 w-3.5" /> Using environment fallback
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400">
        <XCircle className="h-3.5 w-3.5" /> Insecure dev key — set a key
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <KeyRound className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-bold text-sm uppercase tracking-tight">Credential Encryption</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Key used by treasury-api to encrypt gateway secrets and other credentials at rest (AES-256-GCM).
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading encryption key status…
            </div>
          ) : error ? (
            <div className="px-1 py-2 text-sm text-destructive">{error}</div>
          ) : status ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {statusBadge()}
                {status.key_fingerprint && (
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono text-muted-foreground">
                    fp: {status.key_fingerprint}
                  </code>
                )}
                {status.updated_at && (
                  <span className="text-xs text-muted-foreground">
                    Last updated: {new Date(status.updated_at).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Rotating the key encrypts NEW credentials with the new key; existing credentials stay
                    readable (decryption tries previous keys). The raw key is never displayed.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleGenerate} disabled={generating || savingKey} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Generate &amp; activate new key
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? 'Hide advanced' : 'Advanced: paste a key'}
                </Button>
              </div>

              {showAdvanced && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Base64-encoded 32-byte key
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="Paste base64 key…"
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                      autoComplete="off"
                    />
                    <Button onClick={handleSaveKey} disabled={savingKey || generating || !keyInput.trim()} className="gap-2">
                      {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save key
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Must decode to exactly 32 bytes. Prefer &quot;Generate&quot; unless migrating an existing key.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Backup Destination ─────────────────────────────────────────────────────────
// Configures an OPTIONAL remote mirror for treasury backups. The local cluster
// volume (PVC) is ALWAYS written and remains the fallback; when a destination is
// enabled here, each backup is also copied to that remote. Credentials are stored
// encrypted by treasury-api and never returned (secret params come back as set:true
// with no value). On save we omit blank secret params so existing secrets persist.

interface BackupParam {
  key: string;
  is_secret: boolean;
  set: boolean;
  value?: string;
}

interface BackupDestination {
  configured: boolean;
  type: string;
  enabled: boolean;
  remote_path: string;
  params: BackupParam[];
}

type BackupParamSpec = {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
  hint?: string;
};

const BACKUP_TYPES = [
  { value: 's3', label: 'S3 / S3-compatible' },
  { value: 'onedrive', label: 'OneDrive' },
  { value: 'gdrive', label: 'Google Drive' },
  { value: 'webdav', label: 'WebDAV' },
  { value: 'sftp', label: 'SFTP' },
  { value: 'smb', label: 'SMB / CIFS' },
] as const;

const BACKUP_TYPE_HELP: Record<string, string> = {
  s3: 'AWS S3 or any S3-compatible store (MinIO, Wasabi, R2). Provide a bucket and access keys.',
  onedrive: 'Microsoft OneDrive. Paste an rclone OAuth token JSON and (optionally) the target drive.',
  gdrive: 'Google Drive. Use an rclone OAuth token JSON or a service-account credentials JSON.',
  webdav: 'Any WebDAV endpoint (Nextcloud, ownCloud, etc.). Provide the URL and login.',
  sftp: 'SFTP server. Authenticate with a password or a private key (PEM).',
  smb: 'SMB / CIFS network share (e.g. a NAS). Provide host, share and login.',
};

const BACKUP_PARAM_SPECS: Record<string, BackupParamSpec[]> = {
  s3: [
    { key: 'bucket', label: 'Bucket', required: true, placeholder: 'treasury-backups' },
    { key: 'region', label: 'Region', placeholder: 'us-east-1' },
    { key: 'endpoint', label: 'Endpoint', placeholder: 'https://s3.amazonaws.com (or MinIO URL)' },
    { key: 'access_key_id', label: 'Access Key ID', secret: true },
    { key: 'secret_access_key', label: 'Secret Access Key', secret: true },
    { key: 'provider', label: 'Provider', placeholder: 'AWS', hint: 'rclone S3 provider (AWS, Minio, Wasabi, Cloudflare…). Default AWS.' },
  ],
  onedrive: [
    { key: 'token', label: 'OAuth Token (JSON)', secret: true, hint: 'rclone OneDrive token JSON.' },
    { key: 'drive_id', label: 'Drive ID' },
    { key: 'drive_type', label: 'Drive Type', placeholder: 'personal | business | documentLibrary' },
  ],
  gdrive: [
    { key: 'token', label: 'OAuth Token (JSON)', secret: true, hint: 'rclone Google Drive token JSON. Use this OR a service account.' },
    { key: 'service_account_credentials', label: 'Service Account Credentials (JSON)', secret: true, hint: 'Service-account key JSON. Use this OR an OAuth token.' },
    { key: 'drive_id', label: 'Root Folder ID', hint: 'Google Drive folder/shared-drive ID to use as the root.' },
  ],
  webdav: [
    { key: 'url', label: 'URL', required: true, placeholder: 'https://cloud.example.com/remote.php/dav/files/user' },
    { key: 'user', label: 'User', required: true },
    { key: 'pass', label: 'Password', secret: true },
    { key: 'vendor', label: 'Vendor', placeholder: 'nextcloud | owncloud | other' },
  ],
  sftp: [
    { key: 'host', label: 'Host', required: true, placeholder: 'backup.example.com' },
    { key: 'port', label: 'Port', placeholder: '22' },
    { key: 'user', label: 'User', required: true },
    { key: 'pass', label: 'Password', secret: true, hint: 'Provide a password OR a private key.' },
    { key: 'key_pem', label: 'Private Key (PEM)', secret: true, hint: 'PEM-encoded private key. Used instead of a password.' },
  ],
  smb: [
    { key: 'host', label: 'Host', required: true, placeholder: 'nas.local' },
    { key: 'user', label: 'User', required: true },
    { key: 'pass', label: 'Password', secret: true },
    { key: 'domain', label: 'Domain', placeholder: 'WORKGROUP' },
    { key: 'share', label: 'Share', placeholder: 'backups' },
  ],
};

function BackupDestinationSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [type, setType] = useState<string>('s3');
  const [enabled, setEnabled] = useState(false);
  const [remotePath, setRemotePath] = useState('');
  // Map of param key → current input value. Empty string for a secret means
  // "unchanged" (we never send blanks for secrets). Tracks which secrets are
  // already set server-side so we can render the "leave blank to keep" hint.
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [secretSet, setSecretSet] = useState<Record<string, boolean>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const specs = BACKUP_PARAM_SPECS[type] ?? [];

  const applyDestination = (d: BackupDestination) => {
    setType(d.type || 's3');
    setEnabled(!!d.enabled);
    setRemotePath(d.remote_path || '');
    const vals: Record<string, string> = {};
    const sset: Record<string, boolean> = {};
    (d.params ?? []).forEach((p) => {
      if (p.is_secret) {
        sset[p.key] = !!p.set;
        // never prefill secret values into the input
      } else if (p.value !== undefined && p.value !== null) {
        vals[p.key] = p.value;
      }
    });
    setParamValues(vals);
    setSecretSet(sset);
  };

  const load = async () => {
    try {
      const d = await apiClient.get<BackupDestination>('/api/v1/platform/backups/destination');
      if (d.configured) applyDestination(d);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load backup destination');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // When the user switches type, drop param values that don't belong to the new
  // type so we don't accidentally submit stale fields.
  const handleTypeChange = (next: string) => {
    setType(next);
    setVisible({});
  };

  const setParam = (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setParamValues((p) => ({ ...p, [key]: e.target.value }));

  // Builds the PUT/test param map: only include params for the current type, and
  // for secrets only include them when the user actually typed a new value (so
  // existing encrypted secrets are preserved).
  const buildParams = (): Record<string, string> => {
    const out: Record<string, string> = {};
    specs.forEach((s) => {
      const v = paramValues[s.key];
      if (s.secret) {
        if (v && v.trim()) out[s.key] = v;
      } else if (v !== undefined && v !== '') {
        out[s.key] = v;
      }
    });
    return out;
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await apiClient.post<{ ok: boolean; message: string }>(
        '/api/v1/platform/backups/destination/test',
        { type, enabled, remote_path: remotePath, params: buildParams() }
      );
      if (res.ok) {
        toast.success(res.message || 'Connection succeeded');
      } else {
        toast.error(res.message || 'Connection failed');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const d = await apiClient.put<BackupDestination>('/api/v1/platform/backups/destination', {
        type,
        enabled,
        remote_path: remotePath,
        params: buildParams(),
      });
      if (d.configured) applyDestination(d);
      // Clear typed secret inputs after a successful save (they're now stored).
      setParamValues((p) => {
        const next = { ...p };
        specs.forEach((s) => { if (s.secret) delete next[s.key]; });
        return next;
      });
      toast.success('Backup destination saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to save backup destination');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisible = (key: string) =>
    setVisible((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Database className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-bold text-sm uppercase tracking-tight">Backup Destination</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure an optional remote mirror for treasury backups. The local cluster volume is always kept.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading backup destination…
            </div>
          ) : error ? (
            <div className="px-1 py-2 text-sm text-destructive">{error}</div>
          ) : (
            <>
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Backups are always written to the local cluster volume (PVC). When a destination is enabled,
                    each backup is also mirrored there; the PVC copy remains the fallback. Credentials are stored
                    encrypted and never shown.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Destination type</label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {BACKUP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">{BACKUP_TYPE_HELP[type]}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Remote path</label>
                  <input
                    type="text"
                    value={remotePath}
                    onChange={(e) => setRemotePath(e.target.value)}
                    placeholder="treasury/backups"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Folder / key prefix within the destination (e.g. S3 key prefix or Drive folder path).
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">Mirror backups to this remote destination</p>
                  <p className="text-xs text-muted-foreground">
                    When off, only the local cluster volume (PVC) is used — no remote copy is made.
                  </p>
                </div>
              </label>

              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    {BACKUP_TYPES.find((t) => t.value === type)?.label} settings
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {specs.map((s) => {
                    const isSet = secretSet[s.key];
                    const isVisible = visible[s.key] ?? false;
                    const placeholder = s.secret && isSet
                      ? '•••• (set — leave blank to keep)'
                      : (s.placeholder ?? '');
                    return (
                      <div key={s.key} className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          {s.label}
                          {s.required && <span className="text-destructive">*</span>}
                          {s.secret && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">Secret</span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type={s.secret && !isVisible ? 'password' : 'text'}
                            value={paramValues[s.key] ?? ''}
                            onChange={setParam(s.key)}
                            placeholder={placeholder}
                            autoComplete="off"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono pr-10"
                          />
                          {s.secret && (
                            <button
                              type="button"
                              onClick={() => toggleVisible(s.key)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              tabIndex={-1}
                            >
                              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                        {s.hint && <p className="text-[10px] text-muted-foreground">{s.hint}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={handleTest} disabled={testing || saving} className="gap-2">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Test connection
                </Button>
                <Button onClick={handleSave} disabled={saving || testing} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── eTIMS / KRA Platform Configuration ─────────────────────────────────────────
// Platform admin sets the shared KRA eTIMS API credentials (base URL + API key).
// Device serial numbers and TINs are tenant-specific — tenants register their own
// KRA devices via the Tax & Compliance page (branch-scoped via EtimsDevice entity).

interface EtimsConfig {
  base_url: string;
  api_key: string;   // stored masked in API responses (is_secret=true)
}

function EtimsConfigSection({ orgSlug }: { orgSlug: string }) {
  const [config, setConfig] = useState<EtimsConfig>({ base_url: '', api_key: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient.get<{ settings: Array<{ config_key: string; config_value: string }> }>(
          `/api/v1/platform/settings`
        );
        const settings = data.settings ?? [];
        const byKey: Record<string, string> = {};
        settings.forEach((s) => { byKey[s.config_key] = s.config_value; });
        setConfig({
          base_url: byKey['etims.base_url'] ?? '',
          api_key: byKey['etims.api_key'] ?? '',
        });
      } catch {
        // ignore — likely no settings yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgSlug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Array<{ key: string; value: string; is_secret: boolean }> = [
        { key: 'etims.base_url', value: config.base_url, is_secret: false },
        { key: 'etims.api_key', value: config.api_key, is_secret: true },
      ];
      for (const u of updates) {
        if (u.value && u.value !== '***') {
          await apiClient.put(`/api/v1/platform/settings/${u.key}`, {
            config_value: u.value,
            config_type: 'string',
            description: u.key === 'etims.base_url'
              ? 'KRA eTIMS API base URL (e.g. https://etims-api.kra.go.ke/etims-api)'
              : 'KRA eTIMS API key / CMC key (sensitive)',
            is_secret: u.is_secret,
          });
        }
      }
      toast.success('eTIMS configuration saved — takes effect on next treasury-api startup');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save eTIMS config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Receipt className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-bold text-sm uppercase tracking-tight">KRA eTIMS — Platform Credentials</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Shared API credentials used by treasury-api to reach KRA's eTIMS gateway on behalf of all tenants.
              Changes take effect on the next treasury-api pod restart.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading configuration…
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">eTIMS API Base URL</label>
                  <input
                    type="url"
                    value={config.base_url}
                    onChange={(e) => setConfig((p) => ({ ...p, base_url: e.target.value }))}
                    placeholder="https://etims-api.kra.go.ke/etims-api"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Sandbox: https://etims-api-sbx.kra.go.ke/etims-api
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" /> KRA API Key / CMC Key
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">Secret</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={config.api_key}
                      onChange={(e) => setConfig((p) => ({ ...p, api_key: e.target.value }))}
                      placeholder="Enter KRA API key…"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Masked after save. Leave blank to keep existing value.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    <p className="font-semibold">Tenant device registration is separate</p>
                    <p>
                      Each tenant registers their own KRA OSCU device serial number and TIN from their
                      <strong> Tax &amp; Compliance</strong> page (eTIMS Devices tab). Device serials are
                      business-specific and branch-scoped — they are NOT configured here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save eTIMS Configuration
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function isSensitiveField(key: string): boolean {
  return /secret|password|key/i.test(key);
}

function GatewayCredentialsModal({
  title,
  gatewayType,
  name,
  credentialKeys,
  credentialValues,
  setCredentialValues,
  onClose,
  onSubmit,
  isSubmitting,
  gatewayTypes,
  credentialKeysByType,
  editMode = false,
}: {
  title: string;
  gatewayType: string | null;
  name: string;
  credentialKeys: string[];
  credentialValues: Record<string, string>;
  setCredentialValues: (v: Record<string, string>) => void;
  onClose: () => void;
  onSubmit: (type: string, name: string, credentials: Record<string, string>) => Promise<void>;
  isSubmitting: boolean;
  gatewayTypes?: readonly { value: string; label: string }[];
  credentialKeysByType?: Record<string, string[]>;
  editMode?: boolean;
}) {
  const [selectedType, setSelectedType] = useState(gatewayType ?? 'paystack');
  const [nameVal, setNameVal] = useState(name);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const keys = editMode ? credentialKeys : (credentialKeysByType?.[selectedType] ?? credentialKeys);

  const toggleFieldVisibility = (key: string) => {
    setVisibleFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const creds: Record<string, string> = {};
    keys.forEach((k) => { if (credentialValues[k]) creds[k] = credentialValues[k]; });
    onSubmit(editMode ? (gatewayType ?? selectedType) : selectedType, editMode ? name : nameVal, creds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-xl border border-border max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editMode && gatewayTypes && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Gateway type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {gatewayTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  placeholder="e.g. Paystack Production"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
            </>
          )}
          {keys.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">API Credentials</span>
              </div>
              {keys.map((k) => {
                const sensitive = isSensitiveField(k);
                const isVisible = visibleFields[k] ?? false;

                return (
                  <div key={k}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {k.replace(/_/g, ' ')}
                    </label>
                    <div className="relative">
                      <input
                        type={sensitive && !isVisible ? 'password' : 'text'}
                        value={credentialValues[k] ?? ''}
                        onChange={(e) => setCredentialValues({ ...credentialValues, [k]: e.target.value })}
                        placeholder={editMode ? 'Leave blank to keep current' : ''}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono pr-10"
                        autoComplete="off"
                      />
                      {sensitive && (
                        <button
                          type="button"
                          onClick={() => toggleFieldVisibility(k)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent"
                          tabIndex={-1}
                        >
                          {isVisible ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {selectedType === 'cod' && !editMode && (
            <p className="text-xs text-muted-foreground">COD has no credentials; name only.</p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editMode ? 'Update' : 'Create'}
            </Button>
          </div>
          {keys.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
              <Shield className="h-3 w-3 shrink-0" />
              <span>Credentials are encrypted at rest (AES-256-GCM)</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fee Rule Form Dialog                                                */
/* ------------------------------------------------------------------ */

function FeeRuleFormDialog({
  initialData,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  initialData?: FeeRule | null;
  onClose: () => void;
  onSubmit: (data: CreateFeeRuleRequest) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [gatewayType, setGatewayType] = useState(initialData?.gateway_type ?? 'all');
  const [feeType, setFeeType] = useState(initialData?.fee_type ?? 'percentage');
  const [percentage, setPercentage] = useState(initialData?.percentage ?? '');
  const [fixedAmount, setFixedAmount] = useState(initialData?.fixed_amount ?? '');
  const [currency, setCurrency] = useState(initialData?.currency ?? 'KES');
  const [minAmount, setMinAmount] = useState(initialData?.min_amount ?? '');
  const [maxAmount, setMaxAmount] = useState(initialData?.max_amount ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      gateway_type: gatewayType,
      fee_type: feeType,
      percentage: percentage || undefined,
      fixed_amount: fixedAmount || undefined,
      currency,
      min_amount: minAmount || undefined,
      max_amount: maxAmount || undefined,
      description: description || undefined,
    });
  };

  return (
    <DialogContent title={initialData ? 'Edit Fee Rule' : 'Add Fee Rule'} onClose={onClose} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Gateway Type" required>
          <select
            value={gatewayType}
            onChange={(e) => setGatewayType(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {FEE_GATEWAY_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Fee Type" required>
          <select
            value={feeType}
            onChange={(e) => setFeeType(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {FEE_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Percentage" description="Fee percentage (e.g. 2.5 for 2.5%)">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            placeholder="e.g. 2.50"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </FormField>

        <FormField label="Fixed Amount" description="Fixed fee amount per transaction">
          <input
            type="number"
            step="0.01"
            min="0"
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            placeholder="e.g. 100.00"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </FormField>

        <FormField label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {['KES', 'NGN', 'GHS', 'ZAR', 'USD'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Min Amount">
            <input
              type="number"
              step="0.01"
              min="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </FormField>
          <FormField label="Max Amount">
            <input
              type="number"
              step="0.01"
              min="0"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="No limit"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </FormField>
        </div>

        <FormField label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </FormField>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {initialData ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
