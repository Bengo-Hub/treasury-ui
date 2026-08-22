import * as docsApi from '@/lib/api/equity-documents';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Stored documents for an equity holder.
 *
 * `retry: false` is deliberate: the Agreements panel fans this query out across
 * every holder to render real per-holder KYC badges, so a missing/forbidden
 * endpoint must fail once rather than N × retries hammering the API.
 */
export function useHolderDocuments(holderId: string, enabled = true) {
    return useQuery({
        queryKey: ['equity-holder-documents', holderId],
        queryFn: () => docsApi.listHolderDocuments(holderId),
        enabled: !!holderId && enabled,
        staleTime: 60_000,
        retry: false,
    });
}

export function useGenerateHolderDocument(holderId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (docType: string) => docsApi.generateHolderDocument(holderId, docType),
        onSuccess: (_res, docType) => {
            queryClient.invalidateQueries({ queryKey: ['equity-holder-documents', holderId] });
            toast.success(`${docsApi.documentTypeLabel(docType)} generated and saved`);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to generate document');
        },
    });
}

export function useUploadHolderDocument(holderId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file, docType, description }: { file: File; docType: string; description?: string }) =>
            docsApi.uploadHolderDocument(holderId, file, docType, description),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equity-holder-documents', holderId] });
            toast.success('Document uploaded');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to upload document');
        },
    });
}

export function useDeleteHolderDocument(holderId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (docId: string) => docsApi.deleteHolderDocument(holderId, docId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equity-holder-documents', holderId] });
            toast.success('Document deleted');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to delete document');
        },
    });
}

/** Opens a stored document's presigned URL in a new tab (non-PDF download path). */
export function useDownloadHolderDocument(holderId: string) {
    return useMutation({
        mutationFn: (docId: string) => docsApi.getHolderDocumentUrl(holderId, docId),
        onSuccess: (res) => {
            if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || error?.message || 'Failed to get download link');
        },
    });
}
