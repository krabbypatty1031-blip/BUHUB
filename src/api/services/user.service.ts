import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import { useForumStore } from '../../store/forumStore';
import type {
  User,
  UserPublicProfile,
  MyContent,
  LikedComment,
  UserPost,
  WantedItem,
  FollowListItem,
  Language,
  MyInviteCode,
  LinkedEmail,
} from '../../types';
import { normalizeAvatarUrl, normalizeImageUrl } from '../../utils/imageUrl';

const USE_MOCK = false;

const normalizeAvatarValue = (avatar: string | null | undefined): string => {
  if (typeof avatar === 'string' && avatar.startsWith('#')) {
    return avatar;
  }
  return normalizeAvatarUrl(avatar) ?? '';
};

const normalizeNullableAvatarValue = (avatar: string | null | undefined): string | null => {
  if (typeof avatar === 'string' && avatar.startsWith('#')) {
    return avatar;
  }
  return normalizeAvatarUrl(avatar) ?? null;
};

const normalizePostRecord = <T extends { avatar?: string; image?: string; images?: string[] }>(post: T): T => {
  const normalizedImages = Array.isArray(post.images)
    ? post.images
        .map((img) => normalizeImageUrl(img))
        .filter((img): img is string => typeof img === 'string' && img.length > 0)
    : [];
  const normalizedPrimaryImage = normalizeImageUrl(post.image);

  return {
    ...post,
    avatar: normalizeAvatarValue(post.avatar),
    images: normalizedImages.length > 0 ? normalizedImages : post.images,
    image: normalizedPrimaryImage ?? post.image,
  };
};

const normalizeCommentRecord = <T extends { avatar?: string }>(comment: T): T => ({
  ...comment,
  avatar: normalizeAvatarValue(comment.avatar),
});

