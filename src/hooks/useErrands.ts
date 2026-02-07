import { useQuery } from '@tanstack/react-query';
import { errandService } from '../api/services/errand.service';
import type { ErrandCategory } from '../types';

export function useErrands(category?: ErrandCategory) {
  return useQuery({
    queryKey: ['errands', category],
    queryFn: () => errandService.getList(category || undefined),
  });
}

export function useErrandDetail(id: string) {
  return useQuery({
    queryKey: ['errand', id],
    queryFn: () => errandService.getDetail(id),
  });
}
