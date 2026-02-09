import { ScoreItem } from './common';

export type RatingCategory = 'course' | 'teacher' | 'canteen' | 'major';

export type RatingSortMode = 'recent' | 'controversial';

export interface TeacherRating {
  name: string;
  department: string;
  email: string;
  avatar?: string;
  scores: ScoreItem[];
  tags: string[];
  tagCounts: Record<string, number>;
  ratingCount: number;
  recentCount: number;
  scoreVariance: number;
}

export interface CourseRating {
  name: string;
  department: string;
  code: string;
  avatar?: string;
  scores: ScoreItem[];
  tags: string[];
  tagCounts: Record<string, number>;
  ratingCount: number;
  recentCount: number;
  scoreVariance: number;
}

export interface CanteenRating {
  name: string;
  department: string;
  location: string;
  avatar?: string;
  scores: ScoreItem[];
  tags: string[];
  tagCounts: Record<string, number>;
  ratingCount: number;
  recentCount: number;
  scoreVariance: number;
}

export interface MajorRating {
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

export type RatingItem = TeacherRating | CourseRating | CanteenRating | MajorRating;

export interface RatingsData {
  teacher: TeacherRating[];
  course: CourseRating[];
  canteen: CanteenRating[];
  major: MajorRating[];
}
