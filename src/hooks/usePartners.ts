import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerService } from '../api/services/partner.service';
import type { PartnerPost, PartnerCategory } from '../types';

export function usePartners(category?: PartnerCategory) {
  return useQuery({
    queryKey: ['partners', category],
    queryFn: () => partnerService.getList(category || undefined),
  });
}

export function usePartnerDetail(id: string) {
  return useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnerService.getDetail(id),
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: Omit<PartnerPost, 'id' | 'user' | 'avatar' | 'gender' | 'bio' | 'expired'>) =>
      partnerService.create(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useEditPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, post }: { id: string; post: Partial<PartnerPost> }) =>
      partnerService.edit(id, post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => partnerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useJoinPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => partnerService.join(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}
