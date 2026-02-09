import { create } from 'zustand';
import type { Contact, ChatMessage } from '../types';

interface MessageState {
  contacts: Contact[];
  activeChatMessages: ChatMessage[];
  pinnedContacts: Set<string>;
  mutedContacts: Set<string>;
  markedUnreadContacts: Set<string>;
  readContacts: Set<string>;

  setContacts: (contacts: Contact[]) => void;
  setActiveChatMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  togglePin: (name: string) => void;
  toggleMute: (name: string) => void;
  markAsUnread: (name: string) => void;
  markAsRead: (name: string) => void;
  clearUnread: (name: string) => void;
  isPinned: (name: string, defaultPinned: boolean) => boolean;
  isMuted: (name: string) => boolean;
  getEffectiveUnread: (name: string, apiUnread: number) => number;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  contacts: [],
  activeChatMessages: [],
  pinnedContacts: new Set<string>(),
  mutedContacts: new Set<string>(),
  markedUnreadContacts: new Set<string>(),
  readContacts: new Set<string>(),

  setContacts: (contacts) => set({ contacts }),
  setActiveChatMessages: (activeChatMessages) => set({ activeChatMessages }),
  addMessage: (message) =>
    set((state) => ({
      activeChatMessages: [...state.activeChatMessages, message],
    })),

  togglePin: (name) =>
    set((state) => {
      const next = new Set(state.pinnedContacts);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { pinnedContacts: next };
    }),

  toggleMute: (name) =>
    set((state) => {
      const next = new Set(state.mutedContacts);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { mutedContacts: next };
    }),

  markAsUnread: (name) =>
    set((state) => {
      const nextUnread = new Set(state.markedUnreadContacts);
      nextUnread.add(name);
      const nextRead = new Set(state.readContacts);
      nextRead.delete(name);
      return { markedUnreadContacts: nextUnread, readContacts: nextRead };
    }),

  markAsRead: (name) =>
    set((state) => {
      const nextRead = new Set(state.readContacts);
      nextRead.add(name);
      const nextUnread = new Set(state.markedUnreadContacts);
      nextUnread.delete(name);
      return { readContacts: nextRead, markedUnreadContacts: nextUnread };
    }),

  clearUnread: (name) =>
    set((state) => {
      const nextUnread = new Set(state.markedUnreadContacts);
      nextUnread.delete(name);
      const nextRead = new Set(state.readContacts);
      nextRead.add(name);
      return { markedUnreadContacts: nextUnread, readContacts: nextRead };
    }),

  isPinned: (name, defaultPinned) => {
    const { pinnedContacts } = get();
    if (pinnedContacts.has(name)) return !defaultPinned;
    return defaultPinned;
  },

  isMuted: (name) => get().mutedContacts.has(name),

  getEffectiveUnread: (name, apiUnread) => {
    const { markedUnreadContacts, readContacts } = get();
    if (markedUnreadContacts.has(name)) return 1;
    if (readContacts.has(name)) return 0;
    return apiUnread;
  },
}));
