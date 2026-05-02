import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { ForumPost, CommentsData, Comment, Reply, PaginationParams, ForumCircleSummary, RatingCategory, FunctionRefPreview } from '../../types';
import { normalizeImageUrl, normalizeAvatarUrl } from '../../utils/imageUrl';
import i18n, { normalizeLanguage } from '../../i18n';

const USE_MOCK = false;
const FUNCTION_REF_PREFIX = '[FUNC_REF]';

type FunctionRefType = 'partner' | 'errand' | 'secondhand' | 'rating';

type FunctionRefPayload = {
  type: FunctionRefType;
  id: string;
  title: string;
  ratingCategory?: RatingCategory;
};

type ApiAuthorRecord = {
  avatar?: string | null;
  defaultAvatar?: string;
  userName?: string;
  nickname?: string;
  gender?: unknown;
  grade?: string;
  major?: string;
};

type ApiPollOptionRecord = {
  id?: string;
  text: string;
  voteCount?: number;
};

type ApiVoteRecord = {
  id?: string;
  optionId?: string;
  createdAt?: string;
};

type ApiQuotedPostRecord = {
  id?: string;
  name?: string;
  avatar?: string;
  gender?: unknown;
  sourceLanguage?: ForumPost['sourceLanguage'];
  content?: string;
  createdAt?: string;
  isAnonymous?: boolean;
};

type ApiPostRecord = {
  id?: string;
  author?: ApiAuthorRecord;
  pollOptions?: ApiPollOptionRecord[];
  postType?: string;
  content?: string;
  images?: unknown[];
  image?: string;
  isAnonymous?: boolean;
  avatar?: string | null;
  anonymousAvatar?: string | null;
  anonymousName?: string;
  isOwnedByCurrentUser?: boolean;
  name?: string;
  userName?: string;
  gender?: unknown;
  gradeKey?: string;
  majorKey?: string;
  likeCount?: number;
  likes?: number;
  commentCount?: number;
  comments?: number;
  sourceLanguage?: ForumPost['sourceLanguage'];
  lang?: string;
  defaultAvatar?: string;
  tags?: string[];
  liked?: boolean;
  bookmarked?: boolean;
  myVote?: ApiVoteRecord;
  functionIndex?: number;
  createdAt?: string;
  quotedPost?: ApiQuotedPostRecord;
  sourcePostId?: string;
  translated?: ForumPost['translated'];
  functionRefPreview?: {
    entityType?: FunctionRefPreview['entityType'];
    entityId?: string;
    title?: string;
    sourceLanguage?: ForumPost['sourceLanguage'];
    isFallback?: boolean;
  };
} & Record<string, unknown>;

type ApiCommentRecord = {
  id?: string;
  name?: string;
  userName?: string;
  avatar?: string | null;
  anonymousAvatar?: string | null;
  anonymousName?: string;
  isOwnedByCurrentUser?: boolean;
  author?: ApiAuthorRecord;
  isAnonymous?: boolean;
  sourceLanguage?: Comment['sourceLanguage'];
  content?: string;
  createdAt?: string | number | Date;
  likeCount?: number;
  liked?: boolean;
  bookmarked?: boolean;
  replies?: ApiCommentRecord[];
} & Record<string, unknown>;

type ApiCircleRecord = {
  name?: string;
  usageCount?: number;
  followerCount?: number;
  followed?: boolean;
};

type ApiPostsResponse = {
  posts?: ApiPostRecord[];
  hasMore?: boolean;
  page?: number;
};

function encodeFunctionRef(
  content: string,
  ref?: { functionType?: string; functionId?: string; functionTitle?: string; ratingCategory?: RatingCategory }
) {
  if (!ref?.functionType || !ref.functionId || !ref.functionTitle) return content;
  const payload: FunctionRefPayload = {
    type: ref.functionType as FunctionRefType,
    id: ref.functionId,
    title: ref.functionTitle,
    ...(ref.functionType === 'rating' && ref.ratingCategory ? { ratingCategory: ref.ratingCategory } : {}),
  };
  return `${FUNCTION_REF_PREFIX}${JSON.stringify(payload)}\n${content}`;
}

