import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image as RNImage,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { spacing, typography } from '../../theme';

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
};

export default function ImagePreviewModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const safeIndex = Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0));
  const [currentIndex, setCurrentIndex] = useState(safeIndex);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setScrollEnabled(true);
    setCurrentIndex(safeIndex);
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [safeIndex, visible]);

  const imageHeight = useMemo(() => Math.max(height, 240), [height]);

  const handleMomentumEnd = useEffectEvent((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(Math.min(Math.max(nextIndex, 0), Math.max(images.length - 1, 0)));
  });

  if (!visible || images.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          directionalLockEnabled
          decelerationRate="fast"
          disableIntervalMomentum
          scrollEnabled={scrollEnabled}
          initialScrollIndex={safeIndex}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item, index }) => (
            <View style={[styles.slide, { width, height: imageHeight }]}>
              <ZoomableImage
                uri={item}
                width={width}
                height={imageHeight}
                isActive={index === currentIndex}
                onTap={onClose}
                onZoomStateChange={setScrollEnabled}
              />
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        />

        <View style={styles.topLayer} pointerEvents="box-none">
          <View style={[styles.topBar, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
            <Text style={styles.counter}>
              {currentIndex + 1}/{images.length}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function useEffectEvent<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return React.useCallback(((...args: Parameters<T>) => ref.current(...args)) as T, []);
}

type ZoomableImageProps = {
  uri: string;
  width: number;
  height: number;
  isActive: boolean;
  onTap: () => void;
  onZoomStateChange: (scrollEnabled: boolean) => void;
};

function ZoomableImage({
  uri,
  width,
  height,
  isActive,
  onTap,
  onZoomStateChange,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const scaleOffset = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateXOffset = useSharedValue(0);
  const translateYOffset = useSharedValue(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [contentSize, setContentSize] = useState(() => ({
    width: Math.min(width, 320),
    height: Math.min(height, 320),
  }));

  const notifyZoomStateChange = useEffectEvent((nextScale: number) => {
    setIsZoomed(nextScale > 1.01);
    onZoomStateChange(nextScale <= 1.01);
  });

  useEffect(() => {
    let canceled = false;
    RNImage.getSize(
      uri,
      (imageWidth, imageHeight) => {
        if (canceled || imageWidth <= 0 || imageHeight <= 0) return;
        setContentSize(getContainedImageSize(imageWidth, imageHeight, width, height));
      },
      () => {
        if (canceled) return;
        setContentSize(getContainedImageSize(width, height, width, height));
      }
    );

    return () => {
      canceled = true;
    };
  }, [height, uri, width]);

  useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      scaleOffset.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      translateXOffset.value = 0;
      translateYOffset.value = 0;
      setIsZoomed(false);
      onZoomStateChange(true);
    }
  }, [
    isActive,
    onZoomStateChange,
    scale,
    scaleOffset,
    translateX,
    translateY,
    translateXOffset,
    translateYOffset,
  ]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      scaleOffset.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clampScale(scaleOffset.value * event.scale);
      scale.value = nextScale;
      runOnJS(notifyZoomStateChange)(nextScale);
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        scale.value = withTiming(1);
        scaleOffset.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        translateXOffset.value = 0;
        translateYOffset.value = 0;
        runOnJS(setIsZoomed)(false);
        runOnJS(onZoomStateChange)(true);
        return;
      }

      const nextTranslateX = clampTranslate(translateX.value, scale.value, contentSize.width, width);
      const nextTranslateY = clampTranslate(translateY.value, scale.value, contentSize.height, height);
      translateX.value = withTiming(nextTranslateX);
      translateY.value = withTiming(nextTranslateY);
      translateXOffset.value = nextTranslateX;
      translateYOffset.value = nextTranslateY;
      runOnJS(setIsZoomed)(true);
      runOnJS(onZoomStateChange)(false);
    });

  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .maxPointers(1)
    .onStart(() => {
      translateXOffset.value = translateX.value;
      translateYOffset.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= 1.01) return;
      translateX.value = clampTranslate(
        translateXOffset.value + event.translationX,
        scale.value,
        contentSize.width,
        width
      );
      translateY.value = clampTranslate(
        translateYOffset.value + event.translationY,
        scale.value,
        contentSize.height,
        height
      );
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        translateXOffset.value = 0;
        translateYOffset.value = 0;
        runOnJS(setIsZoomed)(false);
      }
    });

  const tapGesture = Gesture.Tap().onEnd((_event, success) => {
    if (success) {
      runOnJS(onTap)();
    }
  });

  const gesture = Gesture.Exclusive(Gesture.Simultaneous(pinchGesture, panGesture), tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.zoomContainer, { width, height }]}>
        <Animated.View style={[animatedStyle, contentSize]}>
          <ExpoImage
            source={uri}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
            recyclingKey={uri}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function getContainedImageSize(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number
) {
  const widthRatio = containerWidth / imageWidth;
  const heightRatio = containerHeight / imageHeight;
  const fitScale = Math.min(widthRatio, heightRatio, 1);

  return {
    width: Math.max(1, imageWidth * fitScale),
    height: Math.max(1, imageHeight * fitScale),
  };
}

function clampScale(value: number) {
  'worklet';
  return Math.min(Math.max(value, 1), 4);
}

function clampTranslate(
  value: number,
  scale: number,
  contentDimension: number,
  viewportDimension: number
) {
  'worklet';
  const scaledDimension = contentDimension * scale;
  const maxOffset = Math.max(0, (scaledDimension - viewportDimension) / 2);
  return Math.min(Math.max(value, -maxOffset), maxOffset);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  topLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 2,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  counter: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
