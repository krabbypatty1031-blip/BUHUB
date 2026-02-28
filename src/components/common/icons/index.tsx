import React from 'react';
import Svg, {
  Path,
  Circle,
  Line,
  Polyline,
  Polygon,
  Rect,
} from 'react-native-svg';
import { colors } from '../../../theme';

export interface IconProps {
  size?: number;
  color?: string;
  fill?: string;
}

const D = { size: 24, color: colors.onSurface };

export const CheckIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polyline points="20,6 9,17 4,12" />
  </Svg>
);

export const BackIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

export const CloseIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Line x1={18} y1={6} x2={6} y2={18} />
    <Line x1={6} y1={6} x2={18} y2={18} />
  </Svg>
);

export const SearchIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={10} cy={10} r={9} />
    <Line x1={17} y1={17} x2={21} y2={21} />
  </Svg>
);

export const HomeIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

export const GridIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={3} y={3} width={7} height={7} />
    <Rect x={14} y={3} width={7} height={7} />
    <Rect x={14} y={14} width={7} height={7} />
    <Rect x={3} y={14} width={7} height={7} />
  </Svg>
);

export const MessageIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>
);

export const UserIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx={12} cy={7} r={4} />
  </Svg>
);

export const PlusIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round">
    <Line x1={12} y1={4} x2={12} y2={20} />
    <Line x1={4} y1={12} x2={20} y2={12} />
  </Svg>
);

export const TabHomeIcon = ({ size = D.size, color = D.color, fill }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {fill ? (
      <>
        <Path d="M2.5 10.8L12 3l9.5 7.8V20a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 20V10.8z" fill={fill} />
        <Path d="M9 22.5v-5.25a3 3 0 0 1 6 0V22.5" stroke={colors.surface} strokeWidth={2.2} />
      </>
    ) : (
      <>
        <Path d="M2.5 10.8L12 3l9.5 7.8V20a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 20V10.8z" stroke={color} strokeWidth={2} />
        <Path d="M9 22.5v-5.25a3 3 0 0 1 6 0V22.5" stroke={color} strokeWidth={2} />
      </>
    )}
  </Svg>
);

export const TabCompassIcon = ({ size = D.size, color = D.color, fill }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10} fill={fill || 'none'} stroke={fill ? 'none' : color} strokeWidth={2} />
    <Polygon
      points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88"
      fill={fill ? colors.surface : 'none'}
      stroke={fill ? 'none' : color}
      strokeWidth={2}
    />
  </Svg>
);

export const TabChatIcon = ({ size = D.size, color = D.color, fill }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {fill ? (
      <Path
        d="M12 2C6.477 2 2 5.813 2 10.5c0 2.614 1.384 4.957 3.562 6.563C5.36 18.2 4.5 20.5 2.5 22c0 0 3.5 0 6.5-2.05.98.2 2 .3 3 .3 5.523 0 10-3.813 10-8.5S17.523 2 12 2z"
        fill={fill}
      />
    ) : (
      <>
        <Path
          d="M12 2C6.477 2 2 5.813 2 10.5c0 2.614 1.384 4.957 3.562 6.563C5.36 18.2 4.5 20.5 2.5 22c0 0 3.5 0 6.5-2.05.98.2 2 .3 3 .3 5.523 0 10-3.813 10-8.5S17.523 2 12 2z"
          stroke={color}
          strokeWidth={2}
        />
        <Circle cx={8} cy={10.5} r={1} fill={color} stroke="none" />
        <Circle cx={12} cy={10.5} r={1} fill={color} stroke="none" />
        <Circle cx={16} cy={10.5} r={1} fill={color} stroke="none" />
      </>
    )}
  </Svg>
);

export const TabProfileIcon = ({ size = D.size, color = D.color, fill }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {fill ? (
      <>
        <Circle cx={12} cy={8} r={4.5} fill={fill} />
        <Path d="M3.5 21.5a8.5 8.5 0 0 1 17 0" fill={fill} />
      </>
    ) : (
      <>
        <Circle cx={12} cy={8} r={4.5} stroke={color} strokeWidth={2} />
        <Path d="M3.5 21.5a8.5 8.5 0 0 1 17 0" stroke={color} strokeWidth={2} />
      </>
    )}
  </Svg>
);

export const HeartIcon = ({ size = D.size, color = D.color, fill }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'} stroke={fill ? 'none' : color} strokeWidth={2}>
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Svg>
);

export const CommentIcon = ({ size = D.size, color = D.color, fill }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'} stroke={fill ? 'none' : color} strokeWidth={2}>
    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    {fill && <Circle cx={9.5} cy={10.5} r={1.2} fill="#000000" />}
    {fill && <Circle cx={14.5} cy={10.5} r={1.2} fill="#000000" />}
  </Svg>
);

