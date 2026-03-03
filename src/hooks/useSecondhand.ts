import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { secondhandService } from '../api/services/secondhand.service';
import type { SecondhandItem, SecondhandCategory } from '../types';

export function useSecondhand(category?: SecondhandCategory) {
  return useQuery({
    queryKey: ['secondhand', category],
    queryFn: () => secondhandService.getList(category || undefined),
  });
}

export function useMySecondhand(category?: SecondhandCategory) {
  return useQuery({
    queryKey: ['secondhand', 'all', category],
    queryFn: () => secondhandService.getList(category || undefined, { includeExpired: true }),
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

      const previousSecondhandQueries = queryClient.getQueriesData<SecondhandItem[]>({
        queryKey: ['secondhand'],
      });
      const previousDetail = queryClient.getQueryData<SecondhandItem>(['secondhandItem', id]);

      for (const [queryKey, data] of previousSecondhandQueries) {
        if (!Array.isArray(data)) continue;
        queryClient.setQueryData<SecondhandItem[]>(
          queryKey,
          data.map((item) => (item.id === id ? { ...item, isWanted: nextWanted } : item))
        );
      }

      if (previousDetail) {
        queryClient.setQueryData<SecondhandItem>(['secondhandItem', id], {
          ...previousDetail,
          isWanted: nextWanted,
        });
      }

      const previousWanted = queryClient.getQueryData<SecondhandItem[]>(['secondhand', 'wanted']);
      if (previousWanted) {
        const wantedSource = previousDetail
          ?? previousSecondhandQueries.flatMap(([, data]) => (Array.isArray(data) ? data : [])).find((item) => item.id === id);
        queryClient.setQueryData<SecondhandItem[]>(
          ['secondhand', 'wanted'],
          nextWanted
            ? wantedSource
              ? [{ ...wantedSource, isWanted: true }, ...previousWanted.filter((item) => item.id !== id)]
              : previousWanted
            : previousWanted.filter((item) => item.id !== id)
        );
      }

      return { previousSecondhandQueries, previousDetail, previousWanted };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondhand'] });
      queryClient.invalidateQueries({ queryKey: ['secondhand', 'wanted'] });
    },
    onError: (_error, variables, context) => {
      context?.previousSecondhandQueries?.forEach(([queryKey, data]: [readonly unknown[], SecondhandItem[] | undefined]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousDetail) {
        queryClient.setQueryData(['secondhandItem', variables.id], context.previousDetail);
      }
      if (context?.previousWanted) {
        queryClient.setQueryData(['secondhand', 'wanted'], context.previousWanted);
      }
    },
  });
}
