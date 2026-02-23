import { Gender, Translated, PollOption } from './common';

export interface ForumPost {
  id: string;
  avatar: string;
  defaultAvatar?: string;
  name: string;
  gender: Gender;
  meta: string;
  gradeKey?: string;
  majorKey?: string;
  createdAt: string;
  lang: string;
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
  isFunction?: boolean;
  functionType?: 'partner' | 'errand' | 'secondhand' | 'rating';
  functionIndex?: number;
  functionTitle?: string;
  quotedPost?: {
    name: string;
    content: string;
    meta: string;
    createdAt?: string;
  };
}

export interface Comment {
  id: string;
  name: string;
  avatar: string;
  defaultAvatar?: string;
  gradeKey?: string;
  majorKey?: string;
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
  gradeKey?: string;
  majorKey?: string;
  replyTo: string;
  content: string;
  time: string;
  createdAt?: string;
  likes: number;
  liked?: boolean;
  bookmarked?: boolean;
}

export type CommentsData = Record<string, Comment[]>;
