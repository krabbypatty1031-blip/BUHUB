import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, borderRadius } from '../../theme';

interface AvatarProps {
  text: string;
  uri?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gender?: 'male' | 'female' | 'other' | 'secret';
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };
const FONT = { xs: 10, sm: 13, md: 16, lg: 22, xl: 32 };

function Avatar({ text, uri, size = 'md', gender }: AvatarProps) {
  const s = SIZES[size];
  const fs = FONT[size];

  // Always use gray background, regardless of gender
  const bgColor = colors.secondary;

  const isImageUri = uri && (uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('data:'));

  if (isImageUri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: s, height: s, borderRadius: s / 2 }]}
      />
    );
  }

  return (
    <View style={[styles.container, { width: s, height: s, borderRadius: s / 2, backgroundColor: bgColor }]}>
      <Text style={[styles.text, { fontSize: fs }]}>{text.charAt(0)}</Text>
    </View>
  );
}

export default React.memo(Avatar);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: colors.white,
    fontWeight: '600',
  },
  image: {
    resizeMode: 'cover',
  },
});
