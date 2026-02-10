import React, { createContext, useContext } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

interface TabBarAnimationContextType {
  tabBarTranslateY: SharedValue<number>;
}

const TabBarAnimationContext = createContext<TabBarAnimationContextType | null>(null);

export function TabBarAnimationProvider({ children }: { children: React.ReactNode }) {
  const tabBarTranslateY = useSharedValue(0);

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
