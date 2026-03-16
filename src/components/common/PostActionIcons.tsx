import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  fill?: string;
}

/** Wrapper to keep all action icons the same visual size */
function ActionIconBox({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

/** 点赞 – heart */
export function LikeActionIcon({ size = 18, color = '#86909C', fill }: IconProps) {
  return (
    <ActionIconBox size={size}>
      <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        <Path
          d="M5.625 3C3.347 3 1.5 4.847 1.5 7.125 1.5 11.25 6.375 15 9 15.872 11.625 15 16.5 11.25 16.5 7.125 16.5 4.847 14.653 3 12.375 3c-1.395 0-2.629.693-3.375 1.753C8.253 3.693 7.02 3 5.625 3z"
          stroke={fill ? undefined : color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={fill ?? 'none'}
        />
      </Svg>
    </ActionIconBox>
  );
}

/** 评论 – chat bubble with dots */
export function CommentActionIcon({ size = 18, color = '#86909C' }: IconProps) {
  return (
    <ActionIconBox size={size}>
      <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        <Path
          d="M16.5 2.25H1.5V13.5H4.875V15.375L8.625 13.5H16.5V2.25z"
          stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        />
        <Path d="M5.25 7.312V8.438" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 7.312V8.438" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M12.75 7.312V8.438" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </ActionIconBox>
  );
}

/** 分享 – upload/share arrow */
export function ShareActionIcon({ size = 18, color = '#86909C' }: IconProps) {
  return (
    <ActionIconBox size={size}>
      <Svg width={size * 0.83} height={size * 0.83} viewBox="0 0 15 15" fill="none">
        <Path d="M.75 7.503V14.25H14.25V7.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M10.875 4.125L7.5.75 4.125 4.125" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M7.497 10.5V.75" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </ActionIconBox>
  );
}

/** 收藏 – bookmark with line */
export function BookmarkActionIcon({ size = 18, color = '#86909C', fill }: IconProps) {
  return (
    <ActionIconBox size={size}>
      <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        <Path
          d="M3 16.5V2.25c0-.414.336-.75.75-.75h10.5c.414 0 .75.336.75.75V16.5L9 13.398 3 16.5z"
          stroke={fill ? undefined : color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill={fill ?? 'none'}
        />
        {!fill && (
          <Path d="M6 6.75h6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </Svg>
    </ActionIconBox>
  );
}

/** 引用 – double quotes */
export function QuoteActionIcon({ size = 18, color = '#86909C' }: IconProps) {
  return (
    <ActionIconBox size={size}>
      <Svg width={size * 0.88} height={size * 0.84} viewBox="0 0 16.705 15.904" fill="none">
        <Path
          d="M.752 13.479v.873c0 .442.358.8.8.8a6.6 6.6 0 005.6-5.6V2.352a1.6 1.6 0 00-1.6-1.6H2.352a1.6 1.6 0 00-1.6 1.6v3.8a2 2 0 002 2c.331 0 .6.269.6.6v2.527a.8.8 0 01-.8.8 1.6 1.6 0 00-1.6 1.6z"
          stroke={color} strokeWidth={1.504}
        />
        <Path
          d="M9.553 13.479v.873c0 .442.358.8.8.8a6.6 6.6 0 005.6-5.6V2.352a1.6 1.6 0 00-1.6-1.6h-3.2a1.6 1.6 0 00-1.6 1.6v3.8a2 2 0 002 2c.331 0 .6.269.6.6v2.527a.8.8 0 01-.8.8 1.6 1.6 0 00-1.6 1.6z"
          stroke={color} strokeWidth={1.504}
        />
      </Svg>
    </ActionIconBox>
  );
}

/** 翻译 – translate icon */
export function TranslateActionIcon({ size = 18, color = '#86909C' }: IconProps) {
  return (
    <ActionIconBox size={size}>
      <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        <Path
          d="M11.404 0a4.215 4.215 0 012.693 1.099 4.089 4.089 0 011.116 2.652v1.037a.652.652 0 01-1.31 0V3.75a2.65 2.65 0 00-.732-1.74 2.76 2.76 0 00-1.766-.719H4.9a2.51 2.51 0 00-2.499 2.432L2.31 13.22a2.45 2.45 0 002.498 2.49h6.957a.655.655 0 010 1.29H4.81a3.848 3.848 0 01-3.81-3.795L1.09 3.708A3.72 3.72 0 012.222 1.083 3.851 3.851 0 014.899 0h6.505zM15.04 7.585a.14.14 0 01.14.139v1.616h2.397c.234 0 .423.186.423.416v3.919a.42.42 0 01-.423.418h-2.399v2.64a.14.14 0 01-.14.139h-.987a.14.14 0 01-.14-.139v-2.64h-2.397a.421.421 0 01-.422-.419V9.757c0-.232.187-.417.422-.417h2.397V7.725a.14.14 0 01.14-.14h.987zm-2.68 3.004v2.254h1.552V10.59H12.36zm2.82 0v2.254h1.552V10.59H15.18zM8.382 4.618a.147.147 0 01.136.092l1.696 4.838H6.756l-.578 1.643a.148.148 0 01-.134.092h-.97a.133.133 0 01-.111-.183l2.24-6.39a.148.148 0 01.268 0h1.067l.001.001-.001-.092zm-1.287 3.958h1.507l-.754-2.149-.753 2.149z"
          fill={color}
        />
      </Svg>
    </ActionIconBox>
  );
}
