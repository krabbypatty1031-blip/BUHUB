import { readFileSync } from 'fs';
import { resolve } from 'path';

// Static-analysis tests for bug 22:
// "self-released partner, delivery, and secondhand cards can be deleted or
//  ended through the three-dot menu on each detail page and listing page."
//
// Same source-shape style used elsewhere in BUHUB/src/__tests__ (no Metro,
// no React Native runtime). Locks in the menu items, the wired handlers, and
// the i18n keys so a regression that removes them shows up immediately.

const ROOT = resolve(__dirname, '..');

const FILES = {
  partnerDetail: `${ROOT}/screens/functions/PartnerDetailScreen.tsx`,
  errandDetail: `${ROOT}/screens/functions/ErrandDetailScreen.tsx`,
  secondhandDetail: `${ROOT}/screens/functions/SecondhandDetailScreen.tsx`,
  partnerList: `${ROOT}/screens/functions/PartnerListScreen.tsx`,
  errandList: `${ROOT}/screens/functions/ErrandListScreen.tsx`,
  secondhandList: `${ROOT}/screens/functions/SecondhandListScreen.tsx`,
  meScreen: `${ROOT}/screens/me/MeScreen.tsx`,
  settingsScreen: `${ROOT}/screens/me/SettingsScreen.tsx`,
  userProfileScreen: `${ROOT}/screens/me/UserProfileScreen.tsx`,
  useUserHook: `${ROOT}/hooks/useUser.ts`,
  enLocale: `${ROOT}/i18n/locales/en.json`,
  scLocale: `${ROOT}/i18n/locales/sc.json`,
  tcLocale: `${ROOT}/i18n/locales/tc.json`,
} as const;

const cache = new Map<keyof typeof FILES, string>();
const read = (key: keyof typeof FILES): string => {
  const cached = cache.get(key);
  if (cached) return cached;
  const text = readFileSync(FILES[key], 'utf-8');
  cache.set(key, text);
  return text;
};

// ---------------------------------------------------------------------------
// Part 1 — Close / delete actions on function pages (Partner / Errand /
// Secondhand) for the OWNER. Tests that:
//   - Each detail screen imports the close + delete hooks.
//   - Each detail screen wires handleEnd + handleDelete behind Alert.alert.
//   - Each detail/list screen renders the menu items in the own-post branch.
//   - Each list screen also wires the action-sheet handlers.
// ---------------------------------------------------------------------------

