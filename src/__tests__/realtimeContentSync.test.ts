import { readFileSync } from 'fs';
import { resolve } from 'path';

// Static-analysis tests for the live-content-sync contract.
//
// Goal: lock in that a user's post/comment/like/bookmark actions, plus other
// users' likes/comments arriving via the realtime channel, are reflected
// across ForumScreen / PostDetailScreen / MeScreen / UserProfileScreen
// without requiring a manual pull-to-refresh.
//
// Strategy (matches the rest of __tests__/): read source files, assert on
// the cache-invalidation / refetchInterval / mutation-propagation patterns
// that implement the contract. A regression that drops any of these keeps
// the unit-test cost paid up front.

const ROOT = resolve(__dirname, '..');

const FILES = {
  usePosts: `${ROOT}/hooks/usePosts.ts`,
  useUser: `${ROOT}/hooks/useUser.ts`,
  useMessageRealtime: `${ROOT}/hooks/useMessageRealtime.ts`,
  forumScreen: `${ROOT}/screens/forum/ForumScreen.tsx`,
  postDetailScreen: `${ROOT}/screens/forum/PostDetailScreen.tsx`,
  meScreen: `${ROOT}/screens/me/MeScreen.tsx`,
  userProfileScreen: `${ROOT}/screens/me/UserProfileScreen.tsx`,
} as const;

const cache = new Map<keyof typeof FILES, string>();
const read = (key: keyof typeof FILES): string => {
  const cached = cache.get(key);
  if (cached) return cached;
  const text = readFileSync(FILES[key], 'utf-8');
  cache.set(key, text);
  return text;
};

const sliceFunction = (src: string, signature: string, fallbackLen = 4000): string => {
  const idx = src.indexOf(signature);
  if (idx < 0) return '';
  const next = src.indexOf('\nexport function ', idx + signature.length);
  return next > 0 ? src.slice(idx, next) : src.slice(idx, idx + fallbackLen);
};

// ---------------------------------------------------------------------------
// Part 1 — Periodic refetch (polling) is configured on the right hooks.
//
// PostDetailScreen needs sub-3s freshness because a user staring at one post
// expects another user's like/comment to appear without manual refresh.
// List screens (Forum / Me / UserProfile) tolerate ≤15s.
// ---------------------------------------------------------------------------

describe('LIVE-SYNC — usePosts.ts polling intervals', () => {
  it('declares the list-feed refetch constant at 15 seconds', () => {
    const src = read('usePosts');
    expect(src).toMatch(/FORUM_LIVE_REFETCH_MS\s*=\s*15\s*\*\s*1000/);
  });

  it('declares the post-detail refetch constant at 2 seconds', () => {
    const src = read('usePosts');
    expect(src).toMatch(/POST_DETAIL_LIVE_REFETCH_MS\s*=\s*2\s*\*\s*1000/);
  });

  it('usePosts (Discover feed) polls on FORUM_LIVE_REFETCH_MS', () => {
    const src = read('usePosts');
    const body = sliceFunction(src, 'export function usePosts(');
    expect(body).toMatch(/refetchInterval:\s*FORUM_LIVE_REFETCH_MS/);
    expect(body).toMatch(/refetchIntervalInBackground:\s*false/);
  });

  it('useFollowingPosts polls on FORUM_LIVE_REFETCH_MS', () => {
    const src = read('usePosts');
    const body = sliceFunction(src, 'export function useFollowingPosts(');
    expect(body).toMatch(/refetchInterval:\s*FORUM_LIVE_REFETCH_MS/);
    expect(body).toMatch(/refetchIntervalInBackground:\s*false/);
  });

  it('useUserPosts polls on FORUM_LIVE_REFETCH_MS', () => {
    const src = read('usePosts');
    const body = sliceFunction(src, 'export function useUserPosts(');
    expect(body).toMatch(/refetchInterval:\s*FORUM_LIVE_REFETCH_MS/);
    expect(body).toMatch(/refetchIntervalInBackground:\s*false/);
  });

  it('usePostDetail polls on POST_DETAIL_LIVE_REFETCH_MS (2s)', () => {
    const src = read('usePosts');
    const body = sliceFunction(src, 'export function usePostDetail(');
    expect(body).toMatch(/refetchInterval:\s*POST_DETAIL_LIVE_REFETCH_MS/);
    expect(body).toMatch(/refetchIntervalInBackground:\s*false/);
  });

  it('useComments polls on POST_DETAIL_LIVE_REFETCH_MS (2s)', () => {
    const src = read('usePosts');
    const body = sliceFunction(src, 'export function useComments(');
    expect(body).toMatch(/refetchInterval:\s*POST_DETAIL_LIVE_REFETCH_MS/);
    expect(body).toMatch(/refetchIntervalInBackground:\s*false/);
  });
});

