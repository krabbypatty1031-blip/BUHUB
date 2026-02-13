import { Gender, Language } from './common';

export interface User {
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
  postId: string;
  lang: string;
  content: string;
  translated: { sc: string; en: string };
  time: string;
  likes: number;
  comments: number;
}

export interface UserComment {
  postId: string;
  commentId: string;
  postAuthor: string;
  postContent: string;
  comment: string;
  time: string;
  likes: number;
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
  postAuthor: string;
  postContent: string;
  commentAuthor: string;
  comment: string;
  time: string;
  likes: number;
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
    posts: LikedPost[];
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
  avatar: string;
  gender: Gender;
  bio: string;
  isFollowed: boolean;
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
