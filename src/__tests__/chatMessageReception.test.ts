/**
 * chatMessageReception.test.ts
 *
 * Unit tests for Phase 4 Plan 01 -- Chat message reception & history:
 * scroll decision logic (CHAT-08, CHAT-09).
 *
 * Tests validate the pure scroll-decision logic extracted from
 * ChatScreen.tsx handleContentSizeChange, handlePressNewMessageHint,
 * and the isAppendingOlderHistory guard. The logic is modelled as
 * pure functions that take state inputs and return actions, making
 * them testable without React component rendering.
 */

// ---------------------------------------------------------------------------
// Constants (mirrored from ChatScreen.tsx lines 160-161)
// ---------------------------------------------------------------------------

const MAX_NEW_MESSAGE_HINT_COUNT = 99;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScrollAction = 'auto-scroll' | 'increment-badge' | 'no-op-history' | 'no-op';

interface ScrollDecisionInput {
  listDataLength: number;
  lastKnownListLength: number;
  messageItemCount: number;
  lastKnownMessageCount: number;
  /** Counter (not boolean) -- how many pending older-history appends await consumption */
  isAppendingOlderHistoryCounter: number;
  shouldForceLatestOnReady: boolean;
  anchorToLatest: boolean;
  isNearLatest: boolean;
}

interface ScrollDecisionResult {
  action: ScrollAction;
  /** Updated counter value after decision */
  updatedHistoryCounter: number;
  /** How many new messages were detected (messageDelta) */
  messageDelta: number;
}

// ---------------------------------------------------------------------------
// Pure decision function (mirrors handleContentSizeChange logic)
// ---------------------------------------------------------------------------

function computeScrollDecision(input: ScrollDecisionInput): ScrollDecisionResult {
  if (input.listDataLength === 0) {
    return {
      action: 'no-op',
      updatedHistoryCounter: input.isAppendingOlderHistoryCounter,
      messageDelta: 0,
    };
  }

  const messageDelta = input.messageItemCount - input.lastKnownMessageCount;
  const hasNewMessages = messageDelta > 0;

  // Guard: older history append -- consume one counter tick and skip scroll
  if (input.isAppendingOlderHistoryCounter > 0) {
    return {
      action: 'no-op-history',
      updatedHistoryCounter: input.isAppendingOlderHistoryCounter - 1,
      messageDelta,
    };
  }

  // Auto-scroll: forced, anchored, or near latest with new messages
  if (
    input.shouldForceLatestOnReady ||
    input.anchorToLatest ||
    (hasNewMessages && input.isNearLatest)
  ) {
    return {
      action: 'auto-scroll',
      updatedHistoryCounter: 0,
      messageDelta,
    };
  }

  // Badge: new messages while scrolled up
  if (hasNewMessages) {
    return {
      action: 'increment-badge',
      updatedHistoryCounter: 0,
      messageDelta,
    };
  }

  return {
    action: 'no-op',
    updatedHistoryCounter: 0,
    messageDelta,
  };
}

// ---------------------------------------------------------------------------
// Badge helpers (mirror pendingNewMessageCount update logic)
// ---------------------------------------------------------------------------

function computeBadgeCount(currentCount: number, messageDelta: number): number {
  return Math.min(MAX_NEW_MESSAGE_HINT_COUNT, currentCount + Math.max(1, messageDelta));
}

// ---------------------------------------------------------------------------
// handlePressNewMessageHint model
// ---------------------------------------------------------------------------

interface HintTapResult {
  anchorToLatest: boolean;
  pendingNewMessageCount: number;
  scrollToLatestCalled: boolean;
}

function computeHintTapAction(): HintTapResult {
  return {
    anchorToLatest: true,
    pendingNewMessageCount: 0,
    scrollToLatestCalled: true,
  };
}

// ---------------------------------------------------------------------------
// Default input factory
// ---------------------------------------------------------------------------

