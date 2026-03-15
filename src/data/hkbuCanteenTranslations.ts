import type { Language } from '../types';

const HKBU_CANTEEN_TRANSLATIONS: Record<string, Partial<Record<Language, string>>> = {
  'Harmony Cafeteria': {
    tc: '\u805a\u96c5\u95a3',
    sc: '\u805a\u96c5\u9601',
  },
  'Harmony Lounge': {
    tc: '\u96c5\u805a\u574a',
    sc: '\u96c5\u805a\u574a',
  },
  'Main Canteen': {
    tc: '\u5927\u5802',
    sc: '\u5927\u5802',
  },
  'Bistro NTT': {
    tc: 'Bistro NTT',
    sc: 'Bistro NTT',
  },
  "Books n' Bites": {
    tc: '\u66f8\u9999\u8f15\u98df',
    sc: '\u4e66\u9999\u8f7b\u98df',
  },
  iCafe: {
    tc: 'iCafe',
    sc: 'iCafe',
  },
  'Nan Yuan': {
    tc: '\u5357\u82d1',
    sc: '\u5357\u82d1',
  },
  'H.F.C.@Scholars Court': {
    tc: '\u5b78\u8005\u82d1\u7f8e\u98df\u574a',
    sc: '\u5b66\u8005\u9662\u7f8e\u98df\u574a',
  },
  'JCCC UG/F Cafe': {
    tc: '\u5275\u610f\u6821\u5712 UG/F Cafe',
    sc: '\u521b\u610f\u6821\u56ed UG/F Cafe',
  },
  'JCCC G/F Cafe': {
    tc: '\u5275\u610f\u6821\u5712 G/F Cafe',
    sc: '\u521b\u610f\u6821\u56ed G/F Cafe',
  },
  'Cafe@CVA Commons': {
    tc: 'Cafe@CVA Commons',
    sc: 'Cafe@CVA Commons',
  },
  'BU Fiesta': {
    tc: 'BU Fiesta',
    sc: 'BU Fiesta',
  },
  Deli: {
    tc: 'Deli',
    sc: 'Deli',
  },
  'Ho Sin Hang Campus': {
    tc: '\u5584\u8861\u6821\u5712',
    sc: '\u5584\u8861\u6821\u56ed',
  },
  'Baptist University Road Campus': {
    tc: '\u6d78\u6703\u5927\u5b78\u9053\u6821\u5712',
    sc: '\u6d78\u4f1a\u5927\u5b66\u9053\u6821\u56ed',
  },
  'Shaw Campus': {
    tc: '\u9038\u592b\u6821\u5712',
    sc: '\u9038\u592b\u6821\u56ed',
  },
  'Jockey Club Campus of Creativity': {
    tc: '\u5275\u610f\u6821\u5712',
    sc: '\u521b\u610f\u6821\u56ed',
  },
  'Kai Tak Campus': {
    tc: '\u555f\u5fb7\u6821\u5712',
    sc: '\u542f\u5fb7\u6821\u56ed',
  },
  'Level 4, Sir Run Run Shaw Building': {
    tc: '\u90b5\u9038\u592b\u5927\u6a13 4 \u6a13',
    sc: '\u90b5\u9038\u592b\u5927\u697c 4 \u697c',
  },
  'Level 5, Academic and Administration Building': {
    tc: '\u6559\u5b78\u53ca\u884c\u653f\u5927\u6a13 5 \u6a13',
    sc: '\u6559\u5b66\u53ca\u884c\u653f\u5927\u697c 5 \u697c',
  },
  'G/F, Dr. Ng Tor Tai International House': {
    tc: '\u5433\u591a\u6cf0\u570b\u969b\u4e2d\u5fc3\u5730\u4e0b',
    sc: '\u5434\u591a\u6cf0\u56fd\u9645\u4e2d\u5fc3\u5730\u4e0b',
  },
  'G/F, Jockey Club Academic Community Centre': {
    tc: '\u8cfd\u99ac\u6703\u5e2b\u751f\u4e2d\u5fc3\u5730\u4e0b',
    sc: '\u8d5b\u9a6c\u4f1a\u5e08\u751f\u4e2d\u5fc3\u5730\u4e0b',
  },
  'Level 3, The Wing Lung Bank Building for Business Studies': {
    tc: '\u6c38\u9686\u9280\u884c\u5546\u5b78\u5927\u6a13 3 \u6a13',
    sc: '\u6c38\u9686\u94f6\u884c\u5546\u5b66\u5927\u697c 3 \u697c',
  },
  'Level 2, David C. Lam Building': {
    tc: '\u6797\u8b77\u570b\u5927\u6a13 2 \u6a13',
    sc: '\u6797\u62a4\u56fd\u5927\u697c 2 \u697c',
  },
  'Upper Ground Floor, Jockey Club Campus of Creativity': {
    tc: '\u5275\u610f\u6821\u5712 UG/F',
    sc: '\u521b\u610f\u6821\u56ed UG/F',
  },
  'Ground Floor, Jockey Club Campus of Creativity': {
    tc: '\u5275\u610f\u6821\u5712 G/F',
    sc: '\u521b\u610f\u6821\u56ed G/F',
  },
  'G/F, Communication and Visual Arts Building': {
    tc: '\u50b3\u7406\u53ca\u8996\u85dd\u5927\u6a13\u5730\u4e0b',
    sc: '\u4f20\u7406\u53ca\u89c6\u827a\u5927\u697c\u5730\u4e0b',
  },
  'G/F, Kai Tak Campus': {
    tc: '\u555f\u5fb7\u6821\u5712\u5730\u4e0b',
    sc: '\u542f\u5fb7\u6821\u56ed\u5730\u4e0b',
  },
};

export function getLocalizedHkbuCanteenLabel(value: string, language: Language): string | null {
  if (!value) return null;
  return HKBU_CANTEEN_TRANSLATIONS[value]?.[language] ?? null;
}
