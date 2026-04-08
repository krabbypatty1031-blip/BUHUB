import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Schedule, ScheduleCourse } from '../types/schedule';

interface ScheduleState {
  schedule: Schedule | null;
  _hasHydrated: boolean;

  setSchedule: (schedule: Schedule | null) => void;
  updateCourse: (id: string, data: Partial<ScheduleCourse>) => void;
  addCourse: (course: ScheduleCourse) => void;
  removeCourse: (id: string) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      schedule: null,
      _hasHydrated: false,

      setSchedule: (schedule) => set({ schedule }),

      updateCourse: (id, data) =>
        set((state) => {
          if (!state.schedule) return state;
          return {
            schedule: {
              ...state.schedule,
              courses: state.schedule.courses.map((c) =>
                c.id === id ? { ...c, ...data } : c
              ),
            },
          };
        }),

      addCourse: (course) =>
        set((state) => {
          if (!state.schedule) return state;
          return {
            schedule: {
              ...state.schedule,
              courses: [...state.schedule.courses, course],
            },
          };
        }),

      removeCourse: (id) =>
        set((state) => {
          if (!state.schedule) return state;
          return {
            schedule: {
              ...state.schedule,
              courses: state.schedule.courses.filter((c) => c.id !== id),
            },
          };
        }),

      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'ulink-schedule',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