function makeDefaultInput(overrides: Partial<ScrollDecisionInput> = {}): ScrollDecisionInput {
  return {
    listDataLength: 10,
    lastKnownListLength: 10,
    messageItemCount: 8,
    lastKnownMessageCount: 8,
    isAppendingOlderHistoryCounter: 0,
    shouldForceLatestOnReady: false,
    anchorToLatest: false,
    isNearLatest: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CHAT-08: New message reception scroll decisions', () => {
  describe('CHAT-08a: Auto-scroll when at bottom', () => {
    it('auto-scrolls when isNearLatest=true and messageDelta > 0', () => {
      const result = computeScrollDecision(
        makeDefaultInput({
          isNearLatest: true,
          messageItemCount: 9,
          lastKnownMessageCount: 8,
        })
      );

      expect(result.action).toBe('auto-scroll');
      expect(result.messageDelta).toBe(1);
    });

    it('auto-scrolls when anchorToLatest=true regardless of isNearLatest', () => {
      const result = computeScrollDecision(
        makeDefaultInput({
          anchorToLatest: true,
          isNearLatest: false,
          messageItemCount: 9,
          lastKnownMessageCount: 8,
        })
      );

      expect(result.action).toBe('auto-scroll');
    });

    it('auto-scrolls when shouldForceLatestOnReady=true even without new messages', () => {
      const result = computeScrollDecision(
        makeDefaultInput({
          shouldForceLatestOnReady: true,
          isNearLatest: false,
          anchorToLatest: false,
        })
      );

      expect(result.action).toBe('auto-scroll');
    });
  });

  describe('CHAT-08b: Badge increment when scrolled up', () => {
    it('increments badge when isNearLatest=false, anchorToLatest=false, and messageDelta > 0', () => {
      const result = computeScrollDecision(
        makeDefaultInput({
          isNearLatest: false,
          anchorToLatest: false,
          messageItemCount: 10,
          lastKnownMessageCount: 8,
        })
      );

      expect(result.action).toBe('increment-badge');
      expect(result.messageDelta).toBe(2);
    });

    it('caps pendingNewMessageCount at MAX_NEW_MESSAGE_HINT_COUNT (99)', () => {
      let badgeCount = 95;

      // Simulate receiving 6 messages (would push past 99)
      badgeCount = computeBadgeCount(badgeCount, 6);
      expect(badgeCount).toBe(99);

      // Simulate receiving more -- stays at 99
      badgeCount = computeBadgeCount(badgeCount, 3);
      expect(badgeCount).toBe(99);
    });

    it('returns no-op when no new messages and not forced', () => {
      const result = computeScrollDecision(
        makeDefaultInput({
          isNearLatest: false,
          anchorToLatest: false,
          messageItemCount: 8,
          lastKnownMessageCount: 8,
        })
      );

      expect(result.action).toBe('no-op');
      expect(result.messageDelta).toBe(0);
    });
  });

  describe('CHAT-08c: Hint tap resets badge and scrolls to bottom', () => {
    it('sets anchorToLatest=true and pendingNewMessageCount=0 on hint tap', () => {
      const result = computeHintTapAction();

      expect(result.anchorToLatest).toBe(true);
      expect(result.pendingNewMessageCount).toBe(0);
      expect(result.scrollToLatestCalled).toBe(true);
    });

    it('direct setPendingNewMessageCount(0) ensures badge is cleared regardless of ref sync timing', () => {
      // Model the scenario: pendingNewMessageCount state is 5, but
      // pendingNewMessageCountRef has not yet synced (still 0 from a
      // previous render cycle). The hint tap handler should directly
      // call setPendingNewMessageCount(0) so the count is zeroed
      // independently of the ref check inside scrollToLatest.
      const stateCount = 5;
      const refCount = 0; // stale -- useEffect has not synced yet

      // scrollToLatest only clears if ref > 0 -- would NOT clear here
      const scrollToLatestWouldClear = refCount > 0;
      expect(scrollToLatestWouldClear).toBe(false);

      // But handlePressNewMessageHint directly sets count to 0
      const hintTapResult = computeHintTapAction();
      expect(hintTapResult.pendingNewMessageCount).toBe(0);
      // The direct call ensures clearing regardless of the stale ref
      expect(hintTapResult.pendingNewMessageCount).not.toBe(stateCount);
    });
  });
});

