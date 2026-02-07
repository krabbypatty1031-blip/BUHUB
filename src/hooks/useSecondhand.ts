import { useQuery } from '@tanstack/react-query';
import { secondhandService } from '../api/services/secondhand.service';
import type { SecondhandCategory } from '../types';

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
