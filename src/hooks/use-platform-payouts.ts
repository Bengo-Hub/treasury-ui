import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/lib/api/client';

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
      const data = await api.get<{ banks: PaystackBank[]; country: string }>(`/platform/payouts/banks?country=${country}`);
      return data;
    },
  });
}

export function usePlatformBalance() {
  return useQuery({
    queryKey: ['platform_balance'],
    queryFn: async () => {
      const data = await api.get<PlatformBalance[]>('/platform/balance');
      return data;
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
      const data = await api.post('/platform/payouts/recipients', req);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform_recipients'] });
    },
  });
}
