import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratingService } from '../api/services/rating.service';
import type { RatingCategory, RatingSortMode } from '../types';

export function useMyRating(category: RatingCategory, id: string) {
  return useQuery({
    queryKey: ['myRating', category, id],
    queryFn: () => ratingService.getMyRating(category, id),
    enabled: id.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRatings(
  category: RatingCategory,
  searchQuery = '',
  sortMode: RatingSortMode = 'recent',
  pageSize = 20
) {
  const normalizedQuery = searchQuery.trim();

  return useInfiniteQuery({
    queryKey: ['ratings', category, sortMode, normalizedQuery, pageSize],
    queryFn: ({ pageParam }) =>
      ratingService.getList(category, sortMode, {
        page: pageParam,
        limit: pageSize,
        query: normalizedQuery,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useRatingDetail(
  category: RatingCategory | undefined,
  id: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['rating', category ?? 'unknown', id],
    queryFn: () => {
      if (!category) {
        throw new Error('Rating category is required');
      }
      return ratingService.getDetail(category, id);
    },
    enabled: Boolean(category) && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRatingDimensions(category: RatingCategory) {
  return useQuery({
    queryKey: ['ratingDimensions', category],
    queryFn: () => ratingService.getDimensions(category),
    staleTime: 5 * 60 * 1000,
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
      queryClient.invalidateQueries({ queryKey: ['ratings', category] });
      queryClient.invalidateQueries({ queryKey: ['rating', category, id] });
      queryClient.invalidateQueries({ queryKey: ['ratingTagOptions', category] });
      queryClient.invalidateQueries({ queryKey: ['myRating', category, id] });
    },
  });
}
