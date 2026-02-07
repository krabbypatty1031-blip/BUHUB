import { create } from 'zustand';
import type { Contact, ChatMessage } from '../types';

interface MessageState {
  contacts: Contact[];
  activeChatMessages: ChatMessage[];

  setContacts: (contacts: Contact[]) => void;
  setActiveChatMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
}

export const useMessageStore = create<MessageState>()((set) => ({
  contacts: [],
  activeChatMessages: [],

  setContacts: (contacts) => set({ contacts }),
  setActiveChatMessages: (activeChatMessages) => set({ activeChatMessages }),
  addMessage: (message) =>
    set((state) => ({
      activeChatMessages: [...state.activeChatMessages, message],
    })),
}));
