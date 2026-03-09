import * as equityApi from '@/lib/api/equity';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useEquityHolders() {
    return useQuery({
        queryKey: ['equity-holders'],
        queryFn: equityApi.listEquityHolders,
    });
}

export function useEquitySummary(from?: string, to?: string) {
    return useQuery({
        queryKey: ['equity-summary', from, to],
        queryFn: () => equityApi.getEquitySummary({ from, to }),
    });
}

export function useHolderPayouts(holderId: string) {
    return useQuery({
        queryKey: ['equity-payouts', holderId],
        queryFn: () => equityApi.getHolderPayouts(holderId),
        enabled: !!holderId,
    });
}

export function useCreateEquityHolder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: equityApi.createEquityHolder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equity-holders'] });
            toast.success('Equity holder created successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create equity holder');
        },
    });
}

export function useUpdateEquityHolder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<equityApi.CreateEquityHolderRequest> }) =>
            equityApi.updateEquityHolder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equity-holders'] });
            toast.success('Equity holder updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update equity holder');
        },
    });
}

export function useTriggerEquityPayout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ holderId, data }: { holderId: string; data: equityApi.TriggerPayoutRequest }) =>
            equityApi.triggerEquityPayout(holderId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['equity-payouts', variables.holderId] });
            queryClient.invalidateQueries({ queryKey: ['equity-summary'] });
            toast.success('Payout triggered successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to trigger payout');
        },
    });
}
