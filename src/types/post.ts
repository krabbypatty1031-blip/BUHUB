import { Gender, Translated, PollOption } from './common';

export interface ForumPost {
  id: string;
  avatar: string;
  name: string;
  gender: Gender;
  meta: string;
  lang: string;
  content: string;
  translated?: Translated;
  hasImage?: boolean;
  image?: string;
  likes: number;
  comments: number;
  isAnonymous?: boolean;
  tags?: string[];
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
  };
}

export interface Comment {
  id?: string;
  name: string;
  avatar: string;
  content: string;
  time: string;
  likes: number;
  isAnonymous?: boolean;
  replies?: Reply[];
}

export interface Reply {
  id?: string;
  name: string;
  avatar: string;
  replyTo: string;
  content: string;
  time: string;
  likes: number;
}

export type CommentsData = Record<string, Comment[]>;
