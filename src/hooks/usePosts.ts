import { useQuery } from '@tanstack/react-query';
import { forumService } from '../api/services/forum.service';
import type { Comment } from '../types';

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: () => forumService.getPosts(),
  });
}

export function usePostDetail(postId: string) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => forumService.getPostDetail(postId),
  });
}

export function useComments(postId: string) {
  return useQuery<Comment[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const data = await forumService.getComments(postId);
      return data[postId] || [];
    },
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => forumService.search(query),
    enabled: query.length > 0,
  });
}
