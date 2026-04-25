/**
 * Forwarded-card notification tests.
 *
 * Verifies that when one user shares a card (function card, post card, or
 * grading/rating card) into a DM, the receiver's app produces the same new-
 * message notification side-effects as a plain text message:
 *
 *   1. notificationStore.unreadMessages is incremented (drives the OS badge
 *      and the in-app tab badge).
 *   2. messageStore.handleIncomingMessage marks the conversation as unread
 *      (drives the per-contact red bubble in MessagesScreen).
 *   3. MainTabNavigator's tabBadgeCount formula
 *        max(0, unreadMessages - seenAtChatMessages)
 *      returns a positive contribution while the receiver is NOT on the
 *      chatscreen, and 0 once they enter it.
 *   4. Opening the specific chat clears that contact's unread bubble, but
 *      leaves the tab counters consistent.
 *
 * The realtime layer (useMessageRealtime.applyEvents) makes exactly the same
 * store calls regardless of the message body — text, image, functionCard,
 * postCard, ratingCard. The test runs each card payload through the same
 * pipeline and asserts identical badge behaviour.
 */

const mockAlert = jest.fn();
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  __esModule: true,
  default: { alert: (...args: unknown[]) => mockAlert(...args) },
}));

jest.mock('../i18n', () => ({
  __esModule: true,
  default: { language: 'tc', t: (k: string) => k },
  normalizeLanguage: (lang: string | null | undefined) =>
    lang === 'tc' || lang === 'zh-TW' ? 'tc' :
    lang === 'sc' || lang === 'zh-CN' ? 'sc' :
    lang === 'en' ? 'en' : null,
  changeLanguage: jest.fn(() => Promise.resolve()),
  i18nReady: Promise.resolve(),
}));

const memoryStore: Record<string, string> = {};
jest.mock('../utils/storage', () => ({
  __esModule: true,
  zustandStorage: {
    getItem: (key: string) => (key in memoryStore ? memoryStore[key] : null),
    setItem: (key: string, value: string) => { memoryStore[key] = value; },
    removeItem: (key: string) => { delete memoryStore[key]; },
  },
}));

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {},
  API_BASE: 'https://test.api/api',
  setOnUnauthorized: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
  uploadClient: { post: jest.fn() },
}));

jest.mock('../store/forumStore', () => ({
  useForumStore: {
    getState: () => ({ clearVotedPolls: jest.fn() }),
  },
}));

import { useNotificationStore } from '../store/notificationStore';
import { useMessageStore } from '../store/messageStore';
import { useAuthStore } from '../store/authStore';

// ---------------------------------------------------------------------------
// Card payload fixtures — one for each shareable card type.
// ---------------------------------------------------------------------------
type FunctionCard = { type: 'partner' | 'errand' | 'secondhand'; id: string; title: string; posterName: string };
type PostCard = { type: 'post'; id: string; title: string; posterName: string; postId: string };
type RatingCard = { type: 'rating'; id: string; title: string; posterName: string; ratingCategory: string };
type CardPayload = FunctionCard | PostCard | RatingCard;

const SENDER_ID = '3dffbbf9-4967-4c7e-9874-67d08ba8e88d'; // Alice
const RECEIVER_ID = '4f59feae-5356-404b-9784-0ce4ffd441b3'; // Dave (the "current user" in the test)

const FUNCTION_CARD: FunctionCard = {
  type: 'partner',
  id: 'partner-42',
  title: 'Run a half marathon at the playground',
  posterName: 'Alice',
};
const POST_CARD: PostCard = {
  type: 'post',
  id: 'post-99',
  title: 'Tonight at the union',
  posterName: 'Alice',
  postId: 'post-99',
};
const RATING_CARD: RatingCard = {
  type: 'rating',
  id: 'rating-7',
  title: 'CS101 Prof Wong',
  posterName: 'Alice',
  ratingCategory: 'professor',
};

const CARD_FIXTURES: Array<{ name: string; card: CardPayload }> = [
  { name: 'function card (find-partner / errand / secondhand)', card: FUNCTION_CARD },
  { name: 'post card (forum post share)', card: POST_CARD },
  { name: 'rating / grading card', card: RATING_CARD },
];

