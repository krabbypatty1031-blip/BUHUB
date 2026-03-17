import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** 找搭子 – two people (exact Figma paths) */
export function PartnerFnIcon({ size = 28, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M8.74972 8.16667C10.0384 8.16667 11.083 7.122 11.083 5.83333C11.083 4.54467 10.0384 3.5 8.74972 3.5C7.46105 3.5 6.41638 4.54467 6.41638 5.83333C6.41638 7.122 7.46105 8.16667 8.74972 8.16667Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19.2497 8.16667C20.5384 8.16667 21.583 7.122 21.583 5.83333C21.583 4.54467 20.5384 3.5 19.2497 3.5C17.9611 3.5 16.9164 4.54467 16.9164 5.83333C16.9164 7.122 17.9611 8.16667 19.2497 8.16667Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5.83362 11.6664H11.667L10.5003 24.4997H7.00028L5.83362 11.6664Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16.3336 11.6664H22.167L21.0003 24.4997H17.5003L16.3336 11.6664Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 跑腿 – delivery cart (exact Figma paths) */
export function ErrandFnIcon({ size = 28, color = '#FF9145' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M23.9167 7H11.0833C10.1168 7 9.33333 7.7835 9.33333 8.75V15.75C9.33333 16.7165 10.1168 17.5 11.0833 17.5H23.9167C24.8832 17.5 25.6667 16.7165 25.6667 15.75V8.75C25.6667 7.7835 24.8832 7 23.9167 7Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M14 10.5V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M21 10.5V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M21 7V3.5H14V7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M25.6667 21H7C6.35565 21 5.83333 20.4777 5.83333 19.8333V6.41667C5.83333 5.77233 5.311 5.25 4.66667 5.25H2.33333" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.0833 24.5C10.1168 24.5 9.33333 23.7165 9.33333 22.75V21H12.8333V22.75C12.8333 23.7165 12.0499 24.5 11.0833 24.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21.5833 24.5C20.6168 24.5 19.8333 23.7165 19.8333 22.75V21H23.3333V22.75C23.3333 23.7165 22.5499 24.5 21.5833 24.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 二手 – shopping bag (exact Figma paths) */
export function SecondhandFnIcon({ size = 28, color = '#02AF4A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M5.70579 5.68863C5.77878 5.10479 6.27506 4.66667 6.86347 4.66667H21.1369C21.7253 4.66667 22.2216 5.10479 22.2946 5.68863L24.3363 22.0219C24.4233 22.7183 23.8804 23.3333 23.1786 23.3333H4.82178C4.12004 23.3333 3.57709 22.7183 3.66413 22.0219L5.70579 5.68863Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M8.75 10.5C8.75 10.5 9.91667 12.8333 14 12.8333C18.0833 12.8333 19.25 10.5 19.25 10.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 评分 – star (exact Figma paths) */
export function RatingFnIcon({ size = 28, color = '#FFA814' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M13.9992 2.91667L10.4333 10.1953L2.33333 11.3698L8.20103 17.1063L6.7984 25.0833L13.9992 21.2445L21.2015 25.0833L19.8092 17.1063L25.6667 11.3698L17.6116 10.1953L13.9992 2.91667Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

/** 设施预定 – building (exact Figma paths) */
export function FacilityFnIcon({ size = 28, color = '#C76FF6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M9.91667 4.43333L25.6667 10.2667V21.9333H9.91667V4.43333Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.91667 4.43333L2.33333 10.2667V21.9333H9.91667" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.4167 21.9333V14.9333L15.1667 13.1833V21.9333" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M25.6667 21.9333H9.91667" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** AI 课表 – calendar with AI text (exact Figma SVG) */
export function AIScheduleFnIcon({ size = 28, color = '#5B73FF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M24.5 5.83333H3.5C2.85567 5.83333 2.33333 6.35567 2.33333 7V22.1667C2.33333 22.811 2.85567 23.3333 3.5 23.3333H24.5C25.1443 23.3333 25.6667 22.811 25.6667 22.1667V7C25.6667 6.35567 25.1443 5.83333 24.5 5.83333Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8.16667 3.5V8.16667" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.5 13.4167L8.16667 13.4167" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M19.5506 15.8667H18.3543V10.8901H19.5506V15.8667Z" fill={color} />
      <Path d="M16.3274 14.937H14.6834L14.3963 15.8667H13.1145L14.9397 10.8901H16.0676L17.9065 15.8667H16.6179L16.3274 14.937ZM14.9705 14.0107H16.0403L15.5037 12.2846L14.9705 14.0107Z" fill={color} />
      <Path d="M19.8333 18.0833H8.16667" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M19.8333 3.5V8.16667" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** 卡片右上角箭头 */
export function ArrowRightFnIcon({ size = 24, color = '#C1C1C1' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.5 6L15.5 12L9.5 18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
