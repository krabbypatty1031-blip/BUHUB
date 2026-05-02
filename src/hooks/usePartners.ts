import { useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { partnerService } from '../api/services/partner.service';
import type { PartnerPost, PartnerCategory } from '../types';

const PAGE_LIMIT = 20;
const MY_MAX_PAGES = 10; // safety cap: 10 pages × 20 = 200 items per category

export type PartnerPage = { items: PartnerPost[]; page: number; hasMore: boolean };
export type PartnerInfiniteData = InfiniteData<PartnerPage>;

export function usePartners(category?: PartnerCategory) {
  return useInfiniteQuery<PartnerPage, Error, PartnerInfiniteData, (string | undefined)[], number>({
    queryKey: ['partners', category],
    queryFn: async ({ pageParam }) => {
      const items = await partnerService.getList(category || undefined, { page: pageParam, limit: PAGE_LIMIT, includeExpired: true });
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyPartners(category?: PartnerCategory, enabled = true) {
  const query = useInfiniteQuery<PartnerPage, Error, PartnerPost[], (string | undefined)[], number>({
    queryKey: ['partners', 'all', category],
    queryFn: async ({ pageParam }) => {
      const items = await partnerService.getList(category || undefined, { page: pageParam, limit: PAGE_LIMIT, includeExpired: true, mine: true });
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.page < MY_MAX_PAGES ? lastPage.page + 1 : undefined,
    select: (data) => data.pages.flatMap((p) => p.items),
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  return query;
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
