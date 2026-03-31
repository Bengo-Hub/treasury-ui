import * as settlementsApi from '@/lib/api/settlements';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useSettlements(tenantSlug: string, params?: settlementsApi.ListSettlementsParams, enabled = true) {
    return useQuery({
        queryKey: ['settlements', tenantSlug, params],
        queryFn: () => settlementsApi.listSettlements(tenantSlug, params),
        enabled: !!tenantSlug && enabled,
    });
}

export function usePayouts(tenantSlug: string, params?: { page?: number; per_page?: number; status?: string }) {
    return useQuery({
        queryKey: ['payouts', tenantSlug, params],
        queryFn: () => settlementsApi.listPayouts(tenantSlug, params),
        enabled: !!tenantSlug,
    });
}

export function useCreatePayout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tenantSlug, data }: { tenantSlug: string; data: settlementsApi.CreatePayoutRequest }) =>
            settlementsApi.createPayout(tenantSlug, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['payouts', variables.tenantSlug] });
            queryClient.invalidateQueries({ queryKey: ['platform-balance'] });
            toast.success('Payout initiated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to initiate payout');
        },
    });
}

export function usePlatformBalance() {
    return useQuery({
        queryKey: ['platform-balance'],
        queryFn: settlementsApi.getPlatformBalance,
    });
}

export function useBanks(country?: string) {
    return useQuery({
        queryKey: ['banks', country],
        queryFn: () => settlementsApi.listBanks(country),
    });
}

export function useCreateTransferRecipient() {
    return useMutation({
        mutationFn: settlementsApi.createTransferRecipient,
        onSuccess: () => {
            toast.success('Transfer recipient created');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create recipient');
        },
    });
}
