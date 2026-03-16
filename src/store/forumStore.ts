import { create } from 'zustand';

interface ForumState {
  votedPolls: Record<string, number>;
  blockedUsers: Record<string, true>;
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
  votedPolls: {} as Record<string, number>,
  blockedUsers: {} as Record<string, true>,
  pollListRefreshKey: 0,

  bumpPollListRefresh: () => set((s) => ({ pollListRefreshKey: s.pollListRefreshKey + 1 })),

  votePoll: (postId, optionIndex) =>
    set((state) => ({
      votedPolls: { ...state.votedPolls, [postId]: optionIndex },
    })),

  setVotedPoll: (postId, optionIndex) =>
    set((state) => ({
      votedPolls: { ...state.votedPolls, [postId]: optionIndex },
    })),

  clearVotedPoll: (postId) =>
    set((state) => {
      if (!(postId in state.votedPolls)) return state;
      const { [postId]: _, ...rest } = state.votedPolls;
      return { votedPolls: rest };
    }),

  clearVotedPolls: () =>
    set(() => ({ votedPolls: {} as Record<string, number> })),

  setBlockedUsers: (users) =>
    set(() => {
      const record: Record<string, true> = {};
      for (const u of users) record[u] = true;
      return { blockedUsers: record };
    }),

  blockUser: (userName) =>
    set((state) => ({
      blockedUsers: { ...state.blockedUsers, [userName]: true as const },
    })),

  unblockUser: (userName) =>
    set((state) => {
      const { [userName]: _, ...rest } = state.blockedUsers;
      return { blockedUsers: rest };
    }),

  isBlocked: (userName) => userName in get().blockedUsers,
}));
