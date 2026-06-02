"use client";

import { useState } from "react";
import {
  CheckCircle,
  ChevronRight,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBulkUploadInvoices } from "@/hooks/use-invoices";
import { useOrgBranding } from "@/hooks/use-org-branding";
import { DOC_CONFIGS } from "@/components/documents/SharedDocumentCreateView";
import { BulkUploadSelectStep } from "./_components/BulkUploadSelectStep";
import { BulkUploadMapStep } from "./_components/BulkUploadMapStep";
import { BulkUploadConfirmStep } from "./_components/BulkUploadConfirmStep";

const STEPS = [
  { n: 1, label: "Select File" },
  { n: 2, label: "Map Fields" },
  { n: 3, label: "Confirm & Upload" },
] as const;

interface Props {
  tenant: string;
  /** Invoice doc type key, e.g. 'credit_note', 'sales_order' — keys of DOC_CONFIGS. */
  docType: keyof typeof DOC_CONFIGS;
  onClose: () => void;
}

export function BulkUploadStepper({ tenant, docType, onClose }: Props) {
  const config = DOC_CONFIGS[docType];
  const docLabel = config?.title ?? "Document";
  const invoiceType = config?.invoiceType ?? String(docType);

  const { data: brand } = useOrgBranding(tenant);
  const tenantName = brand?.orgName || brand?.name || "";

  const upload = useBulkUploadInvoices(tenant);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);

  const result = upload.data;
  const done = !!result;
  const canContinue = step === 1 ? !!file : true;

  const handleUpload = () => {
    if (file) upload.mutate({ type: invoiceType, file });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header — tenant breadcrumb */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            {tenantName && (
              <>
                <span className="truncate font-semibold text-foreground">
                  {tenantName}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </>
            )}
            <span className="truncate text-foreground">
              Bulk Upload {docLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="border-b border-border bg-accent/10 px-6 py-4">
          <ol className="flex items-center justify-center gap-3">
            {STEPS.map((s, i) => {
              const reached = step >= s.n;
              return (
                <li key={s.n} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                      reached
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done && s.n === 3 ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      s.n
                    )}
                  </div>
                  <span
                    className={cn(
                      "hidden text-sm font-semibold transition-colors sm:inline",
                      reached ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {step === 1 && (
            <BulkUploadSelectStep
              file={file}
              docType={docType}
              invoiceType={invoiceType}
              onFileChange={setFile}
            />
          )}
          {step === 2 && file && (
            <BulkUploadMapStep docLabel={docLabel} fileName={file.name} />
          )}
          {step === 3 && file && (
            <BulkUploadConfirmStep
              file={file}
              docLabel={docLabel}
              tenantName={tenantName}
              result={result}
              isError={upload.isError}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-accent/10 px-6 py-4">
          {done ? (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : onClose()
                }
                className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={upload.isPending}
                  onClick={handleUpload}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {upload.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  {upload.isPending ? "Uploading…" : "Confirm & Upload"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
