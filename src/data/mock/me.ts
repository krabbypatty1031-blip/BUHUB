export const mockMeData = {
  following: 36,
  followers: 128,
  collection: 56,

  posts: [
    {
      lang: 'tc',
      content: '今日喺圖書館自習，終於搞掂 COMP3015 嘅 Project Proposal 🎉',
      translated: { sc: '今天在图书馆自习，终于搞定 COMP3015 的 Project Proposal 🎉', en: 'Finally finished the COMP3015 Project Proposal at the library today 🎉' },
      time: '2小時前',
      likes: 45,
      comments: 12,
    },
  ],

  comments: [
    {
      postAuthor: '陳同學',
      postAvatar: '陳',
      postContent: '今日喺飯堂遇到一隻超可愛嘅貓咪！',
      comment: '我都見過！好似係學校附近嘅流浪貓',
      time: '3小時前',
      likes: 12,
    },
  ],

  anonPosts: [
    {
      lang: 'tc',
      content: '有冇人覺得今個學期嘅 workload 特別重？每日都趕 deadline...',
      translated: { sc: '有没有人觉得这学期的 workload 特别重？每天都赶 deadline...', en: 'Does anyone feel the workload is especially heavy this semester?' },
      time: '5小時前',
      likes: 67,
      comments: 31,
    },
  ],

  anonComments: [
    {
      postAuthor: '陳同學',
      postAvatar: '陳',
      postContent: '今日喺飯堂遇到一隻超可愛嘅貓咪！',
      comment: '佢成日都喺南飯堂出沒，好可愛',
      time: '6小時前',
      likes: 8,
    },
  ],

  bookmarks: [
    {
      author: '王同學',
      avatar: '王',
      gender: 'male' as const,
      meta: 'Year 2 · Computer Science · 5小時前',
      lang: 'tc',
      content: '下學期有冇人想一齊選 COMP3015？聽講呢門課嘅 Group Project 好有趣',
      translated: { sc: '下学期有没有人想一起选 COMP3015？', en: 'Anyone want to take COMP3015 next semester?' },
      time: '5小時前',
      likes: 67,
      comments: 18,
    },
  ],

  myLikes: {
    posts: [
      {
        author: '陳同學',
        avatar: '陳',
        gender: 'female' as const,
        meta: 'Year 3 · Communication · 2小時前',
        lang: 'tc',
        content: '今日喺飯堂遇到一隻超可愛嘅貓咪！佢好親人 🐱',
        translated: { sc: '今天在饭堂遇到一只超可爱的猫咪！🐱', en: 'Met a super cute cat at the canteen today! 🐱' },
        time: '2小時前',
        likes: 128,
        comments: 24,
      },
    ],
    comments: [
      {
        postAuthor: '王同學',
        postAvatar: '王',
        postContent: '下學期有冇人想一齊選 COMP3015？',
        commentAuthor: '張同學',
        commentAvatar: '張',
        comment: '我都想選！可以加你一齊組隊',
        time: '5小時前',
        likes: 8,
      },
    ],
  },
};
