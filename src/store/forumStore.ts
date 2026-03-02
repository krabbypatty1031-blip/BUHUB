import { create } from 'zustand';

interface ForumState {
  votedPolls: Map<string, number>;
  blockedUsers: Set<string>;
  /** Bump to force forum list to re-render after vote (so poll results show). */
  pollListRefreshKey: number;

  votePoll: (postId: string, optionIndex: number) => void;
  setVotedPoll: (postId: string, optionIndex: number) => void;
  clearVotedPoll: (postId: string) => void;
  clearVotedPolls: () => void;
  bumpPollListRefresh: () => void;
  setBlockedUsers: (users: string[]) => void;
  blockUser: (userName: string) => void;
  unblockUser: (userName: string) => void;
  isBlocked: (userName: string) => boolean;
}

export const useForumStore = create<ForumState>()((set, get) => ({
  votedPolls: new Map<string, number>(),
  blockedUsers: new Set<string>(),
  pollListRefreshKey: 0,

  bumpPollListRefresh: () => set((s) => ({ pollListRefreshKey: s.pollListRefreshKey + 1 })),

  votePoll: (postId, optionIndex) =>
    set((state) => {
      const next = new Map(state.votedPolls);
      next.set(postId, optionIndex);
      return { votedPolls: next };
    }),

  setVotedPoll: (postId, optionIndex) =>
    set((state) => {
      const next = new Map(state.votedPolls);
      next.set(postId, optionIndex);
      return { votedPolls: next };
    }),

  clearVotedPoll: (postId) =>
    set((state) => {
      if (!state.votedPolls.has(postId)) return state;
      const next = new Map(state.votedPolls);
      next.delete(postId);
      return { votedPolls: next };
    }),

  clearVotedPolls: () =>
    set(() => ({ votedPolls: new Map<string, number>() })),

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
