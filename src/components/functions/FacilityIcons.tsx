import React from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** Library – stacked books */
export function LibraryFacilityIcon({ size = 28, color = '#3B82F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M4.66667 5.25C4.66667 4.60567 5.189 4.08333 5.83333 4.08333H10.5C11.1443 4.08333 11.6667 4.60567 11.6667 5.25V22.75C11.6667 23.3943 11.1443 23.9167 10.5 23.9167H5.83333C5.189 23.9167 4.66667 23.3943 4.66667 22.75V5.25Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M11.6667 7.58333H16.3333C16.9777 7.58333 17.5 8.10567 17.5 8.75V22.75C17.5 23.3943 16.9777 23.9167 16.3333 23.9167H11.6667V7.58333Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M18.1999 9.22058L21.7065 8.59221C22.3408 8.47858 22.9457 8.90329 23.0594 9.53754L24.9823 20.2699C25.0959 20.9041 24.6712 21.5091 24.037 21.6227L20.5303 22.2511"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Line x1="6.41667" y1="8.16667" x2="9.91667" y2="8.16667" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="13.4167" y1="11.0833" x2="15.75" y2="11.0833" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Sports – dumbbell */
export function SportsFacilityIcon({ size = 28, color = '#FF9145' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M4.08333 11.0833V16.9167" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M23.9167 11.0833V16.9167" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x="6.41667" y="8.16667" width="3.5" height="11.6667" rx="1.16667" stroke={color} strokeWidth={2} />
      <Rect x="18.0833" y="8.16667" width="3.5" height="11.6667" rx="1.16667" stroke={color} strokeWidth={2} />
      <Line x1="9.91667" y1="14" x2="18.0833" y2="14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** VFBS – virtual meeting / screen with play */
export function VFBSFacilityIcon({ size = 28, color = '#02AF4A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Rect x="2.91667" y="5.25" width="22.1667" height="14" rx="2.33333" stroke={color} strokeWidth={2} />
      <Path d="M12.25 10.5L15.75 12.25L12.25 14V10.5Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Line x1="9.33333" y1="23.3333" x2="18.6667" y2="23.3333" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="14" y1="19.25" x2="14" y2="23.3333" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** JCCC – performance stage with curtain */
export function JCCCFacilityIcon({ size = 28, color = '#FFA814' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M3.5 4.66667H24.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M5.83333 4.66667V19.8333C5.83333 19.8333 8.16667 17.5 10.5 17.5C12.8333 17.5 13.4167 19.8333 13.4167 19.8333V4.66667"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M22.1667 4.66667V19.8333C22.1667 19.8333 19.8333 17.5 17.5 17.5C15.1667 17.5 14.5833 19.8333 14.5833 19.8333V4.66667"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M10.5 24.5L14 21L17.5 24.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** S-Gallery – picture frame */
export function SGalleryFacilityIcon({ size = 28, color = '#C76FF6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Rect x="3.5" y="3.5" width="21" height="21" rx="2.33333" stroke={color} strokeWidth={2} />
      <Circle cx="10.5" cy="10.5" r="2.33333" stroke={color} strokeWidth={2} />
      <Path
        d="M24.5 17.5L19.8333 12.8333L8.16667 24.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
