import { useQuery } from '@tanstack/react-query';
import { partnerService } from '../api/services/partner.service';
import type { PartnerCategory } from '../types';

export function usePartners(category?: PartnerCategory) {
  return useQuery({
    queryKey: ['partners', category],
    queryFn: () => partnerService.getList(category || undefined),
  });
}

export function usePartnerDetail(id: string) {
  return useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnerService.getDetail(id),
  });
}
