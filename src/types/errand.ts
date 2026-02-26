import { Gender } from './common';

export type ErrandCategory = 'pickup' | 'buy' | 'other';

export interface Errand {
  id: string;
  category: ErrandCategory;
  type: string;
  title: string;
  desc: string;
  from: string;
  to: string;
  price: string;
  item: string;
  time: string;
  user: string;
  authorId?: string;
  avatar: string;
  gender: Gender;
  bio: string;
  gradeKey?: string;
  majorKey?: string;
  expired: boolean;
  expiresAt: string;
  createdAt: string;
}
