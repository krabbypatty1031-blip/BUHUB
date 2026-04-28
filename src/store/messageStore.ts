import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Contact, ChatMessage } from '../types';

type PersistedMessageState = {
  pinnedContactIds: string[];
  mutedContactIds: string[];
};

interface MessageState {
  contacts: Contact[];
  activeChatMessages: ChatMessage[];
  pinnedContacts: Set<string>;
  mutedContacts: Set<string>;
  markedUnreadContacts: Set<string>;
  readContacts: Set<string>;
  inboxSeenContacts: Set<string>;
  activeChatContactId: string | null;

  setContacts: (contacts: Contact[]) => void;
  setActiveChatMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  togglePin: (contactId: string) => void;
  toggleMute: (contactId: string) => void;
  markAsUnread: (contactId: string) => void;
  markAsRead: (contactId: string) => void;
  clearUnread: (contactId: string) => void;
  markInboxSeen: (contactIds: string[]) => void;
  handleIncomingMessage: (contactId: string) => void;
  setActiveChatContact: (contactId: string | null) => void;
  isPinned: (contactId: string, defaultPinned: boolean) => boolean;
  isMuted: (contactId: string) => boolean;
  getEffectiveUnread: (contactId: string, apiUnread: number) => number;
  getEffectiveTabUnread: (contactId: string, apiUnread: number) => number;
}

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      contacts: [],
      activeChatMessages: [],
      pinnedContacts: new Set<string>(),
      mutedContacts: new Set<string>(),
      markedUnreadContacts: new Set<string>(),
      readContacts: new Set<string>(),
      inboxSeenContacts: new Set<string>(),
      activeChatContactId: null,

      setContacts: (contacts) => set({ contacts }),
      setActiveChatMessages: (activeChatMessages) => set({ activeChatMessages }),
      addMessage: (message) =>
        set((state) => ({
          activeChatMessages: [...state.activeChatMessages, message],
        })),

      togglePin: (contactId) =>
        set((state) => {
          const next = new Set(state.pinnedContacts);
          if (next.has(contactId)) next.delete(contactId);
          else next.add(contactId);
          return { pinnedContacts: next };
        }),

      toggleMute: (contactId) =>
        set((state) => {
          const next = new Set(state.mutedContacts);
          if (next.has(contactId)) next.delete(contactId);
          else next.add(contactId);
          return { mutedContacts: next };
        }),

      markAsUnread: (contactId) =>
        set((state) => {
          const nextUnread = new Set(state.markedUnreadContacts);
          nextUnread.add(contactId);

          const nextRead = new Set(state.readContacts);
          nextRead.delete(contactId);

          const nextInboxSeen = new Set(state.inboxSeenContacts);
          nextInboxSeen.delete(contactId);

          return {
            markedUnreadContacts: nextUnread,
            readContacts: nextRead,
            inboxSeenContacts: nextInboxSeen,
          };
        }),

      markAsRead: (contactId) =>
        set((state) => {
          const nextRead = new Set(state.readContacts);
          nextRead.add(contactId);

          const nextUnread = new Set(state.markedUnreadContacts);
          nextUnread.delete(contactId);

          return {
            readContacts: nextRead,
            markedUnreadContacts: nextUnread,
          };
        }),

      clearUnread: (contactId) =>
        set((state) => {
          const nextUnread = new Set(state.markedUnreadContacts);
          nextUnread.delete(contactId);

          const nextRead = new Set(state.readContacts);
          nextRead.add(contactId);

          const nextInboxSeen = new Set(state.inboxSeenContacts);
          nextInboxSeen.add(contactId);

          return {
            markedUnreadContacts: nextUnread,
            readContacts: nextRead,
            inboxSeenContacts: nextInboxSeen,
          };
        }),

      markInboxSeen: (contactIds) =>
        set((state) => {
          if (contactIds.length === 0) return state;
          const nextInboxSeen = new Set(state.inboxSeenContacts);
          contactIds.forEach((contactId) => {
            if (contactId) nextInboxSeen.add(contactId);
          });
          return { inboxSeenContacts: nextInboxSeen };
        }),

      handleIncomingMessage: (contactId) =>
        set((state) => {
          if (!contactId) return state;

          const nextUnread = new Set(state.markedUnreadContacts);
          const nextRead = new Set(state.readContacts);
          const nextInboxSeen = new Set(state.inboxSeenContacts);

          if (state.activeChatContactId === contactId) {
            nextUnread.delete(contactId);
            nextRead.add(contactId);
            nextInboxSeen.add(contactId);
          } else {
            nextRead.delete(contactId);
            nextInboxSeen.delete(contactId);
          }

          return {
            markedUnreadContacts: nextUnread,
            readContacts: nextRead,
            inboxSeenContacts: nextInboxSeen,
          };
        }),

      setActiveChatContact: (contactId) => set({ activeChatContactId: contactId }),

      isPinned: (contactId, defaultPinned) => {
        const { pinnedContacts } = get();
        if (pinnedContacts.has(contactId)) return !defaultPinned;
        return defaultPinned;
      },

      isMuted: (contactId) => get().mutedContacts.has(contactId),

      getEffectiveUnread: (contactId, apiUnread) => {
        const { markedUnreadContacts, readContacts } = get();
        if (markedUnreadContacts.has(contactId)) return 1;
        if (readContacts.has(contactId)) return 0;
        return apiUnread;
      },

      getEffectiveTabUnread: (contactId, apiUnread) => {
        const { inboxSeenContacts, mutedContacts } = get();
        // Muted contacts do not contribute to the tab badge — matches the
        // WeChat / iMessage convention. The per-row indicator still reflects
        // the underlying unread count via getEffectiveUnread.
        if (mutedContacts.has(contactId)) return 0;
        const effectiveUnread = get().getEffectiveUnread(contactId, apiUnread);
        if (effectiveUnread <= 0) return 0;
        if (inboxSeenContacts.has(contactId)) return 0;
        return effectiveUnread;
      },
    }),
    {
      name: 'ulink-message-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist pin/mute state — transient UI state is not persisted
      partialize: (state): PersistedMessageState => ({
        pinnedContactIds: Array.from(state.pinnedContacts),
        mutedContactIds: Array.from(state.mutedContacts),
      }),
      merge: (persisted, currentState) => {
        const saved = persisted as PersistedMessageState | undefined;
        return {
          ...currentState,
          pinnedContacts: new Set(saved?.pinnedContactIds ?? []),
          mutedContacts: new Set(saved?.mutedContactIds ?? []),
        };
      },
    }
  )
);
