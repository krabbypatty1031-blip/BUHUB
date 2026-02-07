import type { RatingsData, ScoreDimension } from '../../types';

export const mockRatings: RatingsData = {
  teacher: [
    {
      name: 'Prof. Wong Chi Ming',
      department: 'Department of Computer Science',
      email: 'cmwong@hkbu.edu.hk',
      scores: [
        { key: 'teaching', label: '教學', value: 75 },
        { key: 'friendly', label: '友善', value: 82 },
        { key: 'strict', label: '嚴格', value: 45 },
      ],
      tags: ['#有GroupPro', '#期末論文', '#考試唔難'],
      ratingCount: 23,
    },
    {
      name: 'Dr. Chen Wei',
      department: 'Department of Computer Science',
      email: 'wchen@hkbu.edu.hk',
      scores: [
        { key: 'teaching', label: '教學', value: 88 },
        { key: 'friendly', label: '友善', value: 90 },
        { key: 'strict', label: '嚴格', value: 30 },
      ],
      tags: ['#lecture錄影', '#給分好', '#非常友善'],
      ratingCount: 45,
    },
  ],
  course: [
    {
      name: 'COMP1001 Introduction to CS',
      department: 'Computer Science',
      code: 'COMP1001',
      scores: [
        { key: 'workload', label: '工作量', value: 55 },
        { key: 'difficulty', label: '難度', value: 40 },
        { key: 'practical', label: '實用性', value: 78 },
      ],
      tags: ['#入門友善', '#有期末考', '#推薦選修'],
      ratingCount: 58,
    },
    {
      name: 'COMP3015 Software Engineering',
      department: 'Computer Science',
      code: 'COMP3015',
      scores: [
        { key: 'workload', label: '工作量', value: 72 },
        { key: 'difficulty', label: '難度', value: 65 },
        { key: 'practical', label: '實用性', value: 85 },
      ],
      tags: ['#GroupPro', '#實用', '#老師好'],
      ratingCount: 34,
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
      tags: ['#飯多量足', '#選擇多', '#排隊長'],
      ratingCount: 89,
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
      tags: ['#中菜好食', '#環境好', '#有點貴'],
      ratingCount: 56,
    },
  ],
};

export const mockScoreDimensions: Record<string, ScoreDimension[]> = {
  teacher: [
    { key: 'teaching', label: '教學質量', left: '妙趣橫生', right: '催眠大師' },
    { key: 'friendly', label: '友善程度', left: '非常友善', right: '高冷刻板' },
    { key: 'strict', label: '嚴格程度', left: '隨緣放養', right: '極其嚴格' },
  ],
  course: [
    { key: 'workload', label: '工作量', left: '輕鬆自在', right: '忙到爆炸' },
    { key: 'difficulty', label: '難度', left: '容易理解', right: '深奧難懂' },
    { key: 'practical', label: '實用性', left: '純理論', right: '非常實用' },
  ],
  canteen: [
    { key: 'taste', label: '味道', left: '難以下嚥', right: '非常好食' },
    { key: 'hygiene', label: '衞生', left: '需要改善', right: '乾淨整潔' },
    { key: 'value', label: '性價比', left: '偏貴', right: '抵食夾大件' },
  ],
};

export const mockTagOptions: Record<string, string[]> = {
  teacher: ['#有GroupPro', '#期末論文', '#考試唔難', '#lecture錄影', '#給分好', '#功課少', '#功課多', '#口音重', '#考試多', '#非常友善', '#彈性deadline'],
  course: ['#入門友善', '#有期末考', '#推薦選修', '#老師好', '#內容有趣', '#考試難', '#GroupPro', '#實用', '#冇考試', '#essay為主', '#輕鬆'],
  canteen: ['#飯多量足', '#選擇多', '#排隊長', '#中菜好食', '#有點貴', '#環境好', '#咖啡唔錯', '#有WiFi', '#平靚正', '#適合趕時間', '#西餐為主', '#快餐為主'],
};
