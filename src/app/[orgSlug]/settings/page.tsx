'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSettings, useUpdateSetting, getSettingValue } from '@/hooks/use-settings';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { PaymentsTab } from './_components/payments-tab';
import {
  Bell,
  CreditCard,
  Globe,
  Link2,
  Loader2,
  Save,
  Settings2,
  Shield,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { tenantPathId } = useResolvedTenant();
  const tenantSlug = tenantPathId || orgSlug;

  const { data: settingsData, isLoading } = useSettings(tenantSlug);
  const updateSetting = useUpdateSetting(tenantSlug);
  const settings = settingsData?.settings;

  const [activeTab, setActiveTab] = useState('general');

  // ---- General ----
  const [defaultCurrency, setDefaultCurrency] = useState('KES');
  const [receiptPrefix, setReceiptPrefix] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  // ---- Settlements ----
  const [autoSettlement, setAutoSettlement] = useState(true);
  const [settlementSchedule, setSettlementSchedule] = useState('daily');
  const [settlementDay, setSettlementDay] = useState(1);
  const [minPayoutBalance, setMinPayoutBalance] = useState(0);

  // ---- Payments ----
  const [maxPaymentAmount, setMaxPaymentAmount] = useState(0);

  // ---- Notifications ----
  const [failedAlerts, setFailedAlerts] = useState(true);
  const [settlementConfirmation, setSettlementConfirmation] = useState(true);

  // ---- Security ----
  const [requireApproval, setRequireApproval] = useState(false);
  const [approvalThreshold, setApprovalThreshold] = useState(100000);

  // Hydrate from API data
  useEffect(() => {
    if (!settings) return;
    setDefaultCurrency(getSettingValue(settings, 'default_currency', 'KES'));
    setReceiptPrefix(getSettingValue(settings, 'receipt_prefix', ''));
    setWebhookUrl(getSettingValue(settings, 'webhook_url', ''));
    setAutoSettlement(getSettingValue(settings, 'auto_settlement', true));
    setSettlementSchedule(getSettingValue(settings, 'settlement_schedule', 'daily'));
    setSettlementDay(getSettingValue(settings, 'settlement_day', 1));
    setMinPayoutBalance(getSettingValue(settings, 'min_payout_balance', 0));
    setMaxPaymentAmount(getSettingValue(settings, 'max_payment_amount', 0));
    setFailedAlerts(getSettingValue(settings, 'failed_transaction_alerts', true));
    setSettlementConfirmation(getSettingValue(settings, 'settlement_confirmation', true));
    setRequireApproval(getSettingValue(settings, 'require_approval_large_payouts', false));
    setApprovalThreshold(getSettingValue(settings, 'approval_threshold', 100000));
  }, [settings]);

  const saveSetting = (key: string, value: any, configType?: string) => {
    updateSetting.mutate(
      { key, value, configType },
      {
        onSuccess: () => toast.success(`Setting "${key}" saved`),
        onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Failed to save'),
      },
    );
  };

  const inputClass = 'w-full bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none';
  const selectClass = inputClass;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Treasury Settings</h1>
        <p className="text-muted-foreground mt-1">Configure settlement rules, payment methods, notifications, and security policies.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="general">
            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> General</span>
          </TabsTrigger>
          <TabsTrigger value="settlements">
            <span className="flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Settlements</span>
          </TabsTrigger>
          <TabsTrigger value="payments">
            <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Payments</span>
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <span className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Security</span>
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <span className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Integrations</span>
          </TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader className="border-b border-border/50 py-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-tight">General</h3>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Default Currency">
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className={selectClass}
                  >
                    <option value="KES">KES - Kenyan Shilling</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="NGN">NGN - Nigerian Naira</option>
                    <option value="GHS">GHS - Ghanaian Cedi</option>
                    <option value="ZAR">ZAR - South African Rand</option>
                  </select>
                </FormField>
                <FormField label="Receipt Prefix" description="Prefix for generated receipt numbers">
                  <input
                    value={receiptPrefix}
                    onChange={(e) => setReceiptPrefix(e.target.value)}
                    placeholder="e.g. INV-"
                    className={inputClass}
                  />
                </FormField>
              </div>
              <FormField label="Webhook URL" description="Read-only webhook endpoint configured for this tenant">
                <input
                  value={webhookUrl}
                  readOnly
                  className={`${inputClass} bg-accent/20 cursor-not-allowed`}
                  placeholder="Not configured"
                />
              </FormField>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={updateSetting.isPending}
                  onClick={() => {
                    saveSetting('default_currency', defaultCurrency);
                    saveSetting('receipt_prefix', receiptPrefix);
                  }}
                >
                  {updateSetting.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save General
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settlements */}
        <TabsContent value="settlements">
          <Card>
            <CardHeader className="border-b border-border/50 py-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-tight">Settlement Configuration</h3>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <ToggleRow
                label="Auto Settlement"
                description="Automatically settle pending transactions on schedule."
                checked={autoSettlement}
                onChange={(v) => {
                  setAutoSettlement(v);
                  saveSetting('auto_settlement', v, 'boolean');
                }}
              />
              {autoSettlement && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Settlement Schedule">
                    <select
                      value={settlementSchedule}
                      onChange={(e) => setSettlementSchedule(e.target.value)}
                      className={selectClass}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </FormField>
                  {settlementSchedule === 'weekly' && (
                    <FormField label="Settlement Day" description="Day of the week (1=Mon, 7=Sun)">
                      <input
                        type="number"
                        min={1}
                        max={7}
                        value={settlementDay}
                        onChange={(e) => setSettlementDay(parseInt(e.target.value) || 1)}
                        className={inputClass}
                      />
                    </FormField>
                  )}
                </div>
              )}
              <FormField label="Minimum Payout Balance" description="Minimum balance required before a settlement payout is created.">
                <input
                  type="number"
                  min={0}
                  value={minPayoutBalance || ''}
                  onChange={(e) => setMinPayoutBalance(parseFloat(e.target.value) || 0)}
                  className={`${inputClass} w-48 font-mono`}
                />
              </FormField>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={updateSetting.isPending}
                  onClick={() => {
                    saveSetting('settlement_schedule', settlementSchedule);
                    saveSetting('settlement_day', settlementDay, 'number');
                    saveSetting('min_payout_balance', minPayoutBalance, 'number');
                  }}
                >
                  {updateSetting.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Settlements
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <PaymentsTab
            orgSlug={orgSlug}
            tenantSlug={tenantSlug}
            maxPaymentAmount={maxPaymentAmount}
            onMaxAmountChange={setMaxPaymentAmount}
            onSaveMaxAmount={() => saveSetting('max_payment_amount', maxPaymentAmount, 'number')}
            isSavingSettings={updateSetting.isPending}
          />
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader className="border-b border-border/50 py-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-tight">Notifications</h3>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <ToggleRow
                label="Failed Transaction Alerts"
                description="Get notified when a payment transaction fails."
                checked={failedAlerts}
                onChange={(v) => {
                  setFailedAlerts(v);
                  saveSetting('failed_transaction_alerts', v, 'boolean');
                }}
              />
              <ToggleRow
                label="Settlement Confirmation"
                description="Receive a summary when a settlement batch completes."
                checked={settlementConfirmation}
                onChange={(v) => {
                  setSettlementConfirmation(v);
                  saveSetting('settlement_confirmation', v, 'boolean');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader className="border-b border-border/50 py-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-tight">Security & Approvals</h3>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <ToggleRow
                label="Require Approval for Large Payouts"
                description="Payouts above a threshold require manual approval before processing."
                checked={requireApproval}
                onChange={(v) => {
                  setRequireApproval(v);
                  saveSetting('require_approval_large_payouts', v, 'boolean');
                }}
              />
              {requireApproval && (
                <FormField label="Approval Threshold" description="Payouts above this amount require approval.">
                  <input
                    type="number"
                    min={0}
                    value={approvalThreshold || ''}
                    onChange={(e) => setApprovalThreshold(parseFloat(e.target.value) || 0)}
                    className={`${inputClass} w-48 font-mono`}
                  />
                </FormField>
              )}
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={updateSetting.isPending}
                  onClick={() => {
                    saveSetting('approval_threshold', approvalThreshold, 'number');
                  }}
                >
                  {updateSetting.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Security
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Integrations */}
        <TabsContent value="integrations">
          <IntegrationsTab tenantSlug={tenantSlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Integrations Tab ─────────────────────────────────────────────────────────

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://sso.codevertexitsolutions.com';
const TREASURY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://booksapi.codevertexitsolutions.com';

function IntegrationsTab({ tenantSlug }: { tenantSlug: string }) {
  const updateSetting = useUpdateSetting(tenantSlug);

  const [authApiUrl, setAuthApiUrl] = useState(AUTH_API_URL);
  const [treasuryApiUrl, setTreasuryApiUrl] = useState(TREASURY_API_URL);
  const [allowedOrigins, setAllowedOrigins] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');

  const inputClass = 'w-full bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none';

  const testAuthConnection = async () => {
    setTestStatus('loading');
    try {
      const res = await fetch(`${authApiUrl}/healthz`);
      setTestStatus(res.ok ? 'ok' : 'fail');
    } catch {
      setTestStatus('fail');
    }
  };

  const handleSave = () => {
    if (allowedOrigins.trim()) {
      updateSetting.mutate(
        { key: 'allowed_origins', value: allowedOrigins, configType: 'string' },
        {
          onSuccess: () => toast.success('Integrations settings saved'),
          onError: () => toast.error('Failed to save settings'),
        },
      );
    } else {
      toast.success('No changes to save');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/50 py-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">S2S Auth</h3>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Auth-API URL</label>
            <div className="flex gap-3">
              <input
                value={authApiUrl}
                onChange={(e) => setAuthApiUrl(e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={testAuthConnection}
                disabled={testStatus === 'loading'}
                className="shrink-0"
              >
                {testStatus === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>
            {testStatus === 'ok' && (
              <p className="text-xs text-green-600 font-medium">Connection successful</p>
            )}
            {testStatus === 'fail' && (
              <p className="text-xs text-red-600 font-medium">Connection failed — check the URL</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Treasury API URL (this service)</label>
            <input
              value={treasuryApiUrl}
              readOnly
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
            <p className="text-xs text-muted-foreground">Set via NEXT_PUBLIC_API_URL environment variable.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 py-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">CORS</h3>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Allowed Origins</label>
            <input
              value={allowedOrigins}
              onChange={(e) => setAllowedOrigins(e.target.value)}
              placeholder="https://app.example.com, https://admin.example.com"
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of allowed CORS origins.</p>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              className="gap-2"
              disabled={updateSetting.isPending}
              onClick={handleSave}
            >
              {updateSetting.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Reusable toggle row for boolean settings. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-accent/10 border border-border">
      <div>
        <h4 className="text-sm font-bold">{label}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-accent'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
