import { Gender } from './common';

export type PartnerCategory = 'travel' | 'food' | 'course' | 'sports' | 'other';

export interface PartnerPost {
  category: PartnerCategory;
  type: string;
  title: string;
  desc: string;
  time: string;
  location: string;
  user: string;
  avatar: string;
  gender: Gender;
  bio: string;
  expired: boolean;
  expiresAt: string;
}
