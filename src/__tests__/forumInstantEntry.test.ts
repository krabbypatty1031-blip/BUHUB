/**
 * forumInstantEntry.test.ts
 *
 * Unit tests for Phase 6 Plan 01 -- Forum instant entry: gcTime and
 * placeholderData configuration on usePosts and useFollowingPosts queries.
 *
 * Tests verify that both queries have:
 * - gcTime of 30 minutes (1800000ms) so cache survives tab-away periods
 * - placeholderData set to keepPreviousData to prevent blank states during refetch
 * - staleTime unchanged at 5 minutes (300000ms) as a regression guard
 */

// ---------------------------------------------------------------------------
// Mocks (same pattern as chatListPerformance.test.ts)
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
// Mock @tanstack/react-query partially — capture useInfiniteQuery options
// ---------------------------------------------------------------------------

const mockUseInfiniteQuery = jest.fn().mockReturnValue({
  data: undefined,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
});

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useInfiniteQuery: (...args: unknown[]) => mockUseInfiniteQuery(...args),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { keepPreviousData } from '@tanstack/react-query';
import { usePosts, useFollowingPosts } from '../hooks/usePosts';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Forum instant entry: query cache configuration', () => {
  beforeEach(() => {
    mockUseInfiniteQuery.mockClear();
  });

  describe('usePosts', () => {
    it('has gcTime of 30 minutes (1800000ms)', () => {
      usePosts(true);
      expect(mockUseInfiniteQuery).toHaveBeenCalledTimes(1);
      const options = mockUseInfiniteQuery.mock.calls[0][0];
      expect(options.gcTime).toBe(30 * 60 * 1000);
    });

    it('has placeholderData set to keepPreviousData', () => {
      usePosts(true);
      const options = mockUseInfiniteQuery.mock.calls[0][0];
      expect(options.placeholderData).toBe(keepPreviousData);
    });

    it('retains staleTime of 5 minutes (300000ms) — regression guard', () => {
      usePosts(true);
      const options = mockUseInfiniteQuery.mock.calls[0][0];
      expect(options.staleTime).toBe(5 * 60 * 1000);
    });
  });

  describe('useFollowingPosts', () => {
    it('has gcTime of 30 minutes (1800000ms)', () => {
      useFollowingPosts(true);
      expect(mockUseInfiniteQuery).toHaveBeenCalledTimes(1);
      const options = mockUseInfiniteQuery.mock.calls[0][0];
      expect(options.gcTime).toBe(30 * 60 * 1000);
    });

    it('has placeholderData set to keepPreviousData', () => {
      useFollowingPosts(true);
      const options = mockUseInfiniteQuery.mock.calls[0][0];
      expect(options.placeholderData).toBe(keepPreviousData);
    });

    it('retains staleTime of 5 minutes (300000ms) — regression guard', () => {
      useFollowingPosts(true);
      const options = mockUseInfiniteQuery.mock.calls[0][0];
      expect(options.staleTime).toBe(5 * 60 * 1000);
    });
  });
});
