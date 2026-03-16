import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface TabIconProps {
  size?: number;
  color?: string;
  focused?: boolean;
}

const FILL = '#0C1015';

/** Wrapper to keep all tab icons the same size */
function IconBox({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

/** 首页 / Forum tab */
export function TabHomeIcon({ size = 28, focused }: TabIconProps) {
  return (
    <IconBox size={size}>
      <Svg width={size * 0.81} height={size * 0.87} viewBox="0 0 26 27.95" fill="none">
        {focused ? (
          <>
            <Path
              d="M0 12.792C0 10.084 1.37 7.56 3.64 6.084l6.09-3.958a7 7 0 016.54 0l6.09 3.958A8.75 8.75 0 0126 12.792v8.428a6.25 6.25 0 01-5.403 5.97l-4.015.402a42 42 0 01-7.164 0l-4.015-.401A6.25 6.25 0 010 21.22v-8.428z"
              fill={FILL}
            />
            <Path
              d="M15.6 16.25a1.3 1.3 0 010 2.6h-5.2a1.3 1.3 0 010-2.6h5.2z"
              fill="white"
            />
          </>
        ) : (
          <>
            <Path
              d="M10.411 3.174a5.25 5.25 0 015.178 0l6.09 3.958A7.5 7.5 0 0124.75 12.79v8.43a5 5 0 01-4.277 4.726l-4.015.401a40.5 40.5 0 01-6.916 0l-4.015-.4A5 5 0 011.25 21.22v-8.43a7.5 7.5 0 013.071-5.658l6.09-3.958z"
              stroke={FILL}
              strokeWidth={2.5}
            />
            <Path
              d="M11.7 14.95a1.3 1.3 0 012.6 0v5.2a1.3 1.3 0 01-2.6 0v-5.2z"
              fill={FILL}
            />
          </>
        )}
      </Svg>
    </IconBox>
  );
}

/** 校园 / Functions tab */
export function TabCampusIcon({ size = 28, focused }: TabIconProps) {
  return (
    <IconBox size={size}>
      <Svg width={size * 0.81} height={size * 0.81} viewBox="0 0 26.035 26.035" fill="none">
        {focused ? (
          <>
            <Circle cx={13.018} cy={13.018} r={13.018} fill={FILL} />
            <Path
              d="M11.772 8.923a1.5 1.5 0 012.5.002l2.112 3.19a1.75 1.75 0 010 1.208l-2.112 3.19a1.5 1.5 0 01-2.5-.002l-2.12-3.189a1.75 1.75 0 010-1.214l2.12-3.185z"
              fill="white"
              stroke={FILL}
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            <Circle cx={13.018} cy={13.018} r={11.768} stroke={FILL} strokeWidth={2.5} />
            <Path
              d="M16.825 9.037a.25.25 0 01.379.38l-1.915 5.75a.75.75 0 01-.231.317l-5.75 1.915a.25.25 0 01-.38-.38l1.906-5.76a.75.75 0 01.318-.317l5.673-1.905z"
              stroke={FILL}
              strokeWidth={2.2}
            />
          </>
        )}
      </Svg>
    </IconBox>
  );
}

/** 消息 / Messages tab */
export function TabMessagesIcon({ size = 28, focused }: TabIconProps) {
  return (
    <IconBox size={size}>
      <Svg width={size * 0.89} height={size * 0.87} viewBox="0 0 28.596 28" fill="none">
        {focused ? (
          <>
            <Path
              d="M2.383 9.41c0-4.655 3.55-8.541 8.185-8.963l1.3-.118a41 41 0 017.243 0l1.3.118c4.635.422 8.185 4.308 8.185 8.963v5.519c0 4.056-3.035 7.482-7.073 7.873a85 85 0 01-6.034.431c-1.628 0-4.17-.596-4.17-.596l-6.304 2.986a1.25 1.25 0 01-1.536-1.653l1.824-3.908-.188-.25A8.75 8.75 0 012.383 14.014V9.41z"
              fill={FILL}
            />
            <Path
              d="M21.096 9.785c-.934.698-1.474 1.1-2.379 1.776a.125.125 0 000 .16l2.379 1.778"
              stroke="white"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <Circle cx={11.498} cy={11.499} r={1.788} fill="white" />
          </>
        ) : (
          <>
            <Path
              d="M11.981 1.574a39.5 39.5 0 017.017 0l1.3.118c3.991.363 7.047 3.71 7.047 7.718v5.519c0 3.429-2.562 6.3-5.943 6.629a83.5 83.5 0 01-5.913.421c-.698 0-1.65-.132-2.477-.279a25 25 0 00-1.01-.264l-.296-.059-.076-.018-.014-.002h-.001l-.425-.1-.394.188-6.304 2.985a.5.5 0 01-.663-.637l1.824-3.907.317-.68-.45-.6-.187-.25A7.5 7.5 0 013.633 14.015V9.41c0-4.008 3.057-7.355 7.049-7.718l1.3-.118z"
              stroke={FILL}
              strokeWidth={2.5}
            />
            <Path
              d="M11.498 9.711a1.788 1.788 0 110 3.576 1.788 1.788 0 010-3.576zM19.838 9.711a1.788 1.788 0 110 3.576 1.788 1.788 0 010-3.576z"
              fill={FILL}
            />
          </>
        )}
      </Svg>
    </IconBox>
  );
}

/** 我的 / Me tab */
export function TabMeIcon({ size = 28, focused }: TabIconProps) {
  return (
    <IconBox size={size}>
      <View style={{ alignItems: 'center' }}>
        {/* Head */}
        <Svg width={size * 0.41} height={size * 0.41} viewBox="0 0 13 13" fill="none">
          {focused ? (
            <>
              <Circle cx={6.5} cy={6.5} r={5.25} fill={FILL} stroke={FILL} strokeWidth={2.5} />
              <Path
                d="M4.643 8.857a3 3 0 003.714 0"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </>
          ) : (
            <Circle cx={6.5} cy={6.5} r={5.25} stroke={FILL} strokeWidth={2.5} />
          )}
        </Svg>
        {/* Body */}
        <Svg width={size * 0.72} height={size * 0.375} viewBox="0 0 23 12" fill="none" style={{ marginTop: size * 0.03 }}>
          <Path
            d="M11.5 1.25c2.473 0 4.965.306 6.98.65C20.386 2.226 21.75 3.938 21.75 6s-1.365 3.774-3.27 4.1c-2.015.343-4.507.65-6.98.65s-4.965-.307-6.98-.65C2.614 9.774 1.25 8.062 1.25 6s1.364-3.774 3.27-4.1c2.015-.344 4.507-.65 6.98-.65z"
            fill={focused ? FILL : undefined}
            stroke={FILL}
            strokeWidth={2.5}
          />
        </Svg>
      </View>
    </IconBox>
  );
}
