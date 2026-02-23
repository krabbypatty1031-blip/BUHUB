import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import { useForumStore } from '../../store/forumStore';
import type { User, UserPublicProfile, MyContent, LikedPost, LikedComment, WantedItem, FollowListItem, Language } from '../../types';

const USE_MOCK = false;

export const userService = {
  async getProfile(): Promise<User> {
    if (USE_MOCK) {
      return {
        name: '張小明',
        nickname: '浸大小明',
        email: 's12345678@hkbu.edu.hk',
        avatar: null,
        grade: 'gradeUndergradY2',
        major: 'majorCS',
        bio: '',
        gender: 'male',
        language: 'tc',
        isLoggedIn: true,
      };
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.PROFILE);
    return data;
  },

  async updateProfile(profile: Partial<User>): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.put(ENDPOINTS.USER.UPDATE_PROFILE, profile);
    return data;
  },

  async updateLanguage(language: Language): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    await apiClient.put(ENDPOINTS.USER.UPDATE_PROFILE, { language });
    return { success: true };
  },

  async getPublicProfile(userName: string): Promise<UserPublicProfile> {
    if (USE_MOCK) {
      const { mockUsers } = await import('../../data/mock/users');
      return mockUsers[userName] || mockUsers[Object.keys(mockUsers)[0]];
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.PUBLIC_PROFILE(userName));
    return data;
  },

  async getMyContent(): Promise<MyContent> {
    if (USE_MOCK) {
      return {
        posts: [
          {
            postId: 'library',
            lang: 'tc',
            content: '圖書館自習室今日好多人，有冇人知其他安靜嘅讀書地方？考試週真係壓力好大...',
            translated: { sc: '图书馆自习室今天好多人，有没有人知道其他安静的读书地方？考试周真的压力好大...', en: 'The library study room is packed today. Does anyone know other quiet study spots? Exam week is really stressful...' },
            time: '5小時前',
            likes: 67,
            comments: 18,
          },
        ],
        comments: [
          {
            postId: 'comp3015',
            commentId: 'comment-006',
            postAuthor: '王同學',
            postContent: '下學期有冇人想一齊選 COMP3015？聽講呢門課嘅 Group Project 好有趣，想搵隊友一齊做！有興趣嘅留言啦～',
            comment: '我都想選！可以加我一齊組隊',
            time: '4小時前',
            likes: 8,
          },
          {
            postId: 'cat',
            commentId: 'comment-007',
            postAuthor: '陳同學',
            postContent: '今日喺飯堂遇到一隻超可愛嘅貓咪！佢好親人，一直蹭我嘅腳，有冇人知佢係邊度嚟㗎？🐱',
            comment: '好可愛！我都想見到佢',
            time: '1日前',
            likes: 3,
          },
        ],
        anonPosts: [
          {
            postId: 'concert',
            lang: 'tc',
            content: '有冇人上個禮拜去咗呢個演唱會？今年最令人期待嘅演出！',
            translated: { sc: '有没有人上个星期去了这个演唱会？今年最令人期待的演出！', en: 'Did anyone go to this concert last week? Most anticipated performance this year!' },
            time: '8小時前',
            likes: 89,
            comments: 31,
          },
        ],
        anonComments: [
          {
            postId: 'concert',
            commentId: 'comment-008',
            postAuthor: '匿名用戶',
            postContent: '有冇人上個禮拜去咗呢個演唱會？今年最令人期待嘅演出！',
            comment: '去咗！真係好正，下次一定再去',
            time: '6小時前',
            likes: 2,
          },
        ],
        myLikes: {
          posts: [
            {
              postId: 'cat',
              author: '陳同學',
              avatar: '陳',
              gender: 'female' as const,
              content: '今日喺飯堂遇到一隻超可愛嘅貓咪！佢好親人 🐱',
              time: '2小時前',
              likes: 128,
              comments: 24,
            },
            {
              postId: 'library',
              author: '李同學',
              avatar: '李',
              gender: 'male' as const,
              content: '浸大圖書館嘅新自習區真係好正，推薦大家去試下！',
              time: '1日前',
              likes: 56,
              comments: 8,
            },
          ] as LikedPost[],
          comments: [
            {
              postId: 'comp3015',
              commentId: 'comment-002',
              postAuthor: '王同學',
              postContent: '下學期有冇人想一齊選 COMP3015？',
              commentAuthor: '張同學',
              comment: '我都想選！可以加你一齊組隊',
              time: '5小時前',
              likes: 8,
            },
          ] as LikedComment[],
        },
        myBookmarks: {
          comments: [] as LikedComment[],
        },
        myWants: [
          {
            itemIndex: 0,
            title: 'MacBook Pro 2021 14寸',
            price: 'HK$8,500',
            condition: '9成新',
            seller: '張同學',
            avatar: '張',
            gender: 'male' as const,
            time: '1小時前',
          },
          {
            itemIndex: 1,
            title: 'COMP1001 教科書',
            price: 'HK$80',
            condition: '8成新',
            seller: '李同學',
            avatar: '李',
            gender: 'female' as const,
            time: '3小時前',
          },
        ],
        stats: {
          following: 36,
          followers: 128,
          collection: 56,
        },
      };
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.MY_CONTENT);
    return data;
  },

  async getFollowingList(): Promise<FollowListItem[]> {
    if (USE_MOCK) {
      const { mockUsers } = await import('../../data/mock/users');
      return Object.entries(mockUsers).map(([name, u]) => ({
        userName: name,
        avatar: u.avatar,
        gender: u.gender,
        bio: u.bio,
        isFollowed: true,
      }));
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.FOLLOWING);
    return data;
  },

  async getFollowersList(): Promise<FollowListItem[]> {
    if (USE_MOCK) {
      const { mockUsers } = await import('../../data/mock/users');
      return Object.entries(mockUsers).map(([name, u]) => ({
        userName: name,
        avatar: u.avatar,
        gender: u.gender,
        bio: u.bio,
        isFollowed: false,
      }));
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.FOLLOWERS);
    return data;
  },

  async followUser(userName: string): Promise<{ followed: boolean }> {
    if (USE_MOCK) {
      return { followed: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.USER.FOLLOW(userName));
    return data;
  },

  async blockUser(userName: string): Promise<{ blocked: boolean }> {
    if (USE_MOCK) {
      return { blocked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.USER.BLOCK(userName));
    return data;
  },

  async unblockUser(userName: string): Promise<{ blocked: boolean }> {
    if (USE_MOCK) {
      return { blocked: false };
    }
    const { data } = await apiClient.delete(ENDPOINTS.USER.BLOCK(userName));
    return data;
  },

  async getBlockedList(): Promise<FollowListItem[]> {
    if (USE_MOCK) {
      const { mockUsers } = await import('../../data/mock/users');
      const blockedUsers = useForumStore.getState().blockedUsers;
      return Array.from(blockedUsers)
        .filter((name) => mockUsers[name])
        .map((name) => ({
          userName: name,
          avatar: mockUsers[name].avatar,
          gender: mockUsers[name].gender,
          bio: mockUsers[name].bio,
          isFollowed: false,
        }));
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.BLOCKED_LIST);
    // Backend returns { id, nickname, avatar, blockedAt }[]
    return (Array.isArray(data) ? data : []).map((b: { id: string; nickname: string; avatar: string }) => ({
      userName: b.nickname,
      avatar: b.avatar,
      gender: 'other' as const,
      bio: '',
      isFollowed: false,
    }));
  },
};
