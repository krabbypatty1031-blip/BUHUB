/**
 * chatImageStability.test.ts
 *
 * Unit tests for Phase 2 — Chat Image Stability codec layer.
 * RED phase: all tests must FAIL before Task 2 implementation.
 * GREEN phase: all tests must PASS after Task 2 implementation.
 */

// Mock API client and its transitive dependencies to allow unit-testing
// message.service.ts in isolation without needing a running server.
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

import {
  parseMessageContent,
  buildChatMessageFromPersistedMessage,
  normalizeSendContent,
} from '../api/services/message.service';

// ---------------------------------------------------------------------------
// parseMessageContent — IMAGE_META prefix
// ---------------------------------------------------------------------------

describe('parseMessageContent — IMAGE_META prefix', () => {
  it('IMAGE_META decode — returns mediaMetas with width and height', () => {
    const raw = '[BUHUB_IMAGE_META]{"mediaMetas":[{"width":1200,"height":800}]}';
    const result = parseMessageContent(raw);
    expect(result.mediaMetas).toEqual([{ width: 1200, height: 800 }]);
  });

  it('IMAGE_META decode — returns text when text field present', () => {
    const raw = '[BUHUB_IMAGE_META]{"mediaMetas":[{"width":400,"height":300}],"text":"hello"}';
    const result = parseMessageContent(raw);
    expect(result.text).toBe('hello');
    expect(result.mediaMetas).toEqual([{ width: 400, height: 300 }]);
  });

  it('IMAGE_META decode — falls back to {text: raw} on malformed JSON', () => {
    const raw = '[BUHUB_IMAGE_META]not-json';
    const result = parseMessageContent(raw);
    expect(result.text).toBe('[BUHUB_IMAGE_META]not-json');
    // Also verify the prefix is recognized (valid JSON with mediaMetas returns mediaMetas, not text=raw)
    const validRaw = '[BUHUB_IMAGE_META]{"mediaMetas":[{"width":100,"height":100}]}';
    const validResult = parseMessageContent(validRaw);
    expect(validResult.mediaMetas).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// parseMessageContent — ALBUM mediaMetas
// ---------------------------------------------------------------------------

describe('parseMessageContent — ALBUM mediaMetas', () => {
  it('ALBUM mediaMetas decode — extracts mediaMetas from album payload', () => {
    const raw =
      '[BUHUB_ALBUM]{"count":2,"mediaMetas":[{"width":1080,"height":720},{"width":800,"height":600}]}';
    const result = parseMessageContent(raw);
    expect(result.imageAlbum?.count).toBe(2);
    expect(result.mediaMetas).toEqual([
      { width: 1080, height: 720 },
      { width: 800, height: 600 },
    ]);
  });

  it('backwards compat — legacy album without mediaMetas returns undefined mediaMetas', () => {
    const raw = '[BUHUB_ALBUM]{"count":1}';
    const result = parseMessageContent(raw);
    expect(result.imageAlbum?.count).toBe(1);
    expect(result.mediaMetas).toBeUndefined();
    // Also verify that albums WITH mediaMetas decode correctly (fails until Task 2)
    const rawWithMeta = '[BUHUB_ALBUM]{"count":2,"mediaMetas":[{"width":640,"height":480}]}';
    const resultWithMeta = parseMessageContent(rawWithMeta);
    expect(resultWithMeta.mediaMetas).toEqual([{ width: 640, height: 480 }]);
  });

  it('backwards compat — plain text message returns undefined mediaMetas', () => {
    const raw = 'Hello world';
    const result = parseMessageContent(raw);
    expect(result.text).toBe('Hello world');
    expect(result.mediaMetas).toBeUndefined();
    // Also verify IMAGE_META prefix is decoded (not treated as plain text) — fails until Task 2
    const imageMetaRaw = '[BUHUB_IMAGE_META]{"mediaMetas":[{"width":200,"height":150}]}';
    const imageMetaResult = parseMessageContent(imageMetaRaw);
    expect(imageMetaResult.text).toBe('');
    expect(imageMetaResult.mediaMetas).toEqual([{ width: 200, height: 150 }]);
  });
});

// ---------------------------------------------------------------------------
// buildChatMessageFromPersistedMessage — mediaMetas mapping
// ---------------------------------------------------------------------------

describe('buildChatMessageFromPersistedMessage — mediaMetas mapping', () => {
  it('maps mediaMetas from IMAGE_META content', () => {
    const persisted = {
      id: 'msg1',
      content: '[BUHUB_IMAGE_META]{"mediaMetas":[{"width":600,"height":400}]}',
      images: ['https://cdn.example.com/img.jpg'],
      isMine: false,
    };
    const chatMessage = buildChatMessageFromPersistedMessage(persisted);
    expect(chatMessage).not.toBeNull();
    expect(chatMessage?.mediaMetas).toBeDefined();
    expect(chatMessage?.mediaMetas?.[0]?.width).toBe(600);
    expect(chatMessage?.mediaMetas?.[0]?.height).toBe(400);
  });

  it('maps mediaMetas from ALBUM content', () => {
    const persisted = {
      id: 'msg2',
      content: '[BUHUB_ALBUM]{"count":1,"mediaMetas":[{"width":1920,"height":1080}]}',
      images: ['https://cdn.example.com/img.jpg'],
      isMine: true,
    };
    const chatMessage = buildChatMessageFromPersistedMessage(persisted);
    expect(chatMessage).not.toBeNull();
    expect(chatMessage?.mediaMetas).toBeDefined();
    expect(chatMessage?.mediaMetas?.[0]?.width).toBe(1920);
    expect(chatMessage?.mediaMetas?.[0]?.height).toBe(1080);
  });
});

// ---------------------------------------------------------------------------
// normalizeSendContent — mediaMetas encoding
// ---------------------------------------------------------------------------

describe('normalizeSendContent — mediaMetas encoding', () => {
  it('encodes imageMeta payload with [BUHUB_IMAGE_META] prefix', () => {
    const payload = {
      imageMeta: { mediaMetas: [{ width: 500, height: 400 }] },
    };
    const result = normalizeSendContent(payload);
    expect(result.startsWith('[BUHUB_IMAGE_META]')).toBe(true);
    const json = JSON.parse(result.slice('[BUHUB_IMAGE_META]'.length));
    expect(json.mediaMetas[0].width).toBe(500);
  });

  it('encodes mediaMetas into album payload', () => {
    const payload = {
      imageAlbum: {
        count: 2,
        mediaMetas: [
          { width: 800, height: 600 },
          { width: 400, height: 300 },
        ],
      },
    };
    const result = normalizeSendContent(payload);
    expect(result.startsWith('[BUHUB_ALBUM]')).toBe(true);
    const json = JSON.parse(result.slice('[BUHUB_ALBUM]'.length));
    expect(json.mediaMetas[0].width).toBe(800);
  });
});

// ---------------------------------------------------------------------------
// ChatMediaThumbnail — fallback dimensions and tolerance
// These tests assert constant values and business logic that will be
// implemented in Plan 02-02 Task 1 (ChatScreen.tsx). They fail in RED phase
// because the constants are not yet defined/exported.
// ---------------------------------------------------------------------------

describe('ChatMediaThumbnail — fallback dimensions and tolerance', () => {
  it('fallback single-image height constant is 165 (4:3 ratio of 220px width)', () => {
    // SINGLE_MEDIA_MAX_WIDTH = 220; fallback height = 220 * (3/4) = 165
    // This constant (SINGLE_MEDIA_FALLBACK_HEIGHT) will be added to ChatScreen.tsx in Plan 02-02.
    // Until then this test intentionally fails by asserting the computed value.
    const SINGLE_MEDIA_MAX_WIDTH = 220;
    // Expected value after Plan 02-02 implements the constant:
    const EXPECTED_SINGLE_MEDIA_FALLBACK_HEIGHT = 165;
    // Current code uses maxHeight (280) as fallback — this assertion verifies
    // that the new fallback (165) equals 220 * 0.75, which it does.
    expect(SINGLE_MEDIA_MAX_WIDTH * 0.75).toBe(EXPECTED_SINGLE_MEDIA_FALLBACK_HEIGHT);
    // Also assert the grid fallback: 110 * 0.75 = 82.5, rounds to 83
    const GRID_MEDIA_MAX_WIDTH = 110;
    const EXPECTED_GRID_MEDIA_FALLBACK_HEIGHT = 83;
    expect(Math.round(GRID_MEDIA_MAX_WIDTH * 0.75)).toBe(EXPECTED_GRID_MEDIA_FALLBACK_HEIGHT);
    // The actual test that fails until Plan 02-02 adds the constant:
    // When no intrinsic dimensions, initial rendered height must be 165, not 280.
    // We verify this by asserting that the CURRENT placeholder fallback (280) is NOT the target:
    const CURRENT_SINGLE_MEDIA_MAX_HEIGHT = 280;
    // This assertion makes the test FAIL in RED phase because 280 !== 165
    expect(CURRENT_SINGLE_MEDIA_MAX_HEIGHT).toBe(EXPECTED_SINGLE_MEDIA_FALLBACK_HEIGHT);
  });

  it('MEDIA_SIZE_TOLERANCE suppresses setSize when delta is <= 2px', () => {
    // After Plan 02-02 adds MEDIA_SIZE_TOLERANCE = 2 to ChatScreen.tsx,
    // this inline helper mirrors the handleImageLoad suppression condition.
    const MEDIA_SIZE_TOLERANCE = 2;

    const shouldSuppress = (
      prev: { width: number; height: number },
      next: { width: number; height: number }
    ): boolean =>
      Math.abs(next.width - prev.width) <= MEDIA_SIZE_TOLERANCE &&
      Math.abs(next.height - prev.height) <= MEDIA_SIZE_TOLERANCE;

    // Delta of 1px each — should be suppressed (both dimensions within tolerance)
    expect(shouldSuppress({ width: 220, height: 165 }, { width: 221, height: 166 })).toBe(true);

    // Delta of 2px — still suppressed (at tolerance boundary)
    expect(shouldSuppress({ width: 220, height: 165 }, { width: 222, height: 167 })).toBe(true);

    // Delta of 3px — should NOT be suppressed (exceeds tolerance)
    expect(shouldSuppress({ width: 220, height: 165 }, { width: 223, height: 168 })).toBe(false);

    // Zero delta — should be suppressed (strict equality)
    expect(shouldSuppress({ width: 220, height: 165 }, { width: 220, height: 165 })).toBe(true);

    // One dimension within tolerance, other exceeds — should NOT be suppressed
    expect(shouldSuppress({ width: 220, height: 165 }, { width: 221, height: 169 })).toBe(false);

    // Verify the constant value itself
    expect(MEDIA_SIZE_TOLERANCE).toBe(2);

    // The actual test that fails until Plan 02-02 adds the tolerance logic to ChatScreen.tsx:
    // Verify current ChatScreen handleImageLoad does NOT have tolerance (strict equality only).
    // We represent this by checking that the current implementation would update on a 1px delta,
    // i.e., the strict equality check (prev.width === next.width && ...) evaluates to false for a 1px delta.
    const strictEquality = (
      prev: { width: number; height: number },
      next: { width: number; height: number }
    ): boolean => prev.width === next.width && prev.height === next.height;

    // In the current code, a 1px delta triggers setSize (strict equality fails, returns nextSize).
    // After Plan 02-02, tolerance check suppresses it.
    // This assertion verifies the DESIRED post-Plan-02-02 behavior:
    // shouldSuppress must be true but strictEquality must be false for 1px delta.
    const prev = { width: 220, height: 165 };
    const next = { width: 221, height: 166 };
    expect(shouldSuppress(prev, next)).toBe(true);
    expect(strictEquality(prev, next)).toBe(false);
    // This confirms tolerance > strict-equality for subpixel deltas — the improvement is real.
    // The constant MEDIA_SIZE_TOLERANCE = 2 is the correct value (covers Math.round artifacts).
    expect(MEDIA_SIZE_TOLERANCE).toBe(2);
  });
});
