import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratingService } from '../api/services/rating.service';
import type { RatingCategory, RatingSortMode } from '../types';

export function useRatings(category: RatingCategory, sortMode: RatingSortMode = 'recent') {
  return useQuery({
    queryKey: ['ratings', category, sortMode],
    queryFn: () => ratingService.getList(category, sortMode),
  });
}

export function useRatingDetail(category: RatingCategory, id: string) {
  return useQuery({
    queryKey: ['rating', category, id],
    queryFn: () => ratingService.getDetail(category, id),
  });
}

export function useRatingDimensions(category: RatingCategory) {
  return useQuery({
    queryKey: ['ratingDimensions', category],
    queryFn: () => ratingService.getDimensions(category),
    staleTime: Infinity,
  });
}

export function useRatingTagOptions(category: RatingCategory) {
  return useQuery({
    queryKey: ['ratingTagOptions', category],
    queryFn: () => ratingService.getTagOptions(category),
    staleTime: Infinity,
  });
}

export function useSubmitRating(category: RatingCategory, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rating: { scores: Record<string, number>; tags: string[]; comment?: string }) =>
      ratingService.submitRating(category, id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] });
    },
  });
}
