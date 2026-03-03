import { Gender, Language } from './common';

export type SecondhandCategory = 'electronics' | 'books' | 'furniture' | 'other';

export interface SecondhandItem {
  id: string;
  category: SecondhandCategory;
  type: string;
  title: string;
  desc: string;
  sourceLanguage?: Language;
  images: string[];
  price: string;
  condition: string;
  location: string;
  user: string;
  userName?: string;
  authorId?: string;
  avatar: string;
  gender: Gender;
  bio: string;
  gradeKey?: string;
  majorKey?: string;
  sold: boolean;
  isWanted?: boolean;
  expiresAt: string;
  expired: boolean;
  createdAt: string;
}
