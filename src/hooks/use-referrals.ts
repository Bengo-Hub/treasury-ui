import * as referralsApi from '@/lib/api/referrals';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useReferralPrograms() {
  return useQuery({
    queryKey: ['referral-programs'],
    queryFn: referralsApi.listPrograms,
  });
}

export function useCreateReferralProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: referralsApi.createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-programs'] });
      toast.success('Referral program created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create referral program');
    },
  });
}

export function useUpdateReferralProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<referralsApi.CreateReferralProgramRequest> & { is_active?: boolean } }) =>
      referralsApi.updateProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-programs'] });
      toast.success('Referral program updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update referral program');
    },
  });
}

export function useDeleteReferralProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: referralsApi.deleteProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-programs'] });
      toast.success('Referral program deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete referral program');
    },
  });
}

export function useReferrals() {
  return useQuery({
    queryKey: ['referrals'],
    queryFn: referralsApi.listReferrals,
  });
}

export function useCreateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: referralsApi.createReferral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success('Referral created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create referral');
    },
  });
}

export function useUpdateReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<referralsApi.CreateReferralRequest> & { status?: string } }) =>
      referralsApi.updateReferral(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success('Referral updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update referral');
    },
  });
}

export function useReferralRewards(referralId: string) {
  return useQuery({
    queryKey: ['referral-rewards', referralId],
    queryFn: () => referralsApi.listRewards(referralId),
    enabled: !!referralId,
  });
}

export function useIssueReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ referralId, data }: { referralId: string; data: referralsApi.IssueRewardRequest }) =>
      referralsApi.issueReward(referralId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['referral-rewards', variables.referralId] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success('Reward issued successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to issue reward');
    },
  });
}
