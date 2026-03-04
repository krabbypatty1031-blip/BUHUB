import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { messageService } from '../api/services/message.service';
import { useAuthStore } from '../store/authStore';

const HEARTBEAT_INTERVAL_MS = 25 * 1000;
const INITIAL_HEARTBEAT_DELAY_MS = 10 * 1000;

export function usePresenceHeartbeat() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) return;

    const sendHeartbeat = () => {
      void messageService.heartbeatPresence().catch(() => {
        // Ignore heartbeat failures; next tick will retry.
      });
    };

    const clearStartupTimer = () => {
      if (!startupTimerRef.current) return;
      clearTimeout(startupTimerRef.current);
      startupTimerRef.current = null;
    };

    const startHeartbeat = (delayMs: number) => {
      if (intervalRef.current || startupTimerRef.current) return;
      startupTimerRef.current = setTimeout(() => {
        startupTimerRef.current = null;
        sendHeartbeat();
        intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
      }, delayMs);
    };

    const stopHeartbeat = (markOffline: boolean) => {
      clearStartupTimer();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (markOffline) {
        void messageService.goOffline().catch(() => {
          // Ignore offline failures; server TTL still expires.
        });
      }
    };

    if (appStateRef.current === 'active') {
      startHeartbeat(INITIAL_HEARTBEAT_DELAY_MS);
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      appStateRef.current = nextState;
      if (nextState === 'active') {
        startHeartbeat(0);
      } else if (wasActive) {
        stopHeartbeat(true);
      }
    });

    return () => {
      subscription.remove();
      stopHeartbeat(true);
    };
  }, [hasHydrated, isLoggedIn]);
}
