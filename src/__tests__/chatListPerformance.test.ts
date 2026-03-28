/**
 * chatListPerformance.test.ts
 *
 * Unit tests for Phase 3 Plan 01 -- Chat list performance: referential
 * stability of the listData pipeline.
 *
 * Tests validate that the buildStableListData helper (which mirrors the
 * ChatScreen listData useMemo logic) preserves ChatListItem object references
 * for unchanged messages across recomputes, enabling React.memo short-circuits.
 */

// ---------------------------------------------------------------------------
// Mocks (same pattern as chatImageStability.test.ts)
// ---------------------------------------------------------------------------

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  setOnUnauthorized: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
  uploadClient: {
    post: jest.fn(),
  },
  API_BASE: 'http://localhost:3000/api',
}));

jest.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ language: 'tc', isLoggedIn: false, logout: jest.fn() }),
    subscribe: jest.fn(),
  },
}));

jest.mock('../store/forumStore', () => ({
  useForumStore: {
    getState: () => ({ clearVotedPolls: jest.fn() }),
  },
}));

jest.mock('../api/endpoints', () => ({
  __esModule: true,
  default: {
    MESSAGE: {
      CONVERSATIONS: '/messages/conversations',
      SEND: '/messages/send',
      CHAT: (id: string) => `/messages/chat/${id}`,
      CAN_SEND: (id: string) => `/messages/can-send/${id}`,
      TYPING: '/messages/typing',
      PRESENCE_HEARTBEAT: '/messages/presence',
      PRESENCE: (id: string) => `/messages/presence/${id}`,
      UPDATES: '/messages/updates',
      MARK_READ: (id: string) => `/messages/${id}/read`,
      MESSAGE_DETAIL: (id: string) => `/messages/${id}`,
      SEARCH: '/messages/search',
    },
  },
}));

jest.mock('../i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
    language: 'tc',
  },
  normalizeLanguage: () => 'tc',
}));

// ---------------------------------------------------------------------------
// Types (mirrored from ChatScreen.tsx to avoid importing internal types)
// ---------------------------------------------------------------------------

interface ChatMessage {
  id?: string;
  clientKey?: string;
  createdAt?: string;
  mediaGroupId?: string;
  type: 'received' | 'sent';
  text: string;
  images?: string[];
  mediaMetas?: Array<{
    uri?: string;
    width?: number;
    height?: number;
    localKey?: string;
  }>;
  audio?: {
    url: string;
    durationMs?: number;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    reactedByMe?: boolean;
  }>;
  replyTo?: {
    text?: string;
    from?: string;
    fromName?: string;
    messageId?: string;
    clientKey?: string;
    type?: string;
    title?: string;
    thumbnailUri?: string;
    durationMs?: number;
    cardType?: string;
  };
  imageAlbum?: {
    count: number;
  };
  time: string;
  isRecalled?: boolean;
  status?: 'read' | 'delivered' | 'sent' | 'sending' | 'failed';
  functionCard?: {
    type?: string;
    id?: string;
    index?: number;
    title?: string;
    posterName?: string;
    postId?: string;
  };
}

interface ChatHistory {
  date: string;
  messages: ChatMessage[];
}

type ChatListItem =
  | { kind: 'date'; date: string; key: string }
  | { kind: 'message'; message: ChatMessage; key: string; timeLabel?: string };

// ---------------------------------------------------------------------------
// areChatMessagesEquivalent (mirrored from ChatScreen.tsx lines 993-1013)
// ---------------------------------------------------------------------------

function isSameStringArray(a?: string[], b?: string[]) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function isSameMediaMetas(a?: ChatMessage['mediaMetas'], b?: ChatMessage['mediaMetas']) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i]?.uri !== b[i]?.uri ||
      a[i]?.width !== b[i]?.width ||
      a[i]?.height !== b[i]?.height ||
      a[i]?.localKey !== b[i]?.localKey
    ) {
      return false;
    }
  }
  return true;
}

function isSameReplyTo(a?: ChatMessage['replyTo'], b?: ChatMessage['replyTo']) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.text === b.text &&
    a.from === b.from &&
    a.fromName === b.fromName &&
    a.messageId === b.messageId &&
    a.clientKey === b.clientKey &&
    a.type === b.type &&
    a.title === b.title &&
    a.thumbnailUri === b.thumbnailUri &&
    a.durationMs === b.durationMs &&
    a.cardType === b.cardType
  );
}

function isSameFunctionCard(a?: ChatMessage['functionCard'], b?: ChatMessage['functionCard']) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.type === b.type &&
    a.id === b.id &&
    a.index === b.index &&
    a.title === b.title &&
    a.posterName === b.posterName &&
    a.postId === b.postId
  );
}