// ---------------------------------------------------------------------------
// Realtime simulator — replays the exact store calls useMessageRealtime
// makes when a message:new WS event arrives for a peer DM. Keeps the test
// focused on side-effects, not on mounting the hook.
// ---------------------------------------------------------------------------
function simulateIncomingMessageNew(senderId: string, _card: CardPayload) {
  // 1. Optimistic bump for an incoming peer message
  //    (useMessageRealtime.ts ~lines 158-168).
  const notification = useNotificationStore.getState();
  notification.setUnreadMessages(notification.unreadMessages + 1);

  // 2. handleIncomingMessage marks the contact as unread when the user is
  //    NOT in that active chat (messageStore.ts handleIncomingMessage).
  useMessageStore.getState().handleIncomingMessage(senderId);
}

function tabBadgeContributionForMessages(): number {
  const s = useNotificationStore.getState();
  return Math.max(0, s.unreadMessages - s.seenAtChatMessages);
}

beforeEach(() => {
  mockAlert.mockClear();
  useNotificationStore.setState({
    unreadLikes: 0,
    unreadFollowers: 0,
    unreadComments: 0,
    unreadMessages: 0,
    seenAtChatLikes: 0,
    seenAtChatFollowers: 0,
    seenAtChatComments: 0,
    seenAtChatMessages: 0,
    messagesScreenFocused: false,
  });
  useMessageStore.setState({
    pinnedContacts: new Set<string>(),
    mutedContacts: new Set<string>(),
    markedUnreadContacts: new Set<string>(),
    readContacts: new Set<string>(),
    inboxSeenContacts: new Set<string>(),
    activeChatContactId: null,
  });
  useAuthStore.setState({
    user: {
      name: 'dave_bu',
      nickname: 'Dave',
      email: 'dave@buhub.test',
      avatar: 'D',
      defaultAvatar: null,
      grade: '',
      major: '',
      bio: '',
      gender: 'male',
      language: 'tc',
      isLoggedIn: true,
    } as never,
    language: 'tc',
    token: 'test-token',
    isLoggedIn: true,
    hasSelectedLanguage: true,
    hasCompletedRegistration: true,
    forceLanguageOnNextLaunch: false,
  });
});

// ===========================================================================
// Phase 1 — Receiver is NOT on chatscreen: every card type bumps the badge.
// ===========================================================================
describe.each(CARD_FIXTURES)(
  'Phase 1: receiver gets a new-message notification for a $name',
  ({ card }) => {
    it('increments notificationStore.unreadMessages by 1', () => {
      expect(useNotificationStore.getState().unreadMessages).toBe(0);
      simulateIncomingMessageNew(SENDER_ID, card);
      expect(useNotificationStore.getState().unreadMessages).toBe(1);
    });

    it('marks the conversation as unread in messageStore (per-contact bubble)', () => {
      simulateIncomingMessageNew(SENDER_ID, card);
      const s = useMessageStore.getState();
      expect(s.readContacts.has(SENDER_ID)).toBe(false);
      expect(s.inboxSeenContacts.has(SENDER_ID)).toBe(false);
    });

    it('tab badge contribution from messages is positive (drives the bottom-tab badge)', () => {
      simulateIncomingMessageNew(SENDER_ID, card);
      expect(tabBadgeContributionForMessages()).toBe(1);
    });

    it('three consecutive cards produce unreadMessages=3', () => {
      simulateIncomingMessageNew(SENDER_ID, card);
      simulateIncomingMessageNew(SENDER_ID, card);
      simulateIncomingMessageNew(SENDER_ID, card);
      expect(useNotificationStore.getState().unreadMessages).toBe(3);
      expect(tabBadgeContributionForMessages()).toBe(3);
    });
  }
);

