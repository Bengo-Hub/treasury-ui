/**
 * Equity-holder documents API client (treasury-api).
 * Platform admin endpoints — requires platform-owner role.
 *
 * Two distinct sub-flows exist and must not be conflated:
 *
 *  1. GENERATED documents (EPA agreement, share certificate, …) — the server
 *     renders them from the holder's own record. `/preview` live-renders and
 *     streams the PDF WITHOUT saving anything (feeds the shared PdfPreview
 *     modal); `/generate` renders AND persists the result as a stored Document.
 *
 *  2. UPLOADED (physical) documents — a scan of a national ID, KRA PIN
 *     certificate, CR12, … posted as multipart. No preview-then-generate step:
 *     the file is stored as-is and read back via a presigned URL.
 *
 * Covers:
 *  - GET    /platform/equity-holders/{id}/documents                       — list stored docs
 *  - GET    /platform/equity-holders/{id}/documents/{docType}/preview     — live render (streams PDF, saves nothing)
 *  - POST   /platform/equity-holders/{id}/documents/{docType}/generate    — render + save
 *  - POST   /platform/equity-holders/{id}/documents/upload                — multipart upload (physical docs)
 *  - GET    /platform/equity-holders/{id}/documents/{docId}/url           — presigned download URL
 *  - DELETE /platform/equity-holders/{id}/documents/{docId}               — delete a stored doc
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

/** How a stored document came to exist: rendered by the server, or uploaded by an admin. */
export type EquityDocumentSource = 'generated' | 'uploaded';

export interface EquityHolderDocument {
    id: string;
    holder_id: string;
    doc_type: string;
    file_name?: string;
    content_type?: string;
    size_bytes?: number;
    /** 'generated' | 'uploaded'. Older payloads may omit it — inferred from doc_type. */
    source?: EquityDocumentSource;
    description?: string;
    status?: string;
    created_at: string;
    updated_at?: string;
}

export interface EquityDocumentUrlResponse {
    url: string;
    expires_at?: string;
}

/** A document the platform can render on demand for a holder. */
export interface EquityDocumentTypeDef {
    value: string;
    label: string;
    description: string;
    /**
     * Compensation models this document applies to. Omitted = applies to every
     * holder. Keeps dividend-only paperwork (share certificates) off royalty
     * holders and EPAs off registered shareholders.
     */
    models?: Array<'equity_revenue_share' | 'dividend' | 'royalty'>;
}

/**
 * Server-rendered document types. Extend this list as the backend adds
 * renderers — the Documents panel derives its whole "generate" section from it.
 */
export const GENERATED_DOC_TYPES: EquityDocumentTypeDef[] = [
    {
        value: 'epa_agreement',
        label: 'EPA Agreement',
        description: 'Equity Participation Agreement — the contractual revenue/profit-share instrument for non-dividend holders.',
        models: ['equity_revenue_share', 'royalty'],
    },
    {
        value: 'share_certificate',
        label: 'Share Certificate',
        description: 'Certificate of the shares held in the umbrella company, rendered from the holder’s registered share count.',
        models: ['dividend'],
    },
];

/** Physical/scanned document types an admin uploads for KYC. */
export const UPLOAD_DOC_TYPES: EquityDocumentTypeDef[] = [
    { value: 'national_id', label: 'National ID / Passport', description: 'Identity document scan.' },
    { value: 'kra_pin', label: 'KRA PIN Certificate', description: 'Tax PIN certificate — required before withholding tax can be applied correctly.' },
    { value: 'cr12', label: 'CR12 / BRS Certificate', description: 'Company registration extract listing the registered shareholders.' },
    { value: 'signed_agreement', label: 'Signed Agreement (scan)', description: 'A wet-signed or counter-signed copy of an agreement.' },
    { value: 'other', label: 'Other', description: 'Any other supporting document.' },
];

/** Doc types that make up a complete KYC file, used for the onboarding status badges. */
export const KYC_REQUIRED_DOC_TYPES = ['national_id', 'kra_pin'] as const;

const GENERATED_TYPE_VALUES = new Set(GENERATED_DOC_TYPES.map((d) => d.value));

/** Resolve a document's source, falling back to its doc_type when the API omits it. */
export function documentSource(doc: EquityHolderDocument): EquityDocumentSource {
    if (doc.source) return doc.source;
    return GENERATED_TYPE_VALUES.has(doc.doc_type) ? 'generated' : 'uploaded';
}

