import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image as RNImage,
  type ImageResizeMode,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { spacing, borderRadius, colors } from '../../theme';

/* ── Shared aspect-ratio cache (also used by AutoRatioImage) ── */
const ratioCache = new Map<string, number>();

function useImageRatios(images: string[]) {
  const [ratios, setRatios] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    images.forEach((uri, i) => {
      const cached = ratioCache.get(uri);
      if (cached) initial[i] = cached;
    });
    return initial;
  });

  useEffect(() => {
    let cancelled = false;
    images.forEach((uri, i) => {
      if (ratioCache.has(uri)) {
        setRatios((prev) => {
          const cached = ratioCache.get(uri)!;
          return prev[i] === cached ? prev : { ...prev, [i]: cached };
        });
        return;
      }
      RNImage.getSize(
        uri,
        (w, h) => {
          if (cancelled || w <= 0 || h <= 0) return;
          const ratio = w / h;
          ratioCache.set(uri, ratio);
          setRatios((prev) => ({ ...prev, [i]: ratio }));
        },
        () => {},
      );
    });
    return () => { cancelled = true; };
  }, [images]);

  return ratios;
}


type PostImageGalleryProps = {
  images: string[];
  onImagePress?: (index: number) => void;
  borderRadiusValue?: number;
  backgroundColor?: string;
  minHeight?: number;
  maxHeight?: number;
  resizeMode?: ImageResizeMode;
};

export const DEFAULT_RATIO = 4 / 3;
export const GALLERY_MIN_HEIGHT = 120;

function PostImageGallery({
  images,
  onImagePress,
  borderRadiusValue = borderRadius.sm,
  backgroundColor = colors.surface2,
  minHeight,
  maxHeight,
  resizeMode = 'cover',
}: PostImageGalleryProps) {
  const windowWidth = useWindowDimensions().width;
  const [containerWidth, setContainerWidth] = useState(0);
  const ratios = useImageRatios(images);

  const pageWidth = containerWidth > 0 ? containerWidth : Math.max(windowWidth - spacing.xl, 1);
  const effectiveMin = minHeight ?? GALLERY_MIN_HEIGHT;

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    const nextWidth = event.nativeEvent.layout.width;
    setContainerWidth((prev) => (Math.abs(prev - nextWidth) > 0.5 ? nextWidth : prev));
  }, []);

  if (images.length === 0) {
    return null;
  }

  // Single image: 70% width, max height 300, fixed DEFAULT_RATIO height
  if (images.length === 1) {
    const singleMaxH = maxHeight ?? 300;
    const singleWidth = pageWidth * 0.7;
    const rawHeight = singleWidth / DEFAULT_RATIO;
    const singleHeight = Math.min(Math.max(rawHeight, effectiveMin), singleMaxH);

    return (
      <View onLayout={handleLayout}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress?.(0)} style={{ alignSelf: 'flex-start' }}>
          <ExpoImage
            source={images[0]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            recyclingKey={images[0]}
            style={{
              width: singleWidth,
              height: singleHeight,
              borderRadius: borderRadiusValue ?? 14,
              backgroundColor,
            }}
          />
        </TouchableOpacity>
      </View>
    );
  }

  // 2 images: side by side, fixed height 150
  if (images.length === 2) {
    const halfWidth = (pageWidth - 3) / 2;
    return (
      <View onLayout={handleLayout} style={styles.twoImageRow}>
        {images.map((uri, index) => (
          <TouchableOpacity key={uri} activeOpacity={0.9} onPress={() => onImagePress?.(index)}>
            <ExpoImage
              source={uri}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={uri}
              style={{
                width: halfWidth,
                height: 150,
                borderRadius: borderRadiusValue ?? 14,
                backgroundColor,
              }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // 3+ images: horizontal scroll thumbnails (130x130 squares)
  const thumbSize = 130;
  return (
    <View onLayout={handleLayout}>
      <FlatList
        data={images}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item}-${index}`}
        contentContainerStyle={styles.thumbScrollContent}
        renderItem={({ item, index }) => (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress?.(index)}>
            <ExpoImage
              source={item}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={item}
              style={{
                width: thumbSize,
                height: thumbSize,
                borderRadius: borderRadiusValue ?? 14,
                backgroundColor,
              }}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function arePropsEqual(prev: PostImageGalleryProps, next: PostImageGalleryProps) {
  if (prev.onImagePress !== next.onImagePress) return false;
  if (prev.borderRadiusValue !== next.borderRadiusValue) return false;
  if (prev.backgroundColor !== next.backgroundColor) return false;
  if (prev.minHeight !== next.minHeight) return false;
  if (prev.maxHeight !== next.maxHeight) return false;
  if (prev.resizeMode !== next.resizeMode) return false;
  if (prev.images.length !== next.images.length) return false;

  for (let i = 0; i < prev.images.length; i += 1) {
    if (prev.images[i] !== next.images[i]) return false;
  }

  return true;
}

export default React.memo(PostImageGallery, arePropsEqual);

const styles = StyleSheet.create({
  twoImageRow: {
    flexDirection: 'row',
    gap: 3,
  },
  thumbScrollContent: {
    gap: 6,
  },
});
