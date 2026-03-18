import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** Figma search icon — magnifying glass with arc highlight, viewBox 0 0 30 30 */
export const FigmaSearchIcon = ({ size = 30, color = '#010101' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <G>
      <Path
        d="M13.125 23.75C18.993 23.75 23.75 18.993 23.75 13.125C23.75 7.257 18.993 2.5 13.125 2.5C7.257 2.5 2.5 7.257 2.5 13.125C2.5 18.993 7.257 23.75 13.125 23.75Z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <Path
        d="M16.6606 8.96444C15.7558 8.05962 14.5058 7.5 13.1251 7.5C11.7444 7.5 10.4944 8.05962 9.58956 8.96444"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.7635 20.7636L26.0668 26.0669"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

/** Figma heart icon — outline heart, viewBox 0 0 30 30 */
export const FigmaHeartIcon = ({ size = 30, color = '#FF5577' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <Path
      d="M9.375 5C5.57804 5 2.5 8.07806 2.5 11.875C2.5 18.75 10.625 25 15 26.4539C19.375 25 27.5 18.75 27.5 11.875C27.5 8.07806 24.4219 5 20.625 5C18.2998 5 16.2442 6.15431 15 7.92113C13.7558 6.15431 11.7002 5 9.375 5Z"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Figma new-follower icon — person + plus, viewBox 0 0 30 30 */
export const FigmaNewFollowerIcon = ({ size = 30, color = '#009AFF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <G>
      <Path
        d="M11.875 12.5C14.2912 12.5 16.25 10.5412 16.25 8.125C16.25 5.70876 14.2912 3.75 11.875 3.75C9.45875 3.75 7.5 5.70876 7.5 8.125C7.5 10.5412 9.45875 12.5 11.875 12.5Z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2.5 25.5V26.25H21.25V25.5C21.25 22.6997 21.25 21.2996 20.7051 20.2301C20.2257 19.2892 19.4608 18.5243 18.5199 18.0449C17.4504 17.5 16.0503 17.5 13.25 17.5H10.5C7.69975 17.5 6.29963 17.5 5.23005 18.0449C4.28924 18.5243 3.52433 19.2892 3.04497 20.2301C2.5 21.2996 2.5 22.6997 2.5 25.5Z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M23.75 8.125V15.625M20 11.875H27.5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

/** Figma comment icon — chat bubble with dots, viewBox 0 0 30 30 */
export const FigmaCommentIcon = ({ size = 30, color = '#04D434' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <G>
      <Path
        d="M27.5 3.75H2.5V22.5H8.125V25.625L14.375 22.5H27.5V3.75Z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.75 12.1875V14.0625"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 12.1875V14.0625"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21.25 12.1875V14.0625"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);
