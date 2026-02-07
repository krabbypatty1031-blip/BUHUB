import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { User, UserPublicProfile, MyContent } from '../../types';

const USE_MOCK = true;

export const userService = {
  async getProfile(): Promise<User> {
    if (USE_MOCK) {
      return {
        name: '張小明',
        nickname: '浸大小明',
        avatar: null,
        grade: 'Year 2',
        major: 'Computer Science',
        bio: '',
        gender: 'male',
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
            lang: 'tc',
            content: '圖書館自習室今日好多人，有冇人知其他安靜嘅讀書地方？考試週真係壓力好大...',
            translated: { sc: '图书馆自习室今天好多人...', en: 'The library study room is packed today...' },
            time: '5小時前',
            likes: 67,
            comments: 18,
          },
          {
            lang: 'tc',
            content: '今個學期嘅 CS 課程真係好充實，學到好多嘢！推薦大家試下 COMP3015',
            translated: { sc: '这个学期的CS课程真的好充实...', en: 'This semester CS courses are really fulfilling...' },
            time: '2日前',
            likes: 23,
            comments: 5,
          },
        ],
        comments: [
          {
            postAuthor: '王同學',
            postContent: '下學期有冇人想一齊選 COMP3015？',
            comment: '我都想選！可以加我一齊組隊',
            time: '4小時前',
          },
          {
            postAuthor: '陳同學',
            postContent: '今日喺飯堂遇到一隻超可愛嘅貓咪！',
            comment: '好可愛！我都想見到佢',
            time: '1日前',
          },
        ],
        anonPosts: [
          {
            lang: 'tc',
            content: '有冇人覺得學校嘅 Wi-Fi 真係好慢？每次上堂都連唔到...',
            translated: { sc: '有没有人觉得学校的Wi-Fi真的好慢？', en: "Does anyone find the school Wi-Fi really slow?" },
            time: '1日前',
            likes: 89,
            comments: 31,
          },
        ],
        anonComments: [
          {
            postAuthor: '匿名用戶',
            postContent: '大家覺得學校餐廳邊間最好食？',
            comment: '個人覺得新開嗰間唔錯',
            time: '3日前',
          },
        ],
      };
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.PROFILE + '/content');
    return data;
  },

  async followUser(userName: string): Promise<{ followed: boolean }> {
    if (USE_MOCK) {
      return { followed: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.USER.FOLLOW(userName));
    return data;
  },
};
