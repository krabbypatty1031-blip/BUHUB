import { create } from 'zustand';

interface NotificationState {
  // Card / per-tab counts. Truth values shown on cards and per-tab message badge.
  // Cleared by detail screens (likes/followers/comments) or by inbox-seen (messages).
  unreadLikes: number;
  unreadFollowers: number;
  unreadComments: number;
  unreadMessages: number;

  // Baselines snapshotted when user enters chatscreen.
  // Tab-bar contribution per type = max(0, unread - seenAtChat).
  // Reset to 0 when its unread is reset to 0 (user viewed detail).
  // Pinned to current unread while user is on chatscreen.
  seenAtChatLikes: number;
  seenAtChatFollowers: number;
  seenAtChatComments: number;
  seenAtChatMessages: number;

  // True while user is focused on MessagesScreen (the chatscreen).
  messagesScreenFocused: boolean;

  setUnreadLikes: (count: number) => void;
  setUnreadFollowers: (count: number) => void;
  setUnreadComments: (count: number) => void;
  setUnreadMessages: (count: number) => void;

  // Snapshot all baselines to current unread values. Called on chatscreen focus
  // so the tab badge clears (contribution becomes max(0, unread - unread) = 0).
  markChatscreenViewed: () => void;

  // Toggle chatscreen focus. While true, setUnread* keep baseline pinned to
  // the new unread value so the tab badge stays at 0.
  setMessagesScreenFocused: (focused: boolean) => void;
}

function nextSeen(next: number, prevSeen: number, focused: boolean): number {
  if (next <= 0) return 0;
  if (focused) return next;
  if (next < prevSeen) return next;
  return prevSeen;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadLikes: 0,
  unreadFollowers: 0,
  unreadComments: 0,
  unreadMessages: 0,

  seenAtChatLikes: 0,
  seenAtChatFollowers: 0,
  seenAtChatComments: 0,
  seenAtChatMessages: 0,

  messagesScreenFocused: false,

  setUnreadLikes: (unreadLikes) =>
    set((state) => ({
      unreadLikes,
      seenAtChatLikes: nextSeen(unreadLikes, state.seenAtChatLikes, state.messagesScreenFocused),
    })),

  setUnreadFollowers: (unreadFollowers) =>
    set((state) => ({
      unreadFollowers,
      seenAtChatFollowers: nextSeen(unreadFollowers, state.seenAtChatFollowers, state.messagesScreenFocused),
    })),

  setUnreadComments: (unreadComments) =>
    set((state) => ({
      unreadComments,
      seenAtChatComments: nextSeen(unreadComments, state.seenAtChatComments, state.messagesScreenFocused),
    })),

  setUnreadMessages: (unreadMessages) =>
    set((state) => ({
      unreadMessages,
      seenAtChatMessages: nextSeen(unreadMessages, state.seenAtChatMessages, state.messagesScreenFocused),
    })),

  markChatscreenViewed: () =>
    set((state) => ({
      seenAtChatLikes: state.unreadLikes,
      seenAtChatFollowers: state.unreadFollowers,
      seenAtChatComments: state.unreadComments,
      seenAtChatMessages: state.unreadMessages,
    })),

  setMessagesScreenFocused: (messagesScreenFocused) =>
    set((state) => {
      if (!messagesScreenFocused) {
        return { messagesScreenFocused };
      }
      return {
        messagesScreenFocused,
        seenAtChatLikes: state.unreadLikes,
        seenAtChatFollowers: state.unreadFollowers,
        seenAtChatComments: state.unreadComments,
        seenAtChatMessages: state.unreadMessages,
      };
    }),
}));
