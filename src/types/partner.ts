import { Gender } from './common';

export type PartnerCategory = 'travel' | 'food' | 'course' | 'sports' | 'other';

export interface PartnerPost {
  category: PartnerCategory;
  type: string;
  title: string;
  desc: string;
  time: string;
  people: string;
  joined: number;
  maxPeople: number;
  location: string;
  user: string;
  avatar: string;
  gender: Gender;
  bio: string;
  expired: boolean;
  expiresAt: string;
}
