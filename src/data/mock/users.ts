import type { UserPublicProfile } from '../../types';

export const mockUsers: Record<string, UserPublicProfile> = {
  '陳同學': {
    avatar: '陳',
    gender: 'female',
    bio: 'Year 3 · Communication',
    posts: 15,
    likes: 342,
    followers: 28,
    userPosts: [
      {
        lang: 'tc',
        content: '今日喺飯堂遇到一隻超可愛嘅貓咪！佢好親人，一直蹭我嘅腳 🐱',
        translated: { sc: '今天在饭堂遇到一只超可爱的猫咪！它很亲人，一直蹭我的脚 🐱', en: 'Met a super cute cat at the canteen today! 🐱' },
        time: '2小時前',
        likes: 128,
        comments: 24,
      },
    ],
    userComments: [
      {
        postAuthor: '王同學',
        postContent: '下學期有冇人想一齊選 COMP3015？',
        comment: '我都想選！可以加我',
        time: '1日前',
      },
    ],
  },
  '王同學': {
    avatar: '王',
    gender: 'male',
    bio: 'Year 2 · Computer Science',
    posts: 8,
    likes: 156,
    followers: 15,
    userPosts: [
      {
        lang: 'tc',
        content: '下學期有冇人想一齊選 COMP3015？聽講呢門課嘅 Group Project 好有趣',
        translated: { sc: '下学期有没有人想一起选 COMP3015？', en: 'Anyone want to take COMP3015 next semester?' },
        time: '5小時前',
        likes: 45,
        comments: 12,
      },
    ],
    userComments: [],
  },
  '李同學': {
    avatar: '李',
    gender: 'female',
    bio: 'Year 4 · Music',
    posts: 12,
    likes: 289,
    followers: 42,
    userPosts: [],
    userComments: [],
  },
  '張同學': {
    avatar: '張',
    gender: 'male',
    bio: 'Year 2 · Computer Science',
    posts: 6,
    likes: 98,
    followers: 10,
    userPosts: [],
    userComments: [],
  },
};
