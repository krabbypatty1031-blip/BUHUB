import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { errandService } from '../api/services/errand.service';
import type { Errand, ErrandCategory } from '../types';

const PAGE_LIMIT = 20;

export type ErrandPage = { items: Errand[]; page: number; hasMore: boolean };
export type ErrandInfiniteData = InfiniteData<ErrandPage>;

export function useErrands(category?: ErrandCategory) {
  return useInfiniteQuery<ErrandPage, Error, ErrandInfiniteData, (string | undefined)[], number>({
    queryKey: ['errands', category],
    queryFn: async ({ pageParam }) => {
      const items = await errandService.getList(category || undefined, { page: pageParam, limit: PAGE_LIMIT });
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 30 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function flattenErrandPages(data: ErrandInfiniteData | undefined): Errand[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.items);
}

export function useMyErrands(category?: ErrandCategory) {
  return useQuery({
    queryKey: ['errands', 'all', category],
    queryFn: () => errandService.getList(category || undefined, { includeExpired: true }),
    refetchInterval: 2 * 60 * 1000,
  });
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
