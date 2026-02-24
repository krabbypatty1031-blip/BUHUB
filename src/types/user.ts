import { Gender, Language, PollOption } from './common';

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
  avatar: string;
  defaultAvatar?: string;
  gender: Gender;
  gradeKey?: string;
  majorKey?: string;
  meta: string;
  lang: string;
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
  quotedPost?: {
    id: string;
    name: string;
    content: string;
    createdAt: string;
  };
  liked?: boolean;
  bookmarked?: boolean;
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
  myBookmarks: {
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
  id: string; // userId for API calls
  name: string;
  avatar: string;
  message: string;
  time: string;
  unread: number;
  pinned: boolean;
  gender?: Gender;
  muted?: boolean;
}