/** Human label for a doc type across both catalogues. */
export function documentTypeLabel(docType: string): string {
    const def =
        GENERATED_DOC_TYPES.find((d) => d.value === docType) ??
        UPLOAD_DOC_TYPES.find((d) => d.value === docType);
    return def?.label ?? docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Generated doc types applicable to a holder's compensation model. */
export function generatedDocTypesFor(compensationModel?: string): EquityDocumentTypeDef[] {
    const model = (compensationModel ?? 'equity_revenue_share') as 'equity_revenue_share' | 'dividend' | 'royalty';
    return GENERATED_DOC_TYPES.filter((d) => !d.models || d.models.includes(model));
}

/** Per-holder document/KYC posture derived from the stored document list. */
export interface HolderDocumentStatus {
    hasAgreement: boolean;
    hasId: boolean;
    hasKraPin: boolean;
    /** Every KYC_REQUIRED_DOC_TYPES document is on file. */
    kycComplete: boolean;
    total: number;
}

export function computeHolderDocumentStatus(docs: EquityHolderDocument[] | undefined): HolderDocumentStatus {
    const types = new Set((docs ?? []).map((d) => d.doc_type));
    const hasId = types.has('national_id');
    const hasKraPin = types.has('kra_pin');
    return {
        hasAgreement: types.has('epa_agreement') || types.has('share_certificate') || types.has('signed_agreement'),
        hasId,
        hasKraPin,
        kycComplete: KYC_REQUIRED_DOC_TYPES.every((t) => types.has(t)),
        total: docs?.length ?? 0,
    };
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** List the documents stored against a holder.
 *  Tolerates the paginated envelope (`{ data: [] }`), `{ documents: [] }` and a bare array,
 *  matching listEquityHolders' defensive parsing. */
export async function listHolderDocuments(holderId: string): Promise<{ documents: EquityHolderDocument[] }> {
    const res = await apiClient.get<unknown>(`${BASE}/platform/equity-holders/${holderId}/documents`);
    const r = res as { data?: EquityHolderDocument[]; documents?: EquityHolderDocument[] } | EquityHolderDocument[];
    const documents = Array.isArray(r) ? r : (r.data ?? r.documents ?? []);
    return { documents };
}

/**
 * Live-render a generated document and stream it back as a PDF blob. Nothing is
 * persisted — this is the "preview before you commit" half of the flow, fed
 * straight into the shared `useDocumentPreview`/`PdfPreview` pair.
 */
export function previewHolderDocument(
    holderId: string,
    docType: string,
    fallbackName = 'document',
): Promise<{ blob: Blob; fileName: string }> {
    return apiClient.getBlob(
        `${BASE}/platform/equity-holders/${holderId}/documents/${docType}/preview`,
        `${fallbackName}.pdf`,
    );
}

/** Render a generated document AND persist it as a stored Document. */
export function generateHolderDocument(holderId: string, docType: string): Promise<EquityHolderDocument> {
    return apiClient.post<EquityHolderDocument>(
        `${BASE}/platform/equity-holders/${holderId}/documents/${docType}/generate`,
        {},
    );
}

/**
 * Upload a physical document (ID scan, KRA PIN certificate, …) as multipart.
 * Axios sets the multipart boundary from the FormData body automatically.
 */
export function uploadHolderDocument(
    holderId: string,
    file: File,
    docType: string,
    description?: string,
): Promise<EquityHolderDocument> {
    const form = new FormData();
    form.append('file', file);
    form.append('doc_type', docType);
    if (description) form.append('description', description);
    return apiClient.post<EquityHolderDocument>(
        `${BASE}/platform/equity-holders/${holderId}/documents/upload`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    );
}

/** Presigned URL for an already-stored document. */
export function getHolderDocumentUrl(holderId: string, docId: string): Promise<EquityDocumentUrlResponse> {
    return apiClient.get<EquityDocumentUrlResponse>(
        `${BASE}/platform/equity-holders/${holderId}/documents/${docId}/url`,
    );
}

/** Permanently remove a stored document. */
export function deleteHolderDocument(holderId: string, docId: string): Promise<{ status: string }> {
    return apiClient.delete<{ status: string }>(
        `${BASE}/platform/equity-holders/${holderId}/documents/${docId}`,
    );
}

/**
 * Fetch a stored document's bytes for the in-app preview modal: resolve the
 * presigned URL, then read it directly (presigned URLs carry their own
 * credentials, so the API client's auth headers must NOT be attached — sending
 * them would break the S3-style signature).
 */
export async function fetchStoredDocumentBlob(holderId: string, docId: string): Promise<Blob> {
    const { url } = await getHolderDocumentUrl(holderId, docId);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download document (${res.status})`);
    return res.blob();
}
