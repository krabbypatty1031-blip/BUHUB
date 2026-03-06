import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image as RNImage,
  type ImageResizeMode,
  type ImageStyle,
  type LayoutChangeEvent,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const aspectRatioCache = new Map<string, number>();
const MAX_ASPECT_RATIO_CACHE_SIZE = 600;

type AutoRatioImageProps = {
  uri: string;
  maxHeight?: number;
  minHeight?: number;
  borderRadius?: number;
  backgroundColor?: string;
  resizeMode?: ImageResizeMode;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
};

const DEFAULT_RATIO = 1;

function AutoRatioImage({
  uri,
  maxHeight,
  minHeight,
  borderRadius = 0,
  backgroundColor = 'transparent',
  resizeMode = 'contain',
  style,
  containerStyle,
}: AutoRatioImageProps) {
  const [aspectRatio, setAspectRatio] = useState(() => aspectRatioCache.get(uri) ?? DEFAULT_RATIO);
  const [containerWidth, setContainerWidth] = useState(0);
  const contentFit = useMemo(() => {
    switch (resizeMode) {
      case 'cover':
        return 'cover' as const;
      case 'stretch':
        return 'fill' as const;
      case 'center':
        return 'none' as const;
      case 'repeat':
        return 'contain' as const;
      case 'contain':
      default:
        return 'contain' as const;
    }
  }, [resizeMode]);

  useEffect(() => {
    let cancelled = false;
    if (!uri) {
      setAspectRatio(DEFAULT_RATIO);
      return;
    }

    const cached = aspectRatioCache.get(uri);
    if (cached && Number.isFinite(cached) && cached > 0) {
      setAspectRatio((prev) => (Math.abs(prev - cached) > 0.001 ? cached : prev));
      return;
    }

    RNImage.getSize(
      uri,
      (width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        const nextRatio = width / height;
        if (!aspectRatioCache.has(uri) && aspectRatioCache.size >= MAX_ASPECT_RATIO_CACHE_SIZE) {
          const firstKey = aspectRatioCache.keys().next().value;
          if (firstKey) {
            aspectRatioCache.delete(firstKey);
          }
        }
        aspectRatioCache.set(uri, nextRatio);
        setAspectRatio((prev) => (Math.abs(prev - nextRatio) > 0.001 ? nextRatio : prev));
      },
      () => {
        if (cancelled) return;
        setAspectRatio((prev) => (Math.abs(prev - DEFAULT_RATIO) > 0.001 ? DEFAULT_RATIO : prev));
      }
    );

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setContainerWidth((prev) => (Math.abs(prev - nextWidth) > 0.5 ? nextWidth : prev));
  }, []);

  const computedHeight = useMemo(() => {
    const fallbackHeight = minHeight ?? 200;
    if (!containerWidth) return fallbackHeight;
    const rawHeight = containerWidth / Math.max(aspectRatio, 0.01);
    let nextHeight = rawHeight;
    if (typeof minHeight === 'number') {
      nextHeight = Math.max(nextHeight, minHeight);
    }
    if (typeof maxHeight === 'number') {
      nextHeight = Math.min(nextHeight, maxHeight);
    }
    return nextHeight;
  }, [aspectRatio, containerWidth, maxHeight, minHeight]);

  return (
    <View onLayout={handleLayout} style={containerStyle}>
      <ExpoImage
        source={uri}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={uri}
        style={[
          styles.image,
          {
            height: computedHeight,
            borderRadius,
            backgroundColor,
          },
          style,
        ]}
      />
    </View>
  );
}

function arePropsEqual(prev: AutoRatioImageProps, next: AutoRatioImageProps) {
  return (
    prev.uri === next.uri &&
    prev.maxHeight === next.maxHeight &&
    prev.minHeight === next.minHeight &&
    prev.borderRadius === next.borderRadius &&
    prev.backgroundColor === next.backgroundColor &&
    prev.resizeMode === next.resizeMode &&
    prev.style === next.style &&
    prev.containerStyle === next.containerStyle
  );
}

export default React.memo(AutoRatioImage, arePropsEqual);

const styles = StyleSheet.create({
  image: {
    width: '100%',
  },
});
