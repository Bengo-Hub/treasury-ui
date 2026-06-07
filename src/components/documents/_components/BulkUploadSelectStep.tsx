"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  FileSpreadsheet,
  Upload,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BRAND_OUTLINE_BTN,
  BRAND_SOLID_BTN,
  BULK_UPLOAD_TIPS,
  downloadTemplateCsv,
} from "./bulk-upload-shared";
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
    <div className="space-y-8">
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
          "rounded-xl border-2 border-dashed px-6 py-12 transition-colors",
          dragging ? "border-[#0f172a] bg-accent" : "border-border bg-muted/20",
        )}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
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
            className={BRAND_SOLID_BTN}
          >
            <UploadCloud className="h-4 w-4" /> Upload CSV File
          </button>

          <button
            type="button"
            onClick={() => downloadTemplateCsv(invoiceType)}
            className={BRAND_OUTLINE_BTN}
          >
            <Upload className="h-4 w-4 rotate-180" /> Download Sample File
            Format
          </button>

          <button
            type="button"
            onClick={() => setShowTips((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
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
            <ul className="w-full max-w-md space-y-1 rounded-lg border border-border bg-accent/10 px-4 py-3 text-left">
              {BULK_UPLOAD_TIPS.map((t, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-[11px] text-muted-foreground"
                >
                  <span className="text-emerald-600">•</span> {t}
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
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Selected:{" "}
              <span className="font-bold text-foreground">{file.name}</span>{" "}
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="ml-1 text-destructive hover:underline"
              >
                remove
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
