import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  type ImageResizeMode,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme';
import AutoRatioImage from './AutoRatioImage';

type PostImageGalleryProps = {
  images: string[];
  onImagePress?: (index: number) => void;
  borderRadiusValue?: number;
  backgroundColor?: string;
  minHeight?: number;
  maxHeight?: number;
  resizeMode?: ImageResizeMode;
};

function PostImageGallery({
  images,
  onImagePress,
  borderRadiusValue = borderRadius.sm,
  backgroundColor = colors.surface2,
  minHeight,
  maxHeight,
  resizeMode = 'contain',
}: PostImageGalleryProps) {
  const windowWidth = useWindowDimensions().width;
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const imagesKey = useMemo(() => images.join('|'), [images]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [imagesKey]);

  const pageWidth = containerWidth > 0 ? containerWidth : Math.max(windowWidth - spacing.xl, 1);
  const safeCurrentIndex = useMemo(
    () => Math.min(Math.max(currentIndex, 0), Math.max(images.length - 1, 0)),
    [currentIndex, images.length]
  );

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    const nextWidth = event.nativeEvent.layout.width;
    setContainerWidth((prev) => (Math.abs(prev - nextWidth) > 0.5 ? nextWidth : prev));
  }, []);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      setCurrentIndex(Math.min(Math.max(nextIndex, 0), Math.max(images.length - 1, 0)));
    },
    [images.length, pageWidth]
  );

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <View onLayout={handleLayout}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress?.(0)}>
          <AutoRatioImage
            uri={images[0]}
            minHeight={minHeight}
            maxHeight={maxHeight}
            borderRadius={borderRadiusValue}
            backgroundColor={backgroundColor}
            resizeMode={resizeMode}
          />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View onLayout={handleLayout} style={styles.wrap}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        directionalLockEnabled
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        removeClippedSubviews={false}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item, index }) => (
          <View style={{ width: pageWidth }}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress?.(index)}>
              <AutoRatioImage
                uri={item}
                minHeight={minHeight}
                maxHeight={maxHeight}
                borderRadius={borderRadiusValue}
                backgroundColor={backgroundColor}
                resizeMode={resizeMode}
              />
            </TouchableOpacity>
          </View>
        )}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
      />
      <View style={styles.imageCountBadge}>
        <Text style={styles.imageCountBadgeText}>{`${safeCurrentIndex + 1}/${images.length}`}</Text>
      </View>
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
  wrap: {
    position: 'relative',
  },
  imageCountBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  imageCountBadgeText: {
    ...typography.labelSmall,
    color: colors.white,
    fontWeight: '700',
  },
});
