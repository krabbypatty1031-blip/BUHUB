// RESTful API Endpoints

const ENDPOINTS = {
  // Auth
  AUTH: {
    SEND_CODE: '/auth/send-code',
    VERIFY: '/auth/verify',
    VERIFY_TOKEN: '/auth/verify-token',
    LOGIN: '/auth/login',
    SET_PASSWORD: '/auth/set-password',
    CHANGE_PASSWORD: '/auth/change-password',
    RESET_PASSWORD: '/auth/reset-password',
    PROFILE_SETUP: '/auth/profile-setup',
    LOGOUT: '/auth/logout',
    DELETE_ACCOUNT: '/auth/account',
  },

  // Forum
  FORUM: {
    POSTS: '/forum/posts',
    POST_DETAIL: (id: string) => `/forum/posts/${id}`,
    EDIT_POST: (id: string) => `/forum/posts/${id}`,
    DELETE_POST: (id: string) => `/forum/posts/${id}`,
    COMMENTS: (postId: string) => `/forum/posts/${postId}/comments`,
    CREATE_COMMENT: (postId: string) => `/forum/posts/${postId}/comments`,
    EDIT_COMMENT: (postId: string, commentId: string) => `/forum/posts/${postId}/comments/${commentId}`,
    DELETE_COMMENT: (postId: string, commentId: string) => `/forum/posts/${postId}/comments/${commentId}`,
    LIKE: (postId: string) => `/forum/posts/${postId}/like`,       // POST = toggle (like/unlike)
    BOOKMARK: (postId: string) => `/forum/posts/${postId}/bookmark`, // POST = toggle (bookmark/unbookmark)
    SEARCH: '/forum/search',
  },

  // Partner
  PARTNER: {
    LIST: '/partner',
    DETAIL: (id: string) => `/partner/${id}`,
    CREATE: '/partner',
    EDIT: (id: string) => `/partner/${id}`,
    DELETE: (id: string) => `/partner/${id}`,
    JOIN: (id: string) => `/partner/${id}/join`,   // POST = toggle (join/leave)
  },

  // Errands
  ERRAND: {
    LIST: '/errands',
    DETAIL: (id: string) => `/errands/${id}`,
    CREATE: '/errands',
    EDIT: (id: string) => `/errands/${id}`,
    DELETE: (id: string) => `/errands/${id}`,
    ACCEPT: (id: string) => `/errands/${id}/accept`, // POST = accept errand
  },

  // Secondhand
  SECONDHAND: {
    LIST: '/secondhand',
    DETAIL: (id: string) => `/secondhand/${id}`,
    CREATE: '/secondhand',
    EDIT: (id: string) => `/secondhand/${id}`,
    DELETE: (id: string) => `/secondhand/${id}`,
    WANT: (id: string) => `/secondhand/${id}/want`, // POST = toggle (want/unwant)
  },

  // Ratings
  RATING: {
    LIST: (category: string) => `/ratings/${category}`,
    DETAIL: (category: string, id: string) => `/ratings/${category}/${id}`,
    SUBMIT: (category: string, id: string) => `/ratings/${category}/${id}/rate`,
    DIMENSIONS: (category: string) => `/ratings/${category}/dimensions`,
    TAGS: (category: string) => `/ratings/${category}/tags`,
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
    UPDATE_LANGUAGE: '/user/language',
    PUBLIC_PROFILE: (userName: string) => `/user/${userName}`,
    FOLLOW: (userName: string) => `/user/${userName}/follow`, // POST = toggle (follow/unfollow)
    BLOCK: (userName: string) => `/user/${userName}/block`,  // POST = toggle (block/unblock)
    BLOCKED_LIST: '/user/blocked',
    MY_CONTENT: '/user/profile/content',
    FOLLOWING: '/user/profile/following',
    FOLLOWERS: '/user/profile/followers',
  },

  // Notifications
  NOTIFICATION: {
    LIKES: '/notifications/likes',
    FOLLOWERS: '/notifications/followers',
    COMMENTS: '/notifications/comments',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: '/notifications/read',
    REGISTER_DEVICE: '/notifications/register-device',
    SETTINGS: '/notifications/settings',
  },

  // Upload
  UPLOAD: {
    IMAGE: '/upload/image',
    AVATAR: '/upload/avatar',
  },

  // Report
  REPORT: {
    SUBMIT: '/report',
  },
} as const;

export default ENDPOINTS;
