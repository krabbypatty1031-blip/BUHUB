import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
} from 'react-native';

type AutoGrowingInputOptions = {
  minHeight: number;
  maxHeight: number;
  extraHeight?: number;
  lineHeight?: number;
};

export function useAutoGrowingInput({
  minHeight,
  maxHeight,
  extraHeight = 0,
  lineHeight,
}: AutoGrowingInputOptions) {
  const [inputHeight, setInputHeight] = useState(minHeight);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const contentHeightRef = useRef(minHeight);
  const textHeightRef = useRef(minHeight);
  const committedHeightRef = useRef(minHeight);
  const committedScrollEnabledRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  const flushHeightUpdate = useCallback(() => {
    const measuredHeight = Math.max(contentHeightRef.current, textHeightRef.current, minHeight);
    const nextHeight = Math.max(minHeight, Math.min(measuredHeight, maxHeight));
    const nextScrollEnabled = measuredHeight > maxHeight;

    if (committedScrollEnabledRef.current !== nextScrollEnabled) {
      committedScrollEnabledRef.current = nextScrollEnabled;
      setScrollEnabled(nextScrollEnabled);
    }

    if (committedHeightRef.current !== nextHeight) {
      committedHeightRef.current = nextHeight;
      setInputHeight(nextHeight);
    }
  }, [maxHeight, minHeight]);

  const scheduleHeightUpdate = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      flushHeightUpdate();
    });
  }, [flushHeightUpdate]);

  const handleContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const contentHeight = Math.ceil(event.nativeEvent.contentSize.height);
      contentHeightRef.current = contentHeight + extraHeight;
      scheduleHeightUpdate();
    },
    [extraHeight, scheduleHeightUpdate]
  );

  const resetInputHeight = useCallback(() => {
    contentHeightRef.current = minHeight;
    textHeightRef.current = minHeight;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    committedHeightRef.current = minHeight;
    committedScrollEnabledRef.current = false;
    setInputHeight(minHeight);
    setScrollEnabled(false);
  }, [minHeight]);

  const updateInputHeightByText = useCallback(
    (text: string) => {
      if (typeof lineHeight !== 'number' || !Number.isFinite(lineHeight) || lineHeight <= 0) {
        return;
      }
      const lineCount = Math.max(1, text.split('\n').length);
      textHeightRef.current = lineCount * lineHeight + extraHeight;
      scheduleHeightUpdate();
    },
    [extraHeight, lineHeight, scheduleHeightUpdate]
  );

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return {
    inputHeight,
    scrollEnabled,
    handleContentSizeChange,
    updateInputHeightByText,
    resetInputHeight,
  };
}
