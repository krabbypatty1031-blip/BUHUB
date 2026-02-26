import { Gender } from './common';

export type SecondhandCategory = 'electronics' | 'books' | 'furniture' | 'other';

export interface SecondhandItem {
  id: string;
  category: SecondhandCategory;
  type: string;
  title: string;
  desc: string;
  price: string;
  condition: string;
  location: string;
  user: string;
  authorId?: string;
  avatar: string;
  gender: Gender;
  bio: string;
  gradeKey?: string;
  majorKey?: string;
  sold: boolean;
  expiresAt: string;
  expired: boolean;
  createdAt: string;
}
