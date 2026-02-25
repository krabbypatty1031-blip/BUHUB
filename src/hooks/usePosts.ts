import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forumService } from '../api/services/forum.service';
import { useForumStore } from '../store/forumStore';
import type { Comment, ForumPost, MyContent, Reply, UserPost } from '../types';

function updateCommentTreeById(
  comments: Comment[] | undefined,
  targetId: string,
  updater: (node: Comment | Reply) => Comment | Reply
): Comment[] | undefined {
  if (!comments) return comments;

  let changed = false;

  const updateReplies = (replies: Reply[] | undefined): Reply[] | undefined => {
    if (!replies || replies.length === 0) return replies;
    let localChanged = false;

    const nextReplies = replies.map((reply) => {
      let nextReply: Reply = reply;

      if (reply.id === targetId) {
        nextReply = updater(reply) as Reply;
        localChanged = true;
      }

      if (reply.replies && reply.replies.length > 0) {
        const updatedNested = updateReplies(reply.replies);
        if (updatedNested !== reply.replies) {
          nextReply = nextReply === reply
            ? { ...nextReply, replies: updatedNested }
            : { ...nextReply, replies: updatedNested };
          localChanged = true;
        }
      }

      return nextReply;
    });

    if (localChanged) {
      changed = true;
      return nextReplies;
    }
    return replies;
  };

  const nextComments = comments.map((comment) => {
    let nextComment: Comment = comment;

    if (comment.id === targetId) {
      nextComment = updater(comment) as Comment;
      changed = true;
    }

    if (comment.replies && comment.replies.length > 0) {
      const updatedReplies = updateReplies(comment.replies);
      if (updatedReplies !== comment.replies) {
        nextComment = nextComment === comment
          ? { ...nextComment, replies: updatedReplies }
          : { ...nextComment, replies: updatedReplies };
        changed = true;
      }
    }

    return nextComment;
  });

  return changed ? nextComments : comments;
}

function updateMyContentCommentById(
  myContent: MyContent | undefined,
  targetId: string,
  updater: (item: any) => any,
  options?: { includeReactionLists?: boolean }
): MyContent | undefined {
  if (!myContent) return myContent;
  const includeReactionLists = !!options?.includeReactionLists;

  const updateArray = <T extends { commentId: string }>(arr: T[]) =>
    arr.map((item) => (item.commentId === targetId ? updater(item) : item));

  return {
    ...myContent,
    comments: updateArray(myContent.comments),
    anonComments: updateArray(myContent.anonComments),
    myLikes: {
      ...myContent.myLikes,
      comments: includeReactionLists ? updateArray(myContent.myLikes.comments) : myContent.myLikes.comments,
    },
    myBookmarks: {
      ...myContent.myBookmarks,
      comments: includeReactionLists ? updateArray(myContent.myBookmarks.comments) : myContent.myBookmarks.comments,
    },
  };
}

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
    mutationFn: ({ content, isAnonymous, parentId }: { content: string; isAnonymous?: boolean; parentId?: string }) =>
      forumService.createComment(postId, content, isAnonymous, parentId),
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
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
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
      await queryClient.cancelQueries({ queryKey: ['myContent'] });
      const previous = queryClient.getQueryData<Comment[]>(['comments', postId]);
      const previousMyContent = queryClient.getQueryData<MyContent>(['myContent']);

      queryClient.setQueryData<Comment[]>(['comments', postId], (old) =>
        updateCommentTreeById(old, commentId, (node) => ({
          ...node,
          liked: !node.liked,
          likes: node.liked ? Math.max(0, node.likes - 1) : node.likes + 1,
        }))
      );
      queryClient.setQueryData<MyContent>(['myContent'], (old) =>
        updateMyContentCommentById(old, commentId, (item) => ({
          ...item,
          liked: !item.liked,
          likes: item.liked ? Math.max(0, item.likes - 1) : item.likes + 1,
        }), { includeReactionLists: false })
      );
      return { previous, previousMyContent };
    },
    onSuccess: (res, commentId) => {
      if (typeof res.likeCount === 'number') {
        queryClient.setQueryData<Comment[]>(['comments', postId], (old) =>
          updateCommentTreeById(old, commentId, (node) => ({
            ...node,
            liked: res.liked,
            likes: res.likeCount!,
          }))
        );
        queryClient.setQueryData<MyContent>(['myContent'], (old) =>
          updateMyContentCommentById(old, commentId, (item) => ({
            ...item,
            liked: res.liked,
            likes: res.likeCount!,
          }), { includeReactionLists: true })
        );
      }
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous) queryClient.setQueryData(['comments', postId], context.previous);
      if (context?.previousMyContent) queryClient.setQueryData(['myContent'], context.previousMyContent);
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
      await queryClient.cancelQueries({ queryKey: ['myContent'] });
      const previous = queryClient.getQueryData<Comment[]>(['comments', postId]);
      const previousMyContent = queryClient.getQueryData<MyContent>(['myContent']);

      queryClient.setQueryData<Comment[]>(['comments', postId], (old) =>
        updateCommentTreeById(old, commentId, (node) => ({
          ...node,
          bookmarked: !node.bookmarked,
        }))
      );
      queryClient.setQueryData<MyContent>(['myContent'], (old) =>
        updateMyContentCommentById(old, commentId, (item) => ({
          ...item,
          bookmarked: !item.bookmarked,
        }), { includeReactionLists: false })
      );
      return { previous, previousMyContent };
    },
    onSuccess: (res, commentId) => {
      queryClient.setQueryData<MyContent>(['myContent'], (old) =>
        updateMyContentCommentById(old, commentId, (item) => ({
          ...item,
          bookmarked: res.bookmarked,
        }), { includeReactionLists: true })
      );
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous) queryClient.setQueryData(['comments', postId], context.previous);
      if (context?.previousMyContent) queryClient.setQueryData(['myContent'], context.previousMyContent);
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
