import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { ForumPost, CommentsData, Comment, PaginationParams } from '../../types';

const USE_MOCK = true;

export const forumService = {
  async getPosts(params?: PaginationParams): Promise<ForumPost[]> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts;
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.POSTS, { params });
    return data;
  },

  async getPostDetail(postId: string): Promise<ForumPost> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts.find((p) => p.id === postId) || mockPosts[0];
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.POST_DETAIL(postId));
    return data;
  },

  async getComments(postId: string): Promise<CommentsData> {
    if (USE_MOCK) {
      const { mockCommentsData } = await import('../../data/mock/forum');
      return { [postId]: mockCommentsData[postId] || [] };
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.COMMENTS(postId));
    return data;
  },

  async createPost(post: { content: string; tags?: string[]; isAnonymous?: boolean; pollOptions?: string[] }): Promise<ForumPost> {
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
    const { data } = await apiClient.post(ENDPOINTS.FORUM.POSTS, post);
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
    const { data } = await apiClient.put(ENDPOINTS.FORUM.EDIT_COMMENT(postId, commentId), { content });
    return data;
  },

  async deleteComment(postId: string, commentId: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.FORUM.DELETE_COMMENT(postId, commentId));
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

  async search(query: string): Promise<ForumPost[]> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts.filter((p) => p.content.includes(query));
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.SEARCH, { params: { q: query } });
    return data;
  },
};
