import React from 'react';
import {
  FlatList,
  type ImageResizeMode,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { borderRadius, colors } from '../../theme';

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

// Reserved upper bound: when single-image width is large enough that
// (width / DEFAULT_RATIO) would exceed this, the layout used to clamp height.
// Express the same cap as a maxWidth on the outer wrapper so aspectRatio still
// resolves cleanly without a height clamp racing the measured width.
const SINGLE_DEFAULT_MAX_HEIGHT = 300;

function PostImageGallery({
  images,
  onImagePress,
  borderRadiusValue = borderRadius.sm,
  backgroundColor = colors.surface2,
  minHeight,
  maxHeight,
}: PostImageGalleryProps) {
  if (images.length === 0) {
    return null;
  }

  const radius = borderRadiusValue ?? 14;
  const effectiveMin = minHeight ?? GALLERY_MIN_HEIGHT;

  // Single image: 70% of available width, locked to DEFAULT_RATIO via the
  // CSS-style `aspectRatio` prop so the row's height is computed in the same
  // layout pass as its width — no useState(0) → onLayout → re-render shake.
  if (images.length === 1) {
    const cap = maxHeight ?? SINGLE_DEFAULT_MAX_HEIGHT;
    const maxWrapperWidth = cap * DEFAULT_RATIO;
    return (
      <View style={{ width: '70%', maxWidth: maxWrapperWidth, alignSelf: 'flex-start' }}>
        <View style={{ aspectRatio: DEFAULT_RATIO, minHeight: effectiveMin }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress?.(0)}
            style={StyleSheet.absoluteFill}
          >
            <ExpoImage
              source={images[0]}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={images[0]}
              style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor }]}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2 images: each takes equal share of the row via flex:1 — no width math.
  if (images.length === 2) {
    return (
      <View style={styles.twoImageRow}>
        {images.map((uri, index) => (
          <TouchableOpacity
            key={uri}
            activeOpacity={0.9}
            onPress={() => onImagePress?.(index)}
            style={styles.twoImageCell}
          >
            <ExpoImage
              source={uri}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={uri}
              style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor }]}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // 3+ images: fixed-size thumbnails in a horizontal scroll. Sizes are
  // independent of the parent container width, so no measurement is needed.
  const thumbSize = 130;
  return (
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
              borderRadius: radius,
              backgroundColor,
            }}
          />
        </TouchableOpacity>
      )}
    />
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
  twoImageCell: {
    flex: 1,
    height: 150,
  },
  thumbScrollContent: {
    gap: 6,
  },
});

