import { create } from 'zustand';

interface ForumState {
  votedPolls: Map<string, number>;
  blockedUsers: Set<string>;

  votePoll: (postId: string, optionIndex: number) => void;
  setBlockedUsers: (users: string[]) => void;
  blockUser: (userName: string) => void;
  unblockUser: (userName: string) => void;
  isBlocked: (userName: string) => boolean;
}

export const useForumStore = create<ForumState>()((set, get) => ({
  votedPolls: new Map<string, number>(),
  blockedUsers: new Set<string>(),

  votePoll: (postId, optionIndex) =>
    set((state) => {
      if (state.votedPolls.has(postId)) return state;
      const next = new Map(state.votedPolls);
      next.set(postId, optionIndex);
      return { votedPolls: next };
    }),

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
