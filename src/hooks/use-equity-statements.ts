import * as statementsApi from '@/lib/api/equity-statements';
import { useQuery } from '@tanstack/react-query';

/**
 * A holder's account statement for a date range. Mirrors `useEquitySummary`'s
 * from/to query-key convention (lib/hooks/use-equity.ts) so the same holder
 * with a different range is cached separately rather than clobbering itself.
 */
export function useEquityHolderStatement(holderId: string, from?: string, to?: string) {
    return useQuery({
        queryKey: ['equity-holder-statement', holderId, from, to],
        queryFn: () => statementsApi.getHolderStatement(holderId, { from, to }),
        enabled: !!holderId,
        staleTime: 60_000,
    });
}
