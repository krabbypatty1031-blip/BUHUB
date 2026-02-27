import { create } from 'zustand';

interface NotificationState {
  unreadLikes: number;
  unreadFollowers: number;
  unreadComments: number;
  unreadMessages: number;

  setUnreadLikes: (count: number) => void;
  setUnreadFollowers: (count: number) => void;
  setUnreadComments: (count: number) => void;
  setUnreadMessages: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadLikes: 0,
  unreadFollowers: 0,
  unreadComments: 0,
  unreadMessages: 0,

  setUnreadLikes: (unreadLikes) => set({ unreadLikes }),
  setUnreadFollowers: (unreadFollowers) => set({ unreadFollowers }),
  setUnreadComments: (unreadComments) => set({ unreadComments }),
  setUnreadMessages: (unreadMessages) => set({ unreadMessages }),
}));
