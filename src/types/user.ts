import { Gender, Language, PollOption } from './common';
import type { RatingCategory } from './rating';

export interface User {
  id?: string;
  userName?: string;
  name: string;
  nickname: string;
  email: string;
  avatar: string | null;
  defaultAvatar?: string | null;
  grade: string;
  major: string;
  bio: string;
  gender: Gender;
  language?: Language;
  isLoggedIn: boolean;
}

export interface MyInviteCode {
  id: string;
  code: string;
  createdAt: string;
  usedAt: string | null;
  status: 'used' | 'unused';
  usedBy: {
    id: string;
    userName: string | null;
    nickname: string;
    email: string | null;
  } | null;
}

export interface UserPublicProfile {
  id?: string;
  userName: string;
  nickname: string;
  avatar: string;
  gender: Gender;
  bio: string;
  grade: string;
  major: string;
  isHKBUVerified?: boolean;
  stats: {
    postCount: number;
    followerCount: number;
    followingCount: number;
  };
  isFollowedByMe: boolean;
}

export interface UserPost {
  postId: string;
  name: string;
  userName?: string;
  avatar: string;
  defaultAvatar?: string;
  gender: Gender;
  gradeKey?: string;
  majorKey?: string;
  meta: string;
  lang: string;
  sourceLanguage?: Language;
  content: string;
  translated?: { sc: string; en: string };
  time: string;
  likes: number;
  comments: number;
  tags?: string[];
  images?: string[];
  hasImage?: boolean;
  image?: string;
  isAnonymous?: boolean;
  postType?: string;
  isPoll?: boolean;
  pollOptions?: PollOption[];
  myVote?: { id: string; optionId: string; createdAt: string };
  isFunction?: boolean;
  functionType?: 'partner' | 'errand' | 'secondhand' | 'rating';
  functionId?: string;
  functionIndex?: number;
  functionTitle?: string;
  ratingCategory?: RatingCategory;
  quotedPost?: {
    id: string;
    name: string;
    sourceLanguage?: Language;
    content: string;
    createdAt: string;
  };
  liked?: boolean;
  bookmarked?: boolean;
}

export interface UserComment {
  postId: string;
  commentId: string;
  name: string;
  userName?: string;
  avatar: string;
  defaultAvatar?: string;
  gender?: Gender;
  gradeKey?: string;
  majorKey?: string;
  replyToName?: string;
  postAuthor: string;
  postContent: string;
  comment: string;
  sourceLanguage?: Language;
  time: string;
  likes: number;
  liked?: boolean;
  bookmarked?: boolean;
  isAnonymous?: boolean;
  replyCount?: number;
}

export interface LikedPost {
  postId: string;
  author: string;
  avatar: string;
  gender: Gender;
  content: string;
  time: string;
  likes: number;
  comments: number;
}

export interface LikedComment {
  postId: string;
  commentId: string;
  name?: string;
  userName?: string;
  avatar?: string;
  defaultAvatar?: string;
  gender?: Gender;
  gradeKey?: string;
  majorKey?: string;
  isAnonymous?: boolean;
  liked?: boolean;
  bookmarked?: boolean;
  replyToName?: string;
  postAuthor: string;
  postContent: string;
  commentAuthor: string;
  comment: string;
  sourceLanguage?: Language;
  time: string;
  likes: number;
  replyCount?: number;
}

export interface WantedItem {
  itemIndex: number;
  title: string;
  price: string;
  condition: string;
  seller: string;
  avatar: string;
  gender: Gender;
  time: string;
}

export interface MyContent {
  posts: UserPost[];
  comments: UserComment[];
  anonPosts: UserPost[];
  anonComments: UserComment[];
  myLikes: {
    posts: UserPost[];
    comments: LikedComment[];
  };
  myBookmarks: {
    posts: UserPost[];
    comments: LikedComment[];
  };
  myWants: WantedItem[];
  stats: {
    following: number;
    followers: number;
    collection: number;
  };
}

export interface FollowListItem {
  userName: string;
  nickname?: string;
  avatar: string;
  gender: Gender;
  bio: string;
  isFollowed: boolean;
  major?: string;
  grade?: string;
}

export interface Contact {
  id: string; // userId for API calls
  userName?: string;
  name: string;
  avatar: string;
  grade?: string;
  major?: string;
  message: string;
  time: string;
  unread: number;
  pinned: boolean;
  gender?: Gender;
  muted?: boolean;
}
