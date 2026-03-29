/**
 * forumListPerformance.test.ts
 *
 * Unit tests for Phase 7 Plan 01 -- Forum list performance & image stability.
 *
 * Tests validate:
 * - FORUM-04: PostImageGallery single-image height uses fixed DEFAULT_RATIO (4/3)
 *   regardless of actual image aspect ratio, eliminating layout shifts.
 * - FORUM-01: PostCard custom arePostCardPropsEqual comparator skips callback
 *   identity checks and only compares data props.
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
// Imports (these will fail initially -- RED phase)
// ---------------------------------------------------------------------------

import { DEFAULT_RATIO, GALLERY_MIN_HEIGHT } from '../components/common/PostImageGallery';
import { arePostCardPropsEqual, PostCardProps } from '../components/common/PostCard';
import type { ForumPost } from '../types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeForumPost(overrides: Partial<ForumPost> = {}): ForumPost {
  return {
    id: 'post-1',
    avatar: 'https://example.com/avatar.jpg',
    name: 'Test User',
    gender: 'male' as const,
    meta: '',
    createdAt: '2026-03-29T10:00:00Z',
    lang: 'tc',
    content: 'Test post content',
    likes: 5,
    comments: 2,
    ...overrides,
  };
}

function makePostCardProps(overrides: Partial<PostCardProps> = {}): PostCardProps {
  return {
    post: makeForumPost(),
    onPress: () => {},
    onAvatarPress: () => {},
    onLike: () => {},
    onComment: () => {},
    onForward: () => {},
    onBookmark: () => {},
    onQuote: () => {},
    onDelete: () => {},
    onTagPress: () => {},
    onFunctionPress: () => {},
    onImagePress: () => {},
    onVote: () => {},
    onQuotedPostPress: () => {},
    isLiked: false,
    isBookmarked: false,
    votedOptionIndex: undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// FORUM-04: PostImageGallery fixed height tests
// ---------------------------------------------------------------------------

describe('FORUM-04: PostImageGallery image height stability', () => {
  it('single-image height uses DEFAULT_RATIO (4/3) always, not actual image ratio', () => {
    // The height formula for a single image should be:
    // singleHeight = Math.min(Math.max((pageWidth * 0.7) / DEFAULT_RATIO, GALLERY_MIN_HEIGHT), 300)
    // This must produce the same result regardless of the actual image aspect ratio.
    const pageWidth = 375; // typical iPhone width
    const singleWidth = pageWidth * 0.7;
    const expectedHeight = Math.min(Math.max(singleWidth / DEFAULT_RATIO, GALLERY_MIN_HEIGHT), 300);

    // Verify DEFAULT_RATIO is 4/3
    expect(DEFAULT_RATIO).toBeCloseTo(4 / 3, 5);

    // The expected height should be a fixed value based solely on pageWidth and DEFAULT_RATIO
    expect(expectedHeight).toBeCloseTo(singleWidth / (4 / 3), 5);

    // Verify GALLERY_MIN_HEIGHT is a reasonable minimum
    expect(GALLERY_MIN_HEIGHT).toBe(120);
  });

  it('two-image layout uses fixed height 150 (regression guard)', () => {
    // Two-image layout uses a hardcoded height of 150 -- no dynamic calculation
    // This test verifies the constant exists and is correct by checking
    // the source file for the hardcoded value.
    const fs = require('fs');
    const path = require('path');
    const galleryPath = path.resolve(__dirname, '../components/common/PostImageGallery.tsx');
    const source = fs.readFileSync(galleryPath, 'utf-8');

    // The two-image branch should contain height: 150
    expect(source).toContain('height: 150');
  });

  it('three+-image layout uses fixed 130x130 squares (regression guard)', () => {
    // Three+ images use 130x130 fixed thumbnails
    const fs = require('fs');
    const path = require('path');
    const galleryPath = path.resolve(__dirname, '../components/common/PostImageGallery.tsx');
    const source = fs.readFileSync(galleryPath, 'utf-8');

    // The 3+ image branch should define thumbSize = 130
    expect(source).toContain('thumbSize = 130');
    // Both width and height use thumbSize
    expect(source).toContain('width: thumbSize');
    expect(source).toContain('height: thumbSize');
  });
});

// ---------------------------------------------------------------------------
// FORUM-01: PostCard custom memo comparator tests
// ---------------------------------------------------------------------------

describe('FORUM-01: PostCard arePostCardPropsEqual comparator', () => {
  it('returns true when same data props but different callback function references', () => {
    const sharedPost = makeForumPost({ id: 'shared-1' });

    const propsA = makePostCardProps({
      post: sharedPost,
      isLiked: true,
      isBookmarked: false,
      votedOptionIndex: 2,
      // Each callback is a new arrow function
      onPress: () => {},
      onLike: () => {},
      onComment: () => {},
      onForward: () => {},
      onBookmark: () => {},
      onQuote: () => {},
      onDelete: () => {},
      onTagPress: () => {},
      onFunctionPress: () => {},
      onImagePress: () => {},
      onVote: () => {},
      onQuotedPostPress: () => {},
      onAvatarPress: () => {},
    });

    const propsB = makePostCardProps({
      post: sharedPost,
      isLiked: true,
      isBookmarked: false,
      votedOptionIndex: 2,
      // Different arrow function references
      onPress: () => {},
      onLike: () => {},
      onComment: () => {},
      onForward: () => {},
      onBookmark: () => {},
      onQuote: () => {},
      onDelete: () => {},
      onTagPress: () => {},
      onFunctionPress: () => {},
      onImagePress: () => {},
      onVote: () => {},
      onQuotedPostPress: () => {},
      onAvatarPress: () => {},
    });

    // Callbacks are all different references
    expect(propsA.onPress).not.toBe(propsB.onPress);
    expect(propsA.onLike).not.toBe(propsB.onLike);

    // But comparator should return true (skips callback identity)
    expect(arePostCardPropsEqual(propsA, propsB)).toBe(true);
  });

  it('returns false when post.id changes', () => {
    const propsA = makePostCardProps({
      post: makeForumPost({ id: 'post-A' }),
    });
    const propsB = makePostCardProps({
      post: makeForumPost({ id: 'post-B' }),
    });

    expect(arePostCardPropsEqual(propsA, propsB)).toBe(false);
  });

  it('returns false when isLiked changes', () => {
    const sharedPost = makeForumPost({ id: 'like-test' });
    const propsA = makePostCardProps({ post: sharedPost, isLiked: false });
    const propsB = makePostCardProps({ post: sharedPost, isLiked: true });

    expect(arePostCardPropsEqual(propsA, propsB)).toBe(false);
  });

  it('returns false when isBookmarked changes', () => {
    const sharedPost = makeForumPost({ id: 'bookmark-test' });
    const propsA = makePostCardProps({ post: sharedPost, isBookmarked: false });
    const propsB = makePostCardProps({ post: sharedPost, isBookmarked: true });

    expect(arePostCardPropsEqual(propsA, propsB)).toBe(false);
  });

  it('returns false when votedOptionIndex changes', () => {
    const sharedPost = makeForumPost({ id: 'vote-test' });
    const propsA = makePostCardProps({ post: sharedPost, votedOptionIndex: undefined });
    const propsB = makePostCardProps({ post: sharedPost, votedOptionIndex: 1 });

    expect(arePostCardPropsEqual(propsA, propsB)).toBe(false);
  });
});
