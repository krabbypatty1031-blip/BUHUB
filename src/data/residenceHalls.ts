// HKBU student residence halls used by LockerSFSCScreen's residence picker.
// The English `value` is stored on the LockerRequest row; Chinese labels are
// display-only and change per-locale.

export type HallGroupKey = 'bur' | 'nttih' | 'vc';

export interface HallOption {
  value: string;
  labelEn: string;
  labelSc: string;
  labelTc: string;
  group: HallGroupKey;
}

export const RESIDENCE_HALLS: HallOption[] = [
  { value: 'Chan Tai Ho Hall', labelEn: 'Chan Tai Ho Hall', labelSc: '陈泰豪堂', labelTc: '陳泰豪堂', group: 'bur' },
  { value: 'Yang Chen-Ning Hall', labelEn: 'Yang Chen-Ning Hall', labelSc: '杨振宁堂', labelTc: '楊振寧堂', group: 'bur' },
  { value: 'Cai Yuanpei Hall', labelEn: 'Cai Yuanpei Hall', labelSc: '蔡元培堂', labelTc: '蔡元培堂', group: 'bur' },
  { value: 'Zhou Shuren Hall', labelEn: 'Zhou Shuren Hall', labelSc: '周树人堂', labelTc: '周樹人堂', group: 'bur' },
  { value: 'Soong Ching-ling Hall', labelEn: 'Soong Ching-ling Hall', labelSc: '宋庆龄堂', labelTc: '宋慶齡堂', group: 'bur' },
  { value: 'NTTIH', labelEn: 'Dr. Ng Tor Tai International House (NTTIH)', labelSc: '吴多泰博士国际中心 (NTTIH)', labelTc: '吳多泰博士國際中心 (NTTIH)', group: 'nttih' },
  { value: 'VC Building 1', labelEn: 'VC Building 1', labelSc: 'VC Building 1', labelTc: 'VC Building 1', group: 'vc' },
  { value: 'VC Building 2', labelEn: 'VC Building 2', labelSc: 'VC Building 2', labelTc: 'VC Building 2', group: 'vc' },
  { value: 'VC Building 3', labelEn: 'VC Building 3', labelSc: 'VC Building 3', labelTc: 'VC Building 3', group: 'vc' },
  { value: 'VC Building 4', labelEn: 'VC Building 4', labelSc: 'VC Building 4', labelTc: 'VC Building 4', group: 'vc' },
  { value: 'VC Building 5', labelEn: 'VC Building 5', labelSc: 'VC Building 5', labelTc: 'VC Building 5', group: 'vc' },
  { value: 'VC Building 6', labelEn: 'VC Building 6', labelSc: 'VC Building 6', labelTc: 'VC Building 6', group: 'vc' },
  { value: 'VC Building 7', labelEn: 'VC Building 7', labelSc: 'VC Building 7', labelTc: 'VC Building 7', group: 'vc' },
  { value: 'VC Building 8', labelEn: 'VC Building 8', labelSc: 'VC Building 8', labelTc: 'VC Building 8', group: 'vc' },
];

export function findHall(value: string | null | undefined): HallOption | undefined {
  if (!value) return undefined;
  return RESIDENCE_HALLS.find((h) => h.value === value);
}
