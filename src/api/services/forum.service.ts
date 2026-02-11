import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { ForumPost, CommentsData } from '../../types';

const USE_MOCK = true;

export const forumService = {
  async getPosts(): Promise<ForumPost[]> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts;
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.POSTS);
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

  async createPost(post: { content: string; tags?: string[]; isAnonymous?: boolean; pollOptions?: string[] }): Promise<ForumPost> {
    if (USE_MOCK) {
      return {
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
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.POSTS, post);
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
