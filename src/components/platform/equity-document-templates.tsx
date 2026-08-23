'use client';

/**
 * Equity Document Templates — platform-wide template AUTHORING.
 *
 * A SEPARATE, parallel feature from `equity-holder-documents.tsx` (per-holder
 * document GENERATION/upload, Phase 9). This panel edits the boilerplate HTML
 * that generation later merges a holder's data into — it does not generate,
 * store, or download any per-holder document itself. The 4 doc_types here
 * (epa_agreement, dividend_certificate, share_certificate, terms) are a
 * platform-wide configuration concern, independent of any one holder.
 *
 * Layout:
 *  1. A row of 4 selectable template entries (title + Customized/Default badge
 *     + last-updated info).
 *  2. The selected template's body_html loaded into the shared RichTextEditor,
 *     with a Save button.
 *  3. A "Preview for holder" control — pick a holder, merge the current
 *     template with their real data, render the result.
 */

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { RichTextEditor } from '@bengo-hub/shared-ui-lib/rich-text-editor';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import {
    useEquityDocumentTemplate,
    useEquityDocumentTemplates,
    usePreviewEquityDocumentTemplate,
    useSaveEquityDocumentTemplate,
} from '@/hooks/use-equity-document-templates';
import {
    EQUITY_DOCUMENT_TEMPLATE_TYPES,
    templateTypeLabel,
    type EquityDocumentTemplateType,
} from '@/lib/api/equity-document-templates';
import type { EquityHolder } from '@/lib/api/equity';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AlertCircle, Eye, FileEdit, FileText, Loader2, Save, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
        return format(new Date(dateStr), 'MMM d, yyyy · h:mm a');
    } catch {
        return dateStr;
    }
}

