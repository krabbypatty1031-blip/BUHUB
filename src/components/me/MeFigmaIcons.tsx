import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** Figma 图标/线/帮助 — 26x26, exact Figma vectors */
export const FigmaHelpIcon = ({ size = 26, color = '#0C1015' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
    <Path
      d="M13 23.8333C7.02333 23.8333 2.16667 18.9767 2.16667 13C2.16667 7.02333 7.02333 2.16667 13 2.16667C18.9767 2.16667 23.8333 7.02333 23.8333 13C23.8333 18.9767 18.9767 23.8333 13 23.8333Z"
      stroke={color}
      strokeWidth={2.16667}
      strokeLinejoin="round"
    />
    <Path
      d="M13 15.1667V14.0833C13 13.5417 13.3583 13.0833 13.8667 12.9167C15.175 12.4583 16.0833 11.2917 16.0833 9.91667C16.0833 8.12175 14.6283 6.66667 12.8333 6.66667C11.0384 6.66667 9.58333 8.12175 9.58333 9.91667"
      stroke={color}
      strokeWidth={2.16667}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13 19.5C13.7364 19.5 14.3333 18.903 14.3333 18.1667C14.3333 17.4303 13.7364 16.8333 13 16.8333C12.2636 16.8333 11.6667 17.4303 11.6667 18.1667C11.6667 18.903 12.2636 19.5 13 19.5Z"
      fill={color}
    />
  </Svg>
);

/** Figma 图标/线/设置 — 26x26, exact Figma gear + center circle vectors */
export const FigmaSettingsIcon = ({ size = 26, color = '#0C1015' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
    <Path
      d="M10.9871 24.4662C9.17189 23.9258 7.55615 22.9225 6.27678 21.5931C6.75404 21.0274 7.04168 20.2966 7.04168 19.4985C7.04168 17.7036 5.58661 16.2485 3.79168 16.2485C3.6831 16.2485 3.57577 16.2539 3.46992 16.2643C3.32573 15.5593 3.25001 14.8295 3.25001 14.0818C3.25001 12.9494 3.42376 11.8576 3.74607 10.8315C3.76124 10.8317 3.77645 10.8318 3.79168 10.8318C5.58661 10.8318 7.04168 9.37675 7.04168 7.58183C7.04168 7.06654 6.92176 6.57931 6.70834 6.14642C7.96116 4.9815 9.49028 4.1097 11.1866 3.64014C11.7241 4.69371 12.8195 5.41518 14.0834 5.41518C15.3472 5.41518 16.4427 4.69371 16.9801 3.64014C18.6764 4.1097 20.2056 4.9815 21.4584 6.14642C21.245 6.57931 21.125 7.06654 21.125 7.58183C21.125 9.37675 22.5801 10.8318 24.375 10.8318C24.3903 10.8318 24.4055 10.8317 24.4206 10.8315C24.7429 11.8576 24.9167 12.9494 24.9167 14.0818C24.9167 14.8295 24.841 15.5593 24.6968 16.2643C24.5909 16.2539 24.4836 16.2485 24.375 16.2485C22.5801 16.2485 21.125 17.7036 21.125 19.4985C21.125 20.2966 21.4127 21.0274 21.8899 21.5931C20.6106 22.9225 18.9948 23.9258 17.1796 24.4662C16.7607 23.1558 15.5329 22.2068 14.0834 22.2068C12.6339 22.2068 11.406 23.1558 10.9871 24.4662Z"
      stroke={color}
      strokeWidth={2.16667}
      strokeLinejoin="round"
    />
    <Path
      d="M14.0834 18.9567C17.0191 18.9567 19.3987 16.577 19.3987 13.6413C19.3987 10.7056 17.0191 8.32593 14.0834 8.32593C11.1477 8.32593 8.76806 10.7056 8.76806 13.6413C8.76806 16.577 11.1477 18.9567 14.0834 18.9567Z"
      stroke={color}
      strokeWidth={2.16667}
      strokeLinejoin="round"
    />
  </Svg>
);

/** Figma 图标/线/编辑 — 16x16, exact Figma pencil + base line vectors */
export const FigmaEditIcon = ({ size = 16, color = '#0C1015' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M4.333 9.573V12H6.773L13.667 5.103L11.232 2.667L4.333 9.573Z"
      stroke={color}
      strokeWidth={1.33333}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 14.667H15.667"
      stroke={color}
      strokeWidth={1.33333}
      strokeLinecap="round"
    />
  </Svg>
);

/** Figma 图标/线/分享 — 16x16, exact Figma share arrow vector */
export const FigmaShareIcon = ({ size = 16, color = '#0C1015' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M9.333 2L15.333 8L9.333 13.667V10C4.667 10 2.667 15 2.667 15C2.667 9.333 4.333 5.667 9.333 5.667V2Z"
      stroke={color}
      strokeWidth={1.33333}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
