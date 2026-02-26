import { ScoreItem } from './common';

export type RatingCategory = 'course' | 'teacher' | 'canteen' | 'major';

export type RatingSortMode = 'recent' | 'controversial';

interface BaseRating {
  id: string;
  name: string;
  department: string;
  avatar?: string;
  scores: ScoreItem[];
  tags: string[];
  tagCounts: Record<string, number>;
  ratingCount: number;
  recentCount: number;
  scoreVariance: number;
}

export interface TeacherRating extends BaseRating {
  email: string;
}

export interface CourseRating extends BaseRating {
  code: string;
}

export interface CanteenRating extends BaseRating {
  location: string;
}

export interface MajorRating extends BaseRating {}

export type RatingItem = TeacherRating | CourseRating | CanteenRating | MajorRating;

export interface RatingsData {
  teacher: TeacherRating[];
  course: CourseRating[];
  canteen: CanteenRating[];
  major: MajorRating[];
}