export function DocumentTemplatesPanel({ holders }: { holders: EquityHolder[] }) {
    const { data: listData, isLoading: listLoading, isError: listError } = useEquityDocumentTemplates();

    const [selectedType, setSelectedType] = useState<EquityDocumentTemplateType>('epa_agreement');
    const {
        data: template,
        isLoading: templateLoading,
        isError: templateError,
    } = useEquityDocumentTemplate(selectedType);

    const saveTemplate = useSaveEquityDocumentTemplate();
    const preview = usePreviewEquityDocumentTemplate();

    // Editor is controlled locally so typing doesn't refetch/rerender against the
    // query; resynced whenever the loaded template (or the selected slot) changes.
    const [bodyHtml, setBodyHtml] = useState('');
    useEffect(() => {
        setBodyHtml(template?.body_html ?? '');
    }, [template?.body_html, selectedType]);

    const [previewHolderId, setPreviewHolderId] = useState('');
    // Switching templates invalidates whatever was previewed for the old one.
    useEffect(() => {
        preview.reset();
        setPreviewHolderId('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedType]);

    const holderOptions: ComboboxOption[] = useMemo(
        () =>
            holders.map((h) => ({
                value: h.id,
                label: h.name,
                hint: h.holder_type,
            })),
        [holders],
    );

    // Merge live summary badges (Customized/Default, updated_at) with the static
    // 4-slot catalogue so the picker renders immediately, before the list loads.
    const slots = useMemo(() => {
        const templates = listData?.templates ?? [];
        return EQUITY_DOCUMENT_TEMPLATE_TYPES.map((t) => {
            const summary = templates.find((s) => s.doc_type === t.value);
            return {
                value: t.value,
                title: summary?.title ?? t.label,
                isCustomized: summary?.is_customized ?? false,
                updatedAt: summary?.updated_at,
                updatedBy: summary?.updated_by,
            };
        });
    }, [listData?.templates]);

    const isDirty = !templateLoading && bodyHtml !== (template?.body_html ?? '');

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-black/5 bg-primary/5">
                <CardContent className="p-6 space-y-2">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <FileEdit className="h-5 w-5 text-primary" /> Document Templates
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Edit the boilerplate used when equity documents are generated for holders. Changes apply
                        platform-wide; a template left untouched falls back to the default Kenya-law-aware wording.
                    </p>
                </CardContent>
            </Card>

            {listError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load template statuses. Check your connection and try again.
                </div>
            )}

            {/* 1 — Template picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {listLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-24 rounded-xl border border-border/60 bg-accent/20 animate-pulse" />
                      ))
                    : slots.map((slot) => {
                          const active = slot.value === selectedType;
                          return (
                              <button
                                  key={slot.value}
                                  type="button"
                                  onClick={() => setSelectedType(slot.value)}
                                  className={cn(
                                      'text-left rounded-xl border p-4 transition-colors',
                                      active
                                          ? 'border-primary/60 bg-primary/5 shadow-md shadow-primary/10'
                                          : 'border-border/60 bg-card hover:bg-accent/20',
                                  )}
                              >
                                  <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-semibold flex items-center gap-1.5">
                                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          {slot.title}
                                      </p>
                                      <Badge variant={slot.isCustomized ? 'success' : 'outline'} className="shrink-0 text-[10px]">
                                          {slot.isCustomized ? 'Customized' : 'Default'}
                                      </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-2">
                                      {slot.updatedAt ? `Updated ${formatDate(slot.updatedAt)}` : 'Never edited'}
                                      {slot.updatedBy ? ` · ${slot.updatedBy}` : ''}
                                  </p>
                              </button>
                          );
                      })}
            </div>

            {/* 2 — Editor */}
            <Card className="border-none shadow-lg shadow-black/5">
                <CardHeader className="bg-transparent border-none flex flex-row items-center justify-between flex-wrap gap-3">
                    <div>
                        <h3 className="font-bold flex items-center gap-2">
                            {templateTypeLabel(selectedType)}
                            {template && (
                                <Badge variant={template.is_customized ? 'success' : 'outline'} className="text-[10px]">
                                    {template.is_customized ? 'Customized' : 'Default (auto-seeded)'}
                                </Badge>
                            )}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Semantic HTML — headings, paragraphs, bold, lists. Merge fields like{' '}
                            <code className="font-mono">{'{{holder_name}}'}</code> are substituted per-holder when generated.
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        disabled={!isDirty || templateLoading || saveTemplate.isPending}
                        onClick={() => saveTemplate.mutate({ docType: selectedType, bodyHtml })}
                    >
                        {saveTemplate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save Template
                    </Button>
                </CardHeader>
                <CardContent className="pt-0">
                    {templateLoading ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
                            <Loader2 className="h-5 w-5 animate-spin" /> Loading template…
                        </div>
                    ) : templateError ? (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load this template. Check your connection and try again.
                        </div>
                    ) : (
                        <RichTextEditor
                            id={`template-editor-${selectedType}`}
                            value={bodyHtml}
                            onChange={setBodyHtml}
                            placeholder="Template body…"
                        />
                    )}
                </CardContent>
            </Card>

            {/* 3 — Preview for holder */}
            <Card className="border-none shadow-lg shadow-black/5">
                <CardHeader className="bg-transparent border-none">
                    <h3 className="font-bold flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" /> Preview for Holder
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Merges the currently saved/seeded template above with one real holder&apos;s data.
                    </p>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <SearchableCombobox
                            options={holderOptions}
                            value={previewHolderId}
                            onChange={setPreviewHolderId}
                            placeholder="Select a holder…"
                            searchPlaceholder="Search holders…"
                            emptyText="No holders found."
                            className="w-full sm:max-w-xs"
                            clearable
                        />
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5 shrink-0"
                            disabled={!previewHolderId || preview.isPending}
                            onClick={() => preview.mutate({ docType: selectedType, holderId: previewHolderId })}
                        >
                            {preview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            {preview.data ? 'Refresh Preview' : 'Preview'}
                        </Button>
                    </div>

                    {preview.isError && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" /> Failed to render preview. Check your connection and try again.
                        </div>
                    )}

                    {preview.data && (
                        <div className="rounded-xl border border-border/60 bg-background p-6 max-h-128 overflow-y-auto">
                            {/* Trusted content: the platform's own saved template merged with this
                                platform's own holder data (no third-party/user-supplied input).
                                No typography plugin in this project, so heading/list/paragraph
                                spacing for the generated HTML is applied explicitly here. */}
                            <div
                                className={cn(
                                    'text-sm leading-relaxed',
                                    '[&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:first:mt-0',
                                    '[&_p]:my-2',
                                    '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2',
                                    '[&_li]:my-1',
                                    '[&_b]:font-semibold [&_strong]:font-semibold',
                                )}
                                dangerouslySetInnerHTML={{ __html: preview.data.merged_html }}
                            />
                        </div>
                    )}

                    {!preview.data && !preview.isPending && !preview.isError && (
                        <p className="text-xs text-muted-foreground">
                            Pick a holder and click Preview to see the merged document.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
