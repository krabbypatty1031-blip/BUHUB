import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** 找搭子 – two people */
export function PartnerFnIcon({ size = 28, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M8.75 8.167a2.333 2.333 0 100-4.667 2.333 2.333 0 000 4.667z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M19.25 8.167a2.333 2.333 0 100-4.667 2.333 2.333 0 000 4.667z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M5.834 11.666h5.833l-1.167 12.834H7l-1.166-12.834z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M16.334 11.666h5.833L21 24.5h-3.5l-1.166-12.834z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 跑腿 – delivery cart */
export function ErrandFnIcon({ size = 28, color = '#FF9145' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M23.917 7H11.083a1.75 1.75 0 00-1.75 1.75v7a1.75 1.75 0 001.75 1.75h12.834a1.75 1.75 0 001.75-1.75v-7A1.75 1.75 0 0023.917 7z"
        stroke={color} strokeWidth={2} strokeLinejoin="round"
      />
      <Path d="M14 10.5V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M21 10.5V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M21 7V3.5h-7V7"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M25.667 21H7A1.167 1.167 0 015.833 19.833V6.417A1.167 1.167 0 004.667 5.25H2.333"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M11.083 24.5a1.75 1.75 0 01-1.75-1.75V21h3.5v1.75a1.75 1.75 0 01-1.75 1.75z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M21.583 24.5a1.75 1.75 0 01-1.75-1.75V21h3.5v1.75a1.75 1.75 0 01-1.75 1.75z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 二手 – shopping bag */
export function SecondhandFnIcon({ size = 28, color = '#02AF4A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M5.706 5.689A1.167 1.167 0 016.863 4.667h14.274a1.167 1.167 0 011.157 1.022l2.042 16.333a1.167 1.167 0 01-1.158 1.311H4.822a1.167 1.167 0 01-1.158-1.311L5.706 5.689z"
        stroke={color} strokeWidth={2} strokeLinejoin="round"
      />
      <Path
        d="M8.75 10.5s1.167 2.333 5.25 2.333 5.25-2.333 5.25-2.333"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 评分 – star */
export function RatingFnIcon({ size = 28, color = '#FFA814' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 2.917l-3.566 7.278-8.1 1.175 5.866 5.736-1.402 7.977L14 21.245l7.202 3.838-1.393-7.977 5.858-5.736-8.056-1.175L14 2.917z"
        stroke={color} strokeWidth={2} strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 设施预定 – building */
export function FacilityFnIcon({ size = 28, color = '#C76FF6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M9.917 4.433l15.75 5.834v11.666H9.917V4.433z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M9.917 4.433L2.333 10.267v11.666h7.584"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M20.417 21.933v-7l-5.25-1.75v8.75"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M25.667 21.933H9.917"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 我的发布 – document with lines */
export function MyPostsFnIcon({ size = 28, color = '#7C3AED' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M16.333 3.5H7A2.333 2.333 0 004.667 5.833v16.334A2.333 2.333 0 007 24.5h14a2.333 2.333 0 002.333-2.333V10.5L16.333 3.5z"
        stroke={color} strokeWidth={2} strokeLinejoin="round"
      />
      <Path
        d="M15.167 3.5v8.167h8.166"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M10.5 15.167h7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.5 19.833h4.667" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** 卡片右上角箭头 */
export function ArrowRightFnIcon({ size = 24, color = '#C1C1C1' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.5 6l6 6-6 6"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

/** 搜索图标 */
export function SearchFnIcon({ size = 30, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Path
        d="M13.125 23.75c5.868 0 10.625-4.757 10.625-10.625S18.993 2.5 13.125 2.5 2.5 7.257 2.5 13.125 7.257 23.75 13.125 23.75z"
        stroke={color} strokeWidth={2.5} strokeLinejoin="round"
      />
      <Path
        d="M16.661 8.964a5.25 5.25 0 00-7.071 0"
        stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M20.764 20.764l5.303 5.303"
        stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}
