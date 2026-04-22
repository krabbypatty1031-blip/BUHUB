import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { forumService } from '../api/services/forum.service';
import { useForumStore } from '../store/forumStore';
import { useAuthStore } from '../store/authStore';
import { normalizeLanguage } from '../i18n';
import type { Comment, ForumPost, MyContent, Reply, UserPost } from '../types';

export type PostsPage = { posts: ForumPost[]; hasMore: boolean; page: number };
type PostsInfiniteData = InfiniteData<PostsPage>;
type MyContentCommentLike = {
  commentId: string;
  liked?: boolean;
  likes: number;
  bookmarked?: boolean;
};
type BookmarkSourcePost = ForumPost | UserPost;

const POSTS_LIMIT = 20;
const resolveForumLanguage = (language?: string | null) => normalizeLanguage(language) ?? 'tc';
const postsKey = (language: string) => ['posts', language] as const;
const followingPostsKey = (language: string) => ['posts', 'following', language] as const;
const userPostsKey = (userName: string, language: string) => ['userPosts', userName, language] as const;
const postDetailKey = (postId: string, language: string) => ['post', postId, language] as const;
const commentsKey = (postId: string, language: string) => ['comments', postId, language] as const;
const searchKey = (query: string, language: string) => ['search', query, language] as const;

function mapPostsPages(
  data: PostsInfiniteData | undefined,
  fn: (post: ForumPost) => ForumPost,
): PostsInfiniteData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, posts: page.posts.map(fn) })),
  };
}

function filterPostsPages(
  data: PostsInfiniteData | undefined,
  predicate: (post: ForumPost) => boolean,
): PostsInfiniteData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, posts: page.posts.filter(predicate) })),
  };
}

function getAllPostLists(queryClient: QueryClient) {
  return queryClient.getQueriesData<PostsInfiniteData>({ queryKey: ['posts'] });
}

function setAllPostLists(
  queryClient: QueryClient,
  updater: (data: PostsInfiniteData | undefined) => PostsInfiniteData | undefined,
) {
  queryClient.setQueriesData<PostsInfiniteData>({ queryKey: ['posts'] }, updater);
}