function parseFunctionRef(content: string): {
  content: string;
  isFunction?: true;
  functionType?: FunctionRefType;
  functionId?: string;
  functionTitle?: string;
  ratingCategory?: RatingCategory;
} {
  if (!content.startsWith(FUNCTION_REF_PREFIX)) {
    return { content };
  }

  const newlineIndex = content.indexOf('\n');
  if (newlineIndex < 0) return { content };

  const raw = content.slice(FUNCTION_REF_PREFIX.length, newlineIndex);
  const parsedContent = content.slice(newlineIndex + 1);
  try {
    const payload = JSON.parse(raw) as FunctionRefPayload;
    if (!payload?.type || !payload?.id || !payload?.title) {
      return { content: parsedContent };
    }
    return {
      content: parsedContent,
      isFunction: true,
      functionType: payload.type,
      functionId: payload.id,
      functionTitle: payload.title,
      ...(payload.type === 'rating' && payload.ratingCategory ? { ratingCategory: payload.ratingCategory } : {}),
    };
  } catch {
    return { content: parsedContent };
  }
}

function resolveAvatarValue(avatar: string | null | undefined): string {
  if (typeof avatar === 'string' && avatar.startsWith('#')) {
    return avatar;
  }
  return normalizeAvatarUrl(avatar) ?? (avatar ?? '');
}

function resolveAnonymousNameValue(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined;
  const trimmed = name.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { tc?: string; sc?: string; en?: string };
      const language = normalizeLanguage(i18n.language) ?? 'tc';
      return parsed[language] ?? parsed.tc ?? parsed.sc ?? parsed.en;
    } catch {
      return undefined;
    }
  }

  return trimmed;
}

function mapPollOptions(
  pollOpts: { id?: string; text: string; voteCount?: number }[] | undefined
) {
  const totalVotes = pollOpts?.reduce((sum, option) => sum + (option.voteCount ?? 0), 0) ?? 0;
  return pollOpts?.map((option) => ({
    ...option,
    percent: totalVotes > 0 ? Math.round(((option.voteCount ?? 0) / totalVotes) * 100) : 0,
  }));
}

function normalizeGenderValue(value: unknown): 'male' | 'female' | 'other' {
  if (typeof value !== 'string') return 'other';
  const normalized = value.trim().toLowerCase();
  const compact = normalized.replace(/[^a-z]/g, '');

  if (compact.startsWith('female')) return 'female';
  if (compact.startsWith('male')) return 'male';
  if (compact === 'secret') return 'other';
  return 'other';
}

function normalizeLanguageValue(value: unknown): ForumPost['sourceLanguage'] | undefined {
  if (value !== 'tc' && value !== 'sc' && value !== 'en') {
    return undefined;
  }
  return value;
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || value instanceof Date) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function mapFunctionRefPreview(
  preview: ApiPostRecord['functionRefPreview']
): FunctionRefPreview | undefined {
  if (!preview?.entityType || !preview.entityId || !preview.title) {
    return undefined;
  }

  return {
    entityType: preview.entityType,
    entityId: preview.entityId,
    title: preview.title,
    sourceLanguage: normalizeLanguageValue(preview.sourceLanguage),
    isFallback: Boolean(preview.isFallback),
  };
}

