import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { messageService } from '../api/services/message.service';
import { useAuthStore } from '../store/authStore';

const HEARTBEAT_INTERVAL_MS = 25 * 1000;

export function usePresenceHeartbeat() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) return;

    const sendHeartbeat = () => {
      void messageService.heartbeatPresence().catch(() => {
        // Ignore heartbeat failures; next tick will retry.
      });
    };

    const startHeartbeat = () => {
      if (intervalRef.current) return;
      sendHeartbeat();
      intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    };

    const stopHeartbeat = (markOffline: boolean) => {
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

    startHeartbeat();

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      appStateRef.current = nextState;
      if (nextState === 'active') {
        startHeartbeat();
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