const normalizeMyContentPayload = (payload: MyContent): MyContent => ({
  ...payload,
  posts: Array.isArray(payload.posts) ? payload.posts.map((post) => normalizePostRecord(post)) : [],
  comments: Array.isArray(payload.comments) ? payload.comments.map((comment) => normalizeCommentRecord(comment)) : [],
  anonPosts: Array.isArray(payload.anonPosts) ? payload.anonPosts.map((post) => normalizePostRecord(post)) : [],
  anonComments: Array.isArray(payload.anonComments) ? payload.anonComments.map((comment) => normalizeCommentRecord(comment)) : [],
  myLikes: {
    posts: Array.isArray(payload.myLikes?.posts) ? payload.myLikes.posts.map((post) => normalizePostRecord(post)) : [],
    comments: Array.isArray(payload.myLikes?.comments)
      ? payload.myLikes.comments.map((comment) => normalizeCommentRecord(comment as LikedComment))
      : [],
  },
  myBookmarks: {
    posts: Array.isArray(payload.myBookmarks?.posts) ? payload.myBookmarks.posts.map((post) => normalizePostRecord(post)) : [],
    comments: Array.isArray(payload.myBookmarks?.comments)
      ? payload.myBookmarks.comments.map((comment) => normalizeCommentRecord(comment as LikedComment))
      : [],
  },
  myWants: Array.isArray(payload.myWants)
    ? payload.myWants.map((item: WantedItem) => ({ ...item, avatar: normalizeAvatarValue(item.avatar) }))
    : [],
});

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
    return {
      ...data,
      avatar: normalizeNullableAvatarValue(data?.avatar),
    };
  },

  async getMyInviteCodes(): Promise<MyInviteCode[]> {
    if (USE_MOCK) {
      return [
        { id: 'mock-1', code: 'AB12CD34', createdAt: new Date().toISOString(), usedAt: null, status: 'unused', usedBy: null },
        { id: 'mock-2', code: 'EF56GH78', createdAt: new Date().toISOString(), usedAt: null, status: 'unused', usedBy: null },
        { id: 'mock-3', code: 'JK90LM12', createdAt: new Date().toISOString(), usedAt: null, status: 'unused', usedBy: null },
      ];
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.INVITE_CODES);
    return Array.isArray(data) ? (data as MyInviteCode[]) : [];
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

  async unlinkEmail(emailId: string): Promise<{
    linkedEmails: LinkedEmail[];
    isHKBUVerified: boolean;
    hkbuEmail?: string;
    currentLoginEmail?: string;
    requiresRelogin?: boolean;
  }> {
    if (USE_MOCK) {
      return {
        linkedEmails: [],
        isHKBUVerified: false,
      };
    }
    const { data } = await apiClient.delete(ENDPOINTS.USER.UNLINK_EMAIL(emailId));
    return data;
  },

  async getPublicProfile(userName: string): Promise<UserPublicProfile> {
    if (USE_MOCK) {
      const { mockUsers } = await import('../../data/mock/users');
      return mockUsers[userName] || mockUsers[Object.keys(mockUsers)[0]];
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.PUBLIC_PROFILE(userName));
    return {
      ...data,
      avatar: normalizeAvatarValue(data?.avatar),
    };
  },

  async getMyContent(): Promise<MyContent> {
    if (USE_MOCK) {
      return {
        posts: [
          {
            postId: 'library',
            name: '测试用户',
            avatar: '',
            gender: 'male' as const,
            gradeKey: 'gradeUndergradY3',
            majorKey: 'majorCS',
            meta: 'gradeUndergradY3 · majorCS',
            lang: 'tc',
            content: '圖書館自習室今日好多人，有冇人知其他安靜嘅讀書地方？考試週真係壓力好大...',
            translated: { sc: '图书馆自习室今天好多人，有没有人知道其他安静的读书地方？考试周真的压力好大...', en: 'The library study room is packed today. Does anyone know other quiet study spots? Exam week is really stressful...' },
            time: '2024-01-01T00:00:00.000Z',
            likes: 67,
            comments: 18,
            liked: false,
            bookmarked: false,
          },
        ],
        comments: [
          {
            postId: 'comp3015',
            commentId: 'comment-006',
            name: '测试用户',
            avatar: '',
            postAuthor: '王同學',
            postContent: '下學期有冇人想一齊選 COMP3015？聽講呢門課嘅 Group Project 好有趣，想搵隊友一齊做！有興趣嘅留言啦～',
            comment: '我都想選！可以加我一齊組隊',
            time: '4小時前',
            likes: 8,
          },
          {
            postId: 'cat',
            commentId: 'comment-007',
            name: '测试用户',
            avatar: '',
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
            name: '匿名用户',
            avatar: '',
            gender: 'other' as const,
            gradeKey: undefined,
            majorKey: undefined,
            meta: '',
            lang: 'tc',
            content: '有冇人上個禮拜去咗呢個演唱會？今年最令人期待嘅演出！',
            translated: { sc: '有没有人上个星期去了这个演唱会？今年最令人期待的演出！', en: 'Did anyone go to this concert last week? Most anticipated performance this year!' },
            time: '2024-01-01T00:00:00.000Z',
            likes: 89,
            comments: 31,
            isAnonymous: true,
            liked: false,
            bookmarked: false,
          },
        ],
        anonComments: [
          {
            postId: 'concert',
            commentId: 'comment-008',
            name: '匿星星同学',
            avatar: '#FF6B6B',
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
          ] as unknown as UserPost[],
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
          posts: [],
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
    return normalizeMyContentPayload(data as MyContent);
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
        major: u.major,
        grade: u.grade,
      }));
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.FOLLOWING);
    return (Array.isArray(data) ? data : []).map((item: FollowListItem) => ({
      ...item,
      avatar: normalizeAvatarValue(item.avatar),
    }));
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
        major: u.major,
        grade: u.grade,
      }));
    }
    const { data } = await apiClient.get(ENDPOINTS.USER.FOLLOWERS);
    return (Array.isArray(data) ? data : []).map((item: FollowListItem) => ({
      ...item,
      avatar: normalizeAvatarValue(item.avatar),
    }));
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

  async requestDataExport(): Promise<{ jobId: string } | null> {
    if (USE_MOCK) return { jobId: 'mock-job-id' };
    const res = await apiClient.post(ENDPOINTS.USER.EXPORT_REQUEST);
    const data = res?.data ?? res;
    const jobId = data?.jobId ?? data?.data?.jobId;
    return typeof jobId === 'string' ? { jobId } : null;
  },

  async pollExportJob(
    jobId: string,
    maxAttempts = 60
  ): Promise<{ jobId: string; downloadUrl: string } | null> {
    const pollInterval = 2000;
    for (let i = 0; i < maxAttempts; i++) {
      const res = await apiClient.get(ENDPOINTS.USER.EXPORT_STATUS(jobId));
      const data = res?.data ?? res;
      const status = data?.status ?? data?.data?.status;
      if (status === 'ready') {
        const downloadUrl = data?.downloadUrl ?? data?.data?.downloadUrl;
        return typeof downloadUrl === 'string' ? { jobId, downloadUrl } : null;
      }
      if (status === 'failed') return null;
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    return null;
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
      avatar: normalizeAvatarValue(b.avatar),
      gender: 'other' as const,
      bio: '',
      isFollowed: false,
    }));
  },
};

