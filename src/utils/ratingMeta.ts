import type { RatingItem } from '../types';
import { getLocalizedHkbuCanteenLabel } from '../data/hkbuCanteenTranslations';

const RATING_META_TRANSLATIONS: Record<'tc' | 'sc' | 'en', Record<string, string>> = {
  tc: {
    'Academy of Film': '电影学院',
    'Academy of Global China Studies': '全球中国研究学院',
    'Academy of Music': '音乐学院',
    'Academy of Visual Arts': '视觉艺术院',
    'Department of Accountancy, Economics and Finance': '会计、经济及金融学系',
    'Department of Biology': '生物系',
    'Department of Chemistry': '化学系',
    'Department of Chinese Language and Literature': '中文系',
    'Department of Communication Studies': '传理学系',
    'Department of Computer Science': '计算机科学系',
    'Department of English Language and Literature': '英语语言文学系',
    'Department of Geography': '地理系',
    'Department of Government and International Studies': '政府与国际研究系',
    'Department of History': '历史系',
    'Department of Humanities and Creative Writing': '人文及创作系',
    'Department of Interactive Media': '互动媒体系',
    'Department of Journalism': '新闻系',
    'Department of Management, Marketing and Information Systems': '管理、市场及资讯系统学系',
    'Department of Mathematics': '数学系',
    'Department of Physics': '物理系',
    'Department of Religion and Philosophy': '宗教及哲学系',
    'Department of Sociology': '社会学系',
    'Department of Sport, Physical Education and Health': '体育、运动及健康学系',
    'Department of Translation, Interpreting and Intercultural Studies': '翻译、传译及跨文化研究系',
    'Digital Futures and Humanities': '数字未来与人文学',
    'Faculty of Arts and Social Sciences': '文学院及社会科学院',
    'Faculty of Arts and Social Sciences (CHRP)': '文学院及社会科学院（中华相关课程）',
    'Faculty of Arts and Social Sciences (LAC)': '文学院及社会科学院（语言与文化课程）',
    'Faculty of Science': '理学院',
    'Ho Sin Hang Campus': '善衡校园',
    'Institute of Transdisciplinary Studies (Undergraduate)': '跨学科本科课程学院',
    'Kai Tak Campus': '启德校园',
    'Language Centre': '语言中心',
    'School of Business': '工商管理学院',
    'School of Chinese Medicine': '中医药学院',
    'School of Communication': '传理学院',
    'School of Creative Arts': '创意艺术学院',
    'Whole Person Development': '全人发展',
  },
  sc: {
    'Academy of Film': '电影学院',
    'Academy of Global China Studies': '全球中国研究学院',
    'Academy of Music': '音乐学院',
    'Academy of Visual Arts': '视觉艺术院',
    'Department of Accountancy, Economics and Finance': '会计、经济及金融学系',
    'Department of Biology': '生物系',
    'Department of Chemistry': '化学系',
    'Department of Chinese Language and Literature': '中文系',
    'Department of Communication Studies': '传理学系',
    'Department of Computer Science': '计算机科学系',
    'Department of English Language and Literature': '英语语言文学系',
    'Department of Geography': '地理系',
    'Department of Government and International Studies': '政府与国际研究系',
    'Department of History': '历史系',
    'Department of Humanities and Creative Writing': '人文及创作系',
    'Department of Interactive Media': '互动媒体系',
    'Department of Journalism': '新闻系',
    'Department of Management, Marketing and Information Systems': '管理、市场及资讯系统学系',
    'Department of Mathematics': '数学系',
    'Department of Physics': '物理系',
    'Department of Religion and Philosophy': '宗教及哲学系',
    'Department of Sociology': '社会学系',
    'Department of Sport, Physical Education and Health': '体育、运动及健康学系',
    'Department of Translation, Interpreting and Intercultural Studies': '翻译、传译及跨文化研究系',
    'Digital Futures and Humanities': '数字未来与人文学',
    'Faculty of Arts and Social Sciences': '文学院及社会科学院',
    'Faculty of Arts and Social Sciences (CHRP)': '文学院及社会科学院（中华相关课程）',
    'Faculty of Arts and Social Sciences (LAC)': '文学院及社会科学院（语言与文化课程）',
    'Faculty of Science': '理学院',
    'Ho Sin Hang Campus': '善衡校园',
    'Institute of Transdisciplinary Studies (Undergraduate)': '跨学科本科课程学院',
    'Kai Tak Campus': '启德校园',
    'Language Centre': '语言中心',
    'School of Business': '工商管理学院',
    'School of Chinese Medicine': '中医药学院',
    'School of Communication': '传理学院',
    'School of Creative Arts': '创意艺术学院',
    'Whole Person Development': '全人发展',
  },
  en: {},
};

export function getLocalizedRatingMetaLabel(value: string, lang: 'tc' | 'sc' | 'en') {
  return getLocalizedHkbuCanteenLabel(value, lang) ?? RATING_META_TRANSLATIONS[lang][value] ?? value;
}

export function getLocalizedRatingDepartment(item: RatingItem, lang: 'tc' | 'sc' | 'en') {
  return getLocalizedRatingMetaLabel(item.department ?? '', lang);
}

export function getLocalizedRatingLocation(item: RatingItem, lang: 'tc' | 'sc' | 'en') {
  if (!('location' in item)) return '';
  return getLocalizedRatingMetaLabel(item.location ?? '', lang);
}
