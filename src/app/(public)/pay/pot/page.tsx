'use client';

import { Button, Card } from '@/components/ui/base';
import { Input } from '@/components/ui/input';
import type { PublicPot } from '@/lib/api/escrow';
import { Gift, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const TREASURY_API_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'https://booksapi.codevertexafrica.com';

// Escrow money always runs on the tenant's PayHero rails, so the pay page offers only those.
const POT_METHODS = 'mpesa,mtn_momo,airtel_money,payhero_momo,payhero_card,payhero_bank,payhero_offline';

const money = (v: string | number | undefined, cur: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(Number(v ?? 0));

/** A pot's public page: what has been raised, the gift items, and a contribution form. */
function PotPageContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const tenant = sp.get('tenant') || '';
  const code = sp.get('code') || '';
  const base = `${TREASURY_API_URL}/api/v1/pay/${encodeURIComponent(tenant)}/escrow/${encodeURIComponent(code)}`;
  const [pot, setPot] = useState<PublicPot | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ amount: '', name: '', message: '', item_sku: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenant || !code) { setNotFound(true); return; }
    fetch(base).then(async (r) => {
      if (!r.ok) { setNotFound(true); return; }
      setPot(await r.json());
    }).catch(() => setNotFound(true));
  }, [base, tenant, code]);

  const contribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!(Number(form.amount) > 0)) { setError('Enter an amount.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${base}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ amount: form.amount, name: form.name || undefined, message: form.message || undefined, item_sku: form.item_sku || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.intent_id) { setError(data.error || data.message || 'Could not start the contribution.'); return; }
      const q = new URLSearchParams({
        intent_id: data.intent_id, tenant, amount: form.amount, currency: pot!.currency,
        description: `Contribution to ${pot!.title}`, reference_type: 'escrow_pot', gateways: POT_METHODS,
        redirect_url: window.location.href,
      });
      if (data.initiate_url) q.set('initiate_url', data.initiate_url);
      router.push(`/pay?${q.toString()}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (notFound) {
    return <div className="min-h-screen flex items-center justify-center p-4 text-muted-foreground">This pot was not found.</div>;
  }
  if (!pot) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  const raised = Number(pot.raised);
  const target = Number(pot.target_amount ?? 0);
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const open = pot.status !== 'cancelled';

  return (
    <div className="min-h-screen bg-background p-4 flex justify-center">
      <div className="w-full max-w-md space-y-4 py-6">
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2"><Gift className="h-6 w-6 text-primary" /><h1 className="text-xl font-bold">{pot.title}</h1></div>
          {pot.description && <p className="text-sm text-muted-foreground">{pot.description}</p>}
          <p className="text-sm">For <span className="font-semibold">{pot.beneficiary_name}</span></p>
          <div>
            <p className="text-2xl font-bold">{money(raised, pot.currency)}</p>
            {target > 0 && (
              <>
                <div className="h-2 rounded-full bg-muted mt-2"><div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% of {money(target, pot.currency)}</p>
              </>
            )}
          </div>
        </Card>

        {!!pot.items?.length && (
          <Card className="p-6 space-y-2">
            <h2 className="font-semibold">Gift list</h2>
            {pot.items.map((it) => (
              <button key={it.sku} type="button" onClick={() => setForm({ ...form, item_sku: it.sku, amount: form.amount || String(Math.max(0, Number(it.price) - Number(it.funded_amount ?? 0))) })}
                className={`w-full flex justify-between rounded-lg border p-3 text-left text-sm ${form.item_sku === it.sku ? 'border-primary' : ''}`}>
                <span>{it.title}</span>
                <span className="text-muted-foreground">{money(it.funded_amount, pot.currency)} of {money(it.price, pot.currency)}</span>
              </button>
            ))}
          </Card>
        )}

        {open ? (
          <Card className="p-6">
            <form onSubmit={contribute} className="space-y-3">
              <h2 className="font-semibold">Contribute</h2>
              <Input inputMode="decimal" placeholder={`Amount (${pot.currency})`} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Input placeholder="Your name (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="A message (optional)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue to payment'}</Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6 text-sm text-muted-foreground">This pot is closed.</Card>
        )}
      </div>
    </div>
  );
}

export default function PotPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PotPageContent />
    </Suspense>
  );
}
