"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  FileSpreadsheet,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BULK_UPLOAD_TIPS, downloadTemplateCsv } from "./bulk-upload-shared";
import { BulkUploadIntro } from "./BulkUploadIntro";

const ACCEPTED = [".csv", "text/csv", "application/vnd.ms-excel"];

interface Props {
  file: File | null;
  docType: string;
  invoiceType: string;
  onFileChange: (f: File | null) => void;
}

export function BulkUploadSelectStep({
  file,
  docType,
  invoiceType,
  onFileChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);

  const isCsv = (f: File) =>
    ACCEPTED.includes(f.type) || f.name.toLowerCase().endsWith(".csv");

  const select = (f: File | null) => {
    if (!f) return;
    if (!isCsv(f)) {
      setFileError("Please choose a .csv file.");
      return;
    }
    setFileError(null);
    onFileChange(f);
  };

  return (
    <div className="space-y-5">
      <BulkUploadIntro docType={docType} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          select(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-background",
        )}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              Select a file from your device
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supported File: CSV
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => select(e.target.files?.[0] ?? null)}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UploadCloud className="h-4 w-4" /> Upload CSV File
          </button>

          <button
            type="button"
            onClick={() => downloadTemplateCsv(invoiceType)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <Upload className="h-4 w-4 rotate-180" /> Download Sample File
            Format
          </button>

          <button
            type="button"
            onClick={() => setShowTips((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Things to keep in mind while bulk uploading
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showTips && "rotate-90",
              )}
            />
          </button>

          {showTips && (
            <ul className="w-full space-y-1 rounded-lg border border-border bg-accent/10 px-4 py-3 text-left">
              {BULK_UPLOAD_TIPS.map((t, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-[11px] text-muted-foreground"
                >
                  <span className="text-primary">•</span> {t}
                </li>
              ))}
            </ul>
          )}

          {fileError && (
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {fileError}
            </p>
          )}

          {file && !fileError && (
            <div className="mt-1 flex w-full items-center gap-3 rounded-xl border border-border bg-accent/20 px-3 py-2.5">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-xs font-bold text-foreground">
                  {file.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