function isSameReactions(a?: ChatMessage['reactions'], b?: ChatMessage['reactions']) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const ra = a[i];
    const rb = b[i];
    if (
      ra.emoji !== rb.emoji ||
      ra.count !== rb.count ||
      Boolean(ra.reactedByMe) !== Boolean(rb.reactedByMe)
    ) {
      return false;
    }
  }
  return true;
}

function areChatMessagesEquivalent(a: ChatMessage, b: ChatMessage) {
  if (a === b) return true;
  return (
    a.id === b.id &&
    a.createdAt === b.createdAt &&
    a.mediaGroupId === b.mediaGroupId &&
    a.type === b.type &&
    a.text === b.text &&
    a.time === b.time &&
    a.isRecalled === b.isRecalled &&
    a.status === b.status &&
    a.audio?.url === b.audio?.url &&
    a.audio?.durationMs === b.audio?.durationMs &&
    a.imageAlbum?.count === b.imageAlbum?.count &&
    isSameReplyTo(a.replyTo, b.replyTo) &&
    isSameFunctionCard(a.functionCard, b.functionCard) &&
    isSameStringArray(a.images, b.images) &&
    isSameMediaMetas(a.mediaMetas, b.mediaMetas) &&
    isSameReactions(a.reactions, b.reactions)
  );
}

// ---------------------------------------------------------------------------
// buildStableListData — mirrors ChatScreen listData useMemo WITH referential
// stability. This is the function under test.
// ---------------------------------------------------------------------------

type ResolveTransientMediaPreview = (message: ChatMessage) => ChatMessage['mediaMetas'] | undefined;

function buildStableListData(
  displayChatHistory: ChatHistory[],
  resolveTransientMediaPreview: ResolveTransientMediaPreview,
  prevItemsMap: Map<string, ChatListItem>
): { items: ChatListItem[]; itemsMap: Map<string, ChatListItem> } {
  const items: ChatListItem[] = [];

  if (displayChatHistory) {
    const histories = [...(Array.isArray(displayChatHistory) ? displayChatHistory : [displayChatHistory])].reverse();
    histories.forEach((h: ChatHistory, gi: number) => {
      const dateKeySeed =
        h.messages
          .map((message) => message.createdAt)
          .find((createdAt) => {
            if (typeof createdAt !== 'string' || createdAt.length === 0) return false;
            const timestamp = Date.parse(createdAt);
            return Number.isFinite(timestamp);
          })
          ?.slice(0, 10) ?? h.date;
      const reversedMessages = [...h.messages].reverse();
      reversedMessages.forEach((m: ChatMessage, mi: number) => {
        const transientMediaMetas = resolveTransientMediaPreview(m);
        const renderMessage =
          transientMediaMetas && transientMediaMetas !== m.mediaMetas
            ? { ...m, mediaMetas: transientMediaMetas }
            : m;

        const messageKey = `msg-${renderMessage.id || renderMessage.clientKey || `${gi}-${mi}-${renderMessage.time}`}`;
        // Simplified: no time grouping logic (tests focus on referential stability, not time labels)
        const newTimeLabel: string | undefined = undefined;

        const prevItem = prevItemsMap.get(messageKey);
        const item: ChatListItem =
          prevItem &&
          prevItem.kind === 'message' &&
          prevItem.message === renderMessage &&
          prevItem.timeLabel === newTimeLabel
            ? prevItem // reuse SAME object reference
            : { kind: 'message', message: renderMessage, key: messageKey,
                ...(newTimeLabel ? { timeLabel: newTimeLabel } : {}) };
        items.push(item);
      });

      if (h.date) {
        const dateKey = `date-${h.date}-${dateKeySeed}`;
        const prevDateItem = prevItemsMap.get(dateKey);
        const dateItem: ChatListItem =
          prevDateItem && prevDateItem.kind === 'date' && prevDateItem.date === h.date
            ? prevDateItem
            : { kind: 'date', date: h.date, key: dateKey };
        items.push(dateItem);
      }
    });
  }

  const newMap = new Map<string, ChatListItem>();
  for (const item of items) {
    newMap.set(item.key, item);
  }

  return { items, itemsMap: newMap };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    type: 'received',
    text: 'Hello',
    time: '10:30',
    createdAt: '2026-03-28T10:30:00Z',
    status: 'read',
    ...overrides,
  };
}

function makeChatHistory(date: string, messages: ChatMessage[]): ChatHistory {
  return { date, messages };
}

