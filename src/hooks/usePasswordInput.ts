import { useCallback, useState } from 'react';
import { TextInput } from 'react-native';

type UsePasswordInputOptions = {
  initialValue?: string;
  initiallyVisible?: boolean;
};

export function usePasswordInput(options: UsePasswordInputOptions = {}) {
  const { initialValue = '', initiallyVisible = false } = options;

  const [value, setValue] = useState(initialValue);
  const [isVisible, setIsVisible] = useState(initiallyVisible);

  const onChangeText = useCallback((text: string) => {
    setValue(text);
  }, []);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return {
    value,
    setValue,
    isVisible,
    onChangeText,
    toggleVisibility,
  };
}
