'use client';

import { ScanLine, Upload, FileSearch, Sparkles } from 'lucide-react';

interface ScannedDocumentsProps {
  effectiveTenant: string;
}

export function ScannedDocuments({ effectiveTenant }: ScannedDocumentsProps) {
  if (!effectiveTenant) return null;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-violet-50 border border-violet-200">
          <ScanLine className="h-5 w-5 text-violet-500" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Scanned Documents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload vendor invoices or receipts — AI extracts the details automatically.
          </p>
        </div>
      </div>

      {/* AI Banner */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-4 flex items-start gap-3 mb-6">
        <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-violet-800">AI OCR Scanning</p>
          <p className="text-[11px] text-violet-600 mt-0.5">
            Upload invoices received from vendors and the AI will automatically extract line items,
            amounts, and tax rates to help you record expenses.
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-accent/20 px-6 py-12 cursor-pointer hover:bg-accent/40 hover:border-primary/40 transition-all group">
        <div className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center group-hover:border-primary/40 transition-colors">
          <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Drop a file or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">Supports PDF, JPG, PNG up to 10 MB</p>
        </div>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
      </label>

      {/* Empty state */}
      <div className="mt-8 rounded-xl border border-dashed border-border bg-accent/10 px-6 py-10 text-center">
        <FileSearch className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No scanned documents yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload a vendor invoice above to get started.
        </p>
      </div>
    </div>
  );
}
