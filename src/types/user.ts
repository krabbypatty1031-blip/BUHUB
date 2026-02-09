import { Gender } from './common';

export interface User {
  name: string;
  nickname: string;
  avatar: string | null;
  grade: string;
  major: string;
  bio: string;
  gender: Gender;
  isLoggedIn: boolean;
}

export interface UserPublicProfile {
  avatar: string;
  gender: Gender;
  bio: string;
  posts: number;
  likes: number;
  followers: number;
  userPosts: UserPost[];
  userComments: UserComment[];
}

export interface UserPost {
  lang: string;
  content: string;
  translated: { sc: string; en: string };
  time: string;
  likes: number;
  comments: number;
}

export interface UserComment {
  postAuthor: string;
  postContent: string;
  comment: string;
  time: string;
}

export interface LikedPost {
  author: string;
  avatar: string;
  gender: Gender;
  content: string;
  time: string;
  likes: number;
  comments: number;
}

export interface LikedComment {
  postAuthor: string;
  postContent: string;
  commentAuthor: string;
  comment: string;
  time: string;
  likes: number;
}

export interface MyContent {
  posts: UserPost[];
  comments: UserComment[];
  anonPosts: UserPost[];
  anonComments: UserComment[];
  myLikes: {
    posts: LikedPost[];
    comments: LikedComment[];
  };
  stats: {
    following: number;
    followers: number;
    collection: number;
  };
}

export interface Contact {
  name: string;
  avatar: string;
  message: string;
  time: string;
  unread: number;
  pinned: boolean;
  gender?: Gender;
  muted?: boolean;
}