function mapPostRecord(p: ApiPostRecord): ForumPost {
  const author = p.author ?? {};
  const pollOpts = p.pollOptions;
  const pollOptions = mapPollOptions(pollOpts);
  const isPoll = (p.postType === 'poll') || (pollOpts?.length ?? 0) > 0;
  const functionRef = parseFunctionRef(p.content ?? '');
  const functionRefPreview = mapFunctionRefPreview(p.functionRefPreview);
  const sourceLanguage = normalizeLanguageValue(p.sourceLanguage) ?? normalizeLanguageValue(p.lang) ?? 'tc';
  const rawImages: unknown[] = Array.isArray(p.images) ? p.images : [];
  const normalizedImages = rawImages
    .map((img: unknown) => normalizeImageUrl(typeof img === 'string' ? img : undefined))
    .filter((img: string | null): img is string => !!img);
  const fallbackImage = normalizeImageUrl(typeof p.image === 'string' ? p.image : undefined) ?? '';
  const primaryImage = normalizedImages[0] ?? fallbackImage;
  const avatarSource = p.isAnonymous ? (p.avatar ?? p.anonymousAvatar) : (p.avatar ?? author.avatar);
  const resolvedAnonymousName = resolveAnonymousNameValue(p.anonymousName);

  return {
    ...functionRef,
    ...(functionRefPreview
      ? {
          isFunction: true as const,
          functionType: functionRefPreview.entityType,
          functionId: functionRefPreview.entityId,
          functionTitle: functionRefPreview.title,
        }
      : {}),
    id: p.id ?? '',
    lang: sourceLanguage,
    sourceLanguage,
    isOwnedByCurrentUser: typeof p.isOwnedByCurrentUser === 'boolean' ? p.isOwnedByCurrentUser : undefined,
    name: p.isAnonymous ? (p.name ?? resolvedAnonymousName ?? '?') : (p.name ?? author.nickname ?? '?'),
    avatar: resolveAvatarValue(avatarSource),
    defaultAvatar: p.defaultAvatar ?? author.defaultAvatar,
    userName: p.isAnonymous ? undefined : (p.userName ?? author.userName ?? author.nickname),
    gender: p.isAnonymous ? 'other' : normalizeGenderValue(author.gender ?? p.gender),
    gradeKey: p.isAnonymous ? undefined : (p.gradeKey ?? author.grade),
    majorKey: p.isAnonymous ? undefined : (p.majorKey ?? author.major),
    meta: '',
    likes: p.likeCount ?? p.likes ?? 0,
    comments: p.commentCount ?? p.comments ?? 0,
    createdAt: normalizeTimestamp(p.createdAt),
    content: functionRef.content,
    translated: p.translated,
    functionRefPreview,
    tags: p.tags,
    liked: p.liked ?? false,
    bookmarked: p.bookmarked ?? false,
    isAnonymous: Boolean(p.isAnonymous),
    postType: p.postType,
    myVote: p.myVote?.id && p.myVote.optionId && p.myVote.createdAt
      ? {
          id: p.myVote.id,
          optionId: p.myVote.optionId,
          createdAt: p.myVote.createdAt,
        }
      : undefined,
    functionIndex: typeof p.functionIndex === 'number' ? p.functionIndex : undefined,
    sourcePostId: typeof p.sourcePostId === 'string' ? p.sourcePostId : undefined,
    quotedPost: p.quotedPost
      ? {
          id: p.quotedPost.id ?? '',
          name: p.quotedPost.name ?? '?',
          avatar: typeof p.quotedPost.avatar === 'string' ? p.quotedPost.avatar : undefined,
          gender: normalizeGenderValue(p.quotedPost.gender),
          sourceLanguage: normalizeLanguageValue(p.quotedPost.sourceLanguage),
          content: p.quotedPost.content ?? '',
          createdAt: p.quotedPost.createdAt,
          isAnonymous: p.quotedPost.isAnonymous,
        }
      : undefined,
    pollOptions,
    isPoll,
    images: normalizedImages.length > 0 ? normalizedImages : (primaryImage ? [primaryImage] : []),
    hasImage: !!primaryImage,
    image: primaryImage,
  };
}

