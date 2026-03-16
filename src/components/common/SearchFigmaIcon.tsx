import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

/** Figma 搜索图标 - 放大镜 + 光泽 + 把手 */
export default function SearchFigmaIcon({ size = 26, color = '#0C1015' }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      {/* Circle */}
      <Svg
        width={size * 0.79}
        height={size * 0.79}
        viewBox="0 0 20.583 20.583"
        fill="none"
        style={{ position: 'absolute', left: size * 0.083, top: size * 0.083 }}
      >
        <Path
          d="M10.292 19.5a9.208 9.208 0 100-18.417 9.208 9.208 0 000 18.417z"
          stroke={color}
          strokeWidth={2.167}
          strokeLinejoin="round"
        />
      </Svg>
      {/* Shine */}
      <Svg
        width={size * 0.319}
        height={size * 0.132}
        viewBox="0 0 8.295 3.436"
        fill="none"
        style={{ position: 'absolute', left: size * 0.32, top: size * 0.25 }}
      >
        <Path
          d="M7.212 2.353A5.15 5.15 0 004.147 1.083 5.15 5.15 0 001.083 2.353"
          stroke={color}
          strokeWidth={2.167}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {/* Handle */}
      <Svg
        width={size * 0.26}
        height={size * 0.26}
        viewBox="0 0 6.763 6.763"
        fill="none"
        style={{ position: 'absolute', left: size * 0.692, top: size * 0.692 }}
      >
        <Path
          d="M1.083 1.083l4.596 4.596"
          stroke={color}
          strokeWidth={2.167}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
