'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import {
  CreditCard,
  ExternalLink,
  Globe,
  Lock,
  Plus,
  Save,
  Smartphone
} from 'lucide-react';

interface GatewayConfig {
  id: string;
  name: string;
  provider: string;
  type: 'mobile_money' | 'card' | 'bank_transfer' | 'wallet';
  status: 'active' | 'inactive' | 'sandbox';
  icon: string;
  color: string;
}

const gateways: GatewayConfig[] = [
  { id: '1', name: 'M-Pesa', provider: 'Safaricom Daraja', type: 'mobile_money', status: 'active', icon: '📱', color: 'green' },
  { id: '2', name: 'Stripe', provider: 'Stripe Connect', type: 'card', status: 'active', icon: '💳', color: 'blue' },
  { id: '3', name: 'Card Payments', provider: 'Flutterwave', type: 'card', status: 'sandbox', icon: '🏦', color: 'purple' },
  { id: '4', name: 'Bank Transfer', provider: 'Pesalink', type: 'bank_transfer', status: 'inactive', icon: '🏛️', color: 'orange' },
];

export default function GatewaysPage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Gateways</h1>
          <p className="text-muted-foreground mt-1">Configure and manage payment gateway integrations.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Add Gateway
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {gateways.map((gw) => (
          <Card key={gw.id} className="overflow-hidden group hover:border-primary/30 transition-all">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-6 md:w-80 bg-accent/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center border border-border shadow-sm text-xl",
                      gw.color === 'green' ? "bg-green-500/10" :
                        gw.color === 'blue' ? "bg-blue-500/10" :
                          gw.color === 'purple' ? "bg-purple-500/10" : "bg-orange-500/10"
                    )}>
                      {gw.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{gw.name}</h3>
                      <Badge variant={gw.status === 'active' ? 'success' : gw.status === 'sandbox' ? 'warning' : 'outline'}>
                        {gw.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{gw.provider}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {gw.type === 'mobile_money' && <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />}
                    {gw.type === 'card' && <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground capitalize">{gw.type.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-6">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <ExternalLink className="h-3 w-3" /> API Docs
                    </Button>
                  </div>
                </div>

                <div className="p-6 flex-1 bg-card">
                  {gw.status !== 'inactive' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-sm font-semibold uppercase tracking-tight">Connected</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">Reconfigure</Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Endpoint
                          </label>
                          <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono truncate">
                            {gw.provider === 'Safaricom Daraja' ? 'api.safaricom.co.ke/mpesa' : `api.${gw.provider.toLowerCase().replace(' ', '')}.com`}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                            <Lock className="h-3 w-3" /> API Key / Secret
                          </label>
                          <div className="bg-accent/20 p-2.5 rounded-lg border border-border text-xs font-mono flex items-center justify-between">
                            <span>••••••••••••••••</span>
                            <button className="text-[10px] text-primary hover:underline">Reveal</button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-end gap-3">
                        <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/5 border-transparent">
                          Disable
                        </Button>
                        <Button size="sm" className="gap-2 shadow-lg shadow-primary/10">
                          <Save className="h-3.5 w-3.5" /> Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 space-y-4 text-center">
                      <div className="h-12 w-12 rounded-full bg-accent/50 flex items-center justify-center text-muted-foreground">
                        <CreditCard className="h-6 w-6 opacity-30" />
                      </div>
                      <div className="max-w-xs">
                        <h4 className="font-bold">Setup {gw.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">Connect your {gw.name} account to start processing payments.</p>
                      </div>
                      <Button size="sm" className="px-8 shadow-lg shadow-primary/20">Configure Now</Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
