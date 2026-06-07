/* eslint-disable */
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
import { BRAND_SOLID_BTN } from "./_components/bulk-upload-shared";

const STEPS = [
  { n: 1, label: "Select File" },
  { n: 2, label: "Map Fields" },
  { n: 3, label: "Confirm & Upload" },
] as const;

interface Props {
  tenant: string;
  /** Invoice doc type key, e.g. 'credit_note', 'sales_order' — keys of DOC_CONFIGS. */
  docType: keyof typeof DOC_CONFIGS;
  /** Closes the modal. */
  onClose: () => void;
}

/**
 * Bulk Upload stepper rendered inside a modal/dialog overlay. The dark
 * blue/black brand palette is encapsulated in the BRAND_* tokens (see
 * bulk-upload-shared) so it doesn't leak into the rest of the app; surfaces
 * use semantic tokens (bg-card, text-foreground, border-border) for dark mode.
 */
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
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header — breadcrumb + close */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            {tenantName && (
              <>
                <span className="truncate font-medium text-foreground">
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
            aria-label="Close"
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
                <li key={s.n} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                      reached
                        ? "bg-[#0f172a] text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done && s.n === STEPS.length ? (
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

        {/* Step body (scrolls if tall) */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
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

        {/* Footer nav */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-accent/10 px-6 py-4">
          {done ? (
            <button type="button" onClick={onClose} className={BRAND_SOLID_BTN}>
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : onClose()
                }
                className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  className={BRAND_SOLID_BTN}
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={upload.isPending}
                  onClick={handleUpload}
                  className={BRAND_SOLID_BTN}
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
