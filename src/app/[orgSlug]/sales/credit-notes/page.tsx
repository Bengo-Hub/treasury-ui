'use client';

import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Paperclip,
  PenLine,
  Pencil,
  Phone,
  Play,
  Plus,
  Ruler,
  Tag,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

const DEMO_VIDEO_URL = 'https://youtu.be/4P6FsYHdN8M?si=KE0PRlIBPbEXtVIz';

type View = 'empty' | 'form' | 'bulk';

export default function CreditNotesPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params?.orgSlug ?? '';
  const [view, setView] = useState<View>('empty');

  if (view === 'form') {
    return <CreateCreditNoteForm orgSlug={orgSlug} onBack={() => setView('empty')} />;
  }

  if (view === 'bulk') {
    return <BulkUploadView orgSlug={orgSlug} onBack={() => setView('empty')} />;
  }

  return (
    <EmptyState
      orgSlug={orgSlug}
      onCreate={() => setView('form')}
      onBulkUpload={() => setView('bulk')}
    />
  );
}

function EmptyState({
  orgSlug,
  onCreate,
  onBulkUpload,
}: {
  orgSlug: string;
  onCreate: () => void;
  onBulkUpload: () => void;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href={`/${orgSlug}`} className="hover:text-slate-900 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-900">Credit Notes</span>
        </div>

        <div className="flex items-center justify-center py-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Credit Notes</h2>
              <p className="mt-3 text-sm text-slate-500">
                Provide Rebates To Customers With Credit Notes. Create, Share,
                Track, and Manage All Credit Notes In One Place.
              </p>
            </div>

            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative mt-8 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 transition-shadow hover:shadow-lg"
            >
              <div className="absolute left-3 top-3 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-900">
                Demo Video
              </div>
              <div className="absolute inset-0 bg-slate-900/30 transition-colors group-hover:bg-slate-900/10" />
              <div className="relative flex flex-col items-center gap-3 px-6 text-center">
                <span className="text-lg font-bold text-white/80">
                  Credit Note Generator
                </span>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-110">
                  <Play className="h-6 w-6 translate-x-0.5 fill-slate-900 text-slate-900" />
                </div>
                <span className="text-sm font-semibold text-white">
                  Watch Demo Video
                </span>
              </div>
            </a>

            <button
              type="button"
              onClick={onCreate}
              className="mt-8 w-full rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              Create First Credit Note
            </button>

            <button
              type="button"
              onClick={onBulkUpload}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              <UploadCloud className="h-4 w-4" />
              Upload Credit Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkUploadView({
  orgSlug,
  onBack,
}: {
  orgSlug: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { n: 1, label: 'Select File' },
    { n: 2, label: 'Map Fields' },
    { n: 3, label: 'Confirm & Upload' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href={`/${orgSlug}`} className="hover:text-slate-900 transition-colors">
              Codevertex IT Solutions
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900">Bulk Upload Credit Note</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-200"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Bulk Upload</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <ol className="flex items-center justify-center gap-3">
            {steps.map((s, i) => (
              <li key={s.n} className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    step >= s.n ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500',
                  )}
                >
                  {s.n}
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold transition-colors',
                    step >= s.n ? 'text-slate-900' : 'text-slate-500',
                  )}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Select a file from your device
                </p>
                <p className="mt-1 text-xs text-slate-500">Supported File: CSV</p>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <UploadCloud className="h-4 w-4" />
                Upload CSV File
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                <Upload className="h-4 w-4 rotate-180" />
                Download Sample File Format
              </button>

              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition-colors hover:text-slate-900"
              >
                Things to keep in mind while bulk uploading
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              {file && (
                <p className="mt-2 text-xs font-medium text-slate-700">
                  Selected: <span className="font-bold">{file.name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => file && setStep(2)}
              disabled={!file}
              className="rounded-lg bg-slate-200 px-8 py-2.5 text-sm font-semibold text-slate-500 transition-colors enabled:bg-slate-900 enabled:text-white hover:enabled:bg-slate-800"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type LineItem = {
  id: string;
  name: string;
  description: string;
  taxRate: number;
  quantity: number;
  rate: number;
  unit: 'Product' | 'Service' | 'Hour' | 'Day';
};

const newLine = (): LineItem => ({
  id: Math.random().toString(36).slice(2),
  name: '',
  description: '',
  taxRate: 0,
  quantity: 1,
  rate: 1,
  unit: 'Product',
});

const CREDIT_NOTE_REASONS = [
  'Sales Return',
  'Discount given after invoice',
  'Price adjustment',
  'Damaged or defective goods',
  'Cancellation of order',
  'Tax adjustment',
  'Other',
];

function CreateCreditNoteForm({
  orgSlug: _orgSlug,
  onBack,
}: {
  orgSlug: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('Credit Note');
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [noteNo, setNoteNo] = useState('A00001');
  const [noteDate, setNoteDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [linkedInvoice, setLinkedInvoice] = useState('');
  const [reason, setReason] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [summariseQty, setSummariseQty] = useState(false);
  const [showTotalInWords, setShowTotalInWords] = useState(true);
  const [showTotalInPdf, setShowTotalInPdf] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(true);

  const [adv, setAdv] = useState({
    displayUnitAs: 'Merge with quantity',
    showTaxSummary: 'Do not show',
    hidePlaceOfSupply: false,
    addOriginalImages: false,
    showThumbnails: false,
    showDescriptionFullWidth: false,
    hideSubtotalGroup: false,
    showSkuInNote: false,
    showSerialNumbers: false,
    displayBatchDetails: false,
  });

  const setAdvField = <K extends keyof typeof adv>(k: K, v: (typeof adv)[K]) =>
    setAdv((p) => ({ ...p, [k]: v }));

  const addLine = () => setLines((p) => [...p, newLine()]);
  const removeLine = (id: string) =>
    setLines((p) => (p.length > 1 ? p.filter((l) => l.id !== id) : p));
  const duplicateLine = (id: string) =>
    setLines((p) => {
      const target = p.find((l) => l.id === id);
      if (!target) return p;
      return [...p, { ...target, id: Math.random().toString(36).slice(2) }];
    });
  const updateLine = <K extends keyof LineItem>(
    id: string,
    field: K,
    value: LineItem[K],
  ) =>
    setLines((p) => p.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const computed = useMemo(() => {
    return lines.map((l) => {
      const amount = Number(l.quantity || 0) * Number(l.rate || 0);
      const tax = amount * (Number(l.taxRate || 0) / 100);
      return { ...l, amount, tax, total: amount + tax };
    });
  }, [lines]);

  const totals = useMemo(() => {
    const amount = computed.reduce((s, l) => s + l.amount, 0);
    const tax = computed.reduce((s, l) => s + l.tax, 0);
    return { amount, tax, total: amount + tax };
  }, [computed]);

  const fmt = (n: number) =>
    `Ksh ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-200"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h1 className="text-center text-xl font-bold text-slate-900">
            Create New Credit Note
          </h1>

          <ol className="mt-5 flex items-center justify-center gap-3">
            {[
              { n: 1, label: 'Credit Note Details' },
              { n: 2, label: 'Design & Share (optional)' },
            ].map((s, i, arr) => (
              <li key={s.n} className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    step >= s.n ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500',
                  )}
                >
                  {s.n}
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold transition-colors',
                    step >= s.n ? 'text-slate-900' : 'text-slate-500',
                  )}
                >
                  {s.label}
                </span>
                {i < arr.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-b-2 border-dashed border-slate-300 bg-transparent text-center text-3xl font-bold tracking-tight text-slate-900 focus:border-slate-900 focus:outline-none"
              />
              <Pencil className="h-4 w-4 text-slate-500" />
            </div>
            {!showSubtitle ? (
              <button
                type="button"
                onClick={() => setShowSubtitle(true)}
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
              >
                <Plus className="h-4 w-4" />
                Add Subtitle
              </button>
            ) : (
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subtitle"
                className="border-b border-dashed border-slate-300 bg-transparent text-center text-sm text-slate-700 focus:border-slate-900 focus:outline-none"
              />
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
            <div className="space-y-5">
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="border-b border-dashed border-slate-300 pb-1 text-sm font-bold text-slate-900">
                  Credit Note No<span className="text-red-600">*</span>
                </label>
                <input
                  value={noteNo}
                  onChange={(e) => setNoteNo(e.target.value)}
                  className="border-b border-slate-300 bg-transparent py-1 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="border-b border-dashed border-slate-300 pb-1 text-sm font-bold text-slate-900">
                  Credit Note Date<span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full border-b border-slate-300 bg-transparent py-1 pr-7 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                  <Calendar className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-sm font-bold text-slate-900">Link Invoice</label>
                <div className="relative">
                  <select
                    value={linkedInvoice}
                    onChange={(e) => setLinkedInvoice(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="">Select Invoice</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <span className="sr-only">Reason</span>
                <div className="relative">
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={cn(
                      'w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-sm focus:outline-none',
                      reason
                        ? 'border-slate-300 text-slate-900 focus:border-slate-900'
                        : 'border-red-300 text-red-600 focus:border-red-600',
                    )}
                  >
                    <option value="">Select reason (REQUIRED)</option>
                    {CREDIT_NOTE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={cn(
                      'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2',
                      reason ? 'text-slate-500' : 'text-red-500',
                    )}
                  />
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
              >
                <Plus className="h-4 w-4" />
                Add Custom Fields
              </button>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex h-32 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-sm font-semibold text-slate-700">
                Business Logo
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-slate-700 transition-colors hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-slate-700 transition-colors hover:text-slate-900"
                >
                  <Pencil className="h-3.5 w-3.5" /> change
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PartyCard title="Issued By" subtitle="Your Details">
              <SelectField label="Codevertex IT Solutions" value="default" />
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    Business details
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition-colors hover:text-slate-900"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                </div>
                <BusinessDetailRow label="Business Name" value="Codevertex IT Solutions" />
                <BusinessDetailRow
                  label="Address"
                  value="OGINGA STREET, PIONEER HSE, 2ND FLOOR, Kisumu, Kenya - 40100"
                />
                <BusinessDetailRow label="Email" value="codevertexitsolutions@gmail.com" />
                <BusinessDetailRow label="Phone" value="+254 743 793901" />
              </div>
            </PartyCard>

            <PartyCard title="Issued To" subtitle="Client's Details">
              <SelectField label="Select a Client" value="" />
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm text-slate-700">
                  Select Client/Business from the list
                </p>
                <p className="my-3 text-xs font-semibold text-slate-500">OR</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Add New Client
                </button>
              </div>
            </PartyCard>
          </div>

          <div className="mt-8">
            <div className="text-center">
              <span className="border-b border-dashed border-slate-300 pb-1 text-sm font-bold text-slate-900">
                Currency<span className="text-red-600">*</span>
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <ToolbarButton icon={Tag} label="Configure TAX" />
              <div className="rounded-lg border border-slate-300 bg-white">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full appearance-none rounded-lg bg-transparent px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="KES">Kenyan Shilling(KES, Ksh)</option>
                  <option value="USD">US Dollar (USD, $)</option>
                  <option value="EUR">Euro (EUR, €)</option>
                  <option value="GBP">British Pound (GBP, £)</option>
                </select>
              </div>
              <ToolbarButton label="Number and Currency Format" prefix="123" />
              <ToolbarButton icon={Ruler} label="Edit Columns/Formulas" />
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[2fr_90px_90px_90px_110px_90px_110px_40px] gap-2 bg-slate-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white">
              <span>Item</span>
              <span className="text-right">TAX Rate</span>
              <span className="text-right">Quantity</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
              <span className="text-right">TAX</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            <div className="divide-y divide-slate-200 bg-white">
              {computed.map((l, idx) => (
                <div key={l.id} className="px-4 py-3">
                  <div className="grid grid-cols-[2fr_90px_90px_90px_110px_90px_110px_40px] items-center gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">{idx + 1}.</span>
                      <input
                        placeholder="Item Name / SKU Id"
                        value={l.name}
                        onChange={(e) => updateLine(l.id, 'name', e.target.value)}
                        className="w-full rounded border-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-slate-50 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min={0}
                        value={l.taxRate}
                        onChange={(e) => updateLine(l.id, 'taxRate', Number(e.target.value))}
                        className="w-12 rounded border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={l.quantity}
                      onChange={(e) => updateLine(l.id, 'quantity', Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.rate}
                      onChange={(e) => updateLine(l.id, 'rate', Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    <span className="text-right text-sm font-medium text-slate-900">{fmt(l.amount)}</span>
                    <span className="text-right text-sm text-slate-700">{fmt(l.tax)}</span>
                    <span className="text-right text-sm font-bold text-slate-900">{fmt(l.total)}</span>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateLine(l.id)}
                        className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Duplicate line"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(l.id)}
                        className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove line"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 pl-6 text-xs">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 transition-colors hover:text-slate-900"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Description
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 transition-colors hover:text-slate-900"
                    >
                      <ImageIcon className="h-3.5 w-3.5" /> Add Image
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 transition-colors hover:text-slate-900"
                    >
                      <Ruler className="h-3.5 w-3.5" /> Add Unit
                    </button>
                    <div className="relative">
                      <select
                        value={l.unit}
                        onChange={(e) => updateLine(l.id, 'unit', e.target.value as LineItem['unit'])}
                        className="appearance-none rounded border border-slate-200 bg-white px-3 py-1 pr-7 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                      >
                        <option value="Product">Product</option>
                        <option value="Service">Service</option>
                        <option value="Hour">Hour</option>
                        <option value="Day">Day</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 transition-colors hover:text-slate-900"
                    >
                      Select Sales Ledger
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2">
              <button
                type="button"
                onClick={addLine}
                className="flex items-center justify-center gap-2 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Add New Line
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Add New Group
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div />
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Show Total in PDF</span>
                  <button
                    type="button"
                    onClick={() => setShowTotalInPdf((p) => !p)}
                    className="text-slate-500 transition-colors hover:text-slate-900"
                    aria-label="Toggle show total in PDF"
                  >
                    {showTotalInPdf ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Amount</span>
                  <span className="font-bold text-slate-900">{fmt(totals.amount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">TAX</span>
                  <span className="font-bold text-slate-900">{fmt(totals.tax)}</span>
                </div>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 self-start font-semibold text-slate-700 transition-colors hover:text-slate-900"
                  >
                    <Tag className="h-3.5 w-3.5" /> Add Discounts
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 self-start font-semibold text-slate-700 transition-colors hover:text-slate-900"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Additional Charges
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 self-start text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={summariseQty}
                      onChange={(e) => setSummariseQty(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    Summarise Total Quantity
                  </label>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
                  <span className="border-b border-dashed border-slate-300 pb-0.5 font-bold text-slate-900">
                    Total <span className="text-slate-500">({currency})</span>
                  </span>
                  <span className="text-base font-bold text-slate-900">{fmt(totals.total)}</span>
                </div>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 transition-colors hover:text-slate-900"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Custom Fields
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Show Total In Words</span>
                  <button
                    type="button"
                    onClick={() => setShowTotalInWords((p) => !p)}
                    className="text-slate-500 transition-colors hover:text-slate-900"
                    aria-label="Toggle show total in words"
                  >
                    {showTotalInWords ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {showTotalInWords && (
                  <div className="mt-3 text-sm">
                    <span className="border-b border-dashed border-slate-300 pb-0.5 font-semibold text-slate-500">
                      Total (in words)
                    </span>
                    <p className="mt-2 border-b border-dashed border-slate-300 pb-1 text-slate-700">
                      One Shilling Only
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <PenLine className="h-4 w-4 text-slate-700" />
                Add Signature
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ExtraAction icon={FileText} label="Add Terms & Conditions" />
            <ExtraAction icon={FileText} label="Add Notes" />
            <ExtraAction icon={Paperclip} label="Add Attachments" />
            <ExtraAction icon={FileText} label="Add Additional Info" />
            <ExtraAction icon={Phone} label="Add Contact Details" />
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setAdvancedOpen((p) => !p)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
            >
              <span className="text-base font-bold text-slate-900">Advanced options</span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-slate-500 transition-transform',
                  advancedOpen && 'rotate-180',
                )}
              />
            </button>
            {advancedOpen && (
              <div className="space-y-5 border-t border-slate-200 px-5 py-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Display unit as
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      value={adv.displayUnitAs}
                      onChange={(e) => setAdvField('displayUnitAs', e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option>Merge with quantity</option>
                      <option>Separate column</option>
                      <option>Hide</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Show tax summary in invoice
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      value={adv.showTaxSummary}
                      onChange={(e) => setAdvField('showTaxSummary', e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option>Do not show</option>
                      <option>Show grouped by rate</option>
                      <option>Show per line</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <AdvancedCheckbox
                    label="Hide place/country of supply"
                    checked={adv.hidePlaceOfSupply}
                    onChange={(v) => setAdvField('hidePlaceOfSupply', v)}
                  />
                  <AdvancedCheckbox
                    label="Add original images in line items"
                    checked={adv.addOriginalImages}
                    onChange={(v) => setAdvField('addOriginalImages', v)}
                  />
                  <AdvancedCheckbox
                    label="Show thumbnails in separate column"
                    checked={adv.showThumbnails}
                    onChange={(v) => setAdvField('showThumbnails', v)}
                  />
                  <AdvancedCheckbox
                    label="Show description in full width"
                    checked={adv.showDescriptionFullWidth}
                    onChange={(v) => setAdvField('showDescriptionFullWidth', v)}
                  />
                  <AdvancedCheckbox
                    label="Hide subtotal for group items"
                    checked={adv.hideSubtotalGroup}
                    onChange={(v) => setAdvField('hideSubtotalGroup', v)}
                  />
                  <AdvancedCheckbox
                    label="Show SKU in Credit Note"
                    checked={adv.showSkuInNote}
                    onChange={(v) => setAdvField('showSkuInNote', v)}
                  />
                  <AdvancedCheckbox
                    label="Show Serial Numbers in Credit Note"
                    checked={adv.showSerialNumbers}
                    onChange={(v) => setAdvField('showSerialNumbers', v)}
                  />
                  <AdvancedCheckbox
                    label="Display Batch Details in columns"
                    checked={adv.displayBatchDetails}
                    onChange={(v) => setAdvField('displayBatchDetails', v)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              Save & Continue
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-900 bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Save & Create New
            </button>
            <button
              type="button"
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Save As Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartyCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="border-b border-dashed border-slate-300 pb-1 text-base font-bold text-slate-900">
          {title}
        </h3>
        <span className="text-xs text-slate-500">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function SelectField({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-900 transition-colors hover:border-slate-400"
      >
        <span className={cn(!value && 'text-slate-400')}>{label}</span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>
    </div>
  );
}

function BusinessDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 py-1 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  prefix,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  prefix?: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
    >
      {prefix && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
          {prefix}
        </span>
      )}
      {Icon && <Icon className="h-4 w-4 text-slate-700" />}
      {label}
    </button>
  );
}

function ExtraAction({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 text-slate-700" />
      {label}
    </button>
  );
}

function AdvancedCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
      />
      {label}
    </label>
  );
}
