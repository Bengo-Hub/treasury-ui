import * as equityApi from '@/lib/api/equity';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useEquityEntitlements(holderId: string) {
    return useQuery({
        queryKey: ['equity-entitlements', holderId],
        queryFn: () => equityApi.listEntitlements(holderId),
        enabled: !!holderId,
    });
}

export function useCreateEntitlement(holderId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: equityApi.CreateEntitlementRequest) =>
            equityApi.createEntitlement(holderId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equity-entitlements', holderId] });
            toast.success('Entitlement created');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create entitlement');
        },
    });
}

export function useUpdateEntitlement(holderId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<equityApi.CreateEntitlementRequest> }) =>
            equityApi.updateEntitlement(holderId, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equity-entitlements', holderId] });
            toast.success('Entitlement updated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update entitlement');
        },
    });
}

export function useDeactivateEntitlement(holderId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (entitlementId: string) =>
            equityApi.deactivateEntitlement(holderId, entitlementId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equity-entitlements', holderId] });
            toast.success('Entitlement deactivated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to deactivate entitlement');
        },
    });
}

export function useGeneratePortalLink() {
    return useMutation({
        mutationFn: (holderId: string) => equityApi.generatePortalLink(holderId),
        onSuccess: (data) => {
            navigator.clipboard.writeText(data.url).catch(() => {});
            toast.success('Portal link copied to clipboard');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to generate portal link');
        },
    });
}
