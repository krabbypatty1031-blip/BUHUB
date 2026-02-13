import { create } from 'zustand';

interface ForumState {
  likedPosts: Set<string>;
  bookmarkedPosts: Set<string>;
  votedPolls: Map<string, number>;
  blockedUsers: Set<string>;

  toggleLike: (postId: string) => void;
  toggleBookmark: (postId: string) => void;
  votePoll: (postId: string, optionIndex: number) => void;
  isLiked: (postId: string) => boolean;
  isBookmarked: (postId: string) => boolean;
  setBlockedUsers: (users: string[]) => void;
  blockUser: (userName: string) => void;
  unblockUser: (userName: string) => void;
  isBlocked: (userName: string) => boolean;
}

export const useForumStore = create<ForumState>()((set, get) => ({
  likedPosts: new Set<string>(),
  bookmarkedPosts: new Set<string>(),
  votedPolls: new Map<string, number>(),
  blockedUsers: new Set<string>(),

  toggleLike: (postId) =>
    set((state) => {
      const next = new Set(state.likedPosts);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return { likedPosts: next };
    }),

  toggleBookmark: (postId) =>
    set((state) => {
      const next = new Set(state.bookmarkedPosts);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return { bookmarkedPosts: next };
    }),

  votePoll: (postId, optionIndex) =>
    set((state) => {
      if (state.votedPolls.has(postId)) return state;
      const next = new Map(state.votedPolls);
      next.set(postId, optionIndex);
      return { votedPolls: next };
    }),

  isLiked: (postId) => get().likedPosts.has(postId),
  isBookmarked: (postId) => get().bookmarkedPosts.has(postId),

  setBlockedUsers: (users) =>
    set(() => ({ blockedUsers: new Set(users) })),

  blockUser: (userName) =>
    set((state) => {
      const next = new Set(state.blockedUsers);
      next.add(userName);
      return { blockedUsers: next };
    }),

  unblockUser: (userName) =>
    set((state) => {
      const next = new Set(state.blockedUsers);
      next.delete(userName);
      return { blockedUsers: next };
    }),

  isBlocked: (userName) => get().blockedUsers.has(userName),
}));
