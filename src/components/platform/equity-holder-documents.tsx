'use client';

/**
 * Equity-holder Documents surface.
 *
 * Uses the SHARED cross-service PDF preview pair from
 * `@bengo-hub/shared-ui-lib/documents` (`useDocumentPreview` + `PdfPreview`) —
 * the same pattern erp-ui's employee contract tab uses — so a generated document
 * is previewed in-app before anything is persisted, rather than force-downloaded.
 *
 * Two clearly separated sub-flows:
 *   1. Generated documents — server-rendered from the holder's record.
 *      "Preview" hits /preview (renders, saves nothing); "Generate & Save"
 *      hits /generate and refreshes the stored list.
 *   2. Uploaded documents — physical scans posted as multipart. No
 *      preview-then-generate step: pick a type, pick a file, upload.
 *
 * Everything already stored (from either flow) lands in one "Documents on file"
 * table with per-row Preview / Download / Delete.
 */

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { RowActionMenu, type RowAction } from '@/components/ui/action-menu';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import {
    useDeleteHolderDocument,
    useDownloadHolderDocument,
    useGenerateHolderDocument,
    useHolderDocuments,
    useUploadHolderDocument,
} from '@/hooks/use-equity-documents';
import {
    UPLOAD_DOC_TYPES,
    computeHolderDocumentStatus,
    documentSource,
    documentTypeLabel,
    fetchStoredDocumentBlob,
    generatedDocTypesFor,
    previewHolderDocument,
    type EquityHolderDocument,
} from '@/lib/api/equity-documents';
import type { EquityHolder } from '@/lib/api/equity';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    AlertCircle,
    CheckCircle2,
    Eye,
    FilePlus2,
    FileText,
    Loader2,
    Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
        return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
        return dateStr;
    }
}

/** A stored document renders in the PdfPreview modal only when it really is a PDF. */
function isPdf(doc: EquityHolderDocument): boolean {
    if (doc.content_type) return doc.content_type.toLowerCase().includes('pdf');
    return (doc.file_name ?? '').toLowerCase().endsWith('.pdf');
}

// ─── Column defs ──────────────────────────────────────────────────────────────

export interface DocumentColumnCallbacks {
    onPreview: (doc: EquityHolderDocument) => void;
    onDownload: (doc: EquityHolderDocument) => void;
    onDelete: (doc: EquityHolderDocument) => void;
    busy: boolean;
}

export function buildHolderDocumentColumns(cb: DocumentColumnCallbacks): DataTableColumn<EquityHolderDocument>[] {
    const actions: RowAction<EquityHolderDocument>[] = [
        { label: 'Preview', visible: isPdf, disabled: () => cb.busy, onClick: cb.onPreview },
        { label: 'Download', disabled: () => cb.busy, onClick: cb.onDownload },
        { label: 'Delete', destructive: true, disabled: () => cb.busy, onClick: cb.onDelete },
    ];

    return [
        {
            key: 'doc_type',
            header: 'Document',
            primary: true,
            sortable: true,
            accessor: (d) => documentTypeLabel(d.doc_type),
            render: (d) => (
                <>
                    <p className="font-medium">{documentTypeLabel(d.doc_type)}</p>
                    {d.file_name && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px] font-mono">{d.file_name}</p>
                    )}
                </>
            ),
        },
        {
            key: 'source',
            header: 'Source',
            filterable: true,
            filterOptions: [
                { value: 'generated', label: 'Generated' },
                { value: 'uploaded', label: 'Uploaded' },
            ],
            accessor: (d) => documentSource(d),
            render: (d) => (
                <Badge variant={documentSource(d) === 'generated' ? 'default' : 'secondary'}>
                    {documentSource(d) === 'generated' ? 'Generated' : 'Uploaded'}
                </Badge>
            ),
        },
        {
            key: 'size_bytes',
            header: 'Size',
            align: 'right',
            mobileHidden: true,
            cellClassName: 'text-xs text-muted-foreground tabular-nums',
            accessor: (d) => d.size_bytes ?? 0,
            render: (d) => formatBytes(d.size_bytes),
        },
        {
            key: 'created_at',
            header: 'Added',
            sortable: true,
            mobileHidden: true,
            cellClassName: 'text-xs text-muted-foreground',
            accessor: (d) => d.created_at,
            render: (d) => formatDate(d.created_at),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            exportable: false,
            render: (d) => <RowActionMenu row={d} actions={actions} />,
        },
    ];
}

