import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** 地点 — 气泡定位针 (找搭子) */
export function LocationPinIcon({ size = 16, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={9} r={2.5} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

/** 活动时间 — 日历 + 中心圆点 (找搭子) */
export function CalendarDotIcon({ size = 16, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={16} y1={2} x2={16} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={8} y1={2} x2={8} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={16} r={1} fill={color} />
    </Svg>
  );
}

/** 截止时间 — 时钟 + 指针 (找搭子/跑腿) */
export function ClockDeadlineIcon({ size = 16, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 取货地点 — 定位针 + 勾 (跑腿) */
export function PinCheckIcon({ size = 16, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 10l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 送达地点 — 房子 (跑腿) */
export function HomeDeliverIcon({ size = 16, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 成色 — 刷新箭头 + 勾 (二手) */
export function ConditionIcon({ size = 16, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M21 3v6h-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 交易方式 — 双人面交 (二手) */
export function TradeMethodIcon({ size = 16, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={2} />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 分类 — 列表 (二手) */
export function CategoryListIcon({ size = 16, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={8} y1={6} x2={21} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={8} y1={12} x2={21} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={8} y1={18} x2={21} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={3.5} cy={6} r={0.5} fill={color} stroke={color} strokeWidth={1} />
      <Circle cx={3.5} cy={12} r={0.5} fill={color} stroke={color} strokeWidth={1} />
      <Circle cx={3.5} cy={18} r={0.5} fill={color} stroke={color} strokeWidth={1} />
    </Svg>
  );
}

/** 私信 — 圆角气泡 + 三个圆点 */
export function ChatBubbleIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={8.5} cy={11.5} r={0.8} fill={color} />
      <Circle cx={12} cy={11.5} r={0.8} fill={color} />
      <Circle cx={15.5} cy={11.5} r={0.8} fill={color} />
    </Svg>
  );
}

/** 关注 — 人物 + 加号 */
export function FollowPersonIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={2} />
      <Line x1={20} y1={8} x2={20} y2={14} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={17} y1={11} x2={23} y2={11} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** 已关注 — 人物 + 勾 */
export function FollowedCheckIcon({ size = 18, color = '#0C1015' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={2} />
      <Polyline points="17 11 19 13 23 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ======== Chat Input Icons — 圆润填充风格 ======== */

/** 相机 — 圆润机身+镜头光晕 */
export function ChatCameraIcon({ size = 18, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={6} width={20} height={14} rx={3} stroke={color} strokeWidth={1.5} fill={`${color}0F`} />
      <Path d="M8.5 6V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={12} cy={13} r={3.5} stroke={color} strokeWidth={1.5} fill={`${color}14`} />
      <Circle cx={12} cy={13} r={1.2} fill={color} opacity={0.4} />
    </Svg>
  );
}

/** 麦克风 — 胶囊话筒+声波弧线 */
export function ChatMicIcon({ size = 18, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={8.5} y={2} width={7} height={12} rx={3.5} stroke={color} strokeWidth={1.5} fill={`${color}0F`} />
      <Path d="M5 11v0.5a7 7 0 0 0 14 0V11" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={12} y1={18.5} x2={12} y2={22} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 22h6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/** 键盘 — 圆润键盘+立体按键 */
export function ChatKeyboardIcon({ size = 18, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={5} width={20} height={14} rx={3} stroke={color} strokeWidth={1.5} fill={`${color}0F`} />
      <Rect x={5} y={8} width={2.5} height={2.5} rx={0.5} fill={color} opacity={0.3} />
      <Rect x={9} y={8} width={2.5} height={2.5} rx={0.5} fill={color} opacity={0.3} />
      <Rect x={13} y={8} width={2.5} height={2.5} rx={0.5} fill={color} opacity={0.3} />
      <Rect x={17} y={8} width={2.5} height={2.5} rx={0.5} fill={color} opacity={0.3} />
      <Rect x={5} y={12.5} width={2.5} height={2.5} rx={0.5} fill={color} opacity={0.3} />
      <Rect x={9} y={12.5} width={6} height={2.5} rx={0.5} fill={color} opacity={0.3} />
      <Rect x={17} y={12.5} width={2.5} height={2.5} rx={0.5} fill={color} opacity={0.3} />
    </Svg>
  );
}

/** 发送 — 纸飞机 */
export function ChatSendIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ======== Rating Category Avatars ======== */

/** 教师 — 带博士帽的人物 */
export function TeacherAvatarIcon({ size = 40, color = '#6366F1' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx={20} cy={20} r={20} fill={`${color}18`} />
      {/* 博士帽 */}
      <Path d="M20 8L10 13l10 5 10-5-10-5z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill={`${color}15`} />
      <Rect x={17} y={8} width={6} height={2} rx={0.5} fill={color} opacity={0.5} />
      <Line x1={30} y1={13} x2={30} y2={18} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={30} cy={19} r={1} fill={color} opacity={0.4} />
      {/* 人物 */}
      <Circle cx={20} cy={22} r={3.5} stroke={color} strokeWidth={1.8} />
      <Path d="M12 33c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** 课程 — 打开的书本 */
export function CourseAvatarIcon({ size = 40, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx={20} cy={20} r={20} fill={`${color}18`} />
      <Path d="M20 12v18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M20 12c-2-2-5-3-8-3v16c3 0 6 1 8 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill={`${color}0A`} />
      <Path d="M20 12c2-2 5-3 8-3v16c-3 0-6 1-8 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill={`${color}0A`} />
    </Svg>
  );
}

/** 餐厅 — 刀叉+盘子 */
export function CanteenAvatarIcon({ size = 40, color = '#F97316' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx={20} cy={20} r={20} fill={`${color}18`} />
      <Circle cx={20} cy={20} r={7} stroke={color} strokeWidth={1.8} fill={`${color}0A`} />
      <Circle cx={20} cy={20} r={3.5} stroke={color} strokeWidth={1} opacity={0.4} />
      <Path d="M10 12v16M10 12c0 3 1.5 4 1.5 7s-1.5 4-1.5 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M30 12v3c0 2-1.5 3-1.5 3L30 28" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={28} y1={12} x2={28} y2={17} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/** 专业 — 学士帽 */
export function MajorAvatarIcon({ size = 40, color = '#10B981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx={20} cy={20} r={20} fill={`${color}18`} />
      <Path d="M20 11L8 17l12 6 12-6-12-6z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={`${color}0A`} />
      <Path d="M12 19v7c0 2 3.5 4 8 4s8-2 8-4v-7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={32} y1={17} x2={32} y2={27} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** 加号 — 圆圈+圆头十字，圆润风格 */
export function ChatPlusIcon({ size = 20, color = '#0C1015' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Line x1={12} y1={8} x2={12} y2={16} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={8} y1={12} x2={16} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** 四宫格 — 逐条发送图标 */
export function GridFourIcon({ size = 20, color = '#0C1015' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={7} height={7} rx={2} stroke={color} strokeWidth={1.5} fill={`${color}0F`} />
      <Rect x={14} y={3} width={7} height={7} rx={2} stroke={color} strokeWidth={1.5} fill={`${color}0F`} />
      <Rect x={3} y={14} width={7} height={7} rx={2} stroke={color} strokeWidth={1.5} fill={`${color}0F`} />
      <Rect x={14} y={14} width={7} height={7} rx={2} stroke={color} strokeWidth={1.5} fill={`${color}0F`} />
    </Svg>
  );
}

/** 相册 — 合并发送图标 */
export function AlbumMergeIcon({ size = 20, color = '#0C1015' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={3} width={20} height={18} rx={3} stroke={color} strokeWidth={1.5} fill={`${color}0F`} />
      <Circle cx={8.5} cy={8.5} r={2} stroke={color} strokeWidth={1.5} fill={`${color}14`} />
      <Path d="M22 16l-5.5-6L11 16l-3.5-3L2 19" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 图片 — 山景风景画 */
export function ChatImageIcon({ size = 18, color = '#86909C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={3} width={20} height={18} rx={3} stroke={color} strokeWidth={1.5} fill={`${color}0F`} />
      <Circle cx={8.5} cy={8.5} r={2} stroke={color} strokeWidth={1.5} fill={`${color}14`} />
      <Path d="M22 16l-5.5-6L11 16l-3.5-3L2 19" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
