/**
 * Equity document templates API client (treasury-api).
 * Platform admin endpoints — requires platform-owner role (same gate as the
 * rest of `/platform/equity-holders/*`).
 *
 * This is a SEPARATE, parallel feature from `equity-documents.ts`:
 *  - `equity-documents.ts` = per-holder document GENERATION/upload (Phase 9,
 *    already shipped) — render a document from one holder's own record.
 *  - This file = platform-wide template AUTHORING — edit the boilerplate
 *    HTML that generation later merges a holder's data into. They may be
 *    cut over to share a rendering path later, but today they are independent
 *    and this file must not import from or modify the other.
 *
 * Covers:
 *  - GET /platform/equity-document-templates                          — list all 4 templates + customization status
 *  - GET /platform/equity-document-templates/{docType}                — full template (auto-seeds boilerplate on first access)
 *  - PUT /platform/equity-document-templates/{docType}                — save edited body_html
 *  - GET /platform/equity-document-templates/{docType}/preview        — merge the current template with one holder's real data
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The 4 template doc types the backend supports. */
export type EquityDocumentTemplateType =
    | 'epa_agreement'
    | 'dividend_certificate'
    | 'share_certificate'
    | 'terms';

/** Static metadata for the 4 template slots, used to render the picker before data loads. */
export const EQUITY_DOCUMENT_TEMPLATE_TYPES: { value: EquityDocumentTemplateType; label: string }[] = [
    { value: 'epa_agreement', label: 'EPA Agreement' },
    { value: 'dividend_certificate', label: 'Dividend Certificate' },
    { value: 'share_certificate', label: 'Share Certificate' },
    { value: 'terms', label: 'Terms & Conditions' },
];

export interface EquityDocumentTemplateSummary {
    doc_type: EquityDocumentTemplateType;
    title: string;
    exists: boolean;
    is_customized: boolean;
    updated_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface EquityDocumentTemplate {
    doc_type: EquityDocumentTemplateType;
    title: string;
    /** Semantic HTML (h3/p/b/ul/li/br) — matches what RichTextEditor produces and consumes. */
    body_html: string;
    is_customized: boolean;
    updated_by?: string;
    created_at: string;
    updated_at: string;
}

export interface EquityDocumentTemplatePreview {
    doc_type: EquityDocumentTemplateType;
    holder_id: string;
    is_customized: boolean;
    /** The saved/seeded template with {{merge_field}} placeholders substituted from one real holder's data. */
    merged_html: string;
}

/** Human label for a template doc type, falling back to a title-cased version of the raw value. */
export function templateTypeLabel(docType: string): string {
    const def = EQUITY_DOCUMENT_TEMPLATE_TYPES.find((d) => d.value === docType);
    return def?.label ?? docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** List all 4 document templates with their customization/last-updated status. */
export async function listEquityDocumentTemplates(): Promise<{ templates: EquityDocumentTemplateSummary[] }> {
    const res = await apiClient.get<unknown>(`${BASE}/platform/equity-document-templates`);
    const r = res as { templates?: EquityDocumentTemplateSummary[] } | EquityDocumentTemplateSummary[];
    const templates = Array.isArray(r) ? r : (r.templates ?? []);
    return { templates };
}

/**
 * Fetch one template's full body. Auto-seeds Kenya-law-aware boilerplate on
 * first access if nothing has been saved yet — always returns a real
 * `body_html`, never empty.
 */
export function getEquityDocumentTemplate(docType: EquityDocumentTemplateType | string): Promise<EquityDocumentTemplate> {
    return apiClient.get<EquityDocumentTemplate>(`${BASE}/platform/equity-document-templates/${docType}`);
}

/** Save edited template HTML. Response mirrors GET, with `is_customized` now true. */
export function saveEquityDocumentTemplate(
    docType: EquityDocumentTemplateType | string,
    bodyHtml: string,
): Promise<EquityDocumentTemplate> {
    return apiClient.put<EquityDocumentTemplate>(`${BASE}/platform/equity-document-templates/${docType}`, {
        body_html: bodyHtml,
    });
}

/** Merge the CURRENT saved/seeded template with one real holder's data for a live preview. */
export function previewEquityDocumentTemplate(
    docType: EquityDocumentTemplateType | string,
    holderId: string,
): Promise<EquityDocumentTemplatePreview> {
    return apiClient.get<EquityDocumentTemplatePreview>(
        `${BASE}/platform/equity-document-templates/${docType}/preview`,
        { holder_id: holderId },
    );
}
