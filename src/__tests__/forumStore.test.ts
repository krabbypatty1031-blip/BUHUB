import { useForumStore } from '../store/forumStore';

describe('forumStore', () => {
  beforeEach(() => {
    // Reset store state
    useForumStore.setState({
      likedPosts: new Set(),
      bookmarkedPosts: new Set(),
      votedPolls: new Map(),
    });
  });

  describe('toggleLike', () => {
    it('adds a post to liked set', () => {
      useForumStore.getState().toggleLike('post-1');
      expect(useForumStore.getState().likedPosts.has('post-1')).toBe(true);
    });

    it('removes a post from liked set on second toggle', () => {
      useForumStore.getState().toggleLike('post-1');
      useForumStore.getState().toggleLike('post-1');
      expect(useForumStore.getState().likedPosts.has('post-1')).toBe(false);
    });

    it('can like multiple posts', () => {
      useForumStore.getState().toggleLike('post-1');
      useForumStore.getState().toggleLike('post-2');
      expect(useForumStore.getState().likedPosts.size).toBe(2);
    });
  });

  describe('toggleBookmark', () => {
    it('adds a post to bookmarked set', () => {
      useForumStore.getState().toggleBookmark('post-1');
      expect(useForumStore.getState().bookmarkedPosts.has('post-1')).toBe(true);
    });

    it('removes a post from bookmarked set on second toggle', () => {
      useForumStore.getState().toggleBookmark('post-1');
      useForumStore.getState().toggleBookmark('post-1');
      expect(useForumStore.getState().bookmarkedPosts.has('post-1')).toBe(false);
    });
  });

  describe('isLiked / isBookmarked', () => {
    it('returns correct state', () => {
      expect(useForumStore.getState().isLiked('post-1')).toBe(false);
      useForumStore.getState().toggleLike('post-1');
      expect(useForumStore.getState().isLiked('post-1')).toBe(true);

      expect(useForumStore.getState().isBookmarked('post-2')).toBe(false);
      useForumStore.getState().toggleBookmark('post-2');
      expect(useForumStore.getState().isBookmarked('post-2')).toBe(true);
    });
  });
});
