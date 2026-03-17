import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { partnerService } from '../api/services/partner.service';
import type { PartnerPost, PartnerCategory } from '../types';

const PAGE_LIMIT = 20;

export type PartnerPage = { items: PartnerPost[]; page: number; hasMore: boolean };
export type PartnerInfiniteData = InfiniteData<PartnerPage>;

export function usePartners(category?: PartnerCategory) {
  return useInfiniteQuery<PartnerPage, Error, PartnerInfiniteData, (string | undefined)[], number>({
    queryKey: ['partners', category],
    queryFn: async ({ pageParam }) => {
      const items = await partnerService.getList(category || undefined, { page: pageParam, limit: PAGE_LIMIT });
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 30 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function flattenPartnerPages(data: PartnerInfiniteData | undefined): PartnerPost[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.items);
}

export function useMyPartners(category?: PartnerCategory) {
  return useQuery({
    queryKey: ['partners', 'all', category],
    queryFn: () => partnerService.getList(category || undefined, { includeExpired: true }),
    refetchInterval: 2 * 60 * 1000,
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['partner', variables.id] });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => partnerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'all'] });
    },
  });
}

export function useClosePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => partnerService.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['partner'] });
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
