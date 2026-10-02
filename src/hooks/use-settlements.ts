import * as settlementsApi from '@/lib/api/settlements';
import { useQuery } from '@tanstack/react-query';

export function useSettlements(tenantSlug: string, params?: settlementsApi.ListSettlementsParams, enabled = true) {
    return useQuery({
        queryKey: ['settlements', tenantSlug, params],
        queryFn: () => settlementsApi.listSettlements(tenantSlug, params),
        enabled: !!tenantSlug && enabled,
    });
}
