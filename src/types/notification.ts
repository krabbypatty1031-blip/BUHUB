import { Gender } from './common';

export interface LikeNotification {
  user: string;
  avatar: string;
  gender: Gender;
  action: 'likedYourPost' | 'likedYourComment' | 'likedYourReply';
  content: string;
  time: string;
  hasImage?: boolean;
  postId: string;
  commentId?: string;
}

export interface FollowerNotification {
  user: string;
  avatar: string;
  gender: Gender;
  bio: string;
  time: string;
  isFollowed: boolean;
}

export interface CommentNotification {
  user: string;
  avatar: string;
  gender: Gender;
  action: 'commentedYourPost' | 'repliedYourComment' | 'mentionedYou';
  comment: string;
  originalPost: string;
  time: string;
  type: 'comment' | 'reply' | 'mention';
  postId: string;
  commentId: string;
}
