'use client';

/**
 * SignatureCard: the tenant's authorised signature (Settings > Document Presentation). Upload a
 * PNG or JPEG, or draw one, plus an optional signatory name and the documents it prints on. The
 * server stores it as a PNG in object storage and prints it above the Prepared By line.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, PenLine, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { deleteDocumentSignature, getDocumentSignature, saveDocumentSignature } from '@/lib/api/settings';

export function SignatureCard({ tenant, docTypes }: { tenant: string; docTypes: { key: string; label: string }[] }) {
  const qc = useQueryClient();
  const key = ['document-signature', tenant];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => getDocumentSignature(tenant), enabled: !!tenant });

  const [name, setName] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'draw'>('upload');

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? '');
    setTypes(data.doc_types ?? []);
  }, [data]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (b: Blob | null) => {
    setImage(b);
    setPreview(b ? URL.createObjectURL(b) : null);
  };

  const save = useMutation({
    mutationFn: () => saveDocumentSignature(tenant, { name: name.trim(), doc_types: types, image: image ?? undefined }),
    onSuccess: (res) => {
      qc.setQueryData(key, res);
      pick(null);
      toast.success('Signature saved');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Failed to save signature'),
  });
  const remove = useMutation({
    mutationFn: () => deleteDocumentSignature(tenant),
    onSuccess: (res) => {
      qc.setQueryData(key, res);
      pick(null);
      toast.success('Signature removed');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || 'Failed to remove signature'),
  });

  const toggleType = (t: string) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const shown = preview ?? data?.image_url ?? null;
  const canSave = !!image || !!data?.configured;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Signature</span>
            {!data?.configured && !isLoading && <span className="text-xs text-muted-foreground">None</span>}
          </div>
          {data?.configured && (
            <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Prints above the Prepared By line. PNG or JPEG up to 1 MB; a transparent background looks best.
        </p>

        <div className="inline-flex rounded-md border bg-background p-0.5 text-sm">
          {(['upload', 'draw'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-3 py-1 rounded ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {m === 'upload' ? 'Upload' : 'Draw'}
            </button>
          ))}
        </div>

        {mode === 'upload' ? (
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm hover:border-primary/50">
            <Upload className="h-4 w-4" /> Choose image
            <input type="file" accept="image/png,image/jpeg" className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <SignaturePad onChange={pick} />
        )}

        {shown && (
          <div className="w-fit rounded border bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shown} alt="Signature" className="h-16 w-auto object-contain" />
          </div>
        )}

        <label className="block space-y-1 sm:max-w-sm">
          <span className="text-xs font-medium text-foreground">Signatory name (optional)</span>
          <input className="w-full rounded border px-2 py-1.5 text-sm bg-background" value={name} maxLength={120}
            onChange={(e) => setName(e.target.value)} placeholder="Printed on the Prepared By line" />
        </label>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Print on</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {docTypes.map((t) => (
              <label key={t.key} className="inline-flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={types.includes(t.key)} onChange={() => toggleType(t.key)} />
                {t.label}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">None ticked prints it on every document.</p>
        </div>

        <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
          Save signature
        </Button>
      </CardContent>
    </Card>
  );
}

/** A simple draw pad; each finished stroke hands the drawing back as a transparent PNG. */
function SignaturePad({ onChange }: { onChange: (b: Blob | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = point(e);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    ref.current?.toBlob((b) => onChange(b), 'image/png');
  };
  const clear = () => {
    const c = ref.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <canvas ref={ref} width={600} height={200}
        className="w-full max-w-md touch-none rounded border bg-white"
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      <button type="button" onClick={clear} disabled={empty}
        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
        Clear
      </button>
    </div>
  );
}
