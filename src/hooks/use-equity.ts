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
            // Projected payouts + Total Allocated are derived server-side from holder %/allocation,
            // so refresh the summary too — the new holder's projection renders immediately.
            queryClient.invalidateQueries({ queryKey: ['equity-summary'] });
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
            // A %-share / allocation-affecting edit changes projected payouts (computed server-side),
            // so invalidate the summary — per-holder "Projected Payout" + Total Allocated recompute.
            queryClient.invalidateQueries({ queryKey: ['equity-summary'] });
            toast.success('Equity holder updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update equity holder');
        },
    });
}

export function useEquitySchedule() {
    return useQuery({
        queryKey: ['equity-schedule'],
        queryFn: equityApi.getEquitySchedule,
    });
}

export function useUpdateEquitySchedule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: equityApi.EquityPayoutSchedule) => equityApi.updateEquitySchedule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equity-schedule'] });
            queryClient.invalidateQueries({ queryKey: ['equity-summary'] });
            toast.success('Payout schedule updated for all holders');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update payout schedule');
        },
    });
}

export function useEquityPolicy() {
    return useQuery({
        queryKey: ['equity-policy'],
        queryFn: equityApi.getEquityPolicy,
    });
}

export function useUpdateEquityPolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: equityApi.UpdateEquityPolicyRequest) => equityApi.updateEquityPolicy(data),
        onSuccess: () => {
            // Refresh the policy plus everything whose projected payouts depend on it.
            queryClient.invalidateQueries({ queryKey: ['equity-policy'] });
            queryClient.invalidateQueries({ queryKey: ['equity-summary'] });
            queryClient.invalidateQueries({ queryKey: ['equity-schedule'] });
            toast.success('Platform retention updated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update platform retention');
        },
    });
}

export function useRunEquityPayout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: equityApi.RunPayoutRequest) => equityApi.runEquityPayout(data),
        onSuccess: (res) => {
            if (!res.dry_run) {
                queryClient.invalidateQueries({ queryKey: ['equity-summary'] });
                queryClient.invalidateQueries({ queryKey: ['equity-payouts'] });
                const paid = res.results.filter((r) => r.payout_id).length;
                toast.success(`Payout run complete — ${paid} holder(s) paid`);
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to run payout');
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
