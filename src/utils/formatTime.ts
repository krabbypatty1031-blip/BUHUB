import type { Language } from '../types';

const weekdayMap: Record<string, Record<string, string>> = {
  '週一': { sc: '周一', en: 'Mon' },
  '週二': { sc: '周二', en: 'Tue' },
  '週三': { sc: '周三', en: 'Wed' },
  '週四': { sc: '周四', en: 'Thu' },
  '週五': { sc: '周五', en: 'Fri' },
  '週六': { sc: '周六', en: 'Sat' },
  '週日': { sc: '周日', en: 'Sun' },
};

export function translateTime(str: string, language: Language): string {
  if (!str || language === 'tc') return str;

  let m: RegExpMatchArray | null;

  // Relative time
  if ((m = str.match(/^(\d+)分鐘前$/))) return language === 'sc' ? `${m[1]}分钟前` : `${m[1]} min ago`;
  if ((m = str.match(/^(\d+)小時前$/))) return language === 'sc' ? `${m[1]}小时前` : `${m[1]}h ago`;
  if ((m = str.match(/^(\d+)日前$/))) return language === 'sc' ? `${m[1]}天前` : `${m[1]}d ago`;
  if ((m = str.match(/^(\d+)週前$/))) return language === 'sc' ? `${m[1]}周前` : `${m[1]}w ago`;
  if (str === '昨日') return language === 'sc' ? '昨天' : 'Yesterday';

  // Today + time range
  if ((m = str.match(/^今日 ([\d:]+)-([\d:]+)$/))) {
    return language === 'sc' ? `今天 ${m[1]}-${m[2]}` : `Today ${m[1]}-${m[2]}`;
  }

  // Weekday + time range
  for (const [tc, map] of Object.entries(weekdayMap)) {
    if (str.startsWith(tc)) {
      const rest = str.slice(tc.length);
      return map[language] + rest;
    }
  }

  return str;
}

export function translateMeta(meta: string, language: Language): string {
  if (!meta || language === 'tc') return meta;

  // Split meta by ' · '
  const parts = meta.split(' · ');
  return parts.map((part) => translateTime(part.trim(), language)).join(' · ');
}
