import { create } from 'zustand';

type TypingState = {
  isTyping: boolean;
  updatedAt: number;
};

interface MessageRealtimeState {
  typingByContact: Record<string, TypingState>;
  setTyping: (contactId: string, isTyping: boolean, updatedAt?: number) => void;
  clearTyping: (contactId: string) => void;
  // pending client keys per contact (for optimistic sends)
  pendingClientKeysByContact: Record<string, Set<string>>;
  addPendingClientKey: (contactId: string, key: string) => void;
  removePendingClientKey: (contactId: string, key: string) => void;
  hasPendingForContact: (contactId: string) => boolean;
}

export const useMessageRealtimeStore = create<MessageRealtimeState>()((set) => ({
  typingByContact: {},
  pendingClientKeysByContact: {},
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
  addPendingClientKey: (contactId, key) =>
    set((state) => {
      if (!contactId || !key) return state;
      const next = { ...state.pendingClientKeysByContact };
      const s = next[contactId] ? new Set(Array.from(next[contactId])) : new Set<string>();
      s.add(key);
      next[contactId] = s;
      return { pendingClientKeysByContact: next } as unknown as MessageRealtimeState;
    }),
  removePendingClientKey: (contactId, key) =>
    set((state) => {
      if (!contactId || !key || !state.pendingClientKeysByContact[contactId]) return state;
      const next = { ...state.pendingClientKeysByContact };
      const s = new Set(Array.from(next[contactId]));
      s.delete(key);
      if (s.size === 0) delete next[contactId];
      else next[contactId] = s;
      return { pendingClientKeysByContact: next } as unknown as MessageRealtimeState;
    }),
  hasPendingForContact: (contactId) => {
    const state = useMessageRealtimeStore.getState();
    return Boolean(contactId && state.pendingClientKeysByContact[contactId] && state.pendingClientKeysByContact[contactId].size > 0);
  },
}));