const noopResolve: ResolveTransientMediaPreview = () => undefined;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('listData referential stability', () => {
  it('reuses ChatListItem objects for unchanged messages on recompute', () => {
    const msg1 = makeChatMessage({ id: 'a1', text: 'Hello' });
    const msg2 = makeChatMessage({ id: 'a2', text: 'World' });
    const history = [makeChatHistory('2026-03-28', [msg1, msg2])];

    // First computation
    const first = buildStableListData(history, noopResolve, new Map());

    // Second computation with SAME messages
    const second = buildStableListData(history, noopResolve, first.itemsMap);

    // Every message item should be the SAME object reference
    const firstMsgItems = first.items.filter((i) => i.kind === 'message');
    const secondMsgItems = second.items.filter((i) => i.kind === 'message');
    expect(firstMsgItems.length).toBe(2);
    expect(secondMsgItems.length).toBe(2);

    for (let i = 0; i < firstMsgItems.length; i++) {
      expect(secondMsgItems[i]).toBe(firstMsgItems[i]); // strict reference equality
    }
  });

  it('retains references for existing items when a new message is added', () => {
    const msg1 = makeChatMessage({ id: 'b1', text: 'First' });
    const msg2 = makeChatMessage({ id: 'b2', text: 'Second' });
    const history1 = [makeChatHistory('2026-03-28', [msg1, msg2])];

    const first = buildStableListData(history1, noopResolve, new Map());

    // Add a third message
    const msg3 = makeChatMessage({ id: 'b3', text: 'Third' });
    const history2 = [makeChatHistory('2026-03-28', [msg1, msg2, msg3])];

    const second = buildStableListData(history2, noopResolve, first.itemsMap);

    // Existing messages should still be same reference
    const firstMsgItems = first.items.filter((i) => i.kind === 'message');
    const secondMsgItems = second.items.filter((i) => i.kind === 'message');
    expect(secondMsgItems.length).toBe(3);

    // msg1 and msg2 should have same reference as before
    const firstMsg1 = firstMsgItems.find((i) => i.kind === 'message' && i.key.includes('b1'));
    const firstMsg2 = firstMsgItems.find((i) => i.kind === 'message' && i.key.includes('b2'));
    const secondMsg1 = secondMsgItems.find((i) => i.kind === 'message' && i.key.includes('b1'));
    const secondMsg2 = secondMsgItems.find((i) => i.kind === 'message' && i.key.includes('b2'));

    expect(secondMsg1).toBe(firstMsg1);
    expect(secondMsg2).toBe(firstMsg2);

    // msg3 is new, so it should be a different object
    const secondMsg3 = secondMsgItems.find((i) => i.kind === 'message' && i.key.includes('b3'));
    expect(secondMsg3).toBeDefined();
    // msg3 has no previous reference, so it must be a fresh object (not in first computation)
    expect(firstMsgItems.find((i) => i.kind === 'message' && i.key.includes('b3'))).toBeUndefined();
  });

  it('creates new reference only for the changed message when status changes', () => {
    const msg1 = makeChatMessage({ id: 'c1', text: 'Alpha', status: 'sending' });
    const msg2 = makeChatMessage({ id: 'c2', text: 'Beta', status: 'read' });
    const history1 = [makeChatHistory('2026-03-28', [msg1, msg2])];

    const first = buildStableListData(history1, noopResolve, new Map());

    // Change status of msg1 from 'sending' to 'sent' -- creates a NEW message object
    const msg1Updated = makeChatMessage({ id: 'c1', text: 'Alpha', status: 'sent' });
    const history2 = [makeChatHistory('2026-03-28', [msg1Updated, msg2])];

    const second = buildStableListData(history2, noopResolve, first.itemsMap);

    const firstItems = first.items.filter((i) => i.kind === 'message');
    const secondItems = second.items.filter((i) => i.kind === 'message');

    // msg1 changed status AND is a new object reference, so its ChatListItem should be NEW
    const firstC1 = firstItems.find((i) => i.kind === 'message' && i.key.includes('c1'));
    const secondC1 = secondItems.find((i) => i.kind === 'message' && i.key.includes('c1'));
    expect(secondC1).not.toBe(firstC1);

    // msg2 is unchanged (same object reference), so its ChatListItem should be REUSED
    const firstC2 = firstItems.find((i) => i.kind === 'message' && i.key.includes('c2'));
    const secondC2 = secondItems.find((i) => i.kind === 'message' && i.key.includes('c2'));
    expect(secondC2).toBe(firstC2);
  });

  it('areChatMessagesEquivalent returns true for same object reference (short-circuit)', () => {
    const msg = makeChatMessage({ id: 'd1', text: 'Test' });
    expect(areChatMessagesEquivalent(msg, msg)).toBe(true);
  });

  it('reuses date separator items with the same key', () => {
    const msg = makeChatMessage({ id: 'e1' });
    const history = [makeChatHistory('2026-03-28', [msg])];

    const first = buildStableListData(history, noopResolve, new Map());
    const second = buildStableListData(history, noopResolve, first.itemsMap);

    const firstDateItems = first.items.filter((i) => i.kind === 'date');
    const secondDateItems = second.items.filter((i) => i.kind === 'date');

    expect(firstDateItems.length).toBe(1);
    expect(secondDateItems.length).toBe(1);
    expect(secondDateItems[0]).toBe(firstDateItems[0]); // same reference
  });
});
