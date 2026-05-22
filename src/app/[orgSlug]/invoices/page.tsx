'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import {
  useInvoices,
  useCreateInvoice,
  useSendInvoice,
  useVoidInvoice,
  useRecordPayment,
} from '@/hooks/use-invoices';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import type { Invoice, CreateInvoiceRequest, LineRequest } from '@/lib/api/invoices';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  ChevronRight,
  Columns,
  Copy,
  DollarSign,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Percent,
  Play,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Send,
  Trash2,
  Upload,
  UploadCloud,
  UserPlus,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

const ITEMS_PER_PAGE = 20;

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 3);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function statusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' {
  switch (status) {
    case 'paid': return 'success';
    case 'sent': return 'default';
    case 'draft': return 'secondary';
    case 'overdue': return 'warning';
    case 'void':
    case 'cancelled': return 'error';
    default: return 'outline';
  }
}

function paymentBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' | 'secondary' {
  switch (status) {
    case 'paid': return 'success';
    case 'partial': return 'warning';
    case 'unpaid': return 'error';
    default: return 'outline';
  }
}

interface ExtendedLineRequest extends LineRequest {
  tax_rate: number;
}

const emptyLine = (): ExtendedLineRequest => ({ description: '', quantity: 1, unit_price: 0, tax_rate: 0 });

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────
function BulkUploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fieldMap, setFieldMap] = useState<Record<string, string>>({
    invoice_number: 'Invoice Number',
    customer_name: 'Customer Name',
    customer_email: 'Email',
    amount: 'Amount',
    due_date: 'Due Date',
  });

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.csv')) setFile(dropped);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    onClose();
  };

  if (!open) return null;

  const steps = [
    { n: 1, label: 'Select File' },
    { n: 2, label: 'Map Fields' },
    { n: 3, label: 'Confirm & Upload' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,8,0.72)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border"
        style={{
          background: 'linear-gradient(145deg, #0d1117 0%, #0f1b2d 100%)',
          borderColor: 'rgba(30,80,160,0.35)',
          boxShadow: '0 0 60px rgba(10,40,120,0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(30,80,160,0.25)' }}>
          <div>
            <h2 className="text-base font-bold text-white">Bulk Upload Invoices</h2>
            <p className="text-xs mt-0.5" style={{ color: '#8ba4c8' }}>Import multiple invoices from a CSV file</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="h-4 w-4 text-white/50" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-4 border-b" style={{ borderColor: 'rgba(30,80,160,0.2)' }}>
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: step >= s.n ? '#1a56db' : 'rgba(255,255,255,0.07)',
                    color: step >= s.n ? '#fff' : '#4a6080',
                    border: step === s.n ? '2px solid #3b82f6' : '2px solid transparent',
                  }}
                >
                  {s.n}
                </div>
                <span className="text-xs font-medium" style={{ color: step >= s.n ? '#fff' : '#4a6080' }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 mx-3" style={{ color: '#1e3a5f' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 cursor-pointer transition-all"
                style={{
                  borderColor: isDragOver ? '#3b82f6' : file ? '#1a56db' : 'rgba(30,80,160,0.35)',
                  background: isDragOver ? 'rgba(26,86,219,0.08)' : file ? 'rgba(26,86,219,0.05)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                <div className="flex items-center justify-center w-14 h-14 rounded-xl mb-4"
                  style={{ background: 'rgba(26,86,219,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <UploadCloud className="h-6 w-6" style={{ color: '#3b82f6' }} />
                </div>
                {file ? (
                  <>
                    <p className="text-sm font-bold text-white">{file.name}</p>
                    <p className="text-xs mt-1" style={{ color: '#5a8a6a' }}>✓ File selected — click Continue to proceed</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-white">Select a file from your device</p>
                    <p className="text-xs mt-1" style={{ color: '#8ba4c8' }}>Supported File: CSV · or drag & drop here</p>
                  </>
                )}
              </div>
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium border transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(30,80,160,0.35)', color: '#8ba4c8' }}
              >
                <Download className="h-3.5 w-3.5" /> Download Sample File Format
              </button>
              <div className="text-xs text-center py-1" style={{ color: '#4a6080' }}>
                Things to keep in mind while bulk uploading →
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs mb-4" style={{ color: '#8ba4c8' }}>Map columns from your CSV file to the corresponding invoice fields.</p>
              {Object.entries(fieldMap).map(([field, col]) => (
                <div key={field} className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg px-3 py-2 text-xs"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(30,80,160,0.25)', color: '#8ba4c8' }}>
                    {field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#1e3a5f' }} />
                  <select
                    value={col}
                    onChange={(e) => setFieldMap((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    style={{ background: 'rgba(26,86,219,0.08)', border: '1px solid rgba(59,130,246,0.3)', color: '#ffffff' }}
                  >
                    {['Invoice Number', 'Customer Name', 'Email', 'Amount', 'Due Date', 'Date', 'Notes', 'Currency'].map((o) => (
                      <option key={o} value={o} style={{ background: '#0d1117' }}>{o}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl p-4 border" style={{ background: 'rgba(26,86,219,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}>
                <p className="text-xs font-bold text-white mb-3">Upload Summary</p>
                <div className="space-y-2">
                  {[
                    ['File', file?.name ?? '—'],
                    ['Detected Rows', '24 invoices'],
                    ['Valid Rows', '22'],
                    ['Skipped Rows', '2 (missing required fields)'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span style={{ color: '#8ba4c8' }}>{k}</span>
                      <span className="font-medium text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs" style={{ color: '#8ba4c8' }}>
                Review the summary above. Click <strong className="text-white">Upload Now</strong> to import the valid rows.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'rgba(30,80,160,0.2)' }}>
          <button onClick={handleClose} className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5" style={{ color: '#8ba4c8' }}>
            Cancel
          </button>
          <button
            onClick={() => {
              if (step === 1 && file) setStep(2);
              else if (step === 2) setStep(3);
              else if (step === 3) handleClose();
            }}
            disabled={step === 1 && !file}
            className="px-5 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: step === 1 && !file ? 'rgba(26,86,219,0.3)' : '#1a56db',
              color: step === 1 && !file ? '#4a6080' : '#fff',
              cursor: step === 1 && !file ? 'not-allowed' : 'pointer',
            }}
          >
            {step === 3 ? 'Upload Now' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick, onUploadClick }: { onCreateClick: () => void; onUploadClick: () => void }) {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="w-full max-w-md rounded-2xl border text-center overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0d1117 0%, #0f1b2d 100%)',
          borderColor: 'rgba(30,80,160,0.3)',
          boxShadow: '0 0 40px rgba(10,40,120,0.25)',
        }}
      >
        <div className="px-8 pt-8 pb-6">
          <h2 className="text-lg font-bold text-white">Invoices</h2>
          <p className="text-xs mt-1.5 mb-6" style={{ color: '#8ba4c8', lineHeight: 1.6 }}>
            Create Professional Invoices With Customisable Templates. 1-click Share as PDF, Print, or Link over WhatsApp or Email. Record & Track Payments. And more…
          </p>

          <div
            onClick={() => setVideoOpen(true)}
            className="relative rounded-xl overflow-hidden cursor-pointer group mb-5"
            style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a3a6e 100%)', border: '1px solid rgba(59,130,246,0.25)' }}
          >
            <div className="absolute top-2 left-2 z-10">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#f59e0b', color: '#000' }}>
                Demo Video
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-8 px-6">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full mb-3 transition-transform group-hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.25)' }}
              >
                <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
              </div>
              <p className="text-sm font-bold text-white leading-tight">
                How to create Invoices<br />on Refrens?
              </p>
            </div>
            <div className="py-2.5 text-xs font-semibold text-white" style={{ background: 'rgba(0,0,0,0.4)' }}>
              Watch Demo Video
            </div>
          </div>

          <button
            onClick={onCreateClick}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all mb-3 hover:brightness-110"
            style={{ background: '#1a56db', color: '#fff' }}
          >
            Create your first invoice
          </button>

          <button
            onClick={onUploadClick}
            className="flex items-center justify-center gap-1.5 w-full text-xs font-medium"
            style={{ color: '#3b82f6' }}
          >
            <Upload className="h-3.5 w-3.5" /> Upload Invoices
          </button>
        </div>
      </div>

      {videoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setVideoOpen(false)}
        >
          <div className="relative w-full max-w-3xl mx-4 aspect-video rounded-2xl overflow-hidden">
            <iframe
              src="https://www.youtube.com/embed/sklmiocRQN0?autoplay=1"
              title="How to create Invoices on Refrens?"
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
            <button onClick={() => setVideoOpen(false)}
              className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-black/60">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Invoice Full-Page View ───────────────────────────────────────────
function CreateInvoiceView({
  onBack,
  onSave,
  isPending,
}: {
  onBack: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState('INV-0001');
  const [lines, setLines] = useState<ExtendedLineRequest[]>([emptyLine()]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('KES');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Thanks for doing business with us');

  // Advanced options
  const [displayUnitAs, setDisplayUnitAs] = useState('Merge with quantity');
  const [showTaxSummary, setShowTaxSummary] = useState('Do not show');
  const [hideCountryOfSupply, setHideCountryOfSupply] = useState(false);
  const [addOriginalImages, setAddOriginalImages] = useState(false);
  const [showThumbnailsSep, setShowThumbnailsSep] = useState(false);
  const [showDescFullWidth, setShowDescFullWidth] = useState(false);
  const [hideSubtotalGroup, setHideSubtotalGroup] = useState(false);

  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    const computedLines = lines.map(line => {
      const qty = Number(line.quantity || 0);
      const rate = Number(line.unit_price || 0);
      const tx = Number(line.tax_rate || 0);
      const net = qty * rate;
      const taxAmount = net * (tx / 100);
      subtotal += net;
      totalTax += taxAmount;
      return { ...line, amount: net, taxAmount, total: net + taxAmount };
    });
    return { lines: computedLines, subtotal, totalTax, grandTotal: subtotal + totalTax };
  }, [lines]);

  const addLine = () => setLines(p => [...p, emptyLine()]);
  const removeLine = (idx: number) => setLines(p => p.length > 1 ? p.filter((_, i) => i !== idx) : p);
  const updateLine = (idx: number, field: keyof ExtendedLineRequest, value: any) =>
    setLines(p => p.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  const handleSubmit = () => {
    onSave({
      invoice_date: invoiceDate,
      due_date: dueDate,
      currency,
      notes,
      terms,
      lines: lines.filter(l => l.description.trim()),
    });
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f8fafc' }}>
      {/* Sticky dark navbar */}
      <div className="sticky top-0 z-50 border-b px-6 py-4 flex items-center justify-between shadow-xl"
        style={{ background: '#0f172a', borderColor: '#1e293b' }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack}
            className="p-2 rounded-xl transition-all"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e293b'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-6 w-px" style={{ background: '#1e293b' }} />
          <div>
            <h1 className="text-base font-black text-white tracking-tight">Create New Invoice</h1>
            <p className="text-[11px] font-medium" style={{ color: '#64748b' }}>Draft · Unsaved</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSubmit} disabled={isPending}
            className="px-4 py-2 text-xs font-bold rounded-lg transition-all"
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8' }}>
            Save As Draft
          </button>
          <button onClick={handleSubmit} disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all"
            style={{ background: '#1a56db' }}>
            {isPending ? 'Processing...' : 'Save & Continue'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        <div className="rounded-xl border bg-white shadow-md p-6 space-y-8" style={{ borderColor: '#e2e8f0' }}>

          {/* Invoice header — number, dates, logo */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b" style={{ borderColor: '#f1f5f9' }}>
            <div className="space-y-4 w-full max-w-sm">
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#334155' }}>
                  Invoice No<span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="w-full rounded-lg py-2 px-3 text-xs font-mono font-bold focus:outline-none focus:ring-1"
                  style={{ border: '1px solid #e2e8f0', color: '#0f172a', focusRingColor: '#0f172a' }}
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                />
                <p className="text-[11px] mt-1 font-medium" style={{ color: '#94a3b8' }}>Last No: INV-0000 (—)</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: '#334155' }}>Invoice Date<span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="date" className="w-full rounded-lg py-2 px-3 text-xs font-mono focus:outline-none"
                    style={{ border: '1px solid #e2e8f0', color: '#0f172a' }}
                    value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: '#334155' }}>Due Date<span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="date" className="w-full rounded-lg py-2 px-3 text-xs font-mono focus:outline-none"
                    style={{ border: '1px solid #e2e8f0', color: '#0f172a' }}
                    value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center w-64 h-36 shrink-0"
              style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
              <div className="text-sm font-black tracking-tight" style={{ color: '#0f172a' }}>Your Business Name</div>
              <div className="text-[10px] mt-3 flex items-center gap-3 font-semibold" style={{ color: '#94a3b8' }}>
                <span className="hover:underline cursor-pointer">✕ Remove</span>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <span className="hover:underline cursor-pointer" style={{ color: '#64748b' }}>✎ Change Logo</span>
              </div>
            </div>
          </div>

          {/* From / For */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl space-y-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span className="text-xs font-bold border-b-2 pb-0.5 block w-fit" style={{ color: '#0f172a', borderColor: '#0f172a' }}>Invoice From</span>
              <select className="w-full rounded-lg py-2 px-3 text-xs font-semibold focus:outline-none"
                style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a' }}>
                <option>Your Business</option>
              </select>
              <div className="text-xs space-y-1 pt-1 leading-relaxed" style={{ color: '#64748b' }}>
                <div className="flex justify-between font-medium">
                  <span style={{ color: '#94a3b8' }}>Business Name</span>
                  <span className="font-bold" style={{ color: '#0f172a' }}>Your Business</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span style={{ color: '#94a3b8' }}>Address</span>
                  <span style={{ color: '#334155', textAlign: 'right' }}>Your Address Here</span>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-xl flex flex-col justify-between space-y-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span className="text-xs font-bold border-b-2 pb-0.5 block w-fit" style={{ color: '#0f172a', borderColor: '#0f172a' }}>Invoice For</span>
              <div className="space-y-3 my-auto py-2">
                <select className="w-full rounded-lg py-2 px-3 text-xs font-semibold focus:outline-none"
                  style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a' }}>
                  <option>Select a Client</option>
                </select>
                <div className="text-center p-4 border border-dashed rounded-lg" style={{ borderColor: '#e2e8f0', background: '#fff' }}>
                  <p className="text-xs font-medium mb-2.5" style={{ color: '#94a3b8' }}>Select Client from the list OR</p>
                  <button className="inline-flex items-center gap-1 px-4 py-2 text-white text-xs font-bold rounded-lg"
                    style={{ background: '#0f172a' }}>
                    <UserPlus className="h-3.5 w-3.5" /> Add New Client
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Currency / config strip */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:bg-slate-200/80"
              style={{ background: '#f1f5f9', color: '#334155' }}>
              <Percent className="h-3 w-3 text-slate-500" /> Configure TAX
            </button>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="rounded-lg py-1.5 px-3 text-xs font-bold focus:outline-none transition-all"
              style={{ background: '#f1f5f9', color: '#334155', border: 'none' }}>
              <option value="KES">Kenyan Shilling (KES, Ksh)</option>
              <option value="USD">US Dollar (USD, $)</option>
              <option value="EUR">Euro (EUR, €)</option>
              <option value="GBP">British Pound (GBP, £)</option>
            </select>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:bg-slate-200/80"
              style={{ background: '#f1f5f9', color: '#334155' }}>
              <Scale className="h-3 w-3 text-slate-500" /> Number & Currency Format
            </button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:bg-slate-200/80"
              style={{ background: '#f1f5f9', color: '#334155' }}>
              <Columns className="h-3 w-3 text-slate-500" /> Edit Columns/Formulas
            </button>
          </div>

          {/* Line items table */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
            <div className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center text-xs font-bold text-white"
              style={{ background: '#0f172a' }}>
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-center">TAX Rate</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-center">Rate</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1 text-right">TAX</div>
              <div className="col-span-1 text-right">Total</div>
            </div>
            <div className="p-4 space-y-4 divide-y bg-white" style={{ divideColor: '#f1f5f9' }}>
              {calculations.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-start pt-3 first:pt-0">
                  <div className="col-span-5 space-y-2">
                    <span className="text-xs font-black" style={{ color: '#0f172a' }}>{idx + 1}.</span>
                    <input
                      placeholder="Item Name / Description"
                      value={line.description}
                      onChange={e => updateLine(idx, 'description', e.target.value)}
                      className="w-full rounded-lg py-2 px-3 text-xs font-semibold focus:outline-none"
                      style={{ border: '1px solid #e2e8f0', color: '#0f172a', background: '#fff' }}
                    />
                  </div>
                  <div className="col-span-2 pt-6">
                    <div className="relative">
                      <input type="number" value={line.tax_rate || ''} onChange={e => updateLine(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg py-2 pl-3 pr-6 text-xs text-center font-mono font-bold focus:outline-none"
                        style={{ border: '1px solid #e2e8f0', color: '#0f172a' }} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: '#94a3b8' }}>%</span>
                    </div>
                  </div>
                  <div className="col-span-1 pt-6">
                    <input type="number" min="1" value={line.quantity} onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg py-2 px-1 text-xs text-center font-mono font-bold focus:outline-none"
                      style={{ border: '1px solid #e2e8f0', color: '#0f172a' }} />
                  </div>
                  <div className="col-span-1 pt-6">
                    <input type="number" value={line.unit_price || ''} onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg py-2 px-1 text-xs text-center font-mono font-bold focus:outline-none"
                      style={{ border: '1px solid #e2e8f0', color: '#0f172a' }} />
                  </div>
                  <div className="col-span-1 pt-8 text-right font-mono font-semibold text-xs" style={{ color: '#64748b' }}>
                    {line.amount.toFixed(2)}
                  </div>
                  <div className="col-span-1 pt-8 text-right font-mono font-semibold text-xs" style={{ color: '#94a3b8' }}>
                    {line.taxAmount.toFixed(2)}
                  </div>
                  <div className="col-span-1 pt-8 text-right font-mono font-black text-xs flex items-center justify-end gap-1" style={{ color: '#0f172a' }}>
                    <span>{line.total.toFixed(2)}</span>
                    {calculations.lines.length > 1 && (
                      <button onClick={() => removeLine(idx)} className="p-1 rounded-md transition-all ml-1"
                        style={{ color: '#cbd5e1' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#cbd5e1'}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex items-center gap-2" style={{ background: '#f8fafc', borderColor: '#f1f5f9' }}>
              <button onClick={addLine} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                <Plus className="h-3.5 w-3.5" /> Add New Line
              </button>
            </div>
          </div>

          {/* Terms + Totals */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-6">
              <div className="p-4 rounded-xl space-y-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span className="text-xs font-bold underline block border-b pb-1.5" style={{ color: '#0f172a', borderColor: '#e2e8f0' }}>
                  Terms and Conditions
                </span>
                <div className="text-xs font-semibold" style={{ color: '#334155' }}>
                  <div className="flex items-center p-1 rounded">
                    <span><span className="font-mono mr-1.5" style={{ color: '#94a3b8' }}>01</span>{terms}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-6">
              <div className="rounded-xl p-4 space-y-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="space-y-1.5 text-xs font-semibold border-b pb-3" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="font-mono font-bold" style={{ color: '#0f172a' }}>Ksh {calculations.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TAX</span>
                    <span className="font-mono font-bold" style={{ color: '#0f172a' }}>Ksh {calculations.totalTax.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold" style={{ color: '#0f172a' }}>Total ({currency})</span>
                  <span className="font-mono font-black text-lg" style={{ color: '#0f172a' }}>Ksh {calculations.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: '#334155' }}>Notes</label>
            <textarea
              className="w-full rounded-lg py-2 px-3 text-xs focus:outline-none min-h-[60px]"
              style={{ border: '1px solid #e2e8f0', color: '#334155', background: '#fff' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes for the customer..."
            />
          </div>

          {/* Advanced options */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: '#0f172a' }}>Advanced Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold block" style={{ color: '#475569' }}>Display unit as</label>
                <select value={displayUnitAs} onChange={e => setDisplayUnitAs(e.target.value)}
                  className="w-full rounded-lg py-1.5 px-3 focus:outline-none"
                  style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#334155' }}>
                  <option>Merge with quantity</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold block" style={{ color: '#475569' }}>Show tax summary in invoice</label>
                <select value={showTaxSummary} onChange={e => setShowTaxSummary(e.target.value)}
                  className="w-full rounded-lg py-1.5 px-3 focus:outline-none"
                  style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#334155' }}>
                  <option>Do not show</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-semibold" style={{ color: '#475569' }}>
              {([
                [hideCountryOfSupply, setHideCountryOfSupply, 'Hide place/country of supply'],
                [addOriginalImages,   setAddOriginalImages,   'Add original images in line items'],
                [showThumbnailsSep,   setShowThumbnailsSep,   'Show thumbnails in separate column'],
                [showDescFullWidth,   setShowDescFullWidth,   'Show description in full width'],
                [hideSubtotalGroup,   setHideSubtotalGroup,   'Hide subtotal for group items'],
              ] as const).map(([val, setter, label]) => (
                <label key={label} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={val as boolean}
                    onChange={e => (setter as React.Dispatch<React.SetStateAction<boolean>>)(e.target.checked)}
                    className="rounded h-3.5 w-3.5" style={{ borderColor: '#cbd5e1' }} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-start gap-3 pt-4 border-t" style={{ borderColor: '#f1f5f9' }}>
            <button onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold text-white rounded-lg transition-all"
              style={{ background: '#0f172a' }}>
              Save & Continue
            </button>
            <button onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold rounded-lg border transition-all"
              style={{ color: '#0f172a', borderColor: '#0f172a', background: '#fff' }}>
              Save & Create New
            </button>
            <button onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold rounded-lg border transition-all"
              style={{ color: '#475569', background: '#f1f5f9', borderColor: '#e2e8f0' }}>
              Save As Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam } = useResolvedTenant();
  const effectiveTenant = isPlatformOwner ? (tenantQueryParam ?? '') : tenantPathId;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const dateRange = useMemo(() => defaultDateRange(), []);

  const filters = useMemo(
    () => ({
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      from: dateRange.from,
      to: dateRange.to,
      page,
      limit: ITEMS_PER_PAGE,
    }),
    [statusFilter, dateRange, page],
  );

  const { data, isLoading, error } = useInvoices(effectiveTenant, filters, !!effectiveTenant);
  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(
      (inv: Invoice) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.metadata?.customer_name?.toLowerCase().includes(q) ||
        inv.metadata?.customer_email?.toLowerCase().includes(q),
    );
  }, [invoices, searchQuery]);

  useMemo(() => { setPage(1); }, [searchQuery, statusFilter]);

  const statusOptions = ['all', 'draft', 'sent', 'paid', 'overdue', 'void'];

  const [showCreateView, setShowCreateView] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ invoiceId: string; invoiceNumber: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const createMutation = useCreateInvoice(effectiveTenant);
  const sendMutation = useSendInvoice(effectiveTenant);
  const voidMutation = useVoidInvoice(effectiveTenant);
  const paymentMutation = useRecordPayment(effectiveTenant);

  const handleSaveInvoice = useCallback((formData: any) => {
    const body: CreateInvoiceRequest = {
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      currency: formData.currency,
      lines: formData.lines,
      metadata: { notes: formData.notes },
    };
    createMutation.mutate(body, { onSuccess: () => setShowCreateView(false) });
  }, [createMutation]);

  const handleRecordPayment = useCallback(() => {
    if (!paymentDialog || !paymentAmount) return;
    paymentMutation.mutate(
      { invoiceId: paymentDialog.invoiceId, amount: paymentAmount },
      { onSuccess: () => { setPaymentDialog(null); setPaymentAmount(''); } },
    );
  }, [paymentDialog, paymentAmount, paymentMutation]);

  const hasNoInvoices = !isLoading && invoices.length === 0 && !error;

  // Show full-page create view
  if (showCreateView) {
    return (
      <CreateInvoiceView
        onBack={() => setShowCreateView(false)}
        onSave={handleSaveInvoice}
        isPending={createMutation.isPending}
      />
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Create, send and manage invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            style={{ borderColor: 'rgba(30,80,160,0.4)', color: '#3b82f6' }}
            onClick={() => setBulkUploadOpen(true)}
          >
            <Upload className="h-4 w-4" /> Upload Invoices
          </Button>
          <Button
            variant="primary"
            className="gap-2"
            style={{ background: '#1a56db' }}
            onClick={() => setShowCreateView(true)}
          >
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        </div>
      </div>

      {isPlatformOwner && !tenantQueryParam && (
        <div className="rounded-lg border border-border bg-accent/5 px-4 py-10 text-center text-sm text-muted-foreground">
          Select a tenant from the filter above to view their invoices.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load invoices. Check your connection and try again.
        </div>
      )}

      {/* Empty State */}
      {hasNoInvoices && (
        <EmptyState
          onCreateClick={() => setShowCreateView(true)}
          onUploadClick={() => setBulkUploadOpen(true)}
        />
      )}

      {/* Table */}
      {!hasNoInvoices && (
        <Card style={{ background: 'linear-gradient(145deg, #0d1117 0%, #0f1b2d 100%)', border: '1px solid rgba(30,80,160,0.25)' }}>
          <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search by invoice number or customer..."
                className="w-full rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-blue-500 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(30,80,160,0.3)', color: '#fff' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span className="font-semibold uppercase tracking-wider">Status:</span>
              </div>
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-3 py-1 rounded-full text-xs font-bold capitalize transition-all"
                  style={{
                    background: statusFilter === s ? '#1a56db' : 'rgba(255,255,255,0.06)',
                    color: statusFilter === s ? '#fff' : '#8ba4c8',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading invoices…
                </div>
              )}
              {!isLoading && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(30,80,160,0.2)', background: 'rgba(255,255,255,0.02)' }}>
                      {['Invoice #', 'Customer', 'Amount', 'Status', 'Payment', 'Date', 'Due', 'Actions'].map((h, i) => (
                        <th
                          key={h}
                          className={cn(
                            'px-6 py-3 font-bold text-xs uppercase tracking-wider',
                            i === 2 || i === 5 || i === 6 ? 'text-right' : i >= 3 && i <= 4 ? 'text-center' : i === 7 ? 'text-center' : 'text-left',
                          )}
                          style={{ color: '#4a7eb5' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv: Invoice) => (
                      <tr key={inv.id} className="border-b transition-colors hover:bg-white/[0.02]"
                        style={{ borderColor: 'rgba(30,80,160,0.12)' }}>
                        <td className="px-6 py-4 font-mono text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5" style={{ color: '#3b82f6' }} />
                            <span className="text-white">{inv.invoice_number}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="text-white">{inv.metadata?.customer_name || '--'}</div>
                          {inv.metadata?.customer_email && (
                            <div className="text-[11px]" style={{ color: '#4a7eb5' }}>{inv.metadata.customer_email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-xs text-white">
                          {inv.currency} {Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={statusBadgeVariant(inv.status)}>{inv.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={paymentBadgeVariant(inv.payment_status)}>{inv.payment_status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right text-xs" style={{ color: '#4a7eb5' }}>
                          {new Date(inv.invoice_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right text-xs" style={{ color: '#4a7eb5' }}>
                          {new Date(inv.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center relative">
                          <div className="flex items-center justify-center gap-2">
                            <button title="View" className="transition-colors" style={{ color: '#4a7eb5' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4a7eb5'}>
                              <Eye className="h-4 w-4" />
                            </button>
                            <button title="Edit" className="transition-colors" style={{ color: '#4a7eb5' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4a7eb5'}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button title="Copy" className="transition-colors" style={{ color: '#4a7eb5' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4a7eb5'}>
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setActionMenuId(actionMenuId === inv.id ? null : inv.id)}
                              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4 text-white/50" />
                            </button>
                          </div>
                          {actionMenuId === inv.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-6 top-12 z-20 rounded-lg shadow-lg py-1 min-w-[160px]"
                                style={{ background: '#0f1b2d', border: '1px solid rgba(30,80,160,0.35)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                {inv.status === 'draft' && (
                                  <button
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-white/5 flex items-center gap-2 text-white"
                                    onClick={() => { sendMutation.mutate(inv.id); setActionMenuId(null); }}
                                  >
                                    <Send className="h-3.5 w-3.5" style={{ color: '#3b82f6' }} /> Send Invoice
                                  </button>
                                )}
                                {(inv.payment_status === 'unpaid' || inv.payment_status === 'partial') && inv.status !== 'void' && (
                                  <button
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-white/5 flex items-center gap-2 text-white"
                                    onClick={() => { setPaymentDialog({ invoiceId: inv.id, invoiceNumber: inv.invoice_number }); setActionMenuId(null); }}
                                  >
                                    <DollarSign className="h-3.5 w-3.5 text-green-400" /> Record Payment
                                  </button>
                                )}
                                {inv.status !== 'void' && inv.status !== 'paid' && (
                                  <button
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-white/5 flex items-center gap-2"
                                    style={{ color: '#f87171' }}
                                    onClick={() => { voidMutation.mutate(inv.id); setActionMenuId(null); }}
                                  >
                                    <Ban className="h-3.5 w-3.5" /> Void Invoice
                                  </button>
                                )}
                                <button className="w-full text-left px-4 py-2 text-xs hover:bg-white/5 flex items-center gap-2"
                                  style={{ color: '#4a7eb5' }}
                                  onClick={() => setActionMenuId(null)}>
                                  <RefreshCw className="h-3.5 w-3.5" /> Convert to Quotation
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!isLoading && filtered.length === 0 && invoices.length > 0 && (
                <div className="p-12 text-center" style={{ color: '#4a7eb5' }}>No invoices match your filters.</div>
              )}
            </div>
            {!isLoading && total > 0 && (
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} />

      {/* Record Payment Dialog */}
      {paymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,8,0.72)' }}
          onClick={e => { if (e.target === e.currentTarget) setPaymentDialog(null); }}>
          <div className="relative w-full max-w-sm rounded-2xl border p-6 space-y-4"
            style={{ background: 'linear-gradient(145deg, #0d1117 0%, #0f1b2d 100%)', borderColor: 'rgba(30,80,160,0.35)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Record Payment</h2>
              <button onClick={() => setPaymentDialog(null)}>
                <X className="h-4 w-4 text-white/50" />
              </button>
            </div>
            <p className="text-xs" style={{ color: '#8ba4c8' }}>Invoice: {paymentDialog.invoiceNumber}</p>
            <div>
              <label className="text-xs font-bold block mb-1 text-white">Amount<span style={{ color: '#ef4444' }}>*</span></label>
              <input type="number" min={0} step="0.01"
                className="w-full rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(30,80,160,0.3)', color: '#fff' }}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPaymentDialog(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-white/5 transition-colors"
                style={{ color: '#8ba4c8' }}>Cancel</button>
              <button onClick={handleRecordPayment} disabled={paymentMutation.isPending || !paymentAmount}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white transition-all"
                style={{ background: '#1a56db' }}>
                {paymentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : null}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}