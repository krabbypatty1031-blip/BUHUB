import { ScoreItem } from './common';

export type RatingCategory = 'course' | 'teacher' | 'canteen' | 'major';

export type RatingSortMode = 'recent' | 'controversial';

export interface RatingComment {
  comment: string;
  createdAt: string;
}

export interface MyRating {
  id: string;
  scores: Record<string, number>;
  tags: string[];
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BaseRating {
  id: string;
  name: string;
  department: string;
  avatar?: string;
  scores: ScoreItem[];
  tags: string[];
  tagCounts: Record<string, number>;
  overallScore?: number;
  ratingCount: number;
  recentCount: number;
  scoreVariance: number;
  comments?: RatingComment[];
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
