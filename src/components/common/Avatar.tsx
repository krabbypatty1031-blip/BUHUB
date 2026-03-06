import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
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

const PLACEHOLDER_AVATARS = new Set(['avatar1.png', 'avatar2.png', 'avatar3.png']);

function Avatar({ text, uri, defaultAvatar, size = 'md', gender }: AvatarProps) {
  const s = SIZES[size];

  // 1. Default avatar ID (Luna, Felix, etc.) - from uri or defaultAvatar prop
  const defaultId = uri && getAvatarDef(uri) ? uri : defaultAvatar && getAvatarDef(defaultAvatar) ? defaultAvatar : null;
  if (defaultId) {
    return <DefaultAvatarSvg id={defaultId} size={s} />;
  }

  // 2. Color-based avatar (e.g., anonymous identity colors like #FF6B6B)
  if (uri && typeof uri === 'string' && uri.startsWith('#')) {
    return (
      <View
        style={[
          styles.colorAvatar,
          { width: s, height: s, borderRadius: s / 2, backgroundColor: uri },
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

  // 3. Placeholder or non-URL (avatar1.png, single letter "A") - use initial, don't fetch
  if (!uri || PLACEHOLDER_AVATARS.has(uri) || (typeof uri === 'string' && uri.length <= 2 && !uri.includes('/'))) {
    return <InitialAvatar text={text || '?'} size={s} gender={gender} />;
  }

  // 4. Custom uploaded image - real URL or /uploads/ path
  const normalizedUri = normalizeAvatarUrl(uri);
  const isImageUri = normalizedUri && (normalizedUri.startsWith('http') || normalizedUri.startsWith('file://') || normalizedUri.startsWith('data:'));
  if (isImageUri) {
    return (
      <ExpoImage
        source={normalizedUri}
        style={[styles.image, { width: s, height: s, borderRadius: s / 2 }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={normalizedUri}
      />
    );
  }

  // 5. Fallback
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
