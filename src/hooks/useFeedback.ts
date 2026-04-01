import { useInfiniteQuery, useQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { feedbackService } from '../api/services/feedback.service';
import type { Feedback } from '../types/feedback';

const PAGE_LIMIT = 20;

export type FeedbackPage = { items: Feedback[]; page: number; hasMore: boolean };
export type FeedbackInfiniteData = InfiniteData<FeedbackPage>;

export function useMyFeedback() {
  return useInfiniteQuery<FeedbackPage, Error, FeedbackInfiniteData, string[], number>({
    queryKey: ['feedback', 'my'],
    queryFn: async ({ pageParam }) => {
      const items = await feedbackService.getList(pageParam, PAGE_LIMIT);
      return { items, page: pageParam, hasMore: items.length === PAGE_LIMIT };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 5 * 60 * 1000,
  });
}

export function flattenFeedbackPages(data: FeedbackInfiniteData | undefined): Feedback[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.items);
}

export function useFeedbackDetail(id: string) {
  return useQuery({
    queryKey: ['feedback', id],
    queryFn: () => feedbackService.getDetail(id),
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: feedbackService.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}
