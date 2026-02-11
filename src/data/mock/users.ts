import type { UserPublicProfile } from '../../types';

export const mockUsers: Record<string, UserPublicProfile> = {
  '陳同學': {
    avatar: '陳',
    gender: 'female',
    bio: '本科三年級 · 傳理學',
    posts: 15,
    likes: 342,
    followers: 28,
    userPosts: [
      {
        postId: 'cat',
        lang: 'tc',
        content: '今日喺飯堂遇到一隻超可愛嘅貓咪！佢好親人，一直蹭我嘅腳，有冇人知佢係邊度嚟㗎？🐱',
        translated: { sc: '今天在饭堂遇到一只超可爱的猫咪！它很亲人，一直蹭我的脚，有没有人知道它是从哪里来的？🐱', en: 'Today I met a super cute cat at the canteen! It was very friendly, kept rubbing against my feet. Does anyone know where it came from? 🐱' },
        time: '2小時前',
        likes: 128,
        comments: 24,
      },
    ],
    userComments: [
      {
        postId: 'comp3015',
        commentId: 'comment-002',
        postAuthor: '王同學',
        postContent: '下學期有冇人想一齊選 COMP3015？',
        comment: '我都想選！可以加我',
        time: '1日前',
        likes: 4,
      },
    ],
  },
  '王同學': {
    avatar: '王',
    gender: 'male',
    bio: '本科二年級 · 計算機科學',
    posts: 8,
    likes: 156,
    followers: 15,
    userPosts: [
      {
        postId: 'comp3015',
        lang: 'tc',
        content: '下學期有冇人想一齊選 COMP3015？聽講呢門課嘅 Group Project 好有趣，想搵隊友一齊做！有興趣嘅留言啦～',
        translated: { sc: '下学期有没有人想一起选 COMP3015？听说这门课的 Group Project 很有趣，想找队友一起做！有兴趣的留言吧～', en: 'Anyone want to take COMP3015 next semester? I heard the Group Project is really interesting. Looking for teammates! Comment if interested~' },
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
    bio: '本科四年級 · 音樂學',
    posts: 12,
    likes: 289,
    followers: 42,
    userPosts: [],
    userComments: [],
  },
  '張同學': {
    avatar: '張',
    gender: 'male',
    bio: '本科三年級 · 新聞學',
    posts: 6,
    likes: 98,
    followers: 10,
    userPosts: [
      {
        postId: 'quote1',
        lang: 'tc',
        content: '哈哈我都見過呢隻貓！佢好鍾意曬太陽，之前仲瞓咗喺長凳上面～',
        translated: { sc: '哈哈我也见过这只猫！它很喜欢晒太阳，之前还睡在长凳上面～', en: 'Haha I\'ve seen this cat too! It loves sunbathing, was even sleeping on the bench before~' },
        time: '1小時前',
        likes: 23,
        comments: 5,
      },
    ],
    userComments: [],
  },
};
