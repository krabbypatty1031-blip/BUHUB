import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { secondhandService } from '../api/services/secondhand.service';
import type { SecondhandItem, SecondhandCategory } from '../types';

const PAGE_LIMIT = 20;

export type SecondhandPage = { items: SecondhandItem[]; page: number; hasMore: boolean };
export type SecondhandInfiniteData = InfiniteData<SecondhandPage>;

export function useSecondhand(category?: SecondhandCategory) {
  return useInfiniteQuery<SecondhandPage, Error, SecondhandInfiniteData, (string | undefined)[], number>({
    queryKey: ['secondhand', category],
    queryFn: async ({ pageParam }) => {
      const items = await secondhandService.getList(category || undefined, { page: pageParam, limit: PAGE_LIMIT });
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 30 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function flattenSecondhandPages(data: SecondhandInfiniteData | undefined): SecondhandItem[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.items);
}

export function useMySecondhand(category?: SecondhandCategory) {
  return useQuery({
    queryKey: ['secondhand', 'all', category],
    queryFn: () => secondhandService.getList(category || undefined, { includeExpired: true }),
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useWantedSecondhand() {
  return useQuery({
    queryKey: ['secondhand', 'wanted'],
    queryFn: () => secondhandService.getList(undefined, { includeExpired: true }),
    select: (items: SecondhandItem[]) => items.filter((item) => item.isWanted),
  });
}

export function useSecondhandDetail(id: string) {
  return useQuery({
    queryKey: ['secondhandItem', id],
    queryFn: () => secondhandService.getDetail(id),
  });
}

export function useCreateSecondhand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: Omit<SecondhandItem, 'id' | 'user' | 'avatar' | 'gender' | 'bio' | 'sold'>) =>
      secondhandService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondhand'] });
    },
  });
}

export function useEditSecondhand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, item }: { id: string; item: Partial<SecondhandItem> }) =>
      secondhandService.edit(id, item),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['secondhand'] });
      queryClient.invalidateQueries({ queryKey: ['secondhand', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['secondhandItem', variables.id] });
    },
  });
}

export function useDeleteSecondhand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => secondhandService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondhand'] });
      queryClient.invalidateQueries({ queryKey: ['secondhand', 'all'] });
    },
  });
}

export function useCloseSecondhand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => secondhandService.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondhand'] });
      queryClient.invalidateQueries({ queryKey: ['secondhand', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['secondhandItem'] });
    },
  });
}

export function useWantSecondhand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; currentWanted: boolean }) => secondhandService.want(id),
    onMutate: async ({ id, currentWanted }) => {
      const nextWanted = !currentWanted;

      await queryClient.cancelQueries({ queryKey: ['secondhand'] });
      await queryClient.cancelQueries({ queryKey: ['secondhandItem', id] });

      const previousSecondhandQueries = queryClient.getQueriesData<SecondhandInfiniteData | SecondhandItem[]>({
        queryKey: ['secondhand'],
      });
      const previousDetail = queryClient.getQueryData<SecondhandItem>(['secondhandItem', id]);

      // Update list caches (both infinite and plain arrays)
      for (const [queryKey, data] of previousSecondhandQueries) {
        if (!data) continue;
        if (Array.isArray(data)) {
          // Plain array (useMySecondhand, useWantedSecondhand)
          queryClient.setQueryData<SecondhandItem[]>(
            queryKey,
            data.map((item) => (item.id === id ? { ...item, isWanted: nextWanted } : item))
          );
        } else if ('pages' in data) {
          // InfiniteData (useSecondhand)
          queryClient.setQueryData<SecondhandInfiniteData>(queryKey, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => (item.id === id ? { ...item, isWanted: nextWanted } : item)),
            })),
          });
        }
      }

      if (previousDetail) {
        queryClient.setQueryData<SecondhandItem>(['secondhandItem', id], {
          ...previousDetail,
          isWanted: nextWanted,
        });
      }

      return { previousSecondhandQueries, previousDetail };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondhand'] });
      queryClient.invalidateQueries({ queryKey: ['secondhand', 'wanted'], exact: true });
    },
    onError: (_error, variables, context) => {
      context?.previousSecondhandQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousDetail) {
        queryClient.setQueryData(['secondhandItem', variables.id], context.previousDetail);
      }
    },
  });
}
