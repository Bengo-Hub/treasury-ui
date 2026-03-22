'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import {
  useCreatePlatformGateway,
  usePlatformGateways,
  useTestPlatformGateway,
  useUpdatePlatformGateway,
} from '@/hooks/use-gateways';
import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';
import type { GatewayConfig } from '@/lib/api/gateways';
import {
  AlertTriangle,
  CreditCard,
  DollarSign,
  Loader2,
  Plus,
  Save,
  Shield,
  Wrench,
  X,
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
  paystack: ['secret_key', 'public_key'],
  mpesa_paybill: ['consumer_key', 'consumer_secret', 'passkey'],
  mpesa_till: ['consumer_key', 'consumer_secret', 'passkey'],
  cod: [],
};

export default function PlatformPage() {
  const { data: user } = useMe();
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [activeTab, setActiveTab] = useState<'gateways' | 'fees'>('gateways');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showAddGateway, setShowAddGateway] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayConfig | null>(null);
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});

  const isPlatformOwner = user?.isPlatformOwner || user?.isSuperUser || orgSlug === 'codevertex';
  const { data: gatewaysData, isLoading: loading, error: queryError, refetch: fetchGateways } = usePlatformGateways(!!isPlatformOwner);
  const gateways = gatewaysData?.gateways ?? [];
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load gateways') : null;

  const testMutation = useTestPlatformGateway();
  const createGateway = useCreatePlatformGateway();
  const updateGateway = useUpdatePlatformGateway();

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
                  {gateways.map((gw) => (
                    <div key={gw.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-accent/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-primary" />
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
                          disabled={testingId === gw.id || testMutation.isPending}
                          onClick={async () => {
                            setTestingId(gw.id);
                            try {
                              await testMutation.mutateAsync(gw.id);
                              await fetchGateways();
                            } finally {
                              setTestingId(null);
                            }
                          }}
                        >
                          {testingId === gw.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Test
                        </Button>
                      </div>
                    </div>
                  ))}
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

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Paystack &amp; integrations</h4>
                  <p className="text-xs text-muted-foreground mt-1">Use the same env keys as isp-billing (PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, AFRICASTALKING_*, etc.) and run seed to create the default Paystack gateway. All tenant payments route through treasury and default to Paystack.</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <Button size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" /> Add Rule
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-accent/5">
                      <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Gateway</th>
                      <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Fee Type</th>
                      <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Percentage</th>
                      <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Flat Fee</th>
                      <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Cap</th>
                      <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { gateway: 'M-Pesa', feeType: 'Transaction', pct: '2.0%', flat: 'KES 0', cap: 'KES 2,000', active: true },
                      { gateway: 'Stripe', feeType: 'Transaction', pct: '2.9%', flat: 'KES 30', cap: '-', active: true },
                      { gateway: 'Card', feeType: 'Transaction', pct: '2.5%', flat: 'KES 0', cap: 'KES 5,000', active: true },
                      { gateway: 'All', feeType: 'Platform Fee', pct: '0.5%', flat: 'KES 0', cap: 'KES 1,000', active: true },
                    ].map((fee, i) => (
                      <tr key={i} className="hover:bg-accent/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-xs">{fee.gateway}</td>
                        <td className="px-6 py-4 text-xs">{fee.feeType}</td>
                        <td className="px-6 py-4 text-right font-mono text-xs font-bold">{fee.pct}</td>
                        <td className="px-6 py-4 text-right text-xs">{fee.flat}</td>
                        <td className="px-6 py-4 text-right text-xs">{fee.cap}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={fee.active ? 'success' : 'outline'}>{fee.active ? 'Active' : 'Disabled'}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button className="gap-2 px-8 shadow-lg shadow-primary/10">
              <Save className="h-4 w-4" /> Save Fee Config
            </Button>
          </div>
        </div>
      )}
    </div>
  );
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

  const keys = editMode ? credentialKeys : (credentialKeysByType?.[selectedType] ?? credentialKeys);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const creds: Record<string, string> = {};
    keys.forEach((k) => { if (credentialValues[k]) creds[k] = credentialValues[k]; });
    onSubmit(editMode ? (gatewayType ?? selectedType) : selectedType, editMode ? name : nameVal, creds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-xl border border-border max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
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
              <span className="text-xs font-medium text-muted-foreground">Credentials (stored securely)</span>
              {keys.map((k) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {k.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="password"
                    value={credentialValues[k] ?? ''}
                    onChange={(e) => setCredentialValues({ ...credentialValues, [k]: e.target.value })}
                    placeholder={editMode ? 'Leave blank to keep current' : ''}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                    autoComplete="off"
                  />
                </div>
              ))}
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
        </form>
      </div>
    </div>
  );
}
