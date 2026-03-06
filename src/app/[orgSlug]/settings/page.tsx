'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import {
  Bell,
  Globe,
  Lock,
  Save,
  Shield
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    defaultCurrency: 'KES',
    autoSettlement: true,
    settlementHour: '06:00',
    webhookUrl: '',
    requireApproval: false,
    approvalThreshold: '100000',
    notifyOnFailure: true,
    notifyOnSettlement: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    toast.success('Settings saved successfully');
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Treasury Settings</h1>
        <p className="text-muted-foreground mt-1">Configure settlement rules, notifications, and security policies.</p>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 py-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">General</h3>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Default Currency</label>
              <select
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                className="w-full bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Webhook URL</label>
              <input
                value={settings.webhookUrl}
                onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                placeholder="https://your-api.com/webhooks/treasury"
                className="w-full bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-accent/10 border border-border">
            <div>
              <h4 className="text-sm font-bold">Auto Settlement</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically settle pending transactions on a daily schedule.</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoSettlement: !settings.autoSettlement })}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoSettlement ? 'bg-primary' : 'bg-accent'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.autoSettlement ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {settings.autoSettlement && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Settlement Time (Daily)</label>
              <input
                type="time"
                value={settings.settlementHour}
                onChange={(e) => setSettings({ ...settings, settlementHour: e.target.value })}
                className="w-48 bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Security & Approvals</h3>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-accent/10 border border-border">
            <div>
              <h4 className="text-sm font-bold">Require Approval for Large Payouts</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Payouts above a threshold require manual approval before processing.</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, requireApproval: !settings.requireApproval })}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.requireApproval ? 'bg-primary' : 'bg-accent'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.requireApproval ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {settings.requireApproval && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Lock className="h-3 w-3 inline mr-1" />Approval Threshold (KES)
              </label>
              <input
                value={settings.approvalThreshold}
                onChange={(e) => setSettings({ ...settings, approvalThreshold: e.target.value })}
                className="w-48 bg-accent/10 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-tight">Notifications</h3>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {[
            { key: 'notifyOnFailure' as const, label: 'Failed Transaction Alerts', desc: 'Get notified when a payment transaction fails.' },
            { key: 'notifyOnSettlement' as const, label: 'Settlement Confirmation', desc: 'Receive a summary when a settlement batch completes.' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-accent/10 border border-border">
              <div>
                <h4 className="text-sm font-bold">{item.label}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key] })}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings[item.key] ? 'bg-primary' : 'bg-accent'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[item.key] ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-8 shadow-lg shadow-primary/10">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