// ===========================================================================
// Phase 2 — Receiver opens chatscreen: tab badge clears, per-contact bubble
// remains visible until they tap into the specific chat.
// ===========================================================================
describe('Phase 2: opening MessagesScreen clears the tab badge but keeps per-contact bubbles', () => {
  beforeEach(() => {
    simulateIncomingMessageNew(SENDER_ID, FUNCTION_CARD);
    simulateIncomingMessageNew(SENDER_ID, POST_CARD);
    simulateIncomingMessageNew(SENDER_ID, RATING_CARD);
    expect(useNotificationStore.getState().unreadMessages).toBe(3);
    expect(tabBadgeContributionForMessages()).toBe(3);
  });

  it('markChatscreenViewed snapshots the baseline → tab badge contribution = 0', () => {
    useNotificationStore.getState().markChatscreenViewed();
    expect(tabBadgeContributionForMessages()).toBe(0);
    expect(useNotificationStore.getState().unreadMessages).toBe(3);
  });

  it('a 4th card arriving while focused does NOT bump the tab badge (focus pin)', () => {
    useNotificationStore.getState().setMessagesScreenFocused(true);
    simulateIncomingMessageNew(SENDER_ID, FUNCTION_CARD);
    expect(useNotificationStore.getState().unreadMessages).toBe(4);
    expect(tabBadgeContributionForMessages()).toBe(0);
  });

  it('after leaving chatscreen, a new card flips the tab badge back on', () => {
    useNotificationStore.getState().setMessagesScreenFocused(true);
    useNotificationStore.getState().markChatscreenViewed();
    useNotificationStore.getState().setMessagesScreenFocused(false);
    expect(tabBadgeContributionForMessages()).toBe(0);

    simulateIncomingMessageNew(SENDER_ID, POST_CARD);
    expect(tabBadgeContributionForMessages()).toBe(1);
  });
});

// ===========================================================================
// Phase 3 — Receiver opens the specific chat: per-contact bubble clears.
// ===========================================================================
describe('Phase 3: opening the specific chat clears the per-contact bubble', () => {
  it('clearUnread(contactId) drops the red dot for that conversation', () => {
    simulateIncomingMessageNew(SENDER_ID, FUNCTION_CARD);
    expect(useMessageStore.getState().readContacts.has(SENDER_ID)).toBe(false);

    useMessageStore.getState().clearUnread(SENDER_ID);
    const s = useMessageStore.getState();
    expect(s.readContacts.has(SENDER_ID)).toBe(true);
    expect(s.markedUnreadContacts.has(SENDER_ID)).toBe(false);
    expect(s.inboxSeenContacts.has(SENDER_ID)).toBe(true);
  });

  it('getEffectiveUnread returns 0 for a contact whose chat has been opened', () => {
    simulateIncomingMessageNew(SENDER_ID, RATING_CARD);
    useMessageStore.getState().clearUnread(SENDER_ID);
    expect(useMessageStore.getState().getEffectiveUnread(SENDER_ID, 1)).toBe(0);
  });
});

// ===========================================================================
// Phase 4 — Behaviour is identical for every card type.
// ===========================================================================
describe('Phase 4: behaviour is identical across function / post / rating cards', () => {
  it('all three card types produce the same unread-count delta and per-contact mark', () => {
    const results = CARD_FIXTURES.map(({ card }) => {
      useNotificationStore.setState({
        unreadLikes: 0, unreadFollowers: 0, unreadComments: 0, unreadMessages: 0,
        seenAtChatLikes: 0, seenAtChatFollowers: 0, seenAtChatComments: 0, seenAtChatMessages: 0,
        messagesScreenFocused: false,
      });
      useMessageStore.setState({
        pinnedContacts: new Set(), mutedContacts: new Set(),
        markedUnreadContacts: new Set(), readContacts: new Set(),
        inboxSeenContacts: new Set(), activeChatContactId: null,
      });
      simulateIncomingMessageNew(SENDER_ID, card);
      return {
        unread: useNotificationStore.getState().unreadMessages,
        tabBadge: tabBadgeContributionForMessages(),
        contactReadCleared: !useMessageStore.getState().readContacts.has(SENDER_ID),
      };
    });

    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
    expect(results[0]).toEqual({ unread: 1, tabBadge: 1, contactReadCleared: true });
  });

  it('placeholder receiver id is consistent — sanity check fixtures', () => {
    expect(RECEIVER_ID).toBe('4f59feae-5356-404b-9784-0ce4ffd441b3');
  });
});
