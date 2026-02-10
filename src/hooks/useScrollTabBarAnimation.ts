import { useRef, useCallback } from 'react';
import { type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import { useTabBarAnimation } from './TabBarAnimationContext';

const TAB_BAR_HEIGHT = 80;
const SCROLL_THRESHOLD = 10;

export function useScrollTabBarAnimation() {
  const { tabBarTranslateY } = useTabBarAnimation();
  const lastOffsetY = useRef(0);
  const isTabBarVisible = useRef(true);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;

      // Always show tab bar at top (iOS bounce / pull-to-refresh)
      if (offsetY <= 0) {
        if (!isTabBarVisible.current) {
          tabBarTranslateY.value = withTiming(0, { duration: 250 });
          isTabBarVisible.current = true;
        }
        lastOffsetY.current = offsetY;
        return;
      }

      const delta = offsetY - lastOffsetY.current;

      if (delta > SCROLL_THRESHOLD && isTabBarVisible.current) {
        // Scrolling down → hide
        tabBarTranslateY.value = withTiming(TAB_BAR_HEIGHT, { duration: 250 });
        isTabBarVisible.current = false;
      } else if (delta < -SCROLL_THRESHOLD && !isTabBarVisible.current) {
        // Scrolling up → show
        tabBarTranslateY.value = withTiming(0, { duration: 250 });
        isTabBarVisible.current = true;
      }

      lastOffsetY.current = offsetY;
    },
    [tabBarTranslateY]
  );

  const show = useCallback(() => {
    tabBarTranslateY.value = withTiming(0, { duration: 250 });
    isTabBarVisible.current = true;
  }, [tabBarTranslateY]);

  return { onScroll, show };
}
