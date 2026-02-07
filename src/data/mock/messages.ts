import type { Contact, ChatHistory } from '../../types';

export const mockContacts: Contact[] = [
  {
    name: '李同學',
    avatar: '李',
    message: '好嘅！咁我哋下週六見！',
    time: '10:30',
    unread: 2,
    pinned: true,
    gender: 'female',
  },
  {
    name: '王同學',
    avatar: '王',
    message: '收到，多謝你！',
    time: '昨日',
    unread: 0,
    pinned: true,
    gender: 'male',
  },
  {
    name: '陳同學',
    avatar: '陳',
    message: '你好！請問你發布嘅搭子活動仲有位嗎？',
    time: '週一',
    unread: 1,
    pinned: false,
    gender: 'female',
  },
  {
    name: '張同學',
    avatar: '張',
    message: '好期待！到時見～',
    time: '週日',
    unread: 0,
    pinned: false,
    gender: 'male',
  },
];

export const mockChatHistory: Record<string, ChatHistory[]> = {
  '李同學': [
    {
      date: '星期一',
      messages: [
        { type: 'received', text: '你好！想問下你發布嘅搭子活動', time: '18:30' },
        { type: 'sent', text: '你好！有咩想了解？', time: '18:35', status: 'read' },
      ],
    },
    {
      date: '今日',
      messages: [
        { type: 'received', text: '請問仲有位嗎？', time: '10:02' },
        { type: 'sent', text: '有呀！歡迎加入，依家仲有2個位', time: '10:05', status: 'read' },
        { type: 'received', text: '太好啦！我想參加，週六幾點出發？', time: '10:08' },
        { type: 'sent', text: '朝早9點喺九龍塘站集合，ok嗎？', time: '10:15', status: 'read' },
        { type: 'received', text: '好嘅！咁我哋下週六見！', time: '10:30' },
      ],
    },
  ],
  '王同學': [
    {
      date: '昨日',
      messages: [
        { type: 'sent', text: 'COMP3015 嘅 Group Project 你搵到隊友未？', time: '14:20', status: 'read' },
        { type: 'received', text: '仲未呀，你有興趣一齊做嗎？', time: '14:25' },
        { type: 'sent', text: '好呀！我哋可以搵多一兩個人', time: '14:30', status: 'read' },
        { type: 'received', text: '收到，多謝你！', time: '14:35' },
      ],
    },
  ],
  '陳同學': [
    {
      date: '週一',
      messages: [
        { type: 'received', text: '你好！請問你發布嘅搭子活動仲有位嗎？', time: '09:15' },
        { type: 'sent', text: '有呀！你想參加邊個活動？', time: '09:20', status: 'read' },
        { type: 'received', text: '就係週末行山嗰個～', time: '09:22' },
        { type: 'sent', text: '歡迎！我加你入群組先', time: '09:25', status: 'read' },
      ],
    },
  ],
  '張同學': [
    {
      date: '週日',
      messages: [
        { type: 'sent', text: '聽日一齊去圖書館溫書？', time: '20:00', status: 'read' },
        { type: 'received', text: '好呀！幾點？', time: '20:05' },
        { type: 'sent', text: '10點喺 LG 等？', time: '20:08', status: 'read' },
        { type: 'received', text: '好期待！到時見～', time: '20:10' },
      ],
    },
  ],
};
