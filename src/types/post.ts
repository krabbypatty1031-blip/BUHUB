import type { Gender, Language, Translated, PollOption } from './common';

export interface ForumCircleSummary {
  name: string;
  usageCount: number;
  followerCount: number;
  followed: boolean;
}

export interface ForumPost {
  id: string;
  avatar: string;
  defaultAvatar?: string;
  name: string;
  userName?: string;
  gender: Gender;
  meta: string;
  gradeKey?: string;
  majorKey?: string;
  createdAt: string;
  lang: string;
  sourceLanguage?: Language;
  content: string;
  translated?: Translated;
  images?: string[];
  hasImage?: boolean;
  image?: string;
  likes: number;
  comments: number;
  isAnonymous?: boolean;
  tags?: string[];
  liked?: boolean;
  bookmarked?: boolean;
  isPoll?: boolean;
  pollOptions?: PollOption[];
  postType?: string;
  /** Current user's vote (from Vote table) */
  myVote?: { id: string; optionId: string; createdAt: string };
  isFunction?: boolean;
  functionType?: 'partner' | 'errand' | 'secondhand' | 'rating';
  functionId?: string;
  functionIndex?: number;
  functionTitle?: string;
  sourcePostId?: string;
  quotedPost?: {
    id: string;
    name: string;
    avatar?: string;
    gender?: Gender;
    sourceLanguage?: Language;
    content: string;
    createdAt?: string;
    isAnonymous?: boolean;
  };
}

export interface Comment {
  id: string;
  name: string;
  avatar: string;
  defaultAvatar?: string;
  gender?: Gender;
  gradeKey?: string;
  majorKey?: string;
  sourceLanguage?: Language;
  content: string;
  time: string;
  createdAt?: string;
  likes: number;
  liked?: boolean;
  bookmarked?: boolean;
  isAnonymous?: boolean;
  replies?: Reply[];
}

export interface Reply {
  id: string;
  name: string;
  avatar: string;
  defaultAvatar?: string;
  gender?: Gender;
  gradeKey?: string;
  majorKey?: string;
  sourceLanguage?: Language;
  replyTo: string;
  content: string;
  time: string;
  createdAt?: string;
  likes: number;
  liked?: boolean;
  bookmarked?: boolean;
  replies?: Reply[];
}

export type CommentsData = Record<string, Comment[]>;