function restoreAllPostLists(
  queryClient: QueryClient,
  previousPostLists: Array<[readonly unknown[], PostsInfiniteData | undefined]> | undefined,
) {
  previousPostLists?.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function findPostInPostLists(
  postLists: Array<[readonly unknown[], PostsInfiniteData | undefined]>,
  postId: string,
) {
  return postLists
    .flatMap(([, data]) => flattenPostPages(data))
    .find((post) => post.id === postId);
}

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

function findCommentNodeById(
  comments: Array<Comment | Reply> | undefined,
  targetId: string,
): Comment | Reply | undefined {
  if (!comments) return undefined;

  for (const comment of comments) {
    if (comment.id === targetId) {
      return comment;
    }
    const nested = findCommentNodeById(comment.replies, targetId);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function insertCreatedComment(
  comments: Comment[] | undefined,
  createdComment: Comment,
  parentId?: string,
): Comment[] | undefined {
  if (!parentId) {
    return comments ? [createdComment, ...comments] : [createdComment];
  }

  if (!comments) return comments;

  const parentNode = findCommentNodeById(comments, parentId);
  if (!parentNode) return comments;

  const reply: Reply = {
    ...createdComment,
    replyTo: parentNode.name,
  };

  return updateCommentTreeById(comments, parentId, (node) => ({
    ...node,
    replies: [reply, ...(node.replies ?? [])],
  }));
}

function updateMyContentCommentById(
  myContent: MyContent | undefined,
  targetId: string,
  updater: <T extends MyContentCommentLike>(item: T) => T,
  options?: { includeReactionLists?: boolean }
): MyContent | undefined {
  if (!myContent) return myContent;
  const includeReactionLists = !!options?.includeReactionLists;

  const updateArray = <T extends MyContentCommentLike>(arr: T[]) =>
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

function mapForumPostToUserPost(post: ForumPost): UserPost {
  return {
    postId: post.id,
    name: post.name,
    isOwnedByCurrentUser: post.isOwnedByCurrentUser,
    userName: post.userName,
    avatar: post.avatar,
    defaultAvatar: post.defaultAvatar,
    gender: post.gender,
    gradeKey: post.gradeKey,
    majorKey: post.majorKey,
    meta: post.meta,
    lang: post.lang,
    sourceLanguage: post.sourceLanguage,
    content: post.content,
    time: post.createdAt,
    likes: post.likes,
    comments: post.comments,
    tags: post.tags,
    images: post.images,
    hasImage: post.hasImage,
    image: post.image,
    isAnonymous: post.isAnonymous,
    postType: post.postType,
    isPoll: post.isPoll,
    pollOptions: post.pollOptions,
    myVote: post.myVote,
    isFunction: post.isFunction,
    functionType: post.functionType,
    functionId: post.functionId,
    functionIndex: post.functionIndex,
    functionTitle: post.functionTitle,
    functionRefPreview: post.functionRefPreview,
    ratingCategory: post.ratingCategory,
    quotedPost: post.quotedPost
      ? {
          id: post.quotedPost.id,
          name: post.quotedPost.name,
          sourceLanguage: post.quotedPost.sourceLanguage,
          content: post.quotedPost.content,
          createdAt: post.quotedPost.createdAt ?? '',
        }
      : undefined,
    liked: post.liked,
    bookmarked: post.bookmarked,
  };
}

function toBookmarkedUserPost(source: BookmarkSourcePost, bookmarked: boolean): UserPost {
  if ('postId' in source) {
    return {
      ...source,
      bookmarked,
    };
  }

  return mapForumPostToUserPost({
    ...source,
    bookmarked,
  });
}

function findSourcePostForBookmark(
  myContent: MyContent | undefined,
  postId: string,
  sourcePost?: BookmarkSourcePost
): BookmarkSourcePost | undefined {
  if (sourcePost) return sourcePost;
  if (!myContent) return undefined;
  return (
    myContent.posts.find((item) => item.postId === postId) ??
    myContent.anonPosts.find((item) => item.postId === postId) ??
    myContent.myBookmarks.posts.find((item) => item.postId === postId)
  );
}

function updateMyContentPostBookmark(
  myContent: MyContent | undefined,
  postId: string,
  bookmarked: boolean,
  sourcePost?: BookmarkSourcePost
): MyContent | undefined {
  if (!myContent) return myContent;

  const updateUserPost = (item: UserPost) =>
    item.postId === postId
      ? {
          ...item,
          bookmarked,
        }
      : item;

  const currentBookmarks = myContent.myBookmarks.posts;
  const existingBookmarkIndex = currentBookmarks.findIndex((item) => item.postId === postId);
  const resolvedSourcePost = findSourcePostForBookmark(myContent, postId, sourcePost);

  let nextBookmarks = currentBookmarks.map(updateUserPost);

  if (bookmarked) {
    if (existingBookmarkIndex === -1 && resolvedSourcePost) {
      nextBookmarks = [toBookmarkedUserPost(resolvedSourcePost, true), ...nextBookmarks];
    }
  } else if (existingBookmarkIndex !== -1) {
    nextBookmarks = nextBookmarks.filter((item) => item.postId !== postId);
  }

  const collectionDelta =
    bookmarked && existingBookmarkIndex === -1 ? 1 : !bookmarked && existingBookmarkIndex !== -1 ? -1 : 0;

  return {
    ...myContent,
    posts: myContent.posts.map(updateUserPost),
    anonPosts: myContent.anonPosts.map(updateUserPost),
    myBookmarks: {
      ...myContent.myBookmarks,
      posts: nextBookmarks,
    },
    stats: {
      ...myContent.stats,
      collection: Math.max(0, (myContent.stats?.collection ?? 0) + collectionDelta),
    },
  };
}

export function usePosts(enabled = true) {
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useInfiniteQuery<PostsPage, Error, PostsInfiniteData, string[], number>({
    queryKey: postsKey(language) as unknown as string[],
    queryFn: ({ pageParam }) =>
      forumService.getPosts({ page: pageParam, limit: POSTS_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUserPosts(userName: string) {
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useInfiniteQuery<PostsPage, Error, PostsInfiniteData, string[], number>({
    queryKey: userPostsKey(userName, language) as unknown as string[],
    queryFn: ({ pageParam }) =>
      forumService.getUserPosts(userName, { page: pageParam, limit: POSTS_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    enabled: userName.length > 0,
  });
}

export function useFollowingPosts(enabled = true) {
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useInfiniteQuery<PostsPage, Error, PostsInfiniteData, string[], number>({
    queryKey: followingPostsKey(language) as unknown as string[],
    queryFn: ({ pageParam }) =>
      forumService.getFollowingPosts({ page: pageParam, limit: POSTS_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function flattenPostPages(data: PostsInfiniteData | undefined): ForumPost[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.posts);
}

export { useFollowedCircles } from './useUser';

export function useCircleFollow(tag: string) {
  return useQuery({
    queryKey: ['circleFollow', tag],
    queryFn: () => forumService.getCircleFollow(tag),
    enabled: tag.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useToggleCircleFollow(tag: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => forumService.toggleCircleFollow(tag),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['circleFollow', tag] });
      const previous = queryClient.getQueryData<{ tag: string; followerCount: number; followed: boolean }>(['circleFollow', tag]);
      if (previous) {
        queryClient.setQueryData(['circleFollow', tag], {
          ...previous,
          followed: !previous.followed,
          followerCount: Math.max(0, previous.followerCount + (previous.followed ? -1 : 1)),
        });
      }
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['circleFollow', tag], data);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['circleFollow', tag], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['circleFollow', tag] });
      queryClient.invalidateQueries({ queryKey: ['circles'] });
    },
  });
}

export function usePostDetail(postId: string) {
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useQuery({
    queryKey: postDetailKey(postId, language),
    queryFn: () => forumService.getPostDetail(postId),
    enabled: postId.length > 0,
  });
}

export function useComments(postId: string) {
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useQuery<Comment[]>({
    queryKey: commentsKey(postId, language),
    queryFn: async () => {
      const data = await forumService.getComments(postId);
      return data[postId] || [];
    },
  });
}

export function useSearch(query: string) {
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  const normalizedQuery = query.trim();
  return useQuery({
    queryKey: searchKey(normalizedQuery, language),
    queryFn: () => forumService.search(normalizedQuery),
    enabled: normalizedQuery.length >= 1,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: { content: string; tags?: string[]; isAnonymous?: boolean; pollOptions?: string[]; images?: string[]; quotedPostId?: string; functionType?: string; functionId?: string; functionTitle?: string; ratingCategory?: import('../types').RatingCategory }) =>
      forumService.createPost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function useEditPost() {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useMutation({
    mutationFn: ({ postId, post }: { postId: string; post: { content: string; tags?: string[] } }) =>
      forumService.editPost(postId, post),
    onSuccess: (data, variables) => {
      setAllPostLists(queryClient, (old) =>
        mapPostsPages(old, (post) => (post.id === variables.postId ? { ...post, ...data } : post))
      );
      queryClient.setQueryData<ForumPost>(postDetailKey(variables.postId, language), (old) =>
        old ? { ...old, ...data } : data
      );
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useMutation({
    mutationFn: (postId: string) => forumService.deletePost(postId),
    onSuccess: (_data, postId) => {
      setAllPostLists(queryClient, (old) => filterPostsPages(old, (post) => post.id !== postId));
      queryClient.setQueryData(postDetailKey(postId, language), undefined);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useMutation({
    mutationFn: ({ content, isAnonymous, parentId }: { content: string; isAnonymous?: boolean; parentId?: string }) =>
      forumService.createComment(postId, content, isAnonymous, parentId),
    onSuccess: (createdComment, variables) => {
      queryClient.setQueryData<Comment[]>(commentsKey(postId, language), (old) =>
        insertCreatedComment(old, createdComment, variables.parentId)
      );
      queryClient.setQueryData<ForumPost>(postDetailKey(postId, language), (old) =>
        old
          ? {
              ...old,
              comments: old.comments + 1,
            }
          : old
      );
      setAllPostLists(queryClient, (old) =>
        mapPostsPages(old, (post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments + 1,
              }
            : post
        )
      );

      queryClient.invalidateQueries({ queryKey: ['comments', postId], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['post', postId], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['myContent'], refetchType: 'inactive' });
    },
  });
}

export function useEditComment(postId: string) {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      forumService.editComment(postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey(postId, language) });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useMutation({
    mutationFn: (commentId: string) => forumService.deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey(postId, language) });
      queryClient.invalidateQueries({ queryKey: postDetailKey(postId, language) });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
      setAllPostLists(queryClient, (old) =>
        mapPostsPages(old, (post) =>
          post.id === postId
            ? { ...post, comments: Math.max(0, post.comments - 1) }
            : post
        )
      );
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useMutation({
    mutationFn: (postId: string) => forumService.likePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: postDetailKey(postId, language) });
      await queryClient.cancelQueries({ queryKey: ['myContent'] });
      const previousPostLists = getAllPostLists(queryClient);
      const previousDetail = queryClient.getQueryData<ForumPost>(postDetailKey(postId, language));
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
      setAllPostLists(queryClient, (old) =>
        mapPostsPages(old, (p) => (p.id === postId ? toggle(p) : p))
      );
      if (previousDetail) {
        queryClient.setQueryData<ForumPost>(postDetailKey(postId, language), toggle(previousDetail));
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
      return { previousPostLists, previousDetail, previousMyContent };
    },
    onSuccess: (res, postId) => {
      if (typeof res.likeCount === 'number') {
        const update = (p: ForumPost) => (p.id === postId ? { ...p, liked: res.liked, likes: res.likeCount! } : p);
        const updateUserPost = (p: UserPost) =>
          p.postId === postId ? { ...p, liked: res.liked, likes: res.likeCount! } : p;
        setAllPostLists(queryClient, (old) =>
          mapPostsPages(old, update)
        );
        const detail = queryClient.getQueryData<ForumPost>(postDetailKey(postId, language));
        if (detail) {
          queryClient.setQueryData<ForumPost>(postDetailKey(postId, language), { ...detail, liked: res.liked, likes: res.likeCount });
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
      restoreAllPostLists(queryClient, context?.previousPostLists);
      if (context?.previousDetail) queryClient.setQueryData(postDetailKey(postId, language), context.previousDetail);
      if (context?.previousMyContent) queryClient.setQueryData(['myContent'], context.previousMyContent);
    },
    onSettled: (res, _err, postId) => {
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['myContent'], refetchType: 'inactive' });
      if (typeof res?.likeCount !== 'number') {
        queryClient.invalidateQueries({ queryKey: postDetailKey(postId, language), refetchType: 'inactive' });
      }
    },
  });
}

export function useLikeComment(postId: string) {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useMutation({
    mutationFn: (commentId: string) => forumService.likeComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: commentsKey(postId, language) });
      await queryClient.cancelQueries({ queryKey: ['myContent'] });
      const previous = queryClient.getQueryData<Comment[]>(commentsKey(postId, language));
      const previousMyContent = queryClient.getQueryData<MyContent>(['myContent']);

      queryClient.setQueryData<Comment[]>(commentsKey(postId, language), (old) =>
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
        queryClient.setQueryData<Comment[]>(commentsKey(postId, language), (old) =>
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
      if (context?.previous) queryClient.setQueryData(commentsKey(postId, language), context.previous);
      if (context?.previousMyContent) queryClient.setQueryData(['myContent'], context.previousMyContent);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey(postId, language) });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function useVotePost() {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  const setVotedPoll = useForumStore((s) => s.setVotedPoll);
  const clearVotedPoll = useForumStore((s) => s.clearVotedPoll);
  const bumpPollListRefresh = useForumStore((s) => s.bumpPollListRefresh);
  return useMutation({
    mutationFn: ({ postId, optionId }: { postId: string; optionId: string; optionIndex: number }) =>
      forumService.votePost(postId, optionId),
    onMutate: async ({ postId, optionId, optionIndex }) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: postDetailKey(postId, language) });

      const previousPostLists = getAllPostLists(queryClient);
      const previousPostDetail = queryClient.getQueryData<ForumPost>(postDetailKey(postId, language));
      const previousOptionIndex = useForumStore.getState().votedPolls[postId];
      setVotedPoll(postId, optionIndex);

      const applyVote = (post: ForumPost): ForumPost => {
        if (post.id !== postId || !post.pollOptions?.length) return post;
        if (post.myVote?.optionId) return post;

        const nextOptions = post.pollOptions.map((opt, i) => {
          const isVotedOption = opt.id === optionId || i === optionIndex;
          return isVotedOption ? { ...opt, voteCount: (opt.voteCount ?? 0) + 1 } : opt;
        });
        const totalVotes = nextOptions.reduce((sum, opt) => sum + (opt.voteCount ?? 0), 0);
        const nextPollOptions = nextOptions.map((opt) => ({
          ...opt,
          percent: totalVotes > 0 ? Math.round(((opt.voteCount ?? 0) / totalVotes) * 100) : 0,
        }));

        return {
          ...post,
          pollOptions: nextPollOptions,
          myVote: {
            id: `optimistic-${postId}`,
            optionId: post.pollOptions[optionIndex]?.id ?? optionId,
            createdAt: new Date().toISOString(),
          },
        };
      };

      const listPost = findPostInPostLists(previousPostLists, postId);
      const optimisticPost = listPost ? applyVote(listPost) : null;

      setAllPostLists(queryClient, (old) =>
        mapPostsPages(old, applyVote)
      );
      if (optimisticPost) {
        queryClient.setQueryData<ForumPost>(postDetailKey(postId, language), optimisticPost);
      } else if (previousPostDetail) {
        queryClient.setQueryData<ForumPost>(postDetailKey(postId, language), applyVote(previousPostDetail));
      }

      return { previousOptionIndex, previousPostLists, previousPostDetail };
    },
    onError: (_err, variables, context) => {
      if (typeof context?.previousOptionIndex === 'number') {
        setVotedPoll(variables.postId, context.previousOptionIndex);
      } else {
        clearVotedPoll(variables.postId);
      }
      restoreAllPostLists(queryClient, context?.previousPostLists);
      if (context?.previousPostDetail) {
        queryClient.setQueryData(postDetailKey(variables.postId, language), context.previousPostDetail);
      }
    },
    onSuccess: async (_data, variables) => {
      const { postId } = variables;
      await queryClient.invalidateQueries({ queryKey: postDetailKey(postId, language) });
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
      bumpPollListRefresh();
    },
  });
}

export function useBookmarkComment(postId: string) {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useMutation({
    mutationFn: (commentId: string) => forumService.bookmarkComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: commentsKey(postId, language) });
      await queryClient.cancelQueries({ queryKey: ['myContent'] });
      const previous = queryClient.getQueryData<Comment[]>(commentsKey(postId, language));
      const previousMyContent = queryClient.getQueryData<MyContent>(['myContent']);

      queryClient.setQueryData<Comment[]>(commentsKey(postId, language), (old) =>
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
      if (context?.previous) queryClient.setQueryData(commentsKey(postId, language), context.previous);
      if (context?.previousMyContent) queryClient.setQueryData(['myContent'], context.previousMyContent);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey(postId, language) });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function useBookmarkPost() {
  const queryClient = useQueryClient();
  const language = resolveForumLanguage(useAuthStore((s) => s.language));
  return useMutation({
    mutationFn: (postId: string) => forumService.bookmarkPost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: postDetailKey(postId, language) });
      await queryClient.cancelQueries({ queryKey: ['myContent'] });
      const previousPostLists = getAllPostLists(queryClient);
      const previousDetail = queryClient.getQueryData<ForumPost>(postDetailKey(postId, language));
      const previousMyContent = queryClient.getQueryData<MyContent>(['myContent']);
      const listSourcePost = findPostInPostLists(previousPostLists, postId);
      const sourcePost = previousDetail ?? listSourcePost;
      const nextBookmarked =
        sourcePost?.bookmarked != null
          ? !sourcePost.bookmarked
          : !previousMyContent?.myBookmarks.posts.some((item) => item.postId === postId);
      const toggle = (p: ForumPost) => ({ ...p, bookmarked: !p.bookmarked });
      setAllPostLists(queryClient, (old) =>
        mapPostsPages(old, (p) => (p.id === postId ? toggle(p) : p))
      );
      if (previousDetail) {
        queryClient.setQueryData<ForumPost>(postDetailKey(postId, language), toggle(previousDetail));
      }
      queryClient.setQueryData<MyContent>(['myContent'], (old) =>
        updateMyContentPostBookmark(old, postId, nextBookmarked, sourcePost)
      );
      return { previousPostLists, previousDetail, previousMyContent };
    },
    onSuccess: (res, postId) => {
      setAllPostLists(queryClient, (old) =>
        mapPostsPages(old, (post) =>
          post.id === postId
            ? {
                ...post,
                bookmarked: res.bookmarked,
              }
            : post
        )
      );
      queryClient.setQueryData<ForumPost>(postDetailKey(postId, language), (old) =>
        old
          ? {
              ...old,
              bookmarked: res.bookmarked,
            }
          : old
      );
      queryClient.setQueryData<MyContent>(['myContent'], (old) =>
        updateMyContentPostBookmark(
          old,
          postId,
          res.bookmarked,
          queryClient.getQueryData<ForumPost>(postDetailKey(postId, language)) ??
            findPostInPostLists(getAllPostLists(queryClient), postId)
        )
      );
    },
    onError: (_err, postId, context) => {
      restoreAllPostLists(queryClient, context?.previousPostLists);
      if (context?.previousDetail) queryClient.setQueryData(postDetailKey(postId, language), context.previousDetail);
      if (context?.previousMyContent) queryClient.setQueryData(['myContent'], context.previousMyContent);
    },
    onSettled: (_data, _err, postId) => {
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: postDetailKey(postId, language), refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}
