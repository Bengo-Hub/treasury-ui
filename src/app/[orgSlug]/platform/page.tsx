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
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  DollarSign,
  Eye,
  EyeOff,
  Info,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Shield,
  Smartphone,
  Wrench,
  X,
  XCircle
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [activeTab, setActiveTab] = useState<'gateways' | 'fees'>('gateways');
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

  useEffect(() => {
    if (user && !isPlatformOwner) {
      router.replace(`/${orgSlug}`);
    }
  }, [user, isPlatformOwner, orgSlug, router]);

  if (!isPlatformOwner) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">This section requires Platform Owner privileges.</p>
        </div>
      </div>
    );
  }

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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
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