export const ForwardIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17 1l4 4-4 4" />
    <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <Path d="M7 23l-4-4 4-4" />
    <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Svg>
);

export const RepostIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 3l5 5-5 5" />
    <Path d="M20 8H9a5 5 0 0 0-5 5v5" />
  </Svg>
);

export const ShareIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <Polyline points="16 6 12 2 8 6" />
    <Line x1={12} y1={2} x2={12} y2={15} />
  </Svg>
);

export const BookmarkIcon = ({ size = D.size, color = D.color, fill }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'} stroke={fill ? 'none' : color} strokeWidth={2}>
    <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Svg>
);

export const QuoteIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
    <Path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
  </Svg>
);

export const TranslateIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M5 8l6 6" />
    <Path d="M4 14l6-6 2-3" />
    <Path d="M2 5h12" />
    <Path d="M7 2h1" />
    <Path d="M22 22l-5-10-5 10" />
    <Path d="M14 18h6" />
  </Svg>
);

export const MaleIcon = ({ size = D.size, color = colors.genderMale }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={10} cy={14} r={5} />
    <Line x1={19} y1={5} x2={13.6} y2={10.4} />
    <Line x1={19} y1={5} x2={14} y2={5} />
    <Line x1={19} y1={5} x2={19} y2={10} />
  </Svg>
);

export const FemaleIcon = ({ size = D.size, color = colors.genderFemale }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={8} r={5} />
    <Line x1={12} y1={13} x2={12} y2={21} />
    <Line x1={9} y1={18} x2={15} y2={18} />
  </Svg>
);

export const CameraIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <Circle cx={12} cy={13} r={4} />
  </Svg>
);

export const ChevronRightIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);

export const ChevronDownIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polyline points="6 9 12 15 18 9" />
  </Svg>
);

export const ChevronUpIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polyline points="18 15 12 9 6 15" />
  </Svg>
);

export const SettingsIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={3} />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

export const StarIcon = ({ size = D.size, color = D.color, fill }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'} stroke={fill ? 'none' : color} strokeWidth={2}>
    <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
);

export const ClockIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={10} />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);

export const MapPinIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Circle cx={12} cy={10} r={3} />
  </Svg>
);

export const DollarIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Line x1={12} y1={1} x2={12} y2={23} />
    <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Svg>
);

export const PackageIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Line x1={16.5} y1={9.4} x2={7.5} y2={4.21} />
    <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <Polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <Line x1={12} y1={22.08} x2={12} y2={12} />
  </Svg>
);

export const UsersIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <Circle cx={9} cy={7} r={4} />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

export const AlertTriangleIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <Line x1={12} y1={9} x2={12} y2={13} />
    <Line x1={12} y1={17} x2={12.01} y2={17} />
  </Svg>
);

export const SendIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Line x1={22} y1={2} x2={11} y2={13} />
    <Polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Svg>
);

export const ImageIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
    <Circle cx={8.5} cy={8.5} r={1.5} />
    <Polyline points="21 15 16 10 5 21" />
  </Svg>
);

export const MoreHorizontalIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={1} />
    <Circle cx={19} cy={12} r={1} />
    <Circle cx={5} cy={12} r={1} />
  </Svg>
);

export const EditIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Svg>
);

export const HelpCircleIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10} />
    <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <Circle cx={12} cy={17} r={0.5} fill={color} />
  </Svg>
);

export const LogOutIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1={21} y1={12} x2={9} y2={12} />
  </Svg>
);

export const PinIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M12 2v7" />
    <Path d="M6 9h12l-1 7H7l-1-7z" />
    <Path d="M12 16v6" />
  </Svg>
);

export const VolumeXIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <Line x1={23} y1={9} x2={17} y2={15} />
    <Line x1={17} y1={9} x2={23} y2={15} />
  </Svg>
);

export const BarChartIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Line x1={12} y1={20} x2={12} y2={10} />
    <Line x1={18} y1={20} x2={18} y2={4} />
    <Line x1={6} y1={20} x2={6} y2={16} />
  </Svg>
);

export const MicIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <Line x1={12} y1={19} x2={12} y2={23} />
    <Line x1={8} y1={23} x2={16} y2={23} />
  </Svg>
);

export const KeyboardIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={2} y={6} width={20} height={12} rx={2} ry={2} />
    <Line x1={5} y1={10} x2={7} y2={10} />
    <Line x1={9} y1={10} x2={11} y2={10} />
    <Line x1={13} y1={10} x2={15} y2={10} />
    <Line x1={17} y1={10} x2={19} y2={10} />
    <Line x1={6} y1={14} x2={18} y2={14} />
  </Svg>
);

export const IncognitoIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={7} cy={15} r={3} />
    <Circle cx={17} cy={15} r={3} />
    <Path d="M10 15h4" />
    <Path d="M2 11h20" />
    <Path d="M5 11c0-3 1.5-7 7-7s7 4 7 7" />
  </Svg>
);

