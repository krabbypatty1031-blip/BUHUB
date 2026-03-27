import type { Language } from '../types';

const HKBU_CANTEEN_TRANSLATIONS: Record<string, Partial<Record<Language, string>>> = {
  // Campus names
  'Ho Sin Hang Campus': {
    tc: '善衡校園',
    sc: '善衡校园',
  },
  'Baptist University Road Campus': {
    tc: '浸會大學道校園',
    sc: '浸会大学道校园',
  },
  'Shaw Campus': {
    tc: '逸夫校園',
    sc: '逸夫校园',
  },
  'Jockey Club Campus of Creativity': {
    tc: '創意校園',
    sc: '创意校园',
  },
  'Kai Tak Campus': {
    tc: '啟德校園',
    sc: '启德校园',
  },
  // Full addresses (department field in DB)
  'Level 2, David C. Lam Building, Shaw Campus': {
    tc: '逸夫校園林護國大樓2樓',
    sc: '逸夫校园林护国大楼2楼',
  },
  'Level 3, The Wing Lung Bank Building for Business Studies, Shaw Campus': {
    tc: '逸夫校園永隆銀行商學大樓3樓',
    sc: '逸夫校园永隆银行商学大楼3楼',
  },
  'G/F, Dr. Ng Tor Tai International House, Baptist University Road Campus': {
    tc: '浸會大學道校園吳多泰國際中心地下',
    sc: '浸会大学道校园吴多泰国际中心地下',
  },
  'Level 5, Academic and Administration Building, Baptist University Road Campus': {
    tc: '浸會大學道校園教學及行政大樓5樓',
    sc: '浸会大学道校园教学及行政大楼5楼',
  },
  'Level 1, Jockey Club Academic Community Centre, Baptist University Road Campus': {
    tc: '浸會大學道校園賽馬會師生中心1樓',
    sc: '浸会大学道校园赛马会师生中心1楼',
  },
  'G/F, Jockey Club Academic Community Centre, Baptist University Road Campus': {
    tc: '浸會大學道校園賽馬會師生中心地下',
    sc: '浸会大学道校园赛马会师生中心地下',
  },
  'UG/F, Jockey Club Academic Community Centre, Baptist University Road Campus': {
    tc: '浸會大學道校園賽馬會師生中心UG/F',
    sc: '浸会大学道校园赛马会师生中心UG/F',
  },
  'G/F, Jockey Club Campus of Creativity, 30 Renfrew Road': {
    tc: '創意校園地下，連翔道30號',
    sc: '创意校园地下，连翔道30号',
  },
  'Student Residence Halls, Baptist University Road Campus': {
    tc: '浸會大學道校園學生宿舍',
    sc: '浸会大学道校园学生宿舍',
  },
  'G/F, Lee Shau Kee Communication and Visual Arts Building, Baptist University Road Campus': {
    tc: '浸會大學道校園李兆基傳理視藝樓地下',
    sc: '浸会大学道校园李兆基传理视艺楼地下',
  },
  'Level 4, Sir Run Run Shaw Building, Ho Sin Hang Campus': {
    tc: '善衡校園邵逸夫大樓4樓',
    sc: '善衡校园邵逸夫大楼4楼',
  },
};

export function getLocalizedHkbuCanteenLabel(value: string, language: Language): string | null {
  if (!value) return null;
  return HKBU_CANTEEN_TRANSLATIONS[value]?.[language] ?? null;
}
