import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forumService } from '../api/services/forum.service';
import { useForumStore } from '../store/forumStore';
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
    enabled: postId.length > 0,
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

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: { content: string; tags?: string[]; isAnonymous?: boolean; pollOptions?: string[] }) =>
      forumService.createPost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useEditPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, post }: { postId: string; post: { content: string; tags?: string[] } }) =>
      forumService.editPost(postId, post),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => forumService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, isAnonymous }: { content: string; isAnonymous?: boolean }) =>
      forumService.createComment(postId, content, isAnonymous),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function useEditComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      forumService.editComment(postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => forumService.deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  const toggleLike = useForumStore((s) => s.toggleLike);
  return useMutation({
    mutationFn: (postId: string) => forumService.likePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (_error, postId) => {
      // Reverse the optimistic toggle on failure
      toggleLike(postId);
    },
  });
}

export function useBookmarkPost() {
  const queryClient = useQueryClient();
  const toggleBookmark = useForumStore((s) => s.toggleBookmark);
  return useMutation({
    mutationFn: (postId: string) => forumService.bookmarkPost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
    onError: (_error, postId) => {
      // Reverse the optimistic toggle on failure
      toggleBookmark(postId);
    },
  });
}
