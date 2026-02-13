import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { secondhandService } from '../api/services/secondhand.service';
import { useSecondhandStore } from '../store/secondhandStore';
import type { SecondhandItem, SecondhandCategory } from '../types';

export function useSecondhand(category?: SecondhandCategory) {
  return useQuery({
    queryKey: ['secondhand', category],
    queryFn: () => secondhandService.getList(category || undefined),
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
    mutationFn: (item: Omit<SecondhandItem, 'user' | 'avatar' | 'gender' | 'bio' | 'sold'>) =>
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondhand'] });
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

export function useWantSecondhand() {
  const queryClient = useQueryClient();
  const toggleWant = useSecondhandStore((s) => s.toggleWant);
  return useMutation({
    mutationFn: (id: string) => secondhandService.want(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondhand'] });
    },
    onError: (_error, id) => {
      // Reverse the optimistic toggle on failure
      toggleWant(Number(id));
    },
  });
}