describe('FUNCTION-PAGE-CLOSE-DELETE — Partner detail', () => {
  it('imports useDeletePartner and useClosePartner', () => {
    const src = read('partnerDetail');
    expect(src).toMatch(/useDeletePartner/);
    expect(src).toMatch(/useClosePartner/);
  });

  it('confirms close via Alert.alert(t("endPostTitle"))', () => {
    const src = read('partnerDetail');
    expect(src).toMatch(/Alert\.alert\(\s*t\(['"]endPostTitle['"]\)/);
  });

  it('confirms delete via Alert.alert(t("deletePostTitle"))', () => {
    const src = read('partnerDetail');
    expect(src).toMatch(/Alert\.alert\(\s*t\(['"]deletePostTitle['"]\)/);
  });

  it('renders endPost and deletePost menu items in the own-post branch', () => {
    const src = read('partnerDetail');
    expect(src).toMatch(/onPress=\{handleEnd\}/);
    expect(src).toMatch(/onPress=\{handleDelete\}/);
    expect(src).toMatch(/t\(['"]endPost['"]\)/);
    expect(src).toMatch(/t\(['"]deletePost['"]\)/);
  });

  it('navigates back after a successful delete', () => {
    const src = read('partnerDetail');
    expect(src).toMatch(/navigation\.goBack\(\)/);
  });
});

describe('FUNCTION-PAGE-CLOSE-DELETE — Errand detail', () => {
  it('imports useDeleteErrand and useCloseErrand', () => {
    const src = read('errandDetail');
    expect(src).toMatch(/useDeleteErrand/);
    expect(src).toMatch(/useCloseErrand/);
  });

  it('confirms close + delete and renders menu items', () => {
    const src = read('errandDetail');
    expect(src).toMatch(/Alert\.alert\(\s*t\(['"]endPostTitle['"]\)/);
    expect(src).toMatch(/Alert\.alert\(\s*t\(['"]deletePostTitle['"]\)/);
    expect(src).toMatch(/onPress=\{handleEnd\}/);
    expect(src).toMatch(/onPress=\{handleDelete\}/);
  });
});

describe('FUNCTION-PAGE-CLOSE-DELETE — Secondhand detail', () => {
  it('imports useDeleteSecondhand and useCloseSecondhand', () => {
    const src = read('secondhandDetail');
    expect(src).toMatch(/useDeleteSecondhand/);
    expect(src).toMatch(/useCloseSecondhand/);
  });

  it('confirms close + delete and renders menu items', () => {
    const src = read('secondhandDetail');
    expect(src).toMatch(/Alert\.alert\(\s*t\(['"]endPostTitle['"]\)/);
    expect(src).toMatch(/Alert\.alert\(\s*t\(['"]deletePostTitle['"]\)/);
    expect(src).toMatch(/onPress=\{handleEnd\}/);
    expect(src).toMatch(/onPress=\{handleDelete\}/);
  });
});

describe('FUNCTION-PAGE-CLOSE-DELETE — Partner list', () => {
  it('exposes endPost and deletePost rows in the own-post action sheet', () => {
    const src = read('partnerList');
    expect(src).toMatch(/onPress=\{handleEndAction\}/);
    expect(src).toMatch(/onPress=\{handleDeleteAction\}/);
    expect(src).toMatch(/t\(['"]endPost['"]\)/);
    expect(src).toMatch(/t\(['"]deletePost['"]\)/);
  });
});

describe('FUNCTION-PAGE-CLOSE-DELETE — Errand list', () => {
  it('exposes endPost and deletePost rows in the own-post action sheet', () => {
    const src = read('errandList');
    expect(src).toMatch(/onPress=\{handleEndAction\}/);
    expect(src).toMatch(/onPress=\{handleDeleteAction\}/);
    expect(src).toMatch(/t\(['"]endPost['"]\)/);
    expect(src).toMatch(/t\(['"]deletePost['"]\)/);
  });
});

describe('FUNCTION-PAGE-CLOSE-DELETE — Secondhand list', () => {
  it('exposes endPost and deletePost rows in the own-post action sheet', () => {
    const src = read('secondhandList');
    expect(src).toMatch(/onPress=\{handleEndAction\}/);
    expect(src).toMatch(/onPress=\{handleDeleteAction\}/);
    expect(src).toMatch(/t\(['"]endPost['"]\)/);
    expect(src).toMatch(/t\(['"]deletePost['"]\)/);
  });
});

// ---------------------------------------------------------------------------
// Part 1b — Me page entry-point. The Me page surfaces the user's content; the
// close/delete UI lives on the detail/list screens those entries route to.
// ---------------------------------------------------------------------------

describe('ME-PAGE — entry points lead into the function detail screens', () => {
  it('routes Me content rows into PartnerDetail / ErrandDetail / SecondhandDetail', () => {
    const src = read('meScreen');
    expect(src).toMatch(/PartnerDetail/);
    expect(src).toMatch(/ErrandDetail/);
    expect(src).toMatch(/SecondhandDetail/);
  });
});

// ---------------------------------------------------------------------------
// Part 1c — i18n keys for close / delete must exist in all three locales.
// ---------------------------------------------------------------------------

describe('I18N — close / delete keys present in all locales', () => {
  const KEYS = [
    'endPost',
    'endPostTitle',
    'endPostMessage',
    'postEnded',
    'endFailed',
    'deletePost',
    'deletePostTitle',
    'deletePostMessage',
    'postDeleted',
    'deleteFailed',
  ];

  it.each(KEYS)('en.json has key %s', (key) => {
    const obj = JSON.parse(read('enLocale'));
    expect(obj[key]).toBeTruthy();
  });

  it.each(KEYS)('sc.json has key %s', (key) => {
    const obj = JSON.parse(read('scLocale'));
    expect(obj[key]).toBeTruthy();
  });

  it.each(KEYS)('tc.json has key %s', (key) => {
    const obj = JSON.parse(read('tcLocale'));
    expect(obj[key]).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Part 2 — Profile visibility (public / mutual / hidden) on the mobile side.
// Backend enforcement is covered by buhub_back/src/__tests__/profile-visibility.test.ts.
// Here we verify the mobile-side wiring:
//   - Settings screen lets the user pick all three values and persists.
//   - Settings screen invalidates downstream caches so the profile screen
//     reflects the new value without manual refresh.
//   - useFollowUser invalidates userPosts AND removes the cache on unfollow
//     (so a broken MUTUAL pair stops showing posts immediately).
//   - UserProfileScreen handles PROFILE_HIDDEN: header still renders;
//     only the post-feed is replaced by t('profileIsPrivate').
// ---------------------------------------------------------------------------

describe('VISIBILITY-MOBILE-01 — Settings screen surfaces all three states', () => {
  it('declares the Visibility = public | mutual | hidden type', () => {
    const src = read('settingsScreen');
    expect(src).toMatch(/Visibility\s*=\s*['"]public['"]\s*\|\s*['"]mutual['"]\s*\|\s*['"]hidden['"]/);
  });

  it('renders all three picker labels (public, mutualOnly, hidden)', () => {
    const src = read('settingsScreen');
    expect(src).toMatch(/visibilityPublic/);
    expect(src).toMatch(/visibilityMutualOnly/);
    expect(src).toMatch(/visibilityHidden/);
  });

  it('persists the choice via userService.updateProfile({ profileVisibility })', () => {
    const src = read('settingsScreen');
    expect(src).toMatch(/userService\s*\.updateProfile\(\s*\{\s*profileVisibility/);
  });

  it('invalidates profile / publicProfile / userPosts after a successful save', () => {
    const src = read('settingsScreen');
    expect(src).toMatch(/queryKey:\s*\[\s*['"]profile['"]\s*\]/);
    expect(src).toMatch(/queryKey:\s*\[\s*['"]publicProfile['"]\s*\]/);
    expect(src).toMatch(/queryKey:\s*\[\s*['"]userPosts['"]\s*\]/);
  });

  it('reverts the local state on save failure', () => {
    const src = read('settingsScreen');
    expect(src).toMatch(/setVisibility\(previous\)/);
  });
});

describe('VISIBILITY-MOBILE-02 — i18n keys for visibility states + private state', () => {
  const KEYS = [
    'profileVisibility',
    'visibilityPublic',
    'visibilityMutualOnly',
    'visibilityHidden',
    'profileIsPrivate',
  ];

  it.each(KEYS)('en.json has key %s', (key) => {
    const obj = JSON.parse(read('enLocale'));
    expect(obj[key]).toBeTruthy();
  });

  it.each(KEYS)('sc.json has key %s', (key) => {
    const obj = JSON.parse(read('scLocale'));
    expect(obj[key]).toBeTruthy();
  });

  it.each(KEYS)('tc.json has key %s', (key) => {
    const obj = JSON.parse(read('tcLocale'));
    expect(obj[key]).toBeTruthy();
  });
});

describe('VISIBILITY-MOBILE-03 — UserProfileScreen handles PROFILE_HIDDEN', () => {
  it('reads error from useUserPosts and detects PROFILE_HIDDEN', () => {
    const src = read('userProfileScreen');
    expect(src).toMatch(/postsError/);
    expect(src).toMatch(/PROFILE_HIDDEN/);
  });

  it('shows the t("profileIsPrivate") empty state when posts are hidden', () => {
    const src = read('userProfileScreen');
    expect(src).toMatch(/profileIsPrivate/);
  });

  it('forces the FlashList data to empty while hidden', () => {
    const src = read('userProfileScreen');
    expect(src).toMatch(/data=\{postsHidden\s*\?\s*\[\]\s*:/);
  });
});

describe('VISIBILITY-MOBILE-04 — useFollowUser invalidates + removes userPosts on unfollow', () => {
  it('invalidates userPosts in onSettled', () => {
    const src = read('useUserHook');
    expect(src).toMatch(/invalidateQueries\(\s*\{\s*queryKey:\s*\[['"]userPosts['"]\]/);
  });

  it('optimistically removes userPosts when the next state is unfollowed', () => {
    const src = read('useUserHook');
    expect(src).toMatch(/if\s*\(\s*!nextFollowed\s*\)/);
    expect(src).toMatch(/removeQueries\(\s*\{\s*queryKey:\s*\[['"]userPosts['"],\s*userName\]/);
  });
});
