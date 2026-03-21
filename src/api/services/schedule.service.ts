import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { Schedule, ScheduleCourse } from '../../types/schedule';

export const scheduleService = {
  async getSchedule(): Promise<Schedule | null> {
    const { data } = await apiClient.get(ENDPOINTS.SCHEDULE.GET);
    return data ?? null;
  },

  async saveSchedule(scheduleData: Partial<Schedule>): Promise<Schedule> {
    const { data } = await apiClient.put(ENDPOINTS.SCHEDULE.SAVE, scheduleData);
    return data;
  },

  async parseImage(imageUrl: string): Promise<{ courses: ScheduleCourse[] }> {
    const { data } = await apiClient.post(ENDPOINTS.SCHEDULE.PARSE, { imageUrl });
    return data;
  },

  async addCourse(courseData: Omit<ScheduleCourse, 'id'>): Promise<ScheduleCourse> {
    const { data } = await apiClient.post(ENDPOINTS.SCHEDULE.ADD_COURSE, courseData);
    return data;
  },

  async updateCourse(id: string, courseData: Partial<ScheduleCourse>): Promise<ScheduleCourse> {
    const { data } = await apiClient.put(ENDPOINTS.SCHEDULE.EDIT_COURSE(id), courseData);
    return data;
  },

  async deleteCourse(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.SCHEDULE.DELETE_COURSE(id));
  },
};
