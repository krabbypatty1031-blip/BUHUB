/**
 * mePagePolish.test.ts
 *
 * Unit tests for Phase 9 Plan 01 -- Me page polish: cache retention and
 * pull-to-refresh configuration on useProfile and useMyContent queries.
 *
 * Tests verify that both queries have:
 * - useProfile: staleTime of 5 minutes (300000ms), gcTime of 30 minutes (1800000ms),
 *   placeholderData set to keepPreviousData
 * - useMyContent: staleTime of 30 seconds (30000ms, unchanged), gcTime of 30 minutes
 *   (1800000ms), placeholderData set to keepPreviousData
 */

// ---------------------------------------------------------------------------
// Mocks (same pattern as forumInstantEntry.test.ts)
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
  useForumStore: Object.assign(
    jest.fn().mockReturnValue(jest.fn()),
    {
      getState: () => ({ clearVotedPolls: jest.fn() }),
    }
  ),
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
// Mock @tanstack/react-query partially -- capture useQuery options
// ---------------------------------------------------------------------------

const mockUseQuery = jest.fn().mockReturnValue({
  data: undefined,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
});

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { keepPreviousData } from '@tanstack/react-query';
import { useProfile, useMyContent } from '../hooks/useUser';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Me page polish: query cache configuration', () => {
  beforeEach(() => {
    mockUseQuery.mockClear();
  });

  describe('useProfile', () => {
    it('has staleTime of 5 minutes (300000ms)', () => {
      useProfile();
      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      const options = mockUseQuery.mock.calls[0][0];
      expect(options.staleTime).toBe(5 * 60 * 1000);
    });

    it('has gcTime of 30 minutes (1800000ms)', () => {
      useProfile();
      const options = mockUseQuery.mock.calls[0][0];
      expect(options.gcTime).toBe(30 * 60 * 1000);
    });

    it('has placeholderData set to keepPreviousData', () => {
      useProfile();
      const options = mockUseQuery.mock.calls[0][0];
      expect(options.placeholderData).toBe(keepPreviousData);
    });
  });

  describe('useMyContent', () => {
    it('has staleTime of 30 seconds (30000ms) -- regression guard', () => {
      useMyContent();
      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      const options = mockUseQuery.mock.calls[0][0];
      expect(options.staleTime).toBe(30 * 1000);
    });

    it('has gcTime of 30 minutes (1800000ms)', () => {
      useMyContent();
      const options = mockUseQuery.mock.calls[0][0];
      expect(options.gcTime).toBe(30 * 60 * 1000);
    });

    it('has placeholderData set to keepPreviousData', () => {
      useMyContent();
      const options = mockUseQuery.mock.calls[0][0];
      expect(options.placeholderData).toBe(keepPreviousData);
    });
  });
});
