import { Gender } from './common';

export type PartnerCategory = 'travel' | 'food' | 'course' | 'sports' | 'other';

export interface PartnerPost {
  id: string;
  category: PartnerCategory;
  type: string;
  title: string;
  desc: string;
  time: string;
  location: string;
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
