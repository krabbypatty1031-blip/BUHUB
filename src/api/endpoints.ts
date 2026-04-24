// RESTful API Endpoints

const ENDPOINTS = {
  // Auth
  AUTH: {
    SEND_CODE: '/auth/send-code',
    VERIFY: '/auth/verify',
    VERIFY_TOKEN: '/auth/verify-token',
    LOGIN: '/auth/login',
    SET_PASSWORD: '/auth/set-password',
    COMPLETE_REGISTRATION: '/auth/complete-registration',
    BIND_HKBU_SEND_CODE: '/auth/bind-hkbu/send-code',
    BIND_HKBU_VERIFY: '/auth/bind-hkbu/verify',
    CHANGE_PASSWORD: '/auth/password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    PROFILE_SETUP: '/auth/profile-setup',
    LOGOUT: '/auth/logout',
    DELETE_ACCOUNT: '/auth/account',
  },

  // Feed
  FEED: {
    FOLLOWING: '/feed/following',
  },

  // Forum (backend: /forum/posts, /comments/:id, /forum/posts/:id/vote)
  FORUM: {
    POSTS: '/forum/posts',
    CIRCLES: '/forum/circles',
    CIRCLE_FOLLOW: (tag: string) => `/forum/circles/${encodeURIComponent(tag)}/follow`,
    POST_DETAIL: (id: string) => `/forum/posts/${id}`,
    EDIT_POST: (id: string) => `/forum/posts/${id}`,
    DELETE_POST: (id: string) => `/forum/posts/${id}`,
    COMMENTS: (postId: string) => `/forum/posts/${postId}/comments`,
    CREATE_COMMENT: (postId: string) => `/forum/posts/${postId}/comments`,
    EDIT_COMMENT: (commentId: string) => `/comments/${commentId}`,
    DELETE_COMMENT: (commentId: string) => `/comments/${commentId}`,
    LIKE: (postId: string) => `/forum/posts/${postId}/like`,
    LIKE_COMMENT: (commentId: string) => `/comments/${commentId}/like`,
    BOOKMARK: (postId: string) => `/forum/posts/${postId}/bookmark`,
    BOOKMARK_COMMENT: (commentId: string) => `/comments/${commentId}/bookmark`,
    VOTE: (postId: string) => `/forum/posts/${postId}/vote`,
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
    MY_RATING: (category: string, id: string) => `/ratings/${category}/${id}/my-rating`,
    COMMENTS: (category: string, id: string) => `/ratings/${category}/${id}/comments`,
  },

  // Messages (backend: conversations, chat/:userId, POST /messages)
  MESSAGE: {
    CONVERSATIONS: '/messages/conversations',
    CONVERSATION: (userId: string) => `/messages/conversations/${userId}`,
    SEARCH: '/messages/search',
    CHAT: (userId: string) => `/messages/chat/${userId}`,
    CAN_SEND: (userId: string) => `/messages/can-send/${userId}`,
    UPDATES: '/messages/updates',
    TYPING: '/messages/typing',
    PRESENCE_HEARTBEAT: '/messages/presence/heartbeat',
    PRESENCE: (userId: string) => `/messages/presence/${userId}`,
    SEND: '/messages',
    MARK_READ: (messageId: string) => `/messages/${messageId}/read`,
    MESSAGE_DETAIL: (messageId: string) => `/messages/${messageId}`,
  },

  // User (backend: /user/*, /user/:userName/block, /users/blocked)
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    UPDATE_LANGUAGE: '/user/language',
    UNLINK_EMAIL: (emailId: string) => `/user/emails/${emailId}`,
    PUBLIC_PROFILE: (userName: string) => `/user/${userName}`,
    USER_POSTS: (userName: string) => `/user/${userName}/posts`,
    FOLLOW: (userName: string) => `/user/${userName}/follow`,
    BLOCK: (userName: string) => `/user/${userName}/block`,
    BLOCKED_LIST: '/users/blocked',
    MY_CONTENT: '/user/profile/content',
    FOLLOWING: '/user/profile/following',
    FOLLOWERS: '/user/profile/followers',
    EXPORT_REQUEST: '/user/export',
    EXPORT_STATUS: (jobId: string) => `/user/export/${jobId}`,
    EXPORT_DOWNLOAD: (jobId: string) => `/user/export/${jobId}/download`,
  },

  // Notifications (backend: register-token, [id]/read, read-all)
  NOTIFICATION: {
    LIKES: '/notifications/likes',
    FOLLOWERS: '/notifications/followers',
    COMMENTS: '/notifications/comments',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: '/notifications/read-all',
    REGISTER_DEVICE: '/notifications/register-token',
    SETTINGS: '/notifications/settings',
  },

  // Upload (backend: presigned-url flow)
  UPLOAD: {
    PRESIGNED_URL: '/upload/presigned-url',
  },

  // Report (backend: /reports)
  REPORT: {
    SUBMIT: '/reports',
  },

  TRANSLATION: {
    RESOLVE: '/translations/resolve',
    BATCH: '/translations/batch',
  },

  // Schedule
  SCHEDULE: {
    GET: '/schedule',
    SAVE: '/schedule',
    DELETE: '/schedule',
    PARSE: '/schedule/parse',
    ADD_COURSE: '/schedule/courses',
    EDIT_COURSE: (id: string) => `/schedule/courses/${id}`,
    DELETE_COURSE: (id: string) => `/schedule/courses/${id}`,
  },

  // Feedback
  FEEDBACK: {
    LIST: '/feedback',
    DETAIL: (id: string) => `/feedback/${id}`,
    SUBMIT: '/feedback',
    REPLY: (id: string) => `/feedback/${id}/reply`,
  },

  // Locker by SFSC
  LOCKER: {
    SUBMIT: '/locker-requests',
    LIST_MINE: '/locker-requests',
    BROADCAST: '/locker-broadcast',
  },
} as const;

export default ENDPOINTS;
