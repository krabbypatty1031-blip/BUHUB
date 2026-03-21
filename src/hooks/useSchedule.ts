import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../api/services/schedule.service';
import { useScheduleStore } from '../store/scheduleStore';
import type { Schedule, ScheduleCourse } from '../types/schedule';

export function useSchedule() {
  const setSchedule = useScheduleStore((s) => s.setSchedule);
  const query = useQuery({
    queryKey: ['schedule'],
    queryFn: () => scheduleService.getSchedule(),
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setSchedule(query.data);
    }
  }, [query.data, setSchedule]);

  return query;
}

export function useParseSchedule() {
  return useMutation({
    mutationFn: (imageUrl: string) => scheduleService.parseImage(imageUrl),
  });
}

export function useSaveSchedule() {
  const queryClient = useQueryClient();
  const setSchedule = useScheduleStore((s) => s.setSchedule);
  return useMutation({
    mutationFn: (data: Partial<Schedule>) => scheduleService.saveSchedule(data),
    onSuccess: (data: Schedule) => {
      setSchedule(data);
      queryClient.setQueryData(['schedule'], data);
    },
  });
}

export function useAddCourse() {
  const queryClient = useQueryClient();
  const addCourse = useScheduleStore((s) => s.addCourse);
  return useMutation({
    mutationFn: (courseData: Omit<ScheduleCourse, 'id'>) => scheduleService.addCourse(courseData),
    onSuccess: (course: ScheduleCourse) => {
      addCourse(course);
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  const updateCourse = useScheduleStore((s) => s.updateCourse);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScheduleCourse> }) =>
      scheduleService.updateCourse(id, data),
    onSuccess: (course: ScheduleCourse) => {
      updateCourse(course.id, course);
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  const removeCourse = useScheduleStore((s) => s.removeCourse);
  return useMutation({
    mutationFn: (id: string) => scheduleService.deleteCourse(id),
    onSuccess: (_: void, id: string) => {
      removeCourse(id);
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}
