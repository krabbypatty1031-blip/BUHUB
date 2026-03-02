import React, { createContext, useContext, useEffect } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

interface TabBarAnimationContextType {
  tabBarTranslateY: SharedValue<number>;
}

const TabBarAnimationContext = createContext<TabBarAnimationContextType | null>(null);
const TAB_BAR_ANIM_DURATION = 250;
let globalTabBarTranslateY: SharedValue<number> | null = null;

export function showTabBar() {
  if (!globalTabBarTranslateY) return;
  globalTabBarTranslateY.value = withTiming(0, { duration: TAB_BAR_ANIM_DURATION });
}

export function hideTabBar(offset: number) {
  if (!globalTabBarTranslateY) return;
  globalTabBarTranslateY.value = withTiming(offset, { duration: TAB_BAR_ANIM_DURATION });
}

export function TabBarAnimationProvider({ children }: { children: React.ReactNode }) {
  const tabBarTranslateY = useSharedValue(0);

  useEffect(() => {
    globalTabBarTranslateY = tabBarTranslateY;
    return () => {
      if (globalTabBarTranslateY === tabBarTranslateY) {
        globalTabBarTranslateY = null;
      }
    };
  }, [tabBarTranslateY]);

  return (
    <TabBarAnimationContext.Provider value={{ tabBarTranslateY }}>
      {children}
    </TabBarAnimationContext.Provider>
  );
}

export function useTabBarAnimation() {
  const ctx = useContext(TabBarAnimationContext);
  if (!ctx) {
    throw new Error('useTabBarAnimation must be used within TabBarAnimationProvider');
  }
  return ctx;
}
