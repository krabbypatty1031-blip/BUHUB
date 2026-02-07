import { Gender } from './common';

export type SecondhandCategory = 'electronics' | 'books' | 'furniture' | 'other';

export interface SecondhandItem {
  category: SecondhandCategory;
  type: string;
  title: string;
  desc: string;
  price: string;
  condition: string;
  location: string;
  user: string;
  avatar: string;
  gender: Gender;
  bio: string;
  sold: boolean;
}
