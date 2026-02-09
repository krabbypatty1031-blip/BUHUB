import type { RatingsData, ScoreDimension } from '../../types';

export const mockRatings: RatingsData = {
  teacher: [
    {
      name: 'Prof. Wong Chi Ming',
      department: 'Department of Computer Science',
      email: 'cmwong@hkbu.edu.hk',
      scores: [
        { key: 'pedagogy', label: '教學質量', value: 75 },
        { key: 'supportive', label: '友善程度', value: 82 },
        { key: 'strictness', label: '嚴格程度', value: 45 },
      ],
      tags: ['#有GroupPro', '#期末論文', '#考試唔難', '#lecture錄影'],
      tagCounts: { '#有GroupPro': 18, '#期末論文': 12, '#考試唔難': 9, '#lecture錄影': 7 },
      ratingCount: 23,
      recentCount: 8,
      scoreVariance: 12.5,
    },
    {
      name: 'Dr. Chen Wei',
      department: 'Department of Computer Science',
      email: 'wchen@hkbu.edu.hk',
      scores: [
        { key: 'pedagogy', label: '教學質量', value: 88 },
        { key: 'supportive', label: '友善程度', value: 90 },
        { key: 'strictness', label: '嚴格程度', value: 30 },
      ],
      tags: ['#lecture錄影', '#給分好', '#非常友善', '#功課少'],
      tagCounts: { '#lecture錄影': 30, '#給分好': 25, '#非常友善': 22, '#功課少': 15 },
      ratingCount: 45,
      recentCount: 15,
      scoreVariance: 8.2,
    },
  ],
  course: [
    {
      name: 'COMP1001 Introduction to CS',
      department: 'Computer Science',
      code: 'COMP1001',
      scores: [
        { key: 'grading', label: '畀分', value: 78 },
        { key: 'workload', label: '工作量', value: 35 },
        { key: 'difficulty', label: '難度', value: 30 },
      ],
      tags: ['#入門友善', '#有期末考', '#推薦選修', '#老師好'],
      tagCounts: { '#入門友善': 40, '#有期末考': 25, '#推薦選修': 20, '#老師好': 18 },
      ratingCount: 58,
      recentCount: 20,
      scoreVariance: 6.5,
    },
    {
      name: 'COMP3015 Software Engineering',
      department: 'Computer Science',
      code: 'COMP3015',
      scores: [
        { key: 'grading', label: '畀分', value: 60 },
        { key: 'workload', label: '工作量', value: 72 },
        { key: 'difficulty', label: '難度', value: 65 },
      ],
      tags: ['#GroupPro', '#實用', '#老師好', '#內容有趣'],
      tagCounts: { '#GroupPro': 28, '#實用': 22, '#老師好': 15, '#內容有趣': 12 },
      ratingCount: 34,
      recentCount: 12,
      scoreVariance: 18.3,
    },
  ],
  canteen: [
    {
      name: '浸大飯堂（善衡校園）',
      department: '善衡校園 · 地下',
      location: '善衡校園',
      scores: [
        { key: 'taste', label: '味道', value: 68 },
        { key: 'hygiene', label: '衞生', value: 72 },
        { key: 'value', label: '性價比', value: 80 },
      ],
      tags: ['#飯多量足', '#選擇多', '#排隊長', '#平靚正'],
      tagCounts: { '#飯多量足': 55, '#選擇多': 42, '#排隊長': 38, '#平靚正': 30 },
      ratingCount: 89,
      recentCount: 30,
      scoreVariance: 5.8,
    },
    {
      name: '聯福樓',
      department: '逸夫校園 · 2樓',
      location: '逸夫校園',
      scores: [
        { key: 'taste', label: '味道', value: 75 },
        { key: 'hygiene', label: '衞生', value: 78 },
        { key: 'value', label: '性價比', value: 65 },
      ],
      tags: ['#中菜好食', '#環境好', '#有點貴', '#選擇多'],
      tagCounts: { '#中菜好食': 35, '#環境好': 28, '#有點貴': 20, '#選擇多': 15 },
      ratingCount: 56,
      recentCount: 18,
      scoreVariance: 14.2,
    },
  ],
  major: [
    {
      name: '計算機科學 Computer Science',
      department: '理學院',
      scores: [
        { key: 'employment', label: '就業前景', value: 82 },
        { key: 'support', label: '學術支持', value: 70 },
        { key: 'satisfaction', label: '學生滿意度', value: 75 },
      ],
      tags: ['#就業率高', '#實習機會多', '#GroupPro多', '#師資好'],
      tagCounts: { '#就業率高': 38, '#實習機會多': 30, '#GroupPro多': 22, '#師資好': 18 },
      ratingCount: 42,
      recentCount: 14,
      scoreVariance: 9.1,
    },
    {
      name: '傳理學 Communication',
      department: '傳理學院',
      scores: [
        { key: 'employment', label: '就業前景', value: 70 },
        { key: 'support', label: '學術支持', value: 78 },
        { key: 'satisfaction', label: '學生滿意度', value: 80 },
      ],
      tags: ['#創意空間大', '#實踐多', '#師資好', '#Exchange機會'],
      tagCounts: { '#創意空間大': 32, '#實踐多': 25, '#師資好': 20, '#Exchange機會': 16 },
      ratingCount: 35,
      recentCount: 10,
      scoreVariance: 7.5,
    },
    {
      name: '工商管理 BBA',
      department: '商學院',
      scores: [
        { key: 'employment', label: '就業前景', value: 78 },
        { key: 'support', label: '學術支持', value: 65 },
        { key: 'satisfaction', label: '學生滿意度', value: 68 },
      ],
      tags: ['#人脈廣', '#Exchange機會', '#實習機會多', '#設施好'],
      tagCounts: { '#人脈廣': 28, '#Exchange機會': 22, '#實習機會多': 20, '#設施好': 14 },
      ratingCount: 30,
      recentCount: 8,
      scoreVariance: 15.6,
    },
    {
      name: '音樂學 Music',
      department: '文學院',
      scores: [
        { key: 'employment', label: '就業前景', value: 55 },
        { key: 'support', label: '學術支持', value: 85 },
        { key: 'satisfaction', label: '學生滿意度', value: 88 },
      ],
      tags: ['#設施好', '#老師用心', '#班細', '#創意空間大'],
      tagCounts: { '#設施好': 22, '#老師用心': 20, '#班細': 18, '#創意空間大': 15 },
      ratingCount: 18,
      recentCount: 5,
      scoreVariance: 20.1,
    },
  ],
};

