import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forumService } from '../api/services/forum.service';
import { useForumStore } from '../store/forumStore';
import type { Comment, ForumPost, MyContent, UserPost } from '../types';

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
    mutationFn: (post: { content: string; tags?: string[]; isAnonymous?: boolean; pollOptions?: string[]; images?: string[]; quotedPostId?: string }) =>
      forumService.createPost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
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
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
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
  return useMutation({
    mutationFn: (postId: string) => forumService.likePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      await queryClient.cancelQueries({ queryKey: ['myContent'] });
      const previousList = queryClient.getQueryData<ForumPost[]>(['posts']);
      const previousDetail = queryClient.getQueryData<ForumPost>(['post', postId]);
      const previousMyContent = queryClient.getQueryData<MyContent>(['myContent']);
      const toggle = (p: ForumPost) => ({
        ...p,
        liked: !p.liked,
        likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1,
      });
      const toggleUserPost = (p: UserPost) =>
        p.postId === postId
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1,
            }
          : p;
      queryClient.setQueryData<ForumPost[]>(['posts'], (old) =>
        old?.map((p) => (p.id === postId ? toggle(p) : p))
      );
      if (previousDetail) {
        queryClient.setQueryData<ForumPost>(['post', postId], toggle(previousDetail));
      }
      queryClient.setQueryData<MyContent>(['myContent'], (old) =>
        old
          ? {
              ...old,
              posts: old.posts.map(toggleUserPost),
              anonPosts: old.anonPosts.map(toggleUserPost),
            }
          : old
      );
      return { previousList, previousDetail, previousMyContent };
    },
    onSuccess: (res, postId) => {
      if (typeof res.likeCount === 'number') {
        const update = (p: ForumPost) => (p.id === postId ? { ...p, liked: res.liked, likes: res.likeCount! } : p);
        const updateUserPost = (p: UserPost) =>
          p.postId === postId ? { ...p, liked: res.liked, likes: res.likeCount! } : p;
        queryClient.setQueryData<ForumPost[]>(['posts'], (old) => old?.map(update));
        const detail = queryClient.getQueryData<ForumPost>(['post', postId]);
        if (detail) {
          queryClient.setQueryData<ForumPost>(['post', postId], { ...detail, liked: res.liked, likes: res.likeCount });
        }
        queryClient.setQueryData<MyContent>(['myContent'], (old) =>
          old
            ? {
                ...old,
                posts: old.posts.map(updateUserPost),
                anonPosts: old.anonPosts.map(updateUserPost),
              }
            : old
        );
      }
    },
    onError: (_err, postId, context) => {
      if (context?.previousList) queryClient.setQueryData(['posts'], context.previousList);
      if (context?.previousDetail) queryClient.setQueryData(['post', postId], context.previousDetail);
      if (context?.previousMyContent) queryClient.setQueryData(['myContent'], context.previousMyContent);
    },
    onSettled: (res, _err, postId) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
      // Skip invalidating post detail when we have likeCount - avoid refetch overwriting our onSuccess update
      if (typeof res?.likeCount !== 'number') {
        queryClient.invalidateQueries({ queryKey: ['post', postId] });
      }
    },
  });
}

export function useLikeComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => forumService.likeComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });
      const previous = queryClient.getQueryData<Comment[]>(['comments', postId]);
      queryClient.setQueryData<Comment[]>(['comments', postId], (old) =>
        old?.map((c) => {
          if (c.id === commentId) {
            return { ...c, liked: !c.liked, likes: c.liked ? Math.max(0, c.likes - 1) : c.likes + 1 };
          }
          if (c.replies?.some((r) => r.id === commentId)) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, liked: !r.liked, likes: r.liked ? Math.max(0, r.likes - 1) : r.likes + 1 } : r
              ),
            };
          }
          return c;
        })
      );
      return { previous };
    },
    onSuccess: (res, commentId) => {
      if (typeof res.likeCount === 'number') {
        queryClient.setQueryData<Comment[]>(['comments', postId], (old) =>
          old?.map((c) => {
            if (c.id === commentId) return { ...c, liked: res.liked, likes: res.likeCount! };
            if (c.replies?.some((r) => r.id === commentId)) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId ? { ...r, liked: res.liked, likes: res.likeCount! } : r
                ),
              };
            }
            return c;
          })
        );
      }
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous) queryClient.setQueryData(['comments', postId], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function useVotePost() {
  const queryClient = useQueryClient();
  const setVotedPoll = useForumStore((s) => s.setVotedPoll);
  const clearVotedPoll = useForumStore((s) => s.clearVotedPoll);
  return useMutation({
    mutationFn: ({ postId, optionId }: { postId: string; optionId: string; optionIndex: number }) =>
      forumService.votePost(postId, optionId),
    onMutate: ({ postId, optionIndex }) => {
      const previousOptionIndex = useForumStore.getState().votedPolls.get(postId);
      setVotedPoll(postId, optionIndex);
      return { previousOptionIndex };
    },
    onError: (_err, variables, context) => {
      if (typeof context?.previousOptionIndex === 'number') {
        setVotedPoll(variables.postId, context.previousOptionIndex);
      } else {
        clearVotedPoll(variables.postId);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function useBookmarkComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => forumService.bookmarkComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });
      const previous = queryClient.getQueryData<Comment[]>(['comments', postId]);
      queryClient.setQueryData<Comment[]>(['comments', postId], (old) =>
        old?.map((c) => {
          if (c.id === commentId) {
            return { ...c, bookmarked: !c.bookmarked };
          }
          if (c.replies?.some((r) => r.id === commentId)) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, bookmarked: !r.bookmarked } : r
              ),
            };
          }
          return c;
        })
      );
      return { previous };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous) queryClient.setQueryData(['comments', postId], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function useBookmarkPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => forumService.bookmarkPost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      await queryClient.cancelQueries({ queryKey: ['myContent'] });
      const previousList = queryClient.getQueryData<ForumPost[]>(['posts']);
      const previousDetail = queryClient.getQueryData<ForumPost>(['post', postId]);
      const previousMyContent = queryClient.getQueryData<MyContent>(['myContent']);
      const toggle = (p: ForumPost) => ({ ...p, bookmarked: !p.bookmarked });
      const toggleUserPost = (p: UserPost) =>
        p.postId === postId
          ? {
              ...p,
              bookmarked: !p.bookmarked,
            }
          : p;
      queryClient.setQueryData<ForumPost[]>(['posts'], (old) =>
        old?.map((p) => (p.id === postId ? toggle(p) : p))
      );
      if (previousDetail) {
        queryClient.setQueryData<ForumPost>(['post', postId], toggle(previousDetail));
      }
      queryClient.setQueryData<MyContent>(['myContent'], (old) =>
        old
          ? {
              ...old,
              posts: old.posts.map(toggleUserPost),
              anonPosts: old.anonPosts.map(toggleUserPost),
            }
          : old
      );
      return { previousList, previousDetail, previousMyContent };
    },
    onError: (_err, postId, context) => {
      if (context?.previousList) queryClient.setQueryData(['posts'], context.previousList);
      if (context?.previousDetail) queryClient.setQueryData(['post', postId], context.previousDetail);
      if (context?.previousMyContent) queryClient.setQueryData(['myContent'], context.previousMyContent);
    },
    onSettled: (_data, _err, postId) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}
