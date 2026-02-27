import { create } from 'zustand';

type TypingState = {
  isTyping: boolean;
  updatedAt: number;
};

interface MessageRealtimeState {
  typingByContact: Record<string, TypingState>;
  setTyping: (contactId: string, isTyping: boolean, updatedAt?: number) => void;
  clearTyping: (contactId: string) => void;
}

export const useMessageRealtimeStore = create<MessageRealtimeState>()((set) => ({
  typingByContact: {},
  setTyping: (contactId, isTyping, updatedAt = Date.now()) =>
    set((state) => {
      if (!contactId) return state;
      if (!isTyping) {
        if (!state.typingByContact[contactId]) return state;
        const next = { ...state.typingByContact };
        delete next[contactId];
        return { typingByContact: next };
      }
      return {
        typingByContact: {
          ...state.typingByContact,
          [contactId]: { isTyping: true, updatedAt },
        },
      };
    }),
  clearTyping: (contactId) =>
    set((state) => {
      if (!state.typingByContact[contactId]) return state;
      const next = { ...state.typingByContact };
      delete next[contactId];
      return { typingByContact: next };
    }),
}));
