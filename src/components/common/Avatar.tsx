import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../../theme';
import { DefaultAvatarSvg, InitialAvatar, getAvatarDef } from './DefaultAvatarPicker';
import { normalizeAvatarUrl } from '../../utils/imageUrl';

interface AvatarProps {
  text: string;
  uri?: string | null;
  defaultAvatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gender?: 'male' | 'female' | 'other' | 'secret';
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };

function Avatar({ text, uri, defaultAvatar, size = 'md', gender }: AvatarProps) {
  const s = SIZES[size];
  const normalizedUri = normalizeAvatarUrl(uri);

  // 1. Custom uploaded image
  const isImageUri = normalizedUri && (normalizedUri.startsWith('http') || normalizedUri.startsWith('file://') || normalizedUri.startsWith('data:'));
  if (isImageUri) {
    return (
      <Image
        source={{ uri: normalizedUri }}
        style={[styles.image, { width: s, height: s, borderRadius: s / 2 }]}
      />
    );
  }

  // 2. Color-based avatar (e.g., anonymous identity colors like #FF6B6B)
  const isColorUri = normalizedUri && normalizedUri.startsWith('#');
  if (isColorUri) {
    return (
      <View
        style={[
          styles.colorAvatar,
          { width: s, height: s, borderRadius: s / 2, backgroundColor: normalizedUri },
        ]}
      >
        <Text
          style={[
            styles.colorAvatarText,
            { fontSize: s * 0.4, lineHeight: s * 0.45 },
          ]}
        >
          {text?.charAt(0) || '?'}
        </Text>
      </View>
    );
  }

  // 3. Pre-designed default avatar
  if (defaultAvatar && getAvatarDef(defaultAvatar)) {
    return <DefaultAvatarSvg id={defaultAvatar} size={s} />;
  }

  // 4. Initial-based avatar (fallback)
  return <InitialAvatar text={text || '?'} size={s} gender={gender} />;
}

export default React.memo(Avatar);

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  colorAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorAvatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