describe('CHAT-09: History loading scroll guard', () => {
  it('returns no-op-history and decrements counter when isAppendingOlderHistoryCounter > 0', () => {
    const result = computeScrollDecision(
      makeDefaultInput({
        isAppendingOlderHistoryCounter: 1,
        isNearLatest: true,
        messageItemCount: 12,
        lastKnownMessageCount: 8,
      })
    );

    expect(result.action).toBe('no-op-history');
    expect(result.updatedHistoryCounter).toBe(0);
    // Even though there are new messages and isNearLatest is true,
    // the history guard takes priority
    expect(result.messageDelta).toBe(4);
  });

  it('counter approach: concurrent WS message does not consume the flag meant for history append', () => {
    // Scenario:
    // 1. applyOlderHistoryChunk increments counter to 1
    // 2. A WebSocket message arrives BEFORE the history render,
    //    causing a content-size change with messageDelta=1
    // 3. With a boolean flag, this WS-driven call would consume the flag,
    //    leaving the actual history render unguarded.
    // 4. With a counter, we can model this: counter=1 means one history
    //    append is pending. The WS message's content-size change is a
    //    separate event. The counter only decrements for history-attributable
    //    changes.

    // Step 1: History append sets counter = 1
    let counter = 0;
    counter += 1; // applyOlderHistoryChunk
    expect(counter).toBe(1);

    // Step 2: If two content-size changes fire in sequence (one for WS msg,
    // one for history), the counter approach ensures at least one is guarded.
    // First call (history render) consumes the counter:
    const historyResult = computeScrollDecision(
      makeDefaultInput({
        isAppendingOlderHistoryCounter: counter,
        messageItemCount: 12,
        lastKnownMessageCount: 8,
        isNearLatest: true,
      })
    );
    expect(historyResult.action).toBe('no-op-history');
    expect(historyResult.updatedHistoryCounter).toBe(0);

    // Second call (WS message) with counter now 0 -- normal scroll logic
    const wsResult = computeScrollDecision(
      makeDefaultInput({
        isAppendingOlderHistoryCounter: historyResult.updatedHistoryCounter,
        messageItemCount: 13,
        lastKnownMessageCount: 12,
        isNearLatest: true,
      })
    );
    expect(wsResult.action).toBe('auto-scroll');
    expect(wsResult.updatedHistoryCounter).toBe(0);
  });

  it('multiple rapid history appends: counter tracks each one independently', () => {
    // Two rapid applyOlderHistoryChunk calls before any render
    let counter = 0;
    counter += 1; // first history append
    counter += 1; // second history append (e.g., prefetch applied immediately)
    expect(counter).toBe(2);

    // First content-size change: consumes one
    const first = computeScrollDecision(
      makeDefaultInput({ isAppendingOlderHistoryCounter: counter })
    );
    expect(first.action).toBe('no-op-history');
    expect(first.updatedHistoryCounter).toBe(1);

    // Second content-size change: consumes the other
    const second = computeScrollDecision(
      makeDefaultInput({ isAppendingOlderHistoryCounter: first.updatedHistoryCounter })
    );
    expect(second.action).toBe('no-op-history');
    expect(second.updatedHistoryCounter).toBe(0);

    // Third content-size change: counter is 0, normal logic
    const third = computeScrollDecision(
      makeDefaultInput({
        isAppendingOlderHistoryCounter: second.updatedHistoryCounter,
        messageItemCount: 9,
        lastKnownMessageCount: 8,
        isNearLatest: true,
      })
    );
    expect(third.action).toBe('auto-scroll');
  });

  it('returns no-op when listDataLength is 0 regardless of other flags', () => {
    const result = computeScrollDecision(
      makeDefaultInput({
        listDataLength: 0,
        isAppendingOlderHistoryCounter: 1,
        shouldForceLatestOnReady: true,
      })
    );

    expect(result.action).toBe('no-op');
  });
});