function mapReplyRecord(r: ApiCommentRecord, parentName: string): Reply {
  const isAnonymous = !!r.isAnonymous;
  const replyName = r.name ?? resolveAnonymousNameValue(r.anonymousName) ?? r.author?.nickname ?? '?';
  const nestedReplies: Reply[] | undefined = r.replies?.length
    ? r.replies.map((nested) => mapReplyRecord(nested, replyName))
    : undefined;

  return {
    id: r.id ?? '',
    name: replyName,
    isOwnedByCurrentUser: typeof r.isOwnedByCurrentUser === 'boolean' ? r.isOwnedByCurrentUser : undefined,
    userName: isAnonymous ? undefined : (r.userName ?? r.author?.userName ?? r.author?.nickname ?? undefined),
    avatar: resolveAvatarValue(r.avatar ?? r.anonymousAvatar ?? r.author?.avatar),
    defaultAvatar: isAnonymous ? undefined : (typeof r.author?.avatar === 'string' ? r.author.avatar : undefined),
    gender: isAnonymous ? undefined : normalizeGenderValue(r.author?.gender),
    gradeKey: isAnonymous ? undefined : (r.author?.grade ?? undefined),
    majorKey: isAnonymous ? undefined : (r.author?.major ?? undefined),
    sourceLanguage: normalizeLanguageValue(r.sourceLanguage) ?? 'tc',
    replyTo: parentName,
    content: r.content ?? '',
    time: normalizeTimestamp(r.createdAt),
    likes: r.likeCount ?? 0,
    liked: r.liked ?? false,
    bookmarked: r.bookmarked ?? false,
    isAnonymous,
    replies: nestedReplies,
  };
}

function mapCommentRecord(c: ApiCommentRecord): Comment {
  const isAnonymous = !!c.isAnonymous;
  const commentName = c.name ?? resolveAnonymousNameValue(c.anonymousName) ?? c.author?.nickname ?? '?';
  const time = normalizeTimestamp(c.createdAt);
  const replies: Reply[] | undefined = c.replies?.length
    ? c.replies.map((reply) => mapReplyRecord(reply, commentName))
    : undefined;

  return {
    id: c.id ?? '',
    name: commentName,
    isOwnedByCurrentUser: typeof c.isOwnedByCurrentUser === 'boolean' ? c.isOwnedByCurrentUser : undefined,
    userName: isAnonymous ? undefined : (c.userName ?? c.author?.userName ?? c.author?.nickname ?? undefined),
    avatar: resolveAvatarValue(c.avatar ?? c.anonymousAvatar ?? c.author?.avatar),
    defaultAvatar: isAnonymous ? undefined : (typeof c.author?.avatar === 'string' ? c.author.avatar : undefined),
    gender: isAnonymous ? undefined : normalizeGenderValue(c.author?.gender),
    gradeKey: isAnonymous ? undefined : (c.author?.grade ?? undefined),
    majorKey: isAnonymous ? undefined : (c.author?.major ?? undefined),
    sourceLanguage: normalizeLanguageValue(c.sourceLanguage) ?? 'tc',
    content: c.content ?? '',
    time,
    likes: c.likeCount ?? 0,
    liked: c.liked ?? false,
    bookmarked: c.bookmarked ?? false,
    isAnonymous,
    replies,
  };
}

