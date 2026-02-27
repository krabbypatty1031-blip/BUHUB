import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { errandService } from '../api/services/errand.service';
import type { Errand, ErrandCategory } from '../types';

export function useErrands(category?: ErrandCategory) {
  return useQuery({
    queryKey: ['errands', category],
    queryFn: () => errandService.getList(category || undefined),
  });
}
export function useMyErrands(category?: ErrandCategory) {
  return useQuery({
    queryKey: ['errands', 'all', category],
    queryFn: () => errandService.getList(category || undefined, { includeExpired: true }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errands'] });
    },
  });
}

export function useDeleteErrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => errandService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errands'] });
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
