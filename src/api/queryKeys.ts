/**
 * Centralized React Query key factory.
 *
 * Each factory returns a `readonly` tuple that is byte-identical to the
 * inline keys already in use across screens/hooks. Migrating a call site
 * is a textual swap — no cache behavior changes.
 *
 * Conventions:
 *   - `.all` is the broadest invalidation key for a resource family.
 *   - More specific factories nest under `.all` so that a parent
 *     `invalidateQueries({ queryKey: qk.X.all })` invalidates every child.
 *   - Keys here mirror what the codebase ALREADY uses; do not invent
 *     new shapes without grepping for the existing string first.
 */

export const qk = {
  /* ─── Forum (posts, comments, search) ───────────────────────────── */
  forum: {
    posts: {
      all: ['posts'] as const,
      detail: (id: string) => ['post', id] as const,
    },
    post: ['post'] as const,
    comments: ['comments'] as const,
    search: ['search'] as const,
    circles: {
      followed: ['followedCircles'] as const,
    },
  },

  /* ─── Profile / following / followers / my content ──────────────── */
  profile: {
    me: ['profile'] as const,
    public: (userName: string) => ['publicProfile', userName] as const,
    userPosts: ['userPosts'] as const,
    myContent: ['myContent'] as const,
    followingList: ['followingList'] as const,
    followersList: ['followersList'] as const,
  },

  /* ─── Notifications ─────────────────────────────────────────────── */
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
    followers: ['notifications', 'followers'] as const,
    comments: ['notifications', 'comments'] as const,
    settings: ['notificationSettings'] as const,
  },

  /* ─── Messages / chat / contacts ────────────────────────────────── */
  messages: {
    contacts: ['contacts'] as const,
    chat: (contactId: string) => ['chat', contactId] as const,
    chatLocalized: (contactId: string, language: string) =>
      ['chat', contactId, language] as const,
    canSend: (contactId: string) => ['chat-can-send', contactId] as const,
  },

  /* ─── Function: Errands ─────────────────────────────────────────── */
  errands: {
    all: ['errands'] as const,
    byCategory: (category: string) => ['errands', category] as const,
    allByCategory: (category: string) =>
      ['errands', 'all', category] as const,
  },

  /* ─── Function: Partner ─────────────────────────────────────────── */
  partners: {
    all: ['partners'] as const,
    byCategory: (category: string) => ['partners', category] as const,
    allByCategory: (category: string) =>
      ['partners', 'all', category] as const,
  },

  /* ─── Function: Secondhand ──────────────────────────────────────── */
  secondhand: {
    all: ['secondhand'] as const,
    list: ['secondhand', 'all'] as const,
    byCategory: (category: string) => ['secondhand', category] as const,
    wanted: ['secondhand', 'wanted'] as const,
    item: (id: string) => ['secondhandItem', id] as const,
  },

  /* ─── Function: Feedback ────────────────────────────────────────── */
  feedback: {
    my: ['feedback', 'my'] as const,
  },

  /* ─── Function: Ratings ─────────────────────────────────────────── */
  ratings: {
    list: (
      category: string,
      sortMode: string,
      query: string,
      pageSize: number
    ) => ['ratings', category, sortMode, query, pageSize] as const,
    detail: (candidate: string, id: string) =>
      ['rating', candidate, id] as const,
  },

  /* ─── Schedule ──────────────────────────────────────────────────── */
  schedule: ['schedule'] as const,

  /* ─── Content translation ───────────────────────────────────────── */
  contentTranslation: (
    entityType: string,
    entityId: string,
    language: string
  ) => ['contentTranslation', entityType, entityId, language] as const,
} as const;

export type QueryKey =
  | typeof qk.forum.posts.all
  | typeof qk.forum.post
  | typeof qk.forum.comments
  | typeof qk.forum.search
  | typeof qk.forum.circles.followed
  | typeof qk.profile.me
  | typeof qk.profile.userPosts
  | typeof qk.profile.myContent
  | typeof qk.profile.followingList
  | typeof qk.profile.followersList
  | typeof qk.notifications.all
  | typeof qk.notifications.unreadCount
  | typeof qk.notifications.followers
  | typeof qk.notifications.comments
  | typeof qk.notifications.settings
  | typeof qk.messages.contacts
  | typeof qk.errands.all
  | typeof qk.partners.all
  | typeof qk.secondhand.all
  | typeof qk.secondhand.list
  | typeof qk.secondhand.wanted
  | typeof qk.feedback.my
  | typeof qk.schedule
  | ReturnType<typeof qk.forum.posts.detail>
  | ReturnType<typeof qk.profile.public>
  | ReturnType<typeof qk.messages.chat>
  | ReturnType<typeof qk.messages.chatLocalized>
  | ReturnType<typeof qk.messages.canSend>
  | ReturnType<typeof qk.errands.byCategory>
  | ReturnType<typeof qk.errands.allByCategory>
  | ReturnType<typeof qk.partners.byCategory>
  | ReturnType<typeof qk.partners.allByCategory>
  | ReturnType<typeof qk.secondhand.byCategory>
  | ReturnType<typeof qk.secondhand.item>
  | ReturnType<typeof qk.ratings.list>
  | ReturnType<typeof qk.ratings.detail>
  | ReturnType<typeof qk.contentTranslation>;
