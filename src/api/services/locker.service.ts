import apiClient from '../client';
import ENDPOINTS from '../endpoints';

export type DropOffDate = '2026-05-07' | '2026-05-11' | '2026-05-16';

export interface LockerRequestInput {
  fullName: string;
  studentId: string;
  phoneNumber: string;
  residenceAddress: string;
  dropOffDate: DropOffDate;
  boxCount: number;
}

export type LockerStatus =
  | 'DROP_OFF_PROCESSING'
  | 'DROP_OFF_COMPLETE'
  | 'PICK_UP_PROCESSING'
  | 'PICK_UP_COMPLETE';

export interface LockerRequestRecord {
  id: string;
  userId: string;
  fullName: string;
  studentId: string;
  phoneNumber: string;
  residenceAddress: string;
  dropOffDate: string; // ISO timestamp from server (Prisma @db.Date serialises to ISO)
  status: LockerStatus;
  modifyCount: number;
  boxCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LockerBroadcastPayload {
  message: string | null;
  updatedAt: string | null;
}

export const lockerService = {
  async submit(payload: LockerRequestInput): Promise<LockerRequestRecord> {
    const { data } = await apiClient.post(ENDPOINTS.LOCKER.SUBMIT, payload);
    return data;
  },
  async getMine(): Promise<LockerRequestRecord | null> {
    const { data } = await apiClient.get(ENDPOINTS.LOCKER.LIST_MINE);
    return data ?? null;
  },
  async fetchBroadcast(): Promise<LockerBroadcastPayload> {
    const { data } = await apiClient.get(ENDPOINTS.LOCKER.BROADCAST);
    return {
      message: data?.message ?? null,
      updatedAt: data?.updatedAt ?? null,
    };
  },
};
