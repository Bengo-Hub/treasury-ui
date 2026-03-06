'use client';

import { useAuthStore } from '@/store/auth';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CreditCard,
  DollarSign,
  Key,
  Plus,
  Save,
  Shield,
  Wrench
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PlatformPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [activeTab, setActiveTab] = useState<'gateways' | 'fees'>('gateways');

  useEffect(() => {
    if (user && !user.roles?.includes('super_admin')) {
      router.replace(`/${orgSlug}`);
    }
  }, [user, orgSlug, router]);

  if (!user?.roles?.includes('super_admin')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">This section requires super_admin privileges.</p>
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
                <Key className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-tight">Global API Secrets</h3>
              </div>
              <Button size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" /> Add Secret
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {[
                  { name: 'MPESA_CONSUMER_KEY', env: 'production', lastRotated: '2026-02-15' },
                  { name: 'MPESA_CONSUMER_SECRET', env: 'production', lastRotated: '2026-02-15' },
                  { name: 'STRIPE_SECRET_KEY', env: 'production', lastRotated: '2026-01-20' },
                  { name: 'STRIPE_WEBHOOK_SECRET', env: 'production', lastRotated: '2026-01-20' },
                ].map((secret) => (
                  <div key={secret.name} className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-accent/30 flex items-center justify-center">
                        <Key className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-mono font-bold">{secret.name}</p>
                        <p className="text-[10px] text-muted-foreground">Last rotated: {secret.lastRotated}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="success">{secret.env}</Badge>
                      <Button variant="ghost" size="sm">Rotate</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Secret Rotation Policy</h4>
                  <p className="text-xs text-muted-foreground mt-1">API secrets should be rotated every 90 days. Automated rotation can be enabled per gateway.</p>
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
