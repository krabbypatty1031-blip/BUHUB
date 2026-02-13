import apiClient, { resolveImageUrl } from '../client';
import ENDPOINTS from '../endpoints';
import type { ForumPost, CommentsData, Comment, Reply, PaginationParams } from '../../types';
import { getAvatarDef } from '../../components/common/DefaultAvatarPicker';

/**
 * Split a raw avatar value from the backend into a resolved URL or defaultAvatar ID.
 * The DB `avatar` field may contain:
 *  - A relative path like "/uploads/avatars/xxx.jpg" → resolve to full URL
 *  - A full URL (http/https) like DiceBear → keep as-is
 *  - A default avatar ID like "Luna" → move to defaultAvatar
 */
function splitAvatar(raw: string | null | undefined): { avatar: string; defaultAvatar?: string } {
  if (!raw) return { avatar: '' };
  if (raw.startsWith('http://') || raw.startsWith('https://')) return { avatar: raw };
  if (raw.startsWith('/')) return { avatar: resolveImageUrl(raw) ?? raw };
  if (getAvatarDef(raw)) return { avatar: '', defaultAvatar: raw };
  return { avatar: raw };
}

/** Resolve relative image URLs in a post to full URLs */
function resolvePostUrls(post: ForumPost): ForumPost {
  const { avatar, defaultAvatar } = splitAvatar(post.avatar);
  return {
    ...post,
    avatar,
    defaultAvatar,
    image: resolveImageUrl(post.image),
    images: post.images?.map((u) => resolveImageUrl(u)!),
  };
}

const USE_MOCK = false;

export const forumService = {
  async getPosts(params?: PaginationParams): Promise<ForumPost[]> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts;
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.POSTS, { params });
    return (data as ForumPost[]).map(resolvePostUrls);
  },

  async getPostDetail(postId: string): Promise<ForumPost> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts.find((p) => p.id === postId) || mockPosts[0];
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.POST_DETAIL(postId));
    return resolvePostUrls(data as ForumPost);
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
      const replies: Reply[] | undefined = c.replies?.length
        ? c.replies.map((r: any) => {
            const ra = splitAvatar(r.author?.avatar);
            return {
              id: r.id,
              name: r.author?.nickname ?? '?',
              avatar: ra.avatar,
              defaultAvatar: ra.defaultAvatar,
              gradeKey: r.author?.grade ?? undefined,
              majorKey: r.author?.major ?? undefined,
              replyTo: c.author?.nickname ?? '?',
              content: r.content,
              time: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString(),
              likes: r.likeCount ?? 0,
              liked: r.liked ?? false,
              bookmarked: r.bookmarked ?? false,
            };
          })
        : undefined;
      const ca = splitAvatar(c.author?.avatar);
      return {
        id: c.id,
        name: c.author?.nickname ?? '?',
        avatar: ca.avatar,
        defaultAvatar: ca.defaultAvatar,
        gradeKey: c.author?.grade ?? undefined,
        majorKey: c.author?.major ?? undefined,
        content: c.content,
        time,
        likes: c.likeCount ?? 0,
        liked: c.liked ?? false,
        bookmarked: c.bookmarked ?? false,
        isAnonymous: c.isAnonymous,
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
    const { data } = await apiClient.post(ENDPOINTS.FORUM.CREATE_COMMENT(postId), { content, isAnonymous });
    return data;
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

  async likeComment(commentId: string): Promise<{ liked: boolean; likeCount: number }> {
    if (USE_MOCK) {
      return { liked: true, likeCount: 1 };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.COMMENT_LIKE(commentId));
    return data;
  },

  async bookmarkComment(commentId: string): Promise<{ bookmarked: boolean }> {
    if (USE_MOCK) {
      return { bookmarked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.COMMENT_BOOKMARK(commentId));
    return data;
  },

  async bookmarkPost(postId: string): Promise<{ bookmarked: boolean }> {
    if (USE_MOCK) {
      return { bookmarked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.BOOKMARK(postId));
    return data;
  },

  async votePost(postId: string, optionId: string): Promise<{ optionId: string; voteCount: number }> {
    if (USE_MOCK) {
      return { optionId, voteCount: 1 };
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
    return (data as ForumPost[]).map(resolvePostUrls);
  },
};
