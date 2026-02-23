import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { ForumPost, CommentsData, Comment, Reply, PaginationParams } from '../../types';

const USE_MOCK = false;

export const forumService = {
  async getPosts(params?: PaginationParams): Promise<ForumPost[]> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts;
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.POSTS, { params });
    return (Array.isArray(data) ? data : []).map((p: any) => {
      const pollOpts = p.pollOptions as { id?: string; text: string; voteCount?: number }[] | undefined;
      const totalVotes = pollOpts?.reduce((s: number, o: any) => s + (o.voteCount ?? 0), 0) ?? 0;
      const pollOptions = pollOpts?.map((o: any) => ({
        ...o,
        percent: totalVotes > 0 ? Math.round(((o.voteCount ?? 0) / totalVotes) * 100) : 0,
      }));
      const isPoll = (p.postType === 'poll') || (pollOpts?.length ?? 0) > 0;
      return pollOptions ? { ...p, pollOptions, isPoll } : { ...p, isPoll };
    });
  },

  async getPostDetail(postId: string): Promise<ForumPost> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts.find((p) => p.id === postId) || mockPosts[0];
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.POST_DETAIL(postId));
    const p = data as any;
    const author = p.author ?? {};
    const pollOpts = p.pollOptions as { id?: string; text: string; voteCount?: number }[] | undefined;
    const totalVotes = pollOpts?.reduce((s, o) => s + (o.voteCount ?? 0), 0) ?? 0;
    const pollOptions = pollOpts?.map((o) => ({
      id: o.id,
      text: o.text,
      voteCount: o.voteCount ?? 0,
      percent: totalVotes > 0 ? Math.round(((o.voteCount ?? 0) / totalVotes) * 100) : 0,
    })) ?? undefined;
    const isPoll = (p.postType === 'poll') || (pollOpts?.length ?? 0) > 0;
    return {
      ...p,
      name: p.isAnonymous ? '匿名用户' : (author.nickname ?? '?'),
      avatar: p.isAnonymous ? '' : (author.avatar ?? ''),
      gender: p.isAnonymous ? 'other' : (author.gender ?? 'other'),
      meta: p.isAnonymous ? '' : [author.grade, author.major].filter(Boolean).join(' · '),
      likes: p.likeCount ?? p.likes ?? 0,
      comments: p.commentCount ?? p.comments ?? 0,
      userName: author.userName ?? author.nickname,
      pollOptions,
      isPoll,
      hasImage: (p.images?.length ?? 0) > 0,
      image: p.images?.[0],
    };
  },

  async getComments(postId: string): Promise<CommentsData> {
    if (USE_MOCK) {
      const { mockCommentsData } = await import('../../data/mock/forum');
      return { [postId]: mockCommentsData[postId] || [] };
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.COMMENTS(postId));
    // Backend returns nested array; map to frontend Comment shape
    const mapComment = (c: any): Comment => {
      const time = typeof c.createdAt === 'string' ? c.createdAt : new Date(c.createdAt).toISOString();
      const isAnon = !!c.isAnonymous;
      const parentName = isAnon ? '匿名用户' : (c.author?.nickname ?? '?');
      const replies: Reply[] | undefined = c.replies?.length
        ? c.replies.map((r: any) => {
            const rAnon = !!r.isAnonymous;
            return {
              id: r.id,
              name: rAnon ? '匿名用户' : (r.author?.nickname ?? '?'),
              avatar: rAnon ? '' : (r.author?.avatar ?? ''),
              gender: rAnon ? undefined : (r.author?.gender as 'male' | 'female' | 'other'),
              gradeKey: rAnon ? undefined : (r.author?.grade ?? undefined),
              majorKey: rAnon ? undefined : (r.author?.major ?? undefined),
              replyTo: parentName,
              content: r.content,
              time: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString(),
              likes: r.likeCount ?? 0,
              liked: r.liked ?? false,
            };
          })
        : undefined;
      return {
        id: c.id,
        name: isAnon ? '匿名用户' : (c.author?.nickname ?? '?'),
        avatar: isAnon ? '' : (c.author?.avatar ?? ''),
        gender: isAnon ? undefined : (c.author?.gender as 'male' | 'female' | 'other'),
        gradeKey: isAnon ? undefined : (c.author?.grade ?? undefined),
        majorKey: isAnon ? undefined : (c.author?.major ?? undefined),
        content: c.content,
        time,
        likes: c.likeCount ?? 0,
        liked: c.liked ?? false,
        isAnonymous: isAnon,
        replies,
      };
    };
    const comments: Comment[] = Array.isArray(data) ? data.map(mapComment) : [];
    return { [postId]: comments };
  },

  async createPost(post: {
    content: string;
    tags?: string[];
    isAnonymous?: boolean;
    pollOptions?: string[];
    images?: string[];
  }): Promise<ForumPost> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      const newPost: ForumPost = {
        id: 'new-' + Date.now(),
        avatar: '我',
        name: '我',
        gender: 'male',
        meta: '',
        createdAt: new Date().toISOString(),
        lang: 'tc',
        content: post.content,
        likes: 0,
        comments: 0,
        tags: post.tags,
        isAnonymous: post.isAnonymous,
      };
      mockPosts.unshift(newPost);
      return newPost;
    }
    const postType = post.pollOptions?.length ? 'poll' : post.images?.length ? 'image-text' : 'text';
    const { data } = await apiClient.post(ENDPOINTS.FORUM.POSTS, {
      postType,
      content: post.content,
      images: post.images ?? [],
      tags: post.tags ?? [],
      isAnonymous: post.isAnonymous ?? false,
      pollOptions: post.pollOptions,
    });
    return data;
  },

  async editPost(postId: string, post: { content: string; tags?: string[] }): Promise<ForumPost> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      const original = mockPosts.find((p) => p.id === postId) || mockPosts[0];
      return { ...original, ...post };
    }
    const { data } = await apiClient.put(ENDPOINTS.FORUM.EDIT_POST(postId), post);
    return data;
  },

  async deletePost(postId: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.FORUM.DELETE_POST(postId));
    return data;
  },

  async createComment(postId: string, content: string, isAnonymous?: boolean): Promise<Comment> {
    if (USE_MOCK) {
      return {
        id: 'comment-new-' + Date.now(),
        name: '我',
        avatar: '我',
        content,
        time: '剛剛',
        likes: 0,
        isAnonymous,
      };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.CREATE_COMMENT(postId), { content, isAnonymous: isAnonymous ?? false });
    const c = data as any;
    const isAnon = !!c.isAnonymous;
    return {
      id: c.id,
      name: isAnon ? '匿名用户' : (c.author?.nickname ?? '?'),
      avatar: isAnon ? '' : (c.author?.avatar ?? ''),
      content: c.content,
      time: typeof c.createdAt === 'string' ? c.createdAt : new Date(c.createdAt).toISOString(),
      likes: c.likeCount ?? 0,
      liked: false,
      isAnonymous: isAnon,
    };
  },

  async editComment(postId: string, commentId: string, content: string): Promise<Comment> {
    if (USE_MOCK) {
      return {
        id: commentId,
        name: '我',
        avatar: '我',
        content,
        time: '剛剛',
        likes: 0,
      };
    }
    const { data } = await apiClient.put(ENDPOINTS.FORUM.EDIT_COMMENT(commentId), { content });
    return data;
  },

  async deleteComment(postId: string, commentId: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.FORUM.DELETE_COMMENT(commentId));
    return data;
  },

  async likePost(postId: string): Promise<{ liked: boolean }> {
    if (USE_MOCK) {
      return { liked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.LIKE(postId));
    return data;
  },

  async bookmarkPost(postId: string): Promise<{ bookmarked: boolean }> {
    if (USE_MOCK) {
      return { bookmarked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.BOOKMARK(postId));
    return data;
  },

  async likeComment(commentId: string): Promise<{ liked: boolean }> {
    if (USE_MOCK) {
      return { liked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.LIKE_COMMENT(commentId));
    return data;
  },

  async bookmarkComment(commentId: string): Promise<{ bookmarked: boolean }> {
    if (USE_MOCK) {
      return { bookmarked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.BOOKMARK_COMMENT(commentId));
    return data;
  },

  async votePost(postId: string, optionId: string): Promise<{ voted: boolean }> {
    if (USE_MOCK) {
      return { voted: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.VOTE(postId), { optionId });
    return data;
  },

  async search(query: string): Promise<ForumPost[]> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts.filter((p) => p.content.includes(query));
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.SEARCH, { params: { q: query } });
    return (Array.isArray(data) ? data : []).map((p: any) => {
      const pollOpts = p.pollOptions as { id?: string; text: string; voteCount?: number }[] | undefined;
      const totalVotes = pollOpts?.reduce((s: number, o: any) => s + (o.voteCount ?? 0), 0) ?? 0;
      const pollOptions = pollOpts?.map((o: any) => ({
        ...o,
        percent: totalVotes > 0 ? Math.round(((o.voteCount ?? 0) / totalVotes) * 100) : 0,
      }));
      const isPoll = (p.postType === 'poll') || (pollOpts?.length ?? 0) > 0;
      return pollOptions ? { ...p, pollOptions, isPoll } : { ...p, isPoll };
    });
  },
};
