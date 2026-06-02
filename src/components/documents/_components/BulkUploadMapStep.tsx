"use client";

import { ArrowRight, Columns3 } from "lucide-react";
import { TEMPLATE_COLUMNS, prettifyColumn } from "./bulk-upload-shared";

interface Props {
  docLabel: string;
  fileName: string;
}

export function BulkUploadMapStep({ docLabel, fileName }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Columns3 className="h-4 w-4 shrink-0 text-primary" />
        <span>
          Columns in{" "}
          <span className="font-bold text-foreground">{fileName}</span> map to
          these {docLabel.toLowerCase()} fields:
        </span>
      </div>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
        {TEMPLATE_COLUMNS.map((col) => (
          <div
            key={col}
            className="flex items-center justify-between gap-2 bg-card px-3 py-2.5"
          >
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {col}
            </span>
            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate text-[11px] font-bold text-foreground">
              {prettifyColumn(col)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Your CSV header row must match these column names exactly. Use “Download
        Sample File Format” on the previous step if you’re unsure of the format.
      </p>
    </div>
  );
}
