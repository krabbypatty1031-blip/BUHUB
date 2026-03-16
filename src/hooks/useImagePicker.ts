import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

interface UseImagePickerOptions {
  allowsMultiple?: boolean;
  maxImages?: number;
  initialImages?: string[];
}

export function useImagePicker(options: UseImagePickerOptions = {}) {
  const { t } = useTranslation();
  const { allowsMultiple = false, maxImages = 9, initialImages = [] } = options;
  const [images, setImages] = useState<string[]>(initialImages);

  const pickImages = useCallback(async () => {
    const existing = await ImagePicker.getMediaLibraryPermissionsAsync();

    if (existing.status === 'denied') {
      // Permission permanently denied — direct user to Settings
      Alert.alert(
        t('permissionNeededTitle'),
        t('photoPermissionMessage'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('settings'),
            onPress: () => {
              void Linking.openSettings().catch(() => {});
            },
          },
        ]
      );
      return;
    }

    if (existing.status !== 'granted') {
      // First time — request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissionNeededTitle'),
          t('photoPermissionMessage'),
          [
            { text: t('cancel'), style: 'cancel' },
            {
              text: t('settings'),
              onPress: () => {
                void Linking.openSettings().catch(() => {});
              },
            },
          ]
        );
        return;
      }
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
  }, [allowsMultiple, maxImages, images.length, t]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  return { images, setImages, pickImages, removeImage, clearImages };
}
