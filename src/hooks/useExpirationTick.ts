import { useState, useEffect } from 'react';

/**
 * Returns a timestamp that updates every `intervalMs`.
 * Use to trigger re-evaluation of expiration status in lists.
 */
export function useExpirationTick(intervalMs = 30000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/**
 * Returns true if the item is expired based on either the `expired` flag
 * or the `expiresAt` timestamp compared to `now`.
 */
export function isExpiredNow(
  expired: boolean | undefined,
  expiresAt: string | undefined,
  now: number
): boolean {
  if (expired) return true;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < now;
}
