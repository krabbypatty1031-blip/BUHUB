export interface ScheduleCourse {
  id: string;
  name: string;
  location: string;
  dayOfWeek: number;     // 1=Mon, 7=Sun
  startTime: string;     // "HH:mm"
  endTime: string;       // "HH:mm"
  color: string;
}

export interface Schedule {
  id: string;
  imageUrl: string | null;
  courses: ScheduleCourse[];
  createdAt: string;
  updatedAt: string;
}

export type DayDetectionTier = 1 | 2 | 3;

export interface ParseScheduleMeta {
  dayDetectionTier: DayDetectionTier;
  dayHeadersFound: number;
  columnCount: number;
}

export interface ParseScheduleWarning {
  code: 'DAY_HEADERS_UNCLEAR';
}

export interface ParseScheduleResult {
  courses: ScheduleCourse[];
  meta: ParseScheduleMeta;
  warning?: ParseScheduleWarning;
}