// ─── Status badges (reused by the Agreements tab) ─────────────────────────────

/**
 * HolderDocumentStatusBadges renders the REAL per-holder document/KYC posture
 * from the holder's stored documents, replacing the old blanket
 * "Quick-add (internal)" badge that was shown identically for every holder.
 */
export function HolderDocumentStatusBadges({ holder }: { holder: EquityHolder }) {
    const { data, isLoading, isError } = useHolderDocuments(holder.id);
    const status = useMemo(() => computeHolderDocumentStatus(data?.documents), [data?.documents]);

    if (isLoading) {
        return (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking documents…
            </span>
        );
    }

    // The endpoint being unreachable is NOT the same as "no documents" — say so
    // rather than falsely reporting a holder as missing their paperwork.
    if (isError) {
        return (
            <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3" /> Status unavailable
            </Badge>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
            {holder.application_id && (
                <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> EPA workflow
                </Badge>
            )}
            <Badge variant={status.hasAgreement ? 'success' : 'outline'} className="gap-1">
                {status.hasAgreement ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                Agreement
            </Badge>
            <Badge variant={status.hasId ? 'success' : 'outline'} className="gap-1">
                {status.hasId ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                ID
            </Badge>
            <Badge variant={status.hasKraPin ? 'success' : 'outline'} className="gap-1">
                {status.hasKraPin ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                KRA PIN
            </Badge>
            <Badge variant={status.kycComplete ? 'success' : 'warning'}>
                {status.kycComplete ? 'KYC complete' : 'KYC incomplete'}
            </Badge>
        </div>
    );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function EquityHolderDocumentsPanel({ holder }: { holder: EquityHolder }) {
    const holderId = holder.id;
    const { data, isLoading, isError, refetch } = useHolderDocuments(holderId);
    const documents = data?.documents ?? [];

    const generate = useGenerateHolderDocument(holderId);
    const upload = useUploadHolderDocument(holderId);
    const remove = useDeleteHolderDocument(holderId);
    const download = useDownloadHolderDocument(holderId);

    // The SHARED preview pair — identical usage to erp-ui's _contract-tab.tsx.
    const { openPreview, previewProps } = useDocumentPreview({ onError: (m) => toast.error(m) });

    const generatedTypes = useMemo(() => generatedDocTypesFor(holder.compensation_model), [holder.compensation_model]);

    // Upload form state
    const [uploadType, setUploadType] = useState(UPLOAD_DOC_TYPES[0].value);
    const [uploadDescription, setUploadDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const previewGenerated = (docType: string, label: string) =>
        openPreview(() => previewHolderDocument(holderId, docType, `${docType}_${holderId}`).then((r) => r.blob), {
            fileName: `${docType}_${holder.name.replace(/\s+/g, '_').toLowerCase()}.pdf`,
            title: `${label} — ${holder.name}`,
        });

    const previewStored = (doc: EquityHolderDocument) =>
        openPreview(() => fetchStoredDocumentBlob(holderId, doc.id), {
            fileName: doc.file_name || `${doc.doc_type}.pdf`,
            title: `${documentTypeLabel(doc.doc_type)} — ${holder.name}`,
        });

    const submitUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        await upload.mutateAsync({ file, docType: uploadType, description: uploadDescription || undefined });
        setFile(null);
        setUploadDescription('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const columns = useMemo(
        () =>
            buildHolderDocumentColumns({
                onPreview: previewStored,
                onDownload: (d) => download.mutate(d.id),
                onDelete: (d) => remove.mutate(d.id),
                busy: remove.isPending || download.isPending,
            }),
        // previewStored closes over stable ids only; rebuild when the mutation
        // pending flags flip so the row menu disables correctly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [holderId, remove.isPending, download.isPending],
    );

    const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';

    return (
        <div className="space-y-6">
            {/* 1 — Generated documents */}
            <Card className="border-none shadow-lg shadow-black/5">
                <CardHeader className="bg-transparent border-none flex flex-row items-center justify-between">
                    <div>
                        <h3 className="font-bold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" /> Generated Documents
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Rendered from this holder&apos;s record. Preview renders without saving; Generate &amp; Save stores a final copy.
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                    {generatedTypes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No generated document types apply to this holder&apos;s compensation model.
                        </p>
                    ) : (
                        generatedTypes.map((t) => {
                            const isGenerating = generate.isPending && generate.variables === t.value;
                            const onFile = documents.some((d) => d.doc_type === t.value);
                            return (
                                <div
                                    key={t.value}
                                    className="flex flex-col gap-3 rounded-xl border border-border/60 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold flex items-center gap-2">
                                            {t.label}
                                            {onFile && <Badge variant="success">On file</Badge>}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={() => previewGenerated(t.value, t.label)}
                                        >
                                            <Eye className="h-3.5 w-3.5" /> Preview
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="gap-1.5"
                                            disabled={generate.isPending}
                                            onClick={() => generate.mutate(t.value)}
                                        >
                                            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />}
                                            Generate &amp; Save
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>

            {/* 2 — Upload a physical document */}
            <Card className="border-none shadow-lg shadow-black/5">
                <CardHeader className="bg-transparent border-none">
                    <h3 className="font-bold flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary" /> Upload Physical Document
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Scans of identity and tax paperwork. Stored as-is — there is no render step.
                    </p>
                </CardHeader>
                <CardContent className="pt-0">
                    <form onSubmit={submitUpload} className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Document Type" required>
                            <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className={inputClass}>
                                {UPLOAD_DOC_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="File" required>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.webp"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className={cn(inputClass, 'file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1 file:text-xs file:font-semibold')}
                                required
                            />
                        </FormField>
                        <FormField label="Description" className="sm:col-span-2">
                            <input
                                value={uploadDescription}
                                onChange={(e) => setUploadDescription(e.target.value)}
                                className={inputClass}
                                placeholder="Optional note (e.g. front & back of ID)"
                            />
                        </FormField>
                        <div className="sm:col-span-2">
                            <Button type="submit" size="sm" className="gap-1.5" disabled={!file || upload.isPending}>
                                {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                Upload
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* 3 — Everything stored */}
            <Card className="border-none shadow-lg shadow-black/5">
                <CardHeader className="bg-transparent border-none flex flex-row items-center justify-between">
                    <h3 className="font-bold">Documents on File</h3>
                    <Badge variant="outline">{documents.length}</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="px-2 pb-2">
                        <DataTable
                            columns={columns}
                            rows={documents}
                            rowKey={(d) => d.id}
                            loading={isLoading}
                            loadingRows={4}
                            error={isError}
                            onRetry={() => refetch()}
                            storageKey="equity-holder-documents-table"
                            emptyText="No documents stored for this holder yet."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Rendered once — the shared preview modal for every flow above. */}
            <PdfPreview {...previewProps} />
        </div>
    );
}

// ─── Modal wrapper (holders-list row action) ──────────────────────────────────

export function EquityHolderDocumentsModal({
    holder,
    onClose,
}: {
    holder: EquityHolder;
    onClose: () => void;
}) {
    return (
        <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent
                title={`Documents — ${holder.name}`}
                description="Generated agreements and uploaded KYC paperwork for this holder."
                onClose={onClose}
                className="max-w-4xl"
            >
                <EquityHolderDocumentsPanel holder={holder} />
            </DialogContent>
        </Dialog>
    );
}
