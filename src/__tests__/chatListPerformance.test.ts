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

// ---------------------------------------------------------------------------
// CHAT-05: Optimistic send pipeline
//
// These tests verify the optimistic message send flow:
// 1. buildLocalPendingMessage produces a correctly shaped ChatMessage
// 2. The send pipeline calls queueLocalPendingMessage synchronously before
//    the await executePendingSend, so the message bubble appears in the
//    React Query cache (and thus in the FlashList) before the network
//    round-trip completes.
// ---------------------------------------------------------------------------

// Mirrors buildLocalPendingMessage from ChatScreen.tsx (lines 2504-2532)
// Pure function (useCallback with empty deps), safe to replicate here.
function formatLocalMessageTime(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

let localIdCounter = 0;
function createLocalMessageId() {
  localIdCounter += 1;
  return `local-msg-${Date.now()}-${localIdCounter}`;
}

interface ChatReplyReference {
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
}

function buildLocalPendingMessage(message: {
  text?: string;
  images?: string[];
  mediaMetas?: ChatMessage['mediaMetas'];
  mediaGroupId?: string;
  audio?: ChatMessage['audio'];
  replyTo?: ChatReplyReference;
  imageAlbum?: ChatMessage['imageAlbum'];
  functionCard?: ChatMessage['functionCard'];
}): ChatMessage {
  const now = new Date();
  const localMessageId = createLocalMessageId();
  return {
    id: localMessageId,
    clientKey: localMessageId,
    createdAt: now.toISOString(),
    type: 'sent',
    text: message.text ?? '',
    ...(message.images ? { images: message.images } : {}),
    ...(message.mediaMetas ? { mediaMetas: message.mediaMetas } : {}),
    ...(message.mediaGroupId ? { mediaGroupId: message.mediaGroupId } : {}),
    ...(message.audio ? { audio: message.audio } : {}),
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    ...(message.imageAlbum ? { imageAlbum: message.imageAlbum } : {}),
    ...(message.functionCard ? { functionCard: message.functionCard } : {}),
    time: formatLocalMessageTime(now),
    status: 'sending',
  };
}

describe('CHAT-05: Optimistic send pipeline', () => {
  beforeEach(() => {
    localIdCounter = 0;
  });

  it('buildLocalPendingMessage returns message with status=sending, non-empty id, type=sent, and provided text', () => {
    const msg = buildLocalPendingMessage({ text: 'hello' });

    expect(msg.status).toBe('sending');
    expect(msg.id).toBeTruthy();
    expect(msg.id!.length).toBeGreaterThan(0);
    expect(msg.type).toBe('sent');
    expect(msg.text).toBe('hello');
    expect(msg.clientKey).toBe(msg.id);
    expect(msg.createdAt).toBeTruthy();
    expect(msg.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('buildLocalPendingMessage with no text returns text="" (empty string, not undefined)', () => {
    const msg = buildLocalPendingMessage({});

    expect(msg.text).toBe('');
    expect(msg.text).not.toBeUndefined();
    expect(msg.status).toBe('sending');
    expect(msg.type).toBe('sent');
  });

  it('buildLocalPendingMessage includes replyTo when provided', () => {
    const reply: ChatReplyReference = {
      text: 'original message',
      fromName: 'Alice',
      messageId: 'msg-999',
    };
    const msg = buildLocalPendingMessage({ text: 'reply text', replyTo: reply });

    expect(msg.replyTo).toBeDefined();
    expect(msg.replyTo!.text).toBe('original message');
    expect(msg.replyTo!.fromName).toBe('Alice');
    expect(msg.replyTo!.messageId).toBe('msg-999');
  });

  it('buildLocalPendingMessage omits optional fields when not provided', () => {
    const msg = buildLocalPendingMessage({ text: 'plain' });

    expect(msg.images).toBeUndefined();
    expect(msg.mediaMetas).toBeUndefined();
    expect(msg.audio).toBeUndefined();
    expect(msg.replyTo).toBeUndefined();
    expect(msg.imageAlbum).toBeUndefined();
    expect(msg.functionCard).toBeUndefined();
    expect(msg.mediaGroupId).toBeUndefined();
  });

  it('each call to buildLocalPendingMessage generates a unique id', () => {
    const msg1 = buildLocalPendingMessage({ text: 'first' });
    const msg2 = buildLocalPendingMessage({ text: 'second' });

    expect(msg1.id).not.toBe(msg2.id);
    expect(msg1.clientKey).not.toBe(msg2.clientKey);
  });

  // -------------------------------------------------------------------
  // Code structure verification tests
  // These tests read the actual ChatScreen.tsx source code and verify
  // that the optimistic send pipeline is correctly ordered:
  //   1. queueLocalPendingMessage is called BEFORE executePendingSend
  //   2. patchPendingMessageInCache is called synchronously inside
  //      queueLocalPendingMessage (no await/Promise/setTimeout wrapper)
  // -------------------------------------------------------------------

  const fs = require('fs');
  const path = require('path');
  const chatScreenPath = path.resolve(__dirname, '../screens/messages/ChatScreen.tsx');
  const chatScreenSource = fs.readFileSync(chatScreenPath, 'utf-8');

  it('queueLocalPendingMessage is called BEFORE executePendingSend in text send flow', () => {
    // Find the text send block: queueLocalPendingMessage(localMessage, textRequest)
    // followed by await executePendingSend(localMessage.id!, textRequest)
    const queueIndex = chatScreenSource.indexOf('queueLocalPendingMessage(localMessage, textRequest)');
    const executeIndex = chatScreenSource.indexOf(
      'executePendingSend(localMessage.id!, textRequest)',
      queueIndex
    );

    expect(queueIndex).toBeGreaterThan(-1);
    expect(executeIndex).toBeGreaterThan(-1);
    // queue must come BEFORE execute in the source
    expect(queueIndex).toBeLessThan(executeIndex);

    // Verify the execute call has await (it's async, not fire-and-forget for text)
    const betweenQueueAndExecute = chatScreenSource.slice(queueIndex, executeIndex);
    expect(betweenQueueAndExecute).toContain('await');
  });

  it('patchPendingMessageInCache inside queueLocalPendingMessage is synchronous (no await/setTimeout/Promise wrapper)', () => {
    // Find the queueLocalPendingMessage function body
    const queueFnStart = chatScreenSource.indexOf('const queueLocalPendingMessage = useCallback(');
    expect(queueFnStart).toBeGreaterThan(-1);

    // Find the closing of queueLocalPendingMessage (next useCallback or named const)
    const queueFnEnd = chatScreenSource.indexOf(
      'const buildLocalPendingMessage',
      queueFnStart
    );
    expect(queueFnEnd).toBeGreaterThan(-1);

    const queueFnBody = chatScreenSource.slice(queueFnStart, queueFnEnd);

    // Verify patchPendingMessageInCache is called in the body
    expect(queueFnBody).toContain('patchPendingMessageInCache(message)');

    // Verify NO async wrapper around patchPendingMessageInCache:
    // Get the line containing patchPendingMessageInCache(message)
    const patchCallIndex = queueFnBody.indexOf('patchPendingMessageInCache(message)');
    // Get a window of 100 chars before the call to check for await/setTimeout/Promise
    const preceding = queueFnBody.slice(Math.max(0, patchCallIndex - 100), patchCallIndex);

    expect(preceding).not.toMatch(/await\s+$/);
    expect(preceding).not.toMatch(/setTimeout\s*\(/);
    expect(preceding).not.toMatch(/Promise\s*\.\s*resolve/);
    expect(preceding).not.toMatch(/requestAnimationFrame\s*\(/);
    expect(preceding).not.toMatch(/InteractionManager\s*\.\s*runAfterInteractions/);

    // Also verify the patchPendingMessageInCache function itself is synchronous
    const patchFnStart = chatScreenSource.indexOf('const patchPendingMessageInCache = useCallback(');
    expect(patchFnStart).toBeGreaterThan(-1);

    const patchFnEnd = chatScreenSource.indexOf(
      'const queueLocalPendingMessage',
      patchFnStart
    );
    const patchFnBody = chatScreenSource.slice(patchFnStart, patchFnEnd);

    // Verify patchPendingMessageInCache does NOT use await (it's a sync cache patch)
    expect(patchFnBody).not.toMatch(/async\s*\(/);
    expect(patchFnBody).not.toContain('await ');
  });
});
