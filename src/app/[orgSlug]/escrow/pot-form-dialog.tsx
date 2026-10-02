'use client';

import { Button } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { escrowApi, type Beneficiary, type Pot, type PotRequest } from '@/lib/api/escrow';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const errMessage = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;

const EMPTY_BENEFICIARY: Beneficiary = { name: '', kind: 'mobile', phone: '' };

/** Create or edit a pot. */
export function PotFormDialog({ tenant, pot, onClose, onSaved }: { tenant: string; pot?: Pot; onClose: () => void; onSaved: (p: Pot) => void }) {
  const [form, setForm] = useState<PotRequest>(() => pot ? {
    title: pot.title, description: pot.description, currency: pot.currency, target_amount: pot.target_amount,
    release_threshold: pot.release_threshold, auto_release: pot.auto_release, hold_until: pot.hold_until,
    beneficiary: pot.beneficiary, fee_percentage: pot.fee_percentage, fee_fixed: pot.fee_fixed,
    items: pot.metadata?.items, approval_policy: pot.metadata?.approval_policy ?? '',
  } : { title: '', currency: 'KES', auto_release: false, beneficiary: EMPTY_BENEFICIARY, approval_policy: '' });
  const b = form.beneficiary;
  const setB = (patch: Partial<Beneficiary>) => setForm({ ...form, beneficiary: { ...b, ...patch } });
  const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  const save = useMutation({
    mutationFn: () => {
      const body: PotRequest = {
        ...form,
        target_amount: clean(form.target_amount), release_threshold: clean(form.release_threshold),
        fee_percentage: clean(form.fee_percentage), fee_fixed: clean(form.fee_fixed),
        hold_until: form.hold_until ? new Date(form.hold_until).toISOString() : undefined,
      };
      return pot ? escrowApi.updatePot(tenant, pot.code, body) : escrowApi.createPot(tenant, body);
    },
    onSuccess: (p) => { toast.success(pot ? 'Pot saved' : 'Pot created'); onSaved(p); },
    onError: (e: any) => toast.error(errMessage(e, 'Could not save the pot')),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={pot ? 'Edit pot' : 'New pot'} onClose={onClose} className="max-w-lg">
        <div className="space-y-3 text-sm">
          <Input placeholder="Title (e.g. Jane and Tom's wedding)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Currency" maxLength={3} disabled={!!pot} value={form.currency ?? 'KES'} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            <Input placeholder="Target (optional)" value={form.target_amount ?? ''} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          </div>
          <p className="font-semibold pt-2">Beneficiary</p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" value={b.name} onChange={(e) => setB({ name: e.target.value })} />
            <Select value={b.kind} onChange={(e) => setB({ kind: e.target.value as Beneficiary['kind'] })}>
              <option value="mobile">Mobile money</option>
              <option value="paybill">Paybill</option>
              <option value="till">Till</option>
              <option value="bank">Bank account</option>
            </Select>
            {b.kind === 'mobile' && <Input placeholder="Phone" value={b.phone ?? ''} onChange={(e) => setB({ phone: e.target.value })} />}
            {(b.kind === 'paybill' || b.kind === 'till') && <Input placeholder="Business number" value={b.short_code ?? ''} onChange={(e) => setB({ short_code: e.target.value })} />}
            {b.kind === 'paybill' && <Input placeholder="Account number" value={b.account_number ?? ''} onChange={(e) => setB({ account_number: e.target.value })} />}
            {b.kind === 'bank' && <>
              <Input placeholder="Bank code" value={b.bank_code ?? ''} onChange={(e) => setB({ bank_code: e.target.value })} />
              <Input placeholder="Account number" value={b.account_number ?? ''} onChange={(e) => setB({ account_number: e.target.value })} />
            </>}
          </div>
          <p className="font-semibold pt-2">Release</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.auto_release} onChange={(e) => setForm({ ...form, auto_release: e.target.checked })} />
            Release automatically when the threshold or the hold date is reached
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Release threshold" value={form.release_threshold ?? ''} onChange={(e) => setForm({ ...form, release_threshold: e.target.value })} />
            <Input type="date" value={form.hold_until ? form.hold_until.slice(0, 10) : ''} onChange={(e) => setForm({ ...form, hold_until: e.target.value || undefined })} />
            <Input placeholder="Commission % (this pot)" value={form.fee_percentage ?? ''} onChange={(e) => setForm({ ...form, fee_percentage: e.target.value })} />
            <Input placeholder="Commission fixed (this pot)" value={form.fee_fixed ?? ''} onChange={(e) => setForm({ ...form, fee_fixed: e.target.value })} />
          </div>
          <label className="block space-y-1">
            <span className="text-muted-foreground">Approval for releases</span>
            <Select value={form.approval_policy ?? ''} onChange={(e) => setForm({ ...form, approval_policy: e.target.value as PotRequest['approval_policy'] })}>
              <option value="">Your escrow release policy</option>
              <option value="threshold">By amount (approval rules)</option>
              <option value="always">Always needs approval</option>
              <option value="auto">Automatic</option>
            </Select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim() || !b.name.trim()}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
