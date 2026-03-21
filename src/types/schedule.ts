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
