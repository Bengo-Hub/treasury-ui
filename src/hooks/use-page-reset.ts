'use client';

import { useCallback, useState } from 'react';

/**
 * Page number that goes back to 1 whenever `resetKey` (the list's filters) changes, without a
 * setState-in-effect: the page is stored with the key it was set under and read as 1 once the key
 * differs. Use for any server-paged list whose filters change the result set.
 */
export function usePageReset(resetKey: unknown): [number, (page: number) => void] {
  const key = JSON.stringify(resetKey);
  const [state, setState] = useState<{ key: string; page: number }>({ key, page: 1 });
  const page = state.key === key ? state.page : 1;
  const setPage = useCallback((p: number) => setState({ key, page: p }), [key]);
  return [page, setPage];
}
