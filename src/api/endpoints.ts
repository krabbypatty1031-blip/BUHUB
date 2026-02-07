// RESTful API Endpoints

const ENDPOINTS = {
  // Auth
  AUTH: {
    SEND_CODE: '/auth/send-code',
    VERIFY: '/auth/verify',
    PROFILE_SETUP: '/auth/profile-setup',
    LOGOUT: '/auth/logout',
  },

  // Forum
  FORUM: {
    POSTS: '/forum/posts',
    POST_DETAIL: (id: string) => `/forum/posts/${id}`,
    COMMENTS: (postId: string) => `/forum/posts/${postId}/comments`,
    LIKE: (postId: string) => `/forum/posts/${postId}/like`,
    BOOKMARK: (postId: string) => `/forum/posts/${postId}/bookmark`,
    SEARCH: '/forum/search',
    CIRCLES: '/forum/circles',
    CIRCLE_DETAIL: (tag: string) => `/forum/circles/${tag}`,
  },

  // Partner
  PARTNER: {
    LIST: '/partner',
    DETAIL: (id: string) => `/partner/${id}`,
    CREATE: '/partner',
    JOIN: (id: string) => `/partner/${id}/join`,
  },

  // Errands
  ERRAND: {
    LIST: '/errands',
    DETAIL: (id: string) => `/errands/${id}`,
    CREATE: '/errands',
    ACCEPT: (id: string) => `/errands/${id}/accept`,
  },

  // Secondhand
  SECONDHAND: {
    LIST: '/secondhand',
    DETAIL: (id: string) => `/secondhand/${id}`,
    CREATE: '/secondhand',
    WANT: (id: string) => `/secondhand/${id}/want`,
  },

  // Ratings
  RATING: {
    LIST: (category: string) => `/ratings/${category}`,
    DETAIL: (category: string, id: string) => `/ratings/${category}/${id}`,
    SUBMIT: (category: string, id: string) => `/ratings/${category}/${id}/rate`,
  },

  // Messages
  MESSAGE: {
    CONTACTS: '/messages/contacts',
    CHAT: (contactId: string) => `/messages/chat/${contactId}`,
    SEND: (contactId: string) => `/messages/chat/${contactId}/send`,
  },

  // User
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    PUBLIC_PROFILE: (userName: string) => `/user/${userName}`,
    FOLLOW: (userName: string) => `/user/${userName}/follow`,
    MY_POSTS: '/user/my-posts',
  },

  // Notifications
  NOTIFICATION: {
    LIKES: '/notifications/likes',
    FOLLOWERS: '/notifications/followers',
    COMMENTS: '/notifications/comments',
  },
} as const;

export default ENDPOINTS;