describe('LIVE-SYNC — useUser.ts polling', () => {
  it('useMyContent polls every 15 seconds with background pause', () => {
    const src = read('useUser');
    const body = sliceFunction(src, 'export function useMyContent(', 600);
    expect(body).toMatch(/refetchInterval:\s*15\s*\*\s*1000/);
    expect(body).toMatch(/refetchIntervalInBackground:\s*false/);
  });
});

// ---------------------------------------------------------------------------
// Part 2 — Realtime WebSocket channel invalidates post-content caches when
// another user likes or comments. This covers the "I'm the post owner and
// someone else interacted with my post" path — the ≤1-second refresh case.
// ---------------------------------------------------------------------------

describe('LIVE-SYNC — useMessageRealtime notification:new fan-out', () => {
  it('still bumps unread badge counters for like/follow/comment', () => {
    const src = read('useMessageRealtime');
    expect(src).toMatch(/setUnreadLikes\(/);
    expect(src).toMatch(/setUnreadFollowers\(/);
    expect(src).toMatch(/setUnreadComments\(/);
  });

  it('invalidates the Discover/Following feed query key', () => {
    const src = read('useMessageRealtime');
    expect(src).toMatch(/queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['posts'\]\s*\}\)/);
  });

  it('invalidates the per-user posts query key (UserProfileScreen)', () => {
    const src = read('useMessageRealtime');
    expect(src).toMatch(/queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['userPosts'\]\s*\}\)/);
  });

  it('invalidates the post-detail query key prefix', () => {
    const src = read('useMessageRealtime');
    expect(src).toMatch(/queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['post'\]\s*\}\)/);
  });

  it('invalidates the myContent query key (MeScreen)', () => {
    const src = read('useMessageRealtime');
    expect(src).toMatch(/queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['myContent'\]\s*\}\)/);
  });

  it('invalidates the search query key', () => {
    const src = read('useMessageRealtime');
    expect(src).toMatch(/queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['search'\]\s*\}\)/);
  });

  it('invalidates the comments query key only when a comment notification arrives', () => {
    const src = read('useMessageRealtime');
    expect(src).toMatch(/commentDelta\s*>\s*0[\s\S]*?queryKey:\s*\['comments'\]/);
  });

  it('only fires invalidations when a like or comment delta is non-zero', () => {
    const src = read('useMessageRealtime');
    expect(src).toMatch(/likeDelta\s*>\s*0\s*\|\|\s*commentDelta\s*>\s*0/);
  });
});

// ---------------------------------------------------------------------------
// Part 3 — Self-action mutations propagate optimistically to every cache the
// affected screens read from. This covers the "I tap like/bookmark/submit"
// path — the screen the user is on must update instantly, AND every other
// screen that shows the same post must also reflect the change when the user
// navigates there.
// ---------------------------------------------------------------------------

