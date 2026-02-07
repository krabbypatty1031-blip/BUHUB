import { ScoreItem } from './common';

export type RatingCategory = 'teacher' | 'course' | 'canteen';

export interface TeacherRating {
  name: string;
  department: string;
  email: string;
  scores: ScoreItem[];
  tags: string[];
  ratingCount: number;
}

export interface CourseRating {
  name: string;
  department: string;
  code: string;
  scores: ScoreItem[];
  tags: string[];
  ratingCount: number;
}

export interface CanteenRating {
  name: string;
  department: string;
  location: string;
  scores: ScoreItem[];
  tags: string[];
  ratingCount: number;
}

export type RatingItem = TeacherRating | CourseRating | CanteenRating;

export interface RatingsData {
  teacher: TeacherRating[];
  course: CourseRating[];
  canteen: CanteenRating[];
}
