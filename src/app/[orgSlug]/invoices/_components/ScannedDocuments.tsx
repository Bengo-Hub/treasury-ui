'use client';

import { ScanLine, Upload, FileSearch, Sparkles } from 'lucide-react';

interface ScannedDocumentsProps {
  effectiveTenant: string;
}

export function ScannedDocuments({ effectiveTenant }: ScannedDocumentsProps) {
  if (!effectiveTenant) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
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
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-5 py-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-violet-600 dark:text-violet-300">AI OCR Scanning</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Upload invoices received from vendors and the AI will automatically extract line items,
            amounts, and tax rates to help you record expenses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload zone */}
        <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-accent/20 px-6 py-16 cursor-pointer hover:bg-accent/40 hover:border-primary/40 transition-all group">
          <div className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center group-hover:border-primary/40 transition-colors">
            <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Drop a file or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">Supports PDF, JPG, PNG up to 10 MB</p>
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
        </label>

        {/* Recent scans / empty state */}
        <div className="rounded-xl border border-dashed border-border bg-accent/10 px-6 py-16 flex flex-col items-center justify-center text-center">
          <FileSearch className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No scanned documents yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Upload a vendor invoice on the left and extracted documents will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
