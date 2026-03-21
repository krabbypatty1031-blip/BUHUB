import React from 'react';
import Svg, { Path, Circle, Rect, Line, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** Image upload — picture frame with arrow up */
export function UploadImageIcon({ size = 32, color = '#009AFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Frame */}
      <Rect x={2} y={5} width={28} height={22} rx={3} stroke={color} strokeWidth={1.8} />
      {/* Sun/circle in top-left */}
      <Circle cx={8.5} cy={11} r={2.5} stroke={color} strokeWidth={1.5} />
      {/* Mountain silhouette */}
      <Path
        d="M2 22l7-7 5 5 4-4 12 8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Up arrow */}
      <Path
        d="M16 17v-7M13 13l3-3 3 3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** AI sparkle — four-pointed star */
export function AISparkleIcon({ size = 41, color = '#009AFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 41 41" fill="none">
      {/* Main four-pointed sparkle */}
      <Path
        d="M20.5 3C20.5 3 21.5 13 25 17C28.5 21 38.5 20.5 38.5 20.5C38.5 20.5 28.5 21 25 25C21.5 29 20.5 38 20.5 38C20.5 38 19.5 29 16 25C12.5 21 2.5 20.5 2.5 20.5C2.5 20.5 12.5 21 16 17C19.5 13 20.5 3 20.5 3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}18`}
      />
      {/* Small sparkle top-right */}
      <Path
        d="M32 7C32 7 32.4 10 33.5 11C34.6 12 38 12.5 38 12.5C38 12.5 34.6 13 33.5 14C32.4 15 32 18 32 18C32 18 31.6 15 30.5 14C29.4 13 26 12.5 26 12.5C26 12.5 29.4 12 30.5 11C31.6 10 32 7 32 7Z"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}18`}
      />
    </Svg>
  );
}

/** Download — save to album (exact Figma SVG) */
export function DownloadIcon({ size = 24, color = '#0C1015' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <Path
        d="M3.25 13.0045V22.75H22.75V13"
        stroke={color} strokeWidth={2.167} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M17.875 12.4583L13 17.3333L8.125 12.4583"
        stroke={color} strokeWidth={2.167} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M12.9966 3.25V17.3333"
        stroke={color} strokeWidth={2.167} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Re-upload — image frame with upload arrow (exact Figma SVG) */
export function ReuploadIcon({ size = 24, color = '#0C1015' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      {/* Image frame (bottom-left open for arrow) */}
      <Path
        d="M23.8333 13C23.8333 12.4017 23.3483 11.9167 22.75 11.9167C22.1517 11.9167 21.6667 12.4017 21.6667 13H23.8333ZM13 4.33333C13.5983 4.33333 14.0833 3.84831 14.0833 3.25C14.0833 2.65169 13.5983 2.16667 13 2.16667V4.33333ZM21.125 21.6667H4.875V23.8333H21.125V21.6667ZM4.33333 21.125V4.875H2.16667V21.125H4.33333ZM21.6667 13V21.125H23.8333V13H21.6667ZM4.875 4.33333H13V2.16667H4.875V4.33333ZM4.875 21.6667C4.57585 21.6667 4.33333 21.4242 4.33333 21.125H2.16667C2.16667 22.6208 3.37923 23.8333 4.875 23.8333V21.6667ZM21.125 23.8333C22.6208 23.8333 23.8333 22.6208 23.8333 21.125H21.6667C21.6667 21.4242 21.4242 21.6667 21.125 21.6667V23.8333ZM4.33333 4.875C4.33333 4.57585 4.57584 4.33333 4.875 4.33333V2.16667C3.37923 2.16667 2.16667 3.37923 2.16667 4.875H4.33333Z"
        fill={color}
      />
      {/* Mountain landscape */}
      <Path
        d="M8.30957 12.8507C9.06706 12.1563 10.1992 12.095 11.0234 12.6778L11.1846 12.8028L11.1973 12.8146L21.2178 21.6896C21.6657 22.0862 21.7072 22.77 21.3105 23.2179C20.9139 23.6658 20.2301 23.7073 19.7822 23.3106L9.77344 14.4474L3.98242 19.7569C3.54138 20.1612 2.85546 20.1316 2.45117 19.6905C2.04713 19.2496 2.07693 18.5645 2.51758 18.1603L8.30957 12.8507Z"
        fill={color}
      />
      {/* Small mountain */}
      <Path
        d="M16.986 13.4395C17.7483 12.6772 18.9555 12.5917 19.818 13.2383L23.4001 15.9248C23.8786 16.2837 23.9757 16.9628 23.6169 17.4414C23.2579 17.92 22.5789 18.0171 22.1003 17.6582L18.5182 14.9717L15.9323 17.5576C15.5093 17.9804 14.8241 17.9804 14.401 17.5576C13.978 17.1345 13.978 16.4485 14.401 16.0254L16.986 13.4395Z"
        fill={color}
      />
      {/* Upload arrow vertical line */}
      <Path
        d="M20.0417 9.75V3.25"
        stroke={color} strokeWidth={2.167} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Upload arrow head */}
      <Path
        d="M17.3333 5.95833L20.0417 3.25L22.75 5.95833"
        stroke={color} strokeWidth={2.167} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Close circle — circle with X inside */
export function CloseCircleIcon({ size = 24, color = '#999' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.8} fill={`${color}18`} />
      <Line x1={8} y1={8} x2={16} y2={16} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={16} y1={8} x2={8} y2={16} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Album — grid of images */
export function AlbumIcon({ size = 24, color = '#333' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Main frame */}
      <Rect x={2} y={2} width={20} height={20} rx={3} stroke={color} strokeWidth={1.6} />
      {/* Inner grid lines */}
      <Line x1={2} y1={11} x2={22} y2={11} stroke={color} strokeWidth={1.2} />
      <Line x1={12} y1={2} x2={12} y2={22} stroke={color} strokeWidth={1.2} />
      {/* Small image indicators */}
      <Circle cx={7} cy={6.5} r={1.2} fill={color} opacity={0.4} />
      <Circle cx={17} cy={6.5} r={1.2} fill={color} opacity={0.4} />
      <Circle cx={7} cy={16.5} r={1.2} fill={color} opacity={0.4} />
      <Circle cx={17} cy={16.5} r={1.2} fill={color} opacity={0.4} />
    </Svg>
  );
}

/** Camera — classic camera body with lens */
export function CameraIcon({ size = 24, color = '#333' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Camera body */}
      <Rect x={2} y={7} width={20} height={14} rx={3} stroke={color} strokeWidth={1.6} />
      {/* Viewfinder notch */}
      <Path
        d="M8.5 7V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 6v1"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* Lens */}
      <Circle cx={12} cy={14} r={3.5} stroke={color} strokeWidth={1.6} />
      <Circle cx={12} cy={14} r={1.2} fill={color} opacity={0.35} />
    </Svg>
  );
}

/** File picker — folder icon */
export function FilePickerIcon({ size = 24, color = '#333' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Folder body */}
      <Path
        d="M2 7a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293L11 7h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={`${color}0F`}
      />
    </Svg>
  );
}