describe('LIVE-SYNC — useLikePost optimistic propagation', () => {
  it('cancels and updates posts, userPosts, post-detail, myContent caches', () => {
    const body = sliceFunction(read('usePosts'), 'export function useLikePost(');
    expect(body).toMatch(/cancelQueries\(\{\s*queryKey:\s*\['posts'\]/);
    expect(body).toMatch(/cancelQueries\(\{\s*queryKey:\s*\['userPosts'\]/);
    expect(body).toMatch(/cancelQueries\(\{\s*queryKey:\s*postDetailKey\(/);
    expect(body).toMatch(/cancelQueries\(\{\s*queryKey:\s*\['myContent'\]/);

    expect(body).toMatch(/setAllPostLists\(queryClient,/);
    expect(body).toMatch(/setAllUserPostLists\(queryClient,/);
    expect(body).toMatch(/setAllSearchLists\(queryClient,/);
    expect(body).toMatch(/setQueryData<MyContent>\(\['myContent'\]/);
  });

  it('reconciles all caches with the server-authoritative likeCount on success', () => {
    const body = sliceFunction(read('usePosts'), 'export function useLikePost(');
    expect(body).toMatch(/onSuccess:\s*\(res,\s*postId\)\s*=>/);
    expect(body).toMatch(/res\.likeCount/);
    expect(body).toMatch(/liked:\s*res\.liked/);
  });

  it('rolls back every cache on error', () => {
    const body = sliceFunction(read('usePosts'), 'export function useLikePost(');
    expect(body).toMatch(/onError:\s*\(_err,\s*postId,\s*context\)\s*=>/);
    expect(body).toMatch(/restoreAllPostLists/);
    expect(body).toMatch(/previousMyContent/);
    expect(body).toMatch(/previousDetail/);
  });

  it('propagates the optimistic toggle into myBookmarks.posts (so likes from the MeScreen bookmarks tab animate immediately)', () => {
    const body = sliceFunction(read('usePosts'), 'export function useLikePost(');
    expect(body).toMatch(/myBookmarks:\s*\{[\s\S]*?posts:\s*old\.myBookmarks\.posts\.map\(toggleUserPost\)/);
  });

  it('propagates the optimistic toggle into myLikes.posts (so the my-likes tab animates immediately)', () => {
    const body = sliceFunction(read('usePosts'), 'export function useLikePost(');
    expect(body).toMatch(/myLikes:\s*\{[\s\S]*?posts:\s*old\.myLikes\.posts\.map\(toggleUserPost\)/);
  });

  it('reconciles myBookmarks.posts and myLikes.posts on success', () => {
    const body = sliceFunction(read('usePosts'), 'export function useLikePost(');
    expect(body).toMatch(/myBookmarks:\s*\{[\s\S]*?posts:\s*old\.myBookmarks\.posts\.map\(updateUserPost\)/);
    expect(body).toMatch(/myLikes:\s*\{[\s\S]*?posts:\s*old\.myLikes\.posts\.map\(updateUserPost\)/);
  });
});

describe('LIVE-SYNC — useBookmarkPost optimistic propagation', () => {
  it('cancels and updates posts, userPosts, post-detail, myContent caches', () => {
    const body = sliceFunction(read('usePosts'), 'export function useBookmarkPost(');
    expect(body).toMatch(/cancelQueries\(\{\s*queryKey:\s*\['posts'\]/);
    expect(body).toMatch(/cancelQueries\(\{\s*queryKey:\s*\['userPosts'\]/);
    expect(body).toMatch(/cancelQueries\(\{\s*queryKey:\s*postDetailKey\(/);
    expect(body).toMatch(/cancelQueries\(\{\s*queryKey:\s*\['myContent'\]/);

    expect(body).toMatch(/setAllPostLists\(queryClient,/);
    expect(body).toMatch(/setAllUserPostLists\(queryClient,/);
    expect(body).toMatch(/setQueryData<ForumPost>\(postDetailKey\(/);
    expect(body).toMatch(/setQueryData<MyContent>\(\['myContent'\]/);
  });

  it('rolls back every cache on error', () => {
    const body = sliceFunction(read('usePosts'), 'export function useBookmarkPost(');
    expect(body).toMatch(/onError:/);
    expect(body).toMatch(/previousMyContent/);
    expect(body).toMatch(/previousDetail/);
  });
});

describe('LIVE-SYNC — useCreateComment optimistic propagation', () => {
  it('inserts the new comment into the comments cache', () => {
    const body = sliceFunction(read('usePosts'), 'export function useCreateComment(');
    expect(body).toMatch(/setQueryData<Comment\[\]>\(commentsKey\(postId,\s*language\)/);
    expect(body).toMatch(/insertCreatedComment\(/);
  });

  it('bumps comment counter on post-detail, posts, search, and myContent', () => {
    const body = sliceFunction(read('usePosts'), 'export function useCreateComment(');
    expect(body).toMatch(/comments:\s*old\.comments\s*\+\s*1/);
    expect(body).toMatch(/setAllPostLists\(queryClient,/);
    expect(body).toMatch(/setAllSearchLists\(queryClient,/);
    expect(body).toMatch(/queryKey:\s*\['myContent'\]/);
  });
});

describe('LIVE-SYNC — useDeleteComment optimistic propagation', () => {
  it('decrements the comment counter on every list cache', () => {
    const body = sliceFunction(read('usePosts'), 'export function useDeleteComment(');
    expect(body).toMatch(/Math\.max\(0,\s*post\.comments\s*-\s*1\)/);
    expect(body).toMatch(/setAllPostLists\(queryClient,/);
    expect(body).toMatch(/setAllSearchLists\(queryClient,/);
    expect(body).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['myContent'\]/);
  });
});

describe('LIVE-SYNC — useLikeComment optimistic propagation', () => {
  it('updates the comments tree and myContent in onMutate', () => {
    const body = sliceFunction(read('usePosts'), 'export function useLikeComment(');
    expect(body).toMatch(/updateCommentTreeById\(/);
    expect(body).toMatch(/updateMyContentCommentById\(/);
  });

  it('reconciles comments cache with server likeCount on success', () => {
    const body = sliceFunction(read('usePosts'), 'export function useLikeComment(');
    expect(body).toMatch(/res\.likeCount/);
    expect(body).toMatch(/liked:\s*res\.liked/);
  });
});

describe('LIVE-SYNC — useBookmarkComment optimistic propagation', () => {
  it('updates the comments tree and myContent', () => {
    const body = sliceFunction(read('usePosts'), 'export function useBookmarkComment(');
    expect(body).toMatch(/updateCommentTreeById\(/);
    expect(body).toMatch(/updateMyContentCommentById\(/);
  });
});

// ---------------------------------------------------------------------------
// Part 4 — Each consumer screen actually subscribes to the right hook so the
// polling/realtime contract above reaches the user.
// ---------------------------------------------------------------------------

describe('LIVE-SYNC — screens consume the live hooks', () => {
  it('ForumScreen uses usePosts and useFollowingPosts', () => {
    const src = read('forumScreen');
    expect(src).toMatch(/usePosts\b/);
    expect(src).toMatch(/useFollowingPosts\b/);
  });

  it('PostDetailScreen uses usePostDetail and useComments', () => {
    const src = read('postDetailScreen');
    expect(src).toMatch(/usePostDetail\b/);
    expect(src).toMatch(/useComments\b/);
  });

  it('MeScreen uses useMyContent', () => {
    const src = read('meScreen');
    expect(src).toMatch(/useMyContent\b/);
  });

  it('UserProfileScreen uses useUserPosts', () => {
    const src = read('userProfileScreen');
    expect(src).toMatch(/useUserPosts\b/);
  });
});

// ---------------------------------------------------------------------------
// Part 5 — Battery + cost guardrails. Polling must pause when the screen is
// not visible (TanStack does this automatically on unmount), and must pause
// when the app is backgrounded (refetchIntervalInBackground:false).
// ---------------------------------------------------------------------------

describe('LIVE-SYNC — guardrails', () => {
  it('every live-polling hook in usePosts pauses while the app is backgrounded', () => {
    const src = read('usePosts');
    const intervalSites = src.match(/refetchInterval:\s*(FORUM_LIVE_REFETCH_MS|POST_DETAIL_LIVE_REFETCH_MS)/g) ?? [];
    const backgroundFalseSites = src.match(/refetchIntervalInBackground:\s*false/g) ?? [];
    expect(backgroundFalseSites.length).toBeGreaterThanOrEqual(intervalSites.length);
  });

  it('useMyContent pauses while the app is backgrounded', () => {
    const src = read('useUser');
    const body = sliceFunction(src, 'export function useMyContent(', 600);
    expect(body).toMatch(/refetchIntervalInBackground:\s*false/);
  });

  it('realtime invalidations rely on TanStack default refetchType "active" — only mounted screens refetch', () => {
    const src = read('useMessageRealtime');
    const startMarker = 'Refresh post-content caches';
    const start = src.indexOf(startMarker);
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, start + 800);
    expect(block).not.toMatch(/refetchType:\s*['"]inactive['"]/);
    expect(block).not.toMatch(/refetchType:\s*['"]all['"]/);
  });
});
