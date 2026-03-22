import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/lib/api/client';

const BASE = '/api/v1';

export interface PaystackBank {
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string;
  pay_with_bank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformBalance {
  currency: string;
  balance: number;
}

export function usePlatformBanks(country = 'kenya') {
  return useQuery({
    queryKey: ['platform_banks', country],
    queryFn: async () => {
      return api.get<{ banks: PaystackBank[]; country: string }>(`${BASE}/platform/payouts/banks`, { country });
    },
  });
}

export function usePlatformBalance() {
  return useQuery({
    queryKey: ['platform_balance'],
    queryFn: async () => {
      return api.get<PlatformBalance[]>(`${BASE}/platform/balance`);
    },
  });
}

export interface CreateRecipientRequest {
  type: string; // 'nuban' | 'mobile_money'
  name: string;
  account_number: string;
  bank_code: string;
  currency: string;
}

export function useCreatePlatformRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: CreateRecipientRequest) => {
      return api.post(`${BASE}/platform/payouts/recipients`, req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform_recipients'] });
    },
  });
}
