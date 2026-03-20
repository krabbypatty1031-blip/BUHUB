import { isExpiredNow } from '../hooks/useExpirationTick';

const EXPIRED_THRESHOLD = 50;

interface ExpirableItem {
  expired: boolean;
  expiresAt: string;
}

/**
 * Filters and sorts items with expired visibility logic:
 * - Active items first, then expired items
 * - When expired count > EXPIRED_THRESHOLD (50), keep only the newest half of expired items
 * - Items manually deleted by user are handled separately (not shown at all)
 */
export function filterWithExpiredVisibility<T extends ExpirableItem>(
  items: T[],
  now: number,
): T[] {
  const active: T[] = [];
  const expired: T[] = [];

  for (const item of items) {
    if (isExpiredNow(item.expired, item.expiresAt, now)) {
      expired.push(item);
    } else {
      active.push(item);
    }
  }

  // When expired count exceeds threshold, keep only the newest half
  let visibleExpired = expired;
  if (expired.length > EXPIRED_THRESHOLD) {
    // Sort by expiresAt descending (newest expired first)
    const sorted = [...expired].sort(
      (a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()
    );
    // Keep the newest half
    const keepCount = Math.ceil(expired.length / 2);
    visibleExpired = sorted.slice(0, keepCount);
  }

  return [...active, ...visibleExpired];
}
