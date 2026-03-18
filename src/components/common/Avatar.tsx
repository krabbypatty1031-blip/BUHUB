import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { colors } from '../../theme';
import { DefaultAvatarSvg, InitialAvatar, getAvatarDef } from './DefaultAvatarPicker';
import AnonymousBadgeAvatar, { isAnonymousBadgeAvatar } from './AnonymousBadgeAvatar';
import { normalizeAvatarUrl } from '../../utils/imageUrl';

interface AvatarProps {
  text: string;
  uri?: string | null;
  defaultAvatar?: string | null;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'ml' | 'lg' | 'xl' | 'xxl';
  gender?: 'male' | 'female' | 'other' | 'secret';
}

const SIZES = { xxs: 20, xs: 24, sm: 32, md: 40, ml: 50, lg: 56, xl: 80, xxl: 96 };

const PLACEHOLDER_AVATARS = new Set(['avatar1.png', 'avatar2.png', 'avatar3.png']);

function Avatar({ text, uri, defaultAvatar, size = 'md', gender }: AvatarProps) {
  const s = SIZES[size];

  // 1. Default avatar ID (Luna, Felix, etc.) - from uri or defaultAvatar prop
  const defaultId = uri && getAvatarDef(uri) ? uri : defaultAvatar && getAvatarDef(defaultAvatar) ? defaultAvatar : null;
  if (defaultId) {
    return <DefaultAvatarSvg id={defaultId} size={s} />;
  }

  // 2. Campus badge avatar token for anonymous identities
  if (uri && isAnonymousBadgeAvatar(uri)) {
    return <AnonymousBadgeAvatar token={uri} size={s} />;
  }

  // 3. Legacy color-based avatar
  if (uri && typeof uri === 'string' && uri.startsWith('#')) {
    return (
      <View
        style={[
          styles.colorAvatarOuter,
          { width: s, height: s, borderRadius: s / 2, backgroundColor: uri },
        ]}
      >
        <View style={[styles.colorAvatarInner, { borderRadius: s / 2 - 4 }]}>
          <Text
            style={[
              styles.colorAvatarText,
              { fontSize: s * 0.38, lineHeight: s * 0.42 },
            ]}
          >
            {text?.charAt(0) || '?'}
          </Text>
        </View>
      </View>
    );
  }

  // 4. Placeholder or non-URL (avatar1.png, single letter "A") - use initial, don't fetch
  if (!uri || PLACEHOLDER_AVATARS.has(uri) || (typeof uri === 'string' && uri.length <= 2 && !uri.includes('/'))) {
    return <InitialAvatar text={text || '?'} size={s} gender={gender} />;
  }

  // 5. Custom uploaded image - real URL or /uploads/ path
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

  // 6. Fallback
  return <InitialAvatar text={text || '?'} size={s} gender={gender} />;
}

export default React.memo(Avatar);

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  colorAvatarOuter: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  colorAvatarInner: {
    width: '78%',
    height: '78%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  colorAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
