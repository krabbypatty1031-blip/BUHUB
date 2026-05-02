import { useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { errandService } from '../api/services/errand.service';
import type { Errand, ErrandCategory } from '../types';

const PAGE_LIMIT = 20;
const MY_MAX_PAGES = 10; // safety cap: 10 pages × 20 = 200 items per category

export type ErrandPage = { items: Errand[]; page: number; hasMore: boolean };
export type ErrandInfiniteData = InfiniteData<ErrandPage>;

export function useErrands(category?: ErrandCategory) {
  return useInfiniteQuery<ErrandPage, Error, ErrandInfiniteData, (string | undefined)[], number>({
    queryKey: ['errands', category],
    queryFn: async ({ pageParam }) => {
      const items = await errandService.getList(category || undefined, { page: pageParam, limit: PAGE_LIMIT, includeExpired: true });
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyErrands(category?: ErrandCategory, enabled = true) {
  const query = useInfiniteQuery<ErrandPage, Error, Errand[], (string | undefined)[], number>({
    queryKey: ['errands', 'all', category],
    queryFn: async ({ pageParam }) => {
      const items = await errandService.getList(category || undefined, { page: pageParam, limit: PAGE_LIMIT, includeExpired: true, mine: true });
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

export function useErrandDetail(id: string) {
  return useQuery({
    queryKey: ['errand', id],
    queryFn: () => errandService.getDetail(id),
  });
}

export function useCreateErrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (errand: Omit<Errand, 'id' | 'user' | 'avatar' | 'gender' | 'bio' | 'expired'>) =>
      errandService.create(errand),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errands'] });
    },
  });
}

export function useEditErrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, errand }: { id: string; errand: Partial<Errand> }) =>
      errandService.edit(id, errand),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['errands'] });
      queryClient.invalidateQueries({ queryKey: ['errands', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['errand', variables.id] });
    },
  });
}

export function useDeleteErrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => errandService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errands'] });
      queryClient.invalidateQueries({ queryKey: ['errands', 'all'] });
    },
  });
}

export function useCloseErrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => errandService.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errands'] });
      queryClient.invalidateQueries({ queryKey: ['errands', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['errand'] });
    },
  });
}

export function useAcceptErrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => errandService.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errands'] });
    },
  });
}
