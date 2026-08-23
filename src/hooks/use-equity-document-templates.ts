import * as templatesApi from '@/lib/api/equity-document-templates';
import type { EquityDocumentTemplateType } from '@/lib/api/equity-document-templates';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const LIST_KEY = ['equity-document-templates'] as const;
const detailKey = (docType: string) => ['equity-document-templates', docType] as const;

/** All 4 templates with customization/last-updated status, for the picker. */
export function useEquityDocumentTemplates() {
    return useQuery({
        queryKey: LIST_KEY,
        queryFn: () => templatesApi.listEquityDocumentTemplates(),
        staleTime: 60_000,
    });
}

/** One template's full body_html. Auto-seeds on the backend if nothing's saved yet. */
export function useEquityDocumentTemplate(docType: EquityDocumentTemplateType | string, enabled = true) {
    return useQuery({
        queryKey: detailKey(docType),
        queryFn: () => templatesApi.getEquityDocumentTemplate(docType),
        enabled: !!docType && enabled,
        staleTime: 30_000,
    });
}

/** Save edited template HTML. Invalidates both the list (badge/updated-at) and the detail query. */
export function useSaveEquityDocumentTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ docType, bodyHtml }: { docType: EquityDocumentTemplateType | string; bodyHtml: string }) =>
            templatesApi.saveEquityDocumentTemplate(docType, bodyHtml),
        onSuccess: (_res, { docType }) => {
            queryClient.invalidateQueries({ queryKey: LIST_KEY });
            queryClient.invalidateQueries({ queryKey: detailKey(docType) });
            toast.success(`${templatesApi.templateTypeLabel(docType)} template saved`);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to save template');
        },
    });
}

/**
 * Merge the current template with one holder's real data. Manually triggered
 * (via `.mutate`) rather than an automatic query since it depends on a
 * user-picked holder — mirrors this page's existing Run/Preview Payout
 * dry-run pattern (`useRunEquityPayout`) for a button-triggered computation.
 */
export function usePreviewEquityDocumentTemplate() {
    return useMutation({
        mutationFn: ({ docType, holderId }: { docType: EquityDocumentTemplateType | string; holderId: string }) =>
            templatesApi.previewEquityDocumentTemplate(docType, holderId),
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to render preview');
        },
    });
}
