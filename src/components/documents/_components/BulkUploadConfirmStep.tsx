"use client";

import { AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react";
import type { BulkUploadResult } from "@/lib/api/invoices";

interface Props {
  file: File;
  docLabel: string;
  tenantName: string;
  result?: BulkUploadResult;
  isError: boolean;
}

export function BulkUploadConfirmStep({
  file,
  docLabel,
  tenantName,
  result,
  isError,
}: Props) {
  // Post-upload result view.
  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
          <p className="text-sm font-black text-foreground">Import complete</p>
          <p className="text-xs text-muted-foreground">
            {result.created} {docLabel.toLowerCase()}
            {result.created === 1 ? "" : "s"} created
            {result.failed ? `, ${result.failed} skipped` : ""}.
          </p>
        </div>
        {!!result.errors?.length && (
          <div className="max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {result.errors.map((e, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 text-[11px]"
              >
                <span className="shrink-0 font-mono font-bold text-muted-foreground">
                  Row {e.row}
                </span>
                <span className="text-destructive">{e.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Pre-upload confirmation view.
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-accent/20 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-bold text-foreground">
            {file.name}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>

      <dl className="space-y-2">
        <Row label="Document type" value={`${docLabel}s`} />
        {tenantName && <Row label="Tenant" value={tenantName} />}
      </dl>

      <p className="flex items-start gap-1.5 rounded-lg border border-border bg-accent/10 px-3 py-2 text-[11px] text-muted-foreground">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Each row becomes a draft {docLabel.toLowerCase()}. Rows with errors are
        reported and skipped — valid rows are still created.
      </p>

      {isError && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> Upload failed. Please try
          again.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="max-w-[60%] truncate text-right text-xs font-bold text-foreground">
        {value}
      </dd>
    </div>
  );
}