export const forumService = {
  async getCircles(params?: { followedOnly?: boolean }): Promise<ForumCircleSummary[]> {
    const { data } = await apiClient.get(ENDPOINTS.FORUM.CIRCLES, {
      params: params?.followedOnly ? { followedOnly: 1 } : undefined,
    });
    return (Array.isArray(data) ? data : []).map((item: ApiCircleRecord) => ({
      name: String(item?.name ?? ''),
      usageCount: Number(item?.usageCount ?? 0),
      followerCount: Number(item?.followerCount ?? 0),
      followed: Boolean(item?.followed),
    }));
  },

  async getCircleFollow(tag: string): Promise<{ tag: string; followerCount: number; followed: boolean }> {
    const { data } = await apiClient.get(ENDPOINTS.FORUM.CIRCLE_FOLLOW(tag));
    return {
      tag: data?.tag ?? tag,
      followerCount: Number(data?.followerCount ?? 0),
      followed: !!data?.followed,
    };
  },

  async toggleCircleFollow(tag: string): Promise<{ tag: string; followerCount: number; followed: boolean }> {
    const { data } = await apiClient.post(ENDPOINTS.FORUM.CIRCLE_FOLLOW(tag));
    return {
      tag: data?.tag ?? tag,
      followerCount: Number(data?.followerCount ?? 0),
      followed: !!data?.followed,
    };
  },

  async getPosts(params?: PaginationParams): Promise<{ posts: ForumPost[]; hasMore: boolean; page: number }> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return { posts: mockPosts, hasMore: false, page: 1 };
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.POSTS, { params });
    if (Array.isArray(data)) {
      return { posts: data.map((post: ApiPostRecord) => mapPostRecord(post)), hasMore: false, page: 1 };
    }
    const { posts: rawPosts, hasMore, page } = data as ApiPostsResponse;
    return {
      posts: (Array.isArray(rawPosts) ? rawPosts : []).map((post: ApiPostRecord) => mapPostRecord(post)),
      hasMore: !!hasMore,
      page: page ?? 1,
    };
  },

  async getUserPosts(userName: string, params?: PaginationParams): Promise<{ posts: ForumPost[]; hasMore: boolean; page: number }> {
    const { data } = await apiClient.get(ENDPOINTS.USER.USER_POSTS(userName), { params });
    if (Array.isArray(data)) {
      return { posts: data.map((post: ApiPostRecord) => mapPostRecord(post)), hasMore: false, page: 1 };
    }
    const { posts: rawPosts, hasMore, page } = data as ApiPostsResponse;
    return {
      posts: (Array.isArray(rawPosts) ? rawPosts : []).map((post: ApiPostRecord) => mapPostRecord(post)),
      hasMore: !!hasMore,
      page: page ?? 1,
    };
  },

  async getFollowingPosts(params?: PaginationParams): Promise<{ posts: ForumPost[]; hasMore: boolean; page: number }> {
    if (USE_MOCK) {
      return { posts: [], hasMore: false, page: 1 };
    }
    const { data } = await apiClient.get(ENDPOINTS.FEED.FOLLOWING, { params });
    if (Array.isArray(data)) {
      return { posts: data.map((post: ApiPostRecord) => mapPostRecord(post)), hasMore: false, page: 1 };
    }
    const { posts: rawPosts, hasMore, page } = data as ApiPostsResponse;
    return {
      posts: (Array.isArray(rawPosts) ? rawPosts : []).map((post: ApiPostRecord) => mapPostRecord(post)),
      hasMore: !!hasMore,
      page: page ?? 1,
    };
  },

  async getPostDetail(postId: string): Promise<ForumPost> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts.find((p) => p.id === postId) || mockPosts[0];
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.POST_DETAIL(postId));
    return mapPostRecord(data as ApiPostRecord);
  },

  async getComments(postId: string): Promise<CommentsData> {
    if (USE_MOCK) {
      const { mockCommentsData } = await import('../../data/mock/forum');
      return { [postId]: mockCommentsData[postId] || [] };
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.COMMENTS(postId));
    const comments: Comment[] = Array.isArray(data) ? data.map((comment: ApiCommentRecord) => mapCommentRecord(comment)) : [];
    return { [postId]: comments };
  },

  async createPost(post: {
    content: string;
    tags?: string[];
    isAnonymous?: boolean;
    pollOptions?: string[];
    images?: string[];
    quotedPostId?: string;
    functionType?: string;
    functionId?: string;
    functionTitle?: string;
    ratingCategory?: RatingCategory;
  }): Promise<ForumPost> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      const newPost: ForumPost = {
        id: 'new-' + Date.now(),
        avatar: '',
        name: post.isAnonymous ? '匿名用户' : 'Me',
        gender: post.isAnonymous ? 'other' : 'male',
        meta: '',
        createdAt: new Date().toISOString(),
        lang: 'tc',
        content: post.content,
        likes: 0,
        comments: 0,
        tags: post.tags,
        isAnonymous: post.isAnonymous,
      };
      mockPosts.unshift(newPost);
      return newPost;
    }
    const postType = post.pollOptions?.length ? 'poll' : post.images?.length ? 'image-text' : 'text';
    const content = encodeFunctionRef(post.content, {
      functionType: post.functionType,
      functionId: post.functionId,
      functionTitle: post.functionTitle,
      ratingCategory: post.ratingCategory,
    });
    const { data } = await apiClient.post(ENDPOINTS.FORUM.POSTS, {
      postType,
      content,
      images: post.images ?? [],
      tags: post.tags ?? [],
      isAnonymous: post.isAnonymous ?? false,
      pollOptions: post.pollOptions,
      quotedPostId: post.quotedPostId,
    });
    return mapPostRecord(data as ApiPostRecord);
  },

  async editPost(postId: string, post: { content: string; tags?: string[] }): Promise<ForumPost> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      const original = mockPosts.find((p) => p.id === postId) || mockPosts[0];
      return { ...original, ...post };
    }
    const { data } = await apiClient.put(ENDPOINTS.FORUM.EDIT_POST(postId), post);
    return mapPostRecord(data as ApiPostRecord);
  },

  async deletePost(postId: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.FORUM.DELETE_POST(postId));
    return data;
  },

  async createComment(postId: string, content: string, isAnonymous?: boolean, parentId?: string): Promise<Comment> {
    if (USE_MOCK) {
      return {
        id: 'comment-new-' + Date.now(),
        name: isAnonymous ? '匿名用户' : 'Me',
        avatar: '',
        content,
        time: new Date().toISOString(),
        likes: 0,
        isAnonymous,
      };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.CREATE_COMMENT(postId), {
      content,
      isAnonymous: isAnonymous ?? false,
      ...(parentId && { parentId }),
    });
    return mapCommentRecord(data as ApiCommentRecord);
  },

  async editComment(postId: string, commentId: string, content: string): Promise<Comment> {
    if (USE_MOCK) {
      return {
        id: commentId,
        name: 'Me',
        avatar: '',
        content,
        time: new Date().toISOString(),
        likes: 0,
      };
    }
    const { data } = await apiClient.put(ENDPOINTS.FORUM.EDIT_COMMENT(commentId), { content });
    return data;
  },

  async deleteComment(postId: string, commentId: string): Promise<{ success: boolean }> {
    if (USE_MOCK) {
      return { success: true };
    }
    const { data } = await apiClient.delete(ENDPOINTS.FORUM.DELETE_COMMENT(commentId));
    return data;
  },

  async likePost(postId: string): Promise<{ liked: boolean; likeCount?: number }> {
    if (USE_MOCK) {
      return { liked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.LIKE(postId));
    return data;
  },

  async bookmarkPost(postId: string): Promise<{ bookmarked: boolean }> {
    if (USE_MOCK) {
      return { bookmarked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.BOOKMARK(postId));
    return data;
  },

  async likeComment(commentId: string): Promise<{ liked: boolean; likeCount?: number }> {
    if (USE_MOCK) {
      return { liked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.LIKE_COMMENT(commentId));
    return data;
  },

  async bookmarkComment(commentId: string): Promise<{ bookmarked: boolean }> {
    if (USE_MOCK) {
      return { bookmarked: true };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.BOOKMARK_COMMENT(commentId));
    return data;
  },

  async votePost(postId: string, optionId: string): Promise<{ voted?: boolean; optionId?: string; voteCount?: number }> {
    if (USE_MOCK) {
      return { voted: true, optionId };
    }
    const { data } = await apiClient.post(ENDPOINTS.FORUM.VOTE(postId), { optionId });
    return data;
  },

  async search(query: string): Promise<ForumPost[]> {
    if (USE_MOCK) {
      const { mockPosts } = await import('../../data/mock/forum');
      return mockPosts.filter((post) => post.content.includes(query));
    }
    const { data } = await apiClient.get(ENDPOINTS.FORUM.SEARCH, { params: { q: query } });
    return (Array.isArray(data) ? data : []).map((post: ApiPostRecord) => mapPostRecord(post));
  },
};
