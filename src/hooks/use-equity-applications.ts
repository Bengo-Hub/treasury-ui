import * as appsApi from '@/lib/api/equity-applications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useEquityApplications() {
    return useQuery({
        queryKey: ['equity-applications'],
        queryFn: appsApi.listEquityApplications,
        staleTime: 60 * 1000,
    });
}

export function useUpdateEquityApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: appsApi.UpdateEquityApplicationRequest }) =>
            appsApi.updateEquityApplication(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equity-applications'] });
            toast.success('Application updated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update application');
        },
    });
}
