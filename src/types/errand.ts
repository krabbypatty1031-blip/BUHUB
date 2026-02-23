import { Gender } from './common';

export type ErrandCategory = 'pickup' | 'buy' | 'other';

export interface Errand {
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
  expired: boolean;
  expiresAt: string;
  createdAt: string;
}
