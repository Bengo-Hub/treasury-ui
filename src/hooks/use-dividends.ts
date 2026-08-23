import * as dividendsApi from '@/lib/api/dividends';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/** Extracts the backend's own error string (respondError's `{"error": "..."}` body)
 *  so a 400/409 rejection — e.g. the dividend ceiling breakdown — reaches the user
 *  verbatim instead of a generic axios message. Exported so callers that need to
 *  render the message inline (not just as a toast) can reuse the same extraction. */
export function backendErrorMessage(error: any, fallback: string): string {
    return error?.response?.data?.error || error?.message || fallback;
}

export function useDividendDeclarations(umbrellaId: string) {
    return useQuery({
        queryKey: ['dividend-declarations', umbrellaId],
        queryFn: () => dividendsApi.listDividendDeclarations(umbrellaId),
        enabled: !!umbrellaId,
    });
}

export function useDividendDeclaration(umbrellaId: string, declId: string) {
    return useQuery({
        queryKey: ['dividend-declaration', umbrellaId, declId],
        queryFn: () => dividendsApi.getDividendDeclaration(umbrellaId, declId),
        enabled: !!umbrellaId && !!declId,
    });
}

export function useDeclareDividend(umbrellaId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: dividendsApi.DeclareDividendRequest) => dividendsApi.declareDividend(umbrellaId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dividend-declarations', umbrellaId] });
            toast.success('Dividend declared as a draft — approve it to move toward payment');
        },
        onError: (error: any) => {
            // Intentionally NOT toast-only: the ceiling-rejection message is long and
            // information-dense (cumulative net profit, already declared, accrued
            // obligations) — the caller also renders it as a persistent inline alert
            // so it doesn't disappear with the toast before it can be read.
            toast.error(backendErrorMessage(error, 'Failed to declare dividend'));
        },
    });
}

export function useApproveDividendDeclaration(umbrellaId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (declId: string) => dividendsApi.approveDividendDeclaration(umbrellaId, declId),
        onSuccess: (_, declId) => {
            queryClient.invalidateQueries({ queryKey: ['dividend-declarations', umbrellaId] });
            queryClient.invalidateQueries({ queryKey: ['dividend-declaration', umbrellaId, declId] });
            toast.success('Declaration approved');
        },
        onError: (error: any) => {
            toast.error(backendErrorMessage(error, 'Failed to approve declaration'));
        },
    });
}

export function usePayDividendDeclaration(umbrellaId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (declId: string) => dividendsApi.payDividendDeclaration(umbrellaId, declId),
        onSuccess: (res, declId) => {
            queryClient.invalidateQueries({ queryKey: ['dividend-declarations', umbrellaId] });
            queryClient.invalidateQueries({ queryKey: ['dividend-declaration', umbrellaId, declId] });
            // Each shareholder gets a real EquityPayout row — refresh their payout
            // history views too (matches any ['equity-payouts', holderId] query).
            queryClient.invalidateQueries({ queryKey: ['equity-payouts'] });
            const paid = res.results.filter((r) => !r.skipped).length;
            const skipped = res.results.length - paid;
            toast.success(
                skipped > 0
                    ? `Dividend paid to ${paid} shareholder(s) — ${skipped} skipped (see results)`
                    : `Dividend paid to ${paid} shareholder(s)`,
            );
        },
        onError: (error: any) => {
            toast.error(backendErrorMessage(error, 'Failed to pay declaration'));
        },
    });
}

export function useCancelDividendDeclaration(umbrellaId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (declId: string) => dividendsApi.cancelDividendDeclaration(umbrellaId, declId),
        onSuccess: (_, declId) => {
            queryClient.invalidateQueries({ queryKey: ['dividend-declarations', umbrellaId] });
            queryClient.invalidateQueries({ queryKey: ['dividend-declaration', umbrellaId, declId] });
            toast.success('Declaration cancelled');
        },
        onError: (error: any) => {
            toast.error(backendErrorMessage(error, 'Failed to cancel declaration'));
        },
    });
}
