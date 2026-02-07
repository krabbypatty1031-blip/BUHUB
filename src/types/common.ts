export type Gender = 'male' | 'female' | 'other' | 'secret';

export type Language = 'tc' | 'sc' | 'en';

export interface Translated {
  sc: string;
  en: string;
}

export interface PollOption {
  text: string;
  percent: number;
}

export interface ScoreDimension {
  key: string;
  label: string;
  left: string;
  right: string;
}

export interface ScoreItem {
  key: string;
  label: string;
  value: number;
}
