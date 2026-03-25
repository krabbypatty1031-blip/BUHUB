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
import { useTranslation } from 'react-i18next';
import {
  MaleIcon,
  FemaleIcon,
} from '../../components/common/icons';
import { FigmaMoreDotsIcon } from '../../components/functions/SecondhandFigmaIcons';
import { getLocalizedFontStyle } from '../../theme/typography';

export interface PartnerCardProps {
  item: PartnerPost;
  expired: boolean;
  displayAcademicMeta: string;
  displayTime: string;
  footerMode?: 'default' | 'time-only';
  onPress: () => void;
  onAvatarPress: () => void;
  onMore?: () => void;
  expiredLabel: string;
  /** Optional category label tag shown next to title in mixed lists */
  categoryLabel?: string;
}

const PartnerCard = React.memo(function PartnerCard({
  item,
  expired,
  displayAcademicMeta,
  displayTime,
  footerMode = 'default',
  onPress,
  onAvatarPress,
  onMore,
  expiredLabel,
  categoryLabel,
}: PartnerCardProps) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  return (
    <PageTranslationProvider>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={onPress}
      >
        {/* Title row: title on left, tags + translate on right */}
        <View style={styles.titleRow}>
          <TranslatableText
            entityType="partner"
            entityId={item.id}
            fieldName="title"
            sourceText={item.title}
            sourceLanguage={item.sourceLanguage}
            textStyle={[styles.cardTitle, expired && styles.textDimmed]}
            numberOfLines={2}
            containerStyle={styles.titleFlex}
          />
          <View style={styles.titleRight}>
            {categoryLabel ? (
              <View style={styles.categoryTag}>
                <Text style={[styles.categoryTagText, getLocalizedFontStyle(language, 'regular')]}>{categoryLabel}</Text>
              </View>
            ) : null}
            {expired ? (
              <View style={styles.expiredTag}>
                <Text style={[styles.expiredTagText, getLocalizedFontStyle(language, 'bold')]}>{expiredLabel}</Text>
              </View>
            ) : null}
            <PageTranslationToggle />
          </View>
        </View>
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
            {footerMode === 'time-only' ? (
              <Text style={styles.metaText}>{displayTime}</Text>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={(e) => { e.stopPropagation(); onAvatarPress(); }}
                >
                  <Avatar text={item.user} uri={item.avatar} size="xxs" gender={item.gender} />
                </TouchableOpacity>
                <Text style={[styles.userName, getLocalizedFontStyle(language, 'regular')]} numberOfLines={1}>{item.user}</Text>
                {item.gender === 'male' && <MaleIcon size={14} color="#1E40AF" />}
                {item.gender === 'female' && <FemaleIcon size={14} color="#E91E8C" />}
                {displayAcademicMeta ? (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={[styles.metaText, getLocalizedFontStyle(language, 'regular')]} numberOfLines={2}>{displayAcademicMeta}</Text>
                  </>
                ) : null}
                <Text style={styles.metaDot}>·</Text>
                <Text style={[styles.metaText, getLocalizedFontStyle(language, 'regular')]} numberOfLines={1}>{displayTime}</Text>
              </>
            )}
          </View>
          <View style={styles.userRight}>
            {onMore && (
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={(e) => { e.stopPropagation(); onMore(); }}
              >
                <FigmaMoreDotsIcon size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  titleFlex: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 21,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
  },
  categoryTag: {
    backgroundColor: '#F3F5F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  categoryTagText: {
    fontSize: 10,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },
  expiredTag: {
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  expiredTagText: {
    fontSize: 10,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#ED4956',
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
    minWidth: 0,
    flexWrap: 'wrap',
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
});
