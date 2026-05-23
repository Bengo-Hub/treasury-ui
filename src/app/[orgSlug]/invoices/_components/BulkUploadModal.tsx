'use client';

import { cn } from '@/lib/utils';
import { ChevronRight, Download, Upload, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function BulkUploadModal({ open, onClose }: BulkUploadModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/75"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Bulk Upload Invoices</h2>
            <p className="text-xs mt-0.5 text-muted-foreground">Import multiple invoices from a CSV file</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-4 border-b border-border">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all border-2',
                    step >= s.n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-transparent',
                  )}
                >
                  {s.n}
                </div>
                <span className={cn('text-xs font-medium', step >= s.n ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 mx-3 text-muted-foreground" />
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
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 cursor-pointer transition-all',
                  isDragOver
                    ? 'border-primary bg-primary/5'
                    : file
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-accent/30 hover:bg-accent/50',
                )}
              >
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                <div className="flex items-center justify-center w-14 h-14 rounded-xl mb-4 bg-primary/10 border border-primary/30">
                  <UploadCloud className="h-6 w-6 text-primary" />
                </div>
                {file ? (
                  <>
                    <p className="text-sm font-bold text-foreground">{file.name}</p>
                    <p className="text-xs mt-1 text-primary">File selected — click Continue to proceed</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-foreground">Select a file from your device</p>
                    <p className="text-xs mt-1 text-muted-foreground">Supported File: CSV · or drag & drop here</p>
                  </>
                )}
              </div>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium border border-border text-muted-foreground transition-colors hover:bg-accent">
                <Download className="h-3.5 w-3.5" /> Download Sample File Format
              </button>
              <div className="text-xs text-center py-1 text-muted-foreground">
                Things to keep in mind while bulk uploading →
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs mb-4 text-muted-foreground">
                Map columns from your CSV file to the corresponding invoice fields.
              </p>
              {Object.entries(fieldMap).map(([field, col]) => (
                <div key={field} className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg px-3 py-2 text-xs bg-accent/30 border border-border text-muted-foreground">
                    {field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  <select
                    value={col}
                    onChange={(e) => setFieldMap((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none bg-primary/10 border border-primary/30 text-foreground"
                  >
                    {['Invoice Number', 'Customer Name', 'Email', 'Amount', 'Due Date', 'Date', 'Notes', 'Currency'].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl p-4 border bg-primary/5 border-primary/20">
                <p className="text-xs font-bold text-foreground mb-3">Upload Summary</p>
                <div className="space-y-2">
                  {[
                    ['File', file?.name ?? '—'],
                    ['Detected Rows', '24 invoices'],
                    ['Valid Rows', '22'],
                    ['Skipped Rows', '2 (missing required fields)'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Review the summary above. Click <strong className="text-foreground">Upload Now</strong> to import the valid rows.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (step === 1 && file) setStep(2);
              else if (step === 2) setStep(3);
              else if (step === 3) handleClose();
            }}
            disabled={step === 1 && !file}
            className={cn(
              'px-5 py-2 rounded-lg text-xs font-bold transition-all',
              step === 1 && !file
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90',
            )}
          >
            {step === 3 ? 'Upload Now' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
