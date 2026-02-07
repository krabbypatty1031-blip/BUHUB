import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

interface UseImagePickerOptions {
  allowsMultiple?: boolean;
  maxImages?: number;
}

export function useImagePicker(options: UseImagePickerOptions = {}) {
  const { allowsMultiple = false, maxImages = 9 } = options;
  const [images, setImages] = useState<string[]>([]);

  const pickImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to select images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: allowsMultiple,
      quality: 0.8,
      selectionLimit: allowsMultiple ? maxImages - images.length : 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      if (allowsMultiple) {
        setImages((prev) => [...prev, ...uris].slice(0, maxImages));
      } else {
        setImages(uris.slice(0, 1));
      }
    }
  }, [allowsMultiple, maxImages, images.length]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  return { images, pickImages, removeImage, clearImages };
}