export const mockScoreDimensions: Record<string, ScoreDimension[]> = {
  teacher: [
    { key: 'pedagogy', label: '教學質量', left: '妙趣橫生', right: '催眠大師' },
    { key: 'supportive', label: '友善程度', left: '非常友善', right: '高冷刻板' },
    { key: 'strictness', label: '嚴格程度', left: '隨緣放養', right: '極其嚴格' },
  ],
  course: [
    { key: 'grading', label: '畀分', left: 'Grade God', right: 'Grade Killer' },
    { key: 'workload', label: '工作量', left: '輕鬆躺平', right: '任務繁重' },
    { key: 'difficulty', label: '難度', left: '通俗易懂', right: '晦澀難懂' },
  ],
  canteen: [
    { key: 'taste', label: '味道', left: '難以下嚥', right: '非常好食' },
    { key: 'hygiene', label: '衞生', left: '需要改善', right: '乾淨整潔' },
    { key: 'value', label: '性價比', left: '偏貴', right: '抵食夾大件' },
  ],
  major: [
    { key: 'employment', label: '就業前景', left: '比較迷茫', right: '前景光明' },
    { key: 'support', label: '學術支持', left: '自求多福', right: '支持充足' },
    { key: 'satisfaction', label: '學生滿意度', left: '一般般', right: '非常滿意' },
  ],
};

export const mockTagOptions: Record<string, string[]> = {
  teacher: ['#有GroupPro', '#期末論文', '#考試唔難', '#lecture錄影', '#給分好', '#功課少', '#功課多', '#非常友善', '#口音重', '#彈性deadline'],
  course: ['#入門友善', '#有期末考', '#推薦選修', '#老師好', '#內容有趣', '#考試難', '#GroupPro', '#實用', '#冇考試', '#輕鬆'],
  canteen: ['#飯多量足', '#選擇多', '#排隊長', '#中菜好食', '#有點貴', '#環境好', '#咖啡唔錯', '#平靚正', '#適合趕時間', '#快餐為主'],
  major: ['#就業率高', '#實習機會多', '#師資好', '#實踐多', '#創意空間大', '#Exchange機會', '#設施好', '#班細', '#老師用心', '#人脈廣'],
};