export const LockIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export const LinkIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Svg>
);

export const ShoppingBagIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <Line x1={3} y1={6} x2={21} y2={6} />
    <Path d="M16 10a4 4 0 0 1-8 0" />
  </Svg>
);

export const ShoppingCartIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={9} cy={20} r={1.5} />
    <Circle cx={18} cy={20} r={1.5} />
    <Path d="M3 4h2l2.4 10.2a1 1 0 0 0 .98.8h9.82a1 1 0 0 0 .97-.76L21 8H7.2" />
  </Svg>
);

export const TruckIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={1} y={3} width={15} height={13} />
    <Polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <Circle cx={5.5} cy={18.5} r={2.5} />
    <Circle cx={18.5} cy={18.5} r={2.5} />
  </Svg>
);

export const CoffeeIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <Path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <Line x1={6} y1={1} x2={6} y2={4} />
    <Line x1={10} y1={1} x2={10} y2={4} />
    <Line x1={14} y1={1} x2={14} y2={4} />
  </Svg>
);

export const AtIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={4} />
    <Path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
  </Svg>
);

export const QrCodeIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={3} y={3} width={7} height={7} />
    <Rect x={14} y={3} width={7} height={7} />
    <Rect x={3} y={14} width={7} height={7} />
    <Rect x={14} y={14} width={3} height={3} />
    <Line x1={21} y1={14} x2={21} y2={17} />
    <Line x1={14} y1={21} x2={17} y2={21} />
    <Line x1={21} y1={21} x2={21} y2={21.01} />
  </Svg>
);

export const DownloadIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Polyline points="7 10 12 15 17 10" />
    <Line x1={12} y1={15} x2={12} y2={3} />
  </Svg>
);

export const CalendarIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
    <Line x1={16} y1={2} x2={16} y2={6} />
    <Line x1={8} y1={2} x2={8} y2={6} />
    <Line x1={3} y1={10} x2={21} y2={10} />
  </Svg>
);

export const TrashIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
);

export const ScanIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M2 7V2h5" />
    <Path d="M17 2h5v5" />
    <Path d="M22 17v5h-5" />
    <Path d="M7 22H2v-5" />
    <Line x1={5} y1={12} x2={19} y2={12} />
  </Svg>
);

export const EyeIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <Circle cx={12} cy={12} r={3} />
  </Svg>
);

export const EyeOffIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <Path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <Line x1={1} y1={1} x2={23} y2={23} />
  </Svg>
);

export const RefreshIcon = ({ size = D.size, color = D.color }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 4v6h-6" />
    <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </Svg>
);

export const iconMap = {
  check: CheckIcon,
  back: BackIcon,
  close: CloseIcon,
  search: SearchIcon,
  home: HomeIcon,
  grid: GridIcon,
  message: MessageIcon,
  user: UserIcon,
  plus: PlusIcon,
  heart: HeartIcon,
  comment: CommentIcon,
  forward: ForwardIcon,
  repost: RepostIcon,
  share: ShareIcon,
  bookmark: BookmarkIcon,
  quote: QuoteIcon,
  translate: TranslateIcon,
  male: MaleIcon,
  female: FemaleIcon,
  camera: CameraIcon,
  chevronRight: ChevronRightIcon,
  chevronDown: ChevronDownIcon,
  chevronUp: ChevronUpIcon,
  settings: SettingsIcon,
  star: StarIcon,
  clock: ClockIcon,
  mapPin: MapPinIcon,
  dollar: DollarIcon,
  package: PackageIcon,
  users: UsersIcon,
  alertTriangle: AlertTriangleIcon,
  send: SendIcon,
  image: ImageIcon,
  moreHorizontal: MoreHorizontalIcon,
  edit: EditIcon,
  helpCircle: HelpCircleIcon,
  logOut: LogOutIcon,
  pin: PinIcon,
  volumeX: VolumeXIcon,
  barChart: BarChartIcon,
  mic: MicIcon,
  keyboard: KeyboardIcon,
  lock: LockIcon,
  link: LinkIcon,
  shoppingBag: ShoppingBagIcon,
  shoppingCart: ShoppingCartIcon,
  truck: TruckIcon,
  coffee: CoffeeIcon,
  at: AtIcon,
  qrCode: QrCodeIcon,
  download: DownloadIcon,
  calendar: CalendarIcon,
  scan: ScanIcon,
  trash: TrashIcon,
  eye: EyeIcon,
  eyeOff: EyeOffIcon,
  tabHome: TabHomeIcon,
  tabCompass: TabCompassIcon,
  tabChat: TabChatIcon,
  tabProfile: TabProfileIcon,
} as const;

export type IconName = keyof typeof iconMap;
