import { Gender } from './common';

export interface LikeNotification {
  user: string;
  userName?: string;
  avatar: string;
  gender: Gender;
  grade?: string;
  major?: string;
  action: 'likedYourPost' | 'likedYourComment' | 'likedYourReply';
  content: string;
  time: string;
  hasImage?: boolean;
  postId: string;
  commentId?: string;
}

export interface FollowerNotification {
  user: string;
  userName?: string;
  avatar: string;
  gender: Gender;
  bio: string;
  grade?: string;
  major?: string;
  time: string;
  isFollowed: boolean;
}

export interface CommentNotification {
  id?: string;
  user: string;
  userName?: string;
  avatar: string;
  gender: Gender;
  grade?: string;
  major?: string;
  action: 'commentedYourPost' | 'repliedYourComment' | 'mentionedYou';
  comment: string;
  originalPost: string;
  time: string;
  type: 'comment' | 'reply' | 'mention';
  postId: string;
  commentId: string;
}
