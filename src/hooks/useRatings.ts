import { useQuery, useMutation } from '@tanstack/react-query';
import { ratingService } from '../api/services/rating.service';
import type { RatingCategory } from '../types';

export function useRatings(category: RatingCategory) {
  return useQuery({
    queryKey: ['ratings', category],
    queryFn: () => ratingService.getList(category),
  });
}

export function useRatingDetail(category: RatingCategory, id: string) {
  return useQuery({
    queryKey: ['rating', category, id],
    queryFn: () => ratingService.getDetail(category, id),
  });
}

export function useSubmitRating(category: RatingCategory, id: string) {
  return useMutation({
    mutationFn: (rating: { scores: Record<string, number>; tags: string[]; comment?: string }) =>
      ratingService.submitRating(category, id, rating),
  });
}
