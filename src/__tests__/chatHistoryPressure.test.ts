/**
 * Pressure test: two users exchange 200 messages. After they leave and reopen
 * the chat screen, the FIRST page (latest 50) loads via useChatHistory, and as
 * the user scrolls back, older pages load and merge in. Verifies:
 *   - mergeChatHistories accumulates pages without dropping or duplicating.
 *   - Final merged history contains every message in correct chronological
 *     order, grouped by date.
 *   - Page-overlap (server returns one message that's already on screen) does
 *     not produce duplicates.
 *   - Empty trailing page leaves the merge stable and signals end-of-history.
 *   - The recent reconcile-fix preserves cached older messages so the
 *     AsyncStorage archive is not truncated to page-1 on every refetch.
 *   - The recent WS-fix prevents single-message poison when current cache empty.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { mergeChatHistories } from '../utils/messageCache';
import type { ChatHistory, ChatMessage } from '../types';

const ROOT = resolve(__dirname, '..');

// ----- synthetic dataset --------------------------------------------------

const PAGE_SIZE = 50;
const TOTAL = 200; // 4 full pages
const EPOCH = Date.UTC(2026, 3, 1, 12, 0, 0); // 2026-04-01T12:00:00Z

function makeMessage(seq: number): ChatMessage {
  // Alternate sender/receiver. Time advances 1 minute per message → spans
  // multiple date groups when seq wraps past a day boundary.
  const isMine = seq % 2 === 0;
  const createdAt = new Date(EPOCH + seq * 60 * 1000).toISOString();
  return {
    id: `msg-${String(seq).padStart(4, '0')}`,
    type: isMine ? 'sent' : 'received',
    text: `message ${seq}`,
    images: [],
    createdAt,
    time: createdAt.slice(11, 16),
    status: isMine ? 'read' : undefined,
  };
}

function dateKeyFromISO(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function groupByDate(messages: ChatMessage[]): ChatHistory[] {
  const map = new Map<string, ChatMessage[]>();
  messages.forEach((m) => {
    const key = dateKeyFromISO(m.createdAt!);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, msgs]) => ({ date, messages: msgs }));
}

// Server returns page 1 = latest, page 2 = next-older, ... Same as
// messageService.getChatHistoryChunk semantics in the mobile codebase.
function buildServerPage(allMessagesNewestLast: ChatMessage[], page: number) {
  const total = allMessagesNewestLast.length;
  const end = Math.max(0, total - (page - 1) * PAGE_SIZE);
  const start = Math.max(0, end - PAGE_SIZE);
  const slice = allMessagesNewestLast.slice(start, end);
  return {
    history: groupByDate(slice),
    hasMore: start > 0,
    page,
    limit: PAGE_SIZE,
    messageCount: slice.length,
  };
}

// ----- runtime pagination simulation --------------------------------------

describe('CHAT-PAGINATION-01 — 200-message pressure test', () => {
  const allMessages: ChatMessage[] = Array.from({ length: TOTAL }, (_, i) => makeMessage(i));

  it('produces 4 server pages with correct hasMore flags', () => {
    const p1 = buildServerPage(allMessages, 1);
    const p2 = buildServerPage(allMessages, 2);
    const p3 = buildServerPage(allMessages, 3);
    const p4 = buildServerPage(allMessages, 4);
    const p5 = buildServerPage(allMessages, 5);

    expect(p1.messageCount).toBe(PAGE_SIZE);
    expect(p2.messageCount).toBe(PAGE_SIZE);
    expect(p3.messageCount).toBe(PAGE_SIZE);
    expect(p4.messageCount).toBe(PAGE_SIZE);
    expect(p5.messageCount).toBe(0);

    expect(p1.hasMore).toBe(true);
    expect(p2.hasMore).toBe(true);
    expect(p3.hasMore).toBe(true);
    expect(p4.hasMore).toBe(false); // exactly 200/50 = 4 pages, no more
    expect(p5.hasMore).toBe(false);
  });

  it('open chat → load page 1 → scroll → load pages 2..4 accumulates all 200 messages', () => {
    const p1 = buildServerPage(allMessages, 1);
    const p2 = buildServerPage(allMessages, 2);
    const p3 = buildServerPage(allMessages, 3);
    const p4 = buildServerPage(allMessages, 4);

    // Step 1: useChatHistory returns page 1 (latest 50). User opens chat.
    let visible: ChatHistory[] = p1.history;
    let messagesShown = visible.flatMap((g) => g.messages).length;
    expect(messagesShown).toBe(50);

    // Step 2: scroll up → load page 2 → mergeChatHistories(older=p2, latest=visible).
    visible = mergeChatHistories(p2.history, visible);
    messagesShown = visible.flatMap((g) => g.messages).length;
    expect(messagesShown).toBe(100);

    // Step 3: scroll up → load page 3.
    visible = mergeChatHistories(p3.history, visible);
    messagesShown = visible.flatMap((g) => g.messages).length;
    expect(messagesShown).toBe(150);

    // Step 4: scroll up → load page 4 (final).
    visible = mergeChatHistories(p4.history, visible);
    messagesShown = visible.flatMap((g) => g.messages).length;
    expect(messagesShown).toBe(TOTAL);

    // Final ordering: every message from msg-0000 through msg-0199 in order.
    const flat = visible.flatMap((g) => g.messages);
    expect(flat.map((m) => m.id)).toEqual(allMessages.map((m) => m.id));

    // No duplicates: message-id set size == flat length.
    expect(new Set(flat.map((m) => m.id)).size).toBe(TOTAL);
  });

  it('handles overlap between pages (server returns a message already on screen) without duplicating', () => {
    const p1 = buildServerPage(allMessages, 1);
    const overlappingP2 = buildServerPage(allMessages, 2);

    // Inject a known-duplicate message from p1 into p2 to force the overlap.
    const injected: ChatHistory[] = JSON.parse(JSON.stringify(overlappingP2.history));
    const dupMessage = p1.history[0].messages[0];
    injected[injected.length - 1].messages.push({ ...dupMessage });

    let visible: ChatHistory[] = p1.history;
    visible = mergeChatHistories(injected, visible);

    const ids = visible.flatMap((g) => g.messages).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    expect(ids.length).toBe(100); // page 1 (50) + page 2 (50) — duplicate dropped
  });

  it('an empty older-page leaves history stable (end of pagination)', () => {
    const p1 = buildServerPage(allMessages, 1);
    let visible: ChatHistory[] = p1.history;
    const before = visible.flatMap((g) => g.messages).length;

    const emptyChunk: ChatHistory[] = [];
    visible = mergeChatHistories(emptyChunk, visible);
    expect(visible.flatMap((g) => g.messages).length).toBe(before);
  });

  it('merging in arbitrary order still produces the full deduped list (idempotence)', () => {
    const pages = [1, 2, 3, 4].map((p) => buildServerPage(allMessages, p));

    let forwardVisible: ChatHistory[] = pages[0].history;
    for (let i = 1; i < pages.length; i += 1) {
      forwardVisible = mergeChatHistories(pages[i].history, forwardVisible);
    }

    let reverseVisible: ChatHistory[] = pages[pages.length - 1].history;
    for (let i = pages.length - 2; i >= 0; i -= 1) {
      reverseVisible = mergeChatHistories(reverseVisible, pages[i].history);
    }

    const forwardIds = forwardVisible.flatMap((g) => g.messages).map((m) => m.id);
    const reverseIds = reverseVisible.flatMap((g) => g.messages).map((m) => m.id);

    expect(forwardIds).toEqual(allMessages.map((m) => m.id));
    expect(reverseIds).toEqual(allMessages.map((m) => m.id));
  });
});

// ----- static-analysis: ChatScreen wiring + recent fixes ------------------

const FILES = {
  chatScreen: `${ROOT}/screens/messages/ChatScreen.tsx`,
  useMessages: `${ROOT}/hooks/useMessages.ts`,
  useMessageRealtime: `${ROOT}/hooks/useMessageRealtime.ts`,
  messageCache: `${ROOT}/utils/messageCache.ts`,
} as const;

const cache = new Map<keyof typeof FILES, string>();
const read = (key: keyof typeof FILES): string => {
  const cached = cache.get(key);
  if (cached) return cached;
  const text = readFileSync(FILES[key], 'utf-8');
  cache.set(key, text);
  return text;
};

describe('CHAT-PAGINATION-02 — ChatScreen wires onEndReached → loadOlderHistory', () => {
  const src = () => read('chatScreen');

  it('FlashList handler chain: onEndReached → handleEndReached → loadOlderHistory', () => {
    expect(src()).toMatch(/onEndReached=\{handleEndReached\}/);
    expect(src()).toMatch(/handleEndReached\s*=\s*useCallback\(\s*\(\s*\)\s*=>\s*\{\s*void\s+loadOlderHistory\(\)/);
  });

  it('loadOlderHistory increments page and respects hasMore via applyOlderHistoryChunk', () => {
    expect(src()).toMatch(/getChatHistoryChunk\(\s*contactId\s*,\s*\{\s*page:\s*nextHistoryPage/);
    expect(src()).toMatch(/applyOlderHistoryChunk\(chunk\)/);
    expect(src()).toMatch(/setHasOlderHistory\(chunk\.hasMore\)/);
    expect(src()).toMatch(/setNextHistoryPage\(chunk\.page \+ 1\)/);
  });

  it('uses the shared mergeChatHistories util (no local duplicate)', () => {
    expect(src()).toMatch(/from\s+['"]\.\.\/\.\.\/utils\/messageCache['"]/);
    expect(src()).toMatch(/mergeChatHistories,/); // imported in the destructured list
    expect(src()).not.toMatch(/^function\s+mergeChatHistories\s*\(/m);
  });
});

describe('CHAT-PAGINATION-03 — recent fixes preserve full history across refetches', () => {
  it('reconciler keeps cached messages older than the server first page', () => {
    const text = read('useMessages');
    expect(text).toMatch(/createdAtMs\s*<\s*oldestFetchedTimestampMs\s*-\s*HISTORY_EDGE_TOLERANCE_MS/);
  });

  it('WS peer-message branch skips writing when current cache is empty (no AsyncStorage poison)', () => {
    const text = read('useMessageRealtime');
    expect(text).toMatch(
      /Array\.isArray\(current\)\s*&&\s*current\.length\s*>\s*0[\s\S]*?appendMessageToHistory\(current,\s*nextMessage,\s*language\)[\s\S]*?:\s*undefined/
    );
  });

  it('messageCache exports the shared mergeChatHistories', () => {
    const text = read('messageCache');
    expect(text).toMatch(/export\s+function\s+mergeChatHistories\s*\(/);
  });
});
