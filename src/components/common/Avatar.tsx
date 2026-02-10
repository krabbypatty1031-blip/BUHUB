import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../../theme';
import { DefaultAvatarSvg, InitialAvatar, getAvatarDef } from './DefaultAvatarPicker';

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

  // 1. Custom uploaded image
  const isImageUri = uri && (uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('data:'));
  if (isImageUri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: s, height: s, borderRadius: s / 2 }]}
      />
    );
  }

  // 2. Pre-designed default avatar
  if (defaultAvatar && getAvatarDef(defaultAvatar)) {
    return <DefaultAvatarSvg id={defaultAvatar} size={s} />;
  }

  // 3. Initial-based avatar (fallback)
  return <InitialAvatar text={text || '?'} size={s} gender={gender} />;
}

export default React.memo(Avatar);

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
});
