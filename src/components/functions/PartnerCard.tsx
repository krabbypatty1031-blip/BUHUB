import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { PartnerPost } from '../../types';
import Avatar from '../../components/common/Avatar';
import TranslatableText from '../../components/common/TranslatableText';
import { PageTranslationProvider, PageTranslationToggle } from '../../components/common/PageTranslation';
import {
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';
import { FigmaMoreDotsIcon } from '../../components/functions/SecondhandFigmaIcons';

export interface PartnerCardProps {
  item: PartnerPost;
  expired: boolean;
  displayAcademicMeta: string;
  displayTime: string;
  onPress: () => void;
  onAvatarPress: () => void;
  onMore?: () => void;
  expiredLabel: string;
  /** Optional left color bar for category indication in mixed lists */
  categoryColor?: string;
}

const PartnerCard = React.memo(function PartnerCard({
  item,
  expired,
  displayAcademicMeta,
  displayTime,
  onPress,
  onAvatarPress,
  onMore,
  expiredLabel,
  categoryColor,
}: PartnerCardProps) {
  return (
    <PageTranslationProvider>
      <TouchableOpacity
        style={[
          styles.card,
          categoryColor ? { borderLeftWidth: 3, borderLeftColor: categoryColor } : undefined,
        ]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        {/* Title */}
        <TranslatableText
          entityType="partner"
          entityId={item.id}
          fieldName="title"
          sourceText={item.title}
          sourceLanguage={item.sourceLanguage}
          textStyle={[styles.cardTitle, expired && styles.textDimmed]}
          numberOfLines={2}
        />
        {/* Description */}
        <TranslatableText
          entityType="partner"
          entityId={item.id}
          fieldName="description"
          sourceText={item.desc}
          sourceLanguage={item.sourceLanguage}
          textStyle={[styles.cardDesc, expired && styles.textDimmed]}
          numberOfLines={3}
        />
        {/* Bottom user row */}
        <View style={[styles.userRow, expired && styles.textDimmed]}>
          <View style={styles.userLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => { e.stopPropagation(); onAvatarPress(); }}
            >
              <Avatar text={item.user} uri={item.avatar} size="xxs" gender={item.gender} />
            </TouchableOpacity>
            <Text style={styles.userName}>{item.user}</Text>
            {item.gender === 'male' && <MaleIcon size={14} color="#1E40AF" />}
            {item.gender === 'female' && <FemaleIcon size={14} color="#E91E8C" />}
            {displayAcademicMeta ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText} numberOfLines={1}>{displayAcademicMeta}</Text>
              </>
            ) : null}
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{displayTime}</Text>
          </View>
          <View style={styles.userRight}>
            <PageTranslationToggle />
            {onMore && (
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={onMore}
              >
                <FigmaMoreDotsIcon size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Expired stamp overlay */}
        {expired && (
          <View style={styles.expiredOverlay}>
            <View style={styles.expiredStamp}>
              <Text style={styles.expiredStampText}>{expiredLabel}</Text>
            </View>
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
          </View>
        )}
      </TouchableOpacity>
    </PageTranslationProvider>
  );
});

export default PartnerCard;

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DEE2E5',
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 21,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    marginBottom: 10,
  },
  textDimmed: {
    opacity: 0.35,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  userRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userName: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#999999',
  },
  metaDot: {
    fontSize: 11,
    color: '#C7C7CC',
  },
  metaText: {
    fontSize: 11,
    color: '#C7C7CC',
    flexShrink: 1,
  },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredStamp: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ED4956',
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-15deg' }],
    shadowColor: '#ED4956',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  expiredStampText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#ED4956',
    letterSpacing: 2,
  },
  cornerTR: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(237,73,86,0.15)',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(237,73,86,0.15)',
  },
});
