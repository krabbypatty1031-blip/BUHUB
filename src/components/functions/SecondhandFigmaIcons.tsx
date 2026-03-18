import React from 'react';
import Svg, { Path, G, Circle as SvgCircle } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** Figma 图标/线/搜索 — 26x26 magnifying glass */
export const FigmaSearchIcon26 = ({ size = 30, color = '#0C1015' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
    <Path
      d="M11.375 20.5833C16.4616 20.5833 20.5833 16.4616 20.5833 11.375C20.5833 6.28845 16.4616 2.16667 11.375 2.16667C6.28845 2.16667 2.16667 6.28845 2.16667 11.375C2.16667 16.4616 6.28845 20.5833 11.375 20.5833Z"
      stroke={color}
      strokeWidth={2.16667}
      strokeLinejoin="round"
    />
    <Path
      d="M14.4391 7.76834C13.6549 6.98417 12.5716 6.49917 11.375 6.49917C10.1784 6.49917 9.09502 6.98417 8.31085 7.76834"
      stroke={color}
      strokeWidth={2.16667}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17.995 17.995L22.5798 22.5798"
      stroke={color}
      strokeWidth={2.16667}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Figma 图标/线/购物车 — 26x26 shopping cart */
export const FigmaCartIcon = ({ size = 26, color = '#0C1015' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 26 26" fill="none">
    <Path
      d="M3.25 3.25L5.41667 3.25L6.5 8.66667"
      stroke={color}
      strokeWidth={2.16667}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 8.66667H22.75L20.5833 17.3333H8.66667L6.5 8.66667Z"
      stroke={color}
      strokeWidth={2.16667}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <SvgCircle cx="9.75" cy="21.6667" r="1.625" stroke={color} strokeWidth={2.16667} />
    <SvgCircle cx="19.5" cy="21.6667" r="1.625" stroke={color} strokeWidth={2.16667} />
  </Svg>
);

/** Figma translate icon — 20x20 filled path */
export const FigmaTranslateIcon = ({ size = 20, color = '#86909C' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M12.0677 2.71118C13.0267 2.71118 13.9465 3.09207 14.6247 3.77009C15.3029 4.4481 15.6841 5.36773 15.6844 6.32674V7.32563C15.6844 7.40735 15.6683 7.48827 15.6371 7.56377C15.6058 7.63928 15.56 7.70788 15.5022 7.76568C15.4444 7.82347 15.3758 7.86931 15.3003 7.90058C15.2248 7.93186 15.1439 7.94796 15.0622 7.94796C14.9805 7.94796 14.8995 7.93186 14.824 7.90058C14.7485 7.86931 14.6799 7.82347 14.6222 7.76568C14.5644 7.70788 14.5185 7.63928 14.4873 7.56377C14.456 7.48827 14.4399 7.40735 14.44 7.32563V6.32674C14.4397 5.69778 14.1896 5.09468 13.7448 4.65004C13.2999 4.2054 12.6967 3.95563 12.0677 3.95563H5.88996C4.58996 3.95563 3.53218 5.00229 3.51773 6.30007L3.43218 13.7856C3.4285 14.0995 3.48715 14.4109 3.60472 14.702C3.72229 14.993 3.89644 15.2578 4.11709 15.481C4.33774 15.7043 4.60049 15.8815 4.89013 16.0024C5.17976 16.1234 5.49052 16.1856 5.8044 16.1856H12.4111C12.5761 16.1856 12.7344 16.2512 12.851 16.3679C12.9677 16.4846 13.0333 16.6428 13.0333 16.8078C13.0333 16.9729 12.9677 17.1311 12.851 17.2478C12.7344 17.3645 12.5761 17.4301 12.4111 17.4301H5.8044C5.32597 17.4301 4.8523 17.3352 4.4108 17.1509C3.9693 16.9666 3.56877 16.6965 3.23239 16.3563C2.896 16.0161 2.63046 15.6125 2.45115 15.169C2.27183 14.7254 2.1823 14.2507 2.18773 13.7723L2.27329 6.28563C2.2844 5.33376 2.67034 4.42466 3.3474 3.75551C4.02445 3.08636 4.93803 2.71112 5.88996 2.71118H12.0677ZM15.52 9.18896C15.5553 9.18896 15.5892 9.20301 15.6142 9.22801C15.6392 9.25302 15.6533 9.28693 15.6533 9.32229V10.8801H17.93C18.1522 10.8801 18.3311 11.059 18.3311 11.2812V14.2256C18.3311 14.449 18.1522 14.629 17.93 14.629H15.6522V17.1734C15.6522 17.2088 15.6381 17.2427 15.6131 17.2677C15.5881 17.2927 15.5542 17.3067 15.5188 17.3067H14.5822C14.5468 17.3067 14.5129 17.2927 14.4879 17.2677C14.4629 17.2427 14.4488 17.2088 14.4488 17.1734V14.629H12.1722C12.1194 14.629 12.0672 14.6185 12.0184 14.5983C11.9697 14.5781 11.9254 14.5484 11.8882 14.5111C11.8509 14.4737 11.8214 14.4294 11.8013 14.3806C11.7812 14.3318 11.7709 14.2795 11.7711 14.2267V11.2823C11.7711 11.059 11.9488 10.8801 12.1722 10.8801H14.4488V9.3234C14.4488 9.28804 14.4629 9.25413 14.4879 9.22912C14.5129 9.20412 14.5468 9.19007 14.5822 9.19007H15.52V9.18896ZM12.9755 12.0845V13.4234H14.4488V12.0845H12.9755ZM15.6533 12.0845V13.4234H17.1266V12.0845H15.6533ZM9.19773 6.32896C9.22559 6.3294 9.2527 6.33807 9.27564 6.35389C9.29857 6.36971 9.31631 6.39196 9.32662 6.41785L10.9377 11.0812H7.65329L7.1044 12.6645C7.09474 12.6904 7.07747 12.7127 7.05486 12.7286C7.03225 12.7445 7.00536 12.7531 6.97773 12.7534H6.05551C6.03423 12.7535 6.01324 12.7485 5.99429 12.7388C5.97534 12.7291 5.95898 12.7151 5.94658 12.6978C5.93418 12.6805 5.9261 12.6605 5.92302 12.6394C5.91993 12.6183 5.92193 12.5969 5.92884 12.5767L8.05662 6.41785C8.06628 6.39197 8.08355 6.36962 8.10616 6.35375C8.12878 6.33788 8.15567 6.32924 8.18329 6.32896H9.19662H9.19773ZM7.97551 10.1434H9.40662L8.69107 8.07229L7.97551 10.1434Z"
      fill={color}
    />
  </Svg>
);

/** Figma 图标/面/目录 — 3 dots, 20x20 */
export const FigmaMoreDotsIcon = ({ size = 20, color = '#86909C' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <SvgCircle cx={5} cy={10} r={1.25} fill={color} />
    <SvgCircle cx={10} cy={10} r={1.25} fill={color} />
    <SvgCircle cx={15} cy={10} r={1.25} fill={color} />
  </Svg>
);

/** Figma FAB plus — ~17.5x17.5, filled white */
export const FigmaFabPlusIcon = ({ size = 17.5, color = '#FFFFFF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 17.4609 17.4609" fill="none">
    <Path
      d="M17.4609 9.96094H9.96094V17.4609H7.5V9.96094H0V7.5H7.5V0H9.96094V7.5H17.4609V9.96094Z"
      fill={color}
    />
  </Svg>
);

/** Figma 图标/线/注意 — info/warning circle, 12x12 */
export const FigmaInfoIcon = ({ size = 12, color = '#0C1015' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <SvgCircle cx={6} cy={6} r={5} stroke={color} strokeWidth={1} />
    <Path d="M6 5.5V8.5" stroke={color} strokeWidth={1} strokeLinecap="round" />
    <SvgCircle cx={6} cy={3.75} r={0.5} fill={color} />
  </Svg>
);

/** Figma verified badge — 8x8 pink circle with checkmark */
export const FigmaVerifiedBadge = ({ size = 8, color = '#E91E8C' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 8 8" fill="none">
    <SvgCircle cx={4} cy={4} r={4} fill={color} />
    <Path
      d="M2.5 4L3.5 5L5.5 3"
      stroke="#FFFFFF"
      strokeWidth={0.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
