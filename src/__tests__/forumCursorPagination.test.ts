/**
 * forumCursorPagination.test.ts
 *
 * Regression tests for H1 cursor migration on usePosts and useFollowingPosts.
 *
 * Invariants:
 * - initialPageParam is null (not 1) so first fetch sends no cursor → backend
 *   serves newest page via offset=0 path.
 * - queryFn forwards pageParam as `cursor` (or undefined when null).
 * - getNextPageParam returns lastPage.nextCursor when hasMore is true,
 *   undefined otherwise.
 * - When hasMore is true but nextCursor is missing (defensive against backend
 *   bugs), getNextPageParam returns undefined — NOT null. Returning null would
 *   give TanStack a "valid" pageParam of null, retriggering the offset-only
 *   path forever.
 */

// ---------------------------------------------------------------------------
// Mocks
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
  uploadClient: { post: jest.fn() },
  API_BASE: 'http://localhost:3000/api',
}));

jest.mock('../store/authStore', () => {
  const state = { language: 'tc', isLoggedIn: false, logout: jest.fn(), token: null, user: null };
  const useAuthStore: any = jest.fn((selector?: (s: typeof state) => unknown) =>
    typeof selector === 'function' ? selector(state) : state
  );
  useAuthStore.getState = () => state;
  useAuthStore.subscribe = jest.fn();
  return { useAuthStore };
});

jest.mock('../store/forumStore', () => ({
  useForumStore: Object.assign(jest.fn().mockReturnValue(jest.fn()), {
    getState: () => ({ clearVotedPolls: jest.fn() }),
  }),
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
  default: { t: (key: string) => key, language: 'tc' },
  normalizeLanguage: () => 'tc',
}));

const mockGetPosts = jest.fn().mockResolvedValue({ posts: [], hasMore: false, page: 1 });
const mockGetFollowingPosts = jest
  .fn()
  .mockResolvedValue({ posts: [], hasMore: false, page: 1 });

jest.mock('../api/services/forum.service', () => ({
  forumService: {
    getPosts: (...args: unknown[]) => mockGetPosts(...args),
    getFollowingPosts: (...args: unknown[]) => mockGetFollowingPosts(...args),
    getUserPosts: jest.fn(),
    getPostDetail: jest.fn(),
    getComments: jest.fn(),
  },
}));

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

import { usePosts, useFollowingPosts, type PostsPage } from '../hooks/usePosts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCapturedOptions() {
  const calls = mockUseInfiniteQuery.mock.calls;
  return calls[calls.length - 1][0];
}

function makePage(overrides: Partial<PostsPage>): PostsPage {
  return {
    posts: [],
    hasMore: false,
    page: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Cursor pagination: usePosts', () => {
  beforeEach(() => {
    mockUseInfiniteQuery.mockClear();
    mockGetPosts.mockClear();
  });

  it('initialPageParam is null (so first fetch sends no cursor)', () => {
    usePosts(true);
    expect(getCapturedOptions().initialPageParam).toBeNull();
  });

  it('queryFn passes cursor=undefined when pageParam is null', async () => {
    usePosts(true);
    const queryFn = getCapturedOptions().queryFn;
    await queryFn({ pageParam: null });
    expect(mockGetPosts).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: undefined, limit: expect.any(Number) }),
    );
  });

  it('queryFn passes cursor string when pageParam is a string', async () => {
    usePosts(true);
    const queryFn = getCapturedOptions().queryFn;
    await queryFn({ pageParam: '2026-05-02T12:00:00.000Z' });
    expect(mockGetPosts).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: '2026-05-02T12:00:00.000Z' }),
    );
  });

  it('getNextPageParam returns nextCursor when hasMore is true', () => {
    usePosts(true);
    const getNextPageParam = getCapturedOptions().getNextPageParam;
    const result = getNextPageParam(
      makePage({ hasMore: true, nextCursor: '2026-04-01T00:00:00.000Z' }),
    );
    expect(result).toBe('2026-04-01T00:00:00.000Z');
  });

  it('getNextPageParam returns undefined when hasMore is false', () => {
    usePosts(true);
    const getNextPageParam = getCapturedOptions().getNextPageParam;
    expect(getNextPageParam(makePage({ hasMore: false }))).toBeUndefined();
  });

  it('getNextPageParam returns undefined (NOT null) when hasMore=true but nextCursor missing — death-loop guard', () => {
    usePosts(true);
    const getNextPageParam = getCapturedOptions().getNextPageParam;
    const result = getNextPageParam(makePage({ hasMore: true, nextCursor: undefined }));
    expect(result).toBeUndefined();
    expect(result).not.toBeNull();
  });
});

describe('Cursor pagination: useFollowingPosts', () => {
  beforeEach(() => {
    mockUseInfiniteQuery.mockClear();
    mockGetFollowingPosts.mockClear();
  });

  it('initialPageParam is null', () => {
    useFollowingPosts(true);
    expect(getCapturedOptions().initialPageParam).toBeNull();
  });

  it('queryFn passes cursor=undefined when pageParam is null', async () => {
    useFollowingPosts(true);
    const queryFn = getCapturedOptions().queryFn;
    await queryFn({ pageParam: null });
    expect(mockGetFollowingPosts).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: undefined, limit: expect.any(Number) }),
    );
  });

  it('queryFn passes cursor string when pageParam is a string', async () => {
    useFollowingPosts(true);
    const queryFn = getCapturedOptions().queryFn;
    await queryFn({ pageParam: '2026-05-02T12:00:00.000Z' });
    expect(mockGetFollowingPosts).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: '2026-05-02T12:00:00.000Z' }),
    );
  });

  it('getNextPageParam returns nextCursor when hasMore is true', () => {
    useFollowingPosts(true);
    const getNextPageParam = getCapturedOptions().getNextPageParam;
    expect(
      getNextPageParam(makePage({ hasMore: true, nextCursor: '2026-04-01T00:00:00.000Z' })),
    ).toBe('2026-04-01T00:00:00.000Z');
  });

  it('getNextPageParam returns undefined when hasMore is false', () => {
    useFollowingPosts(true);
    const getNextPageParam = getCapturedOptions().getNextPageParam;
    expect(getNextPageParam(makePage({ hasMore: false }))).toBeUndefined();
  });

  it('getNextPageParam returns undefined (NOT null) when hasMore=true but nextCursor missing — death-loop guard', () => {
    useFollowingPosts(true);
    const getNextPageParam = getCapturedOptions().getNextPageParam;
    const result = getNextPageParam(makePage({ hasMore: true, nextCursor: undefined }));
    expect(result).toBeUndefined();
    expect(result).not.toBeNull();
  });
});
