import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useContacts } from '../../hooks/useMessages';
import Avatar from './Avatar';
import SearchInput from './SearchInput';
import {
  CloseIcon,
  BackIcon,
  ImageIcon,
  EditIcon,
  BarChartIcon,
  ChevronRightIcon,
  ForwardIcon,
  MessageIcon,
} from './icons';
import type { Contact } from '../../types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.max(SCREEN_HEIGHT * 0.55, 420);

interface FunctionForwardSheetProps {
  visible: boolean;
  onClose: () => void;
  functionType: 'partner' | 'errand' | 'secondhand';
  functionTitle: string;
  navigation: any;
}

type Step = 'destination' | 'forumType' | 'contact';

/* ── Memoised contact row ── */
interface ContactRowProps {
  item: Contact;
  onPress: (contact: Contact) => void;
}

const ContactRow = React.memo(function ContactRow({ item, onPress }: ContactRowProps) {
  return (
    <TouchableOpacity
      style={styles.contactRow}
      activeOpacity={0.65}
      onPress={() => onPress(item)}
    >
      <Avatar text={item.name} uri={item.avatar || null} size="sm" />
      <Text style={styles.contactName} numberOfLines={1}>
        {item.name}
      </Text>
      <ChevronRightIcon size={16} color={colors.outlineVariant} />
    </TouchableOpacity>
  );
});

export default function FunctionForwardSheet({
  visible,
  onClose,
  functionType,
  functionTitle,
  navigation,
}: FunctionForwardSheetProps) {
  const { t } = useTranslation();
  const { data: contacts } = useContacts();

  const [step, setStep] = useState<Step>('destination');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset state when sheet closes
  useEffect(() => {
    if (!visible) {
      setStep('destination');
      setSearchQuery('');
    }
  }, [visible]);

  const filteredContacts =
    contacts?.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  const handleForumType = useCallback(
    (type: 'text' | 'image' | 'poll') => {
      onClose();
      navigation.getParent()?.navigate('ForumTab', {
        screen: 'Compose',
        params: { type, functionType, functionTitle },
      });
    },
    [navigation, functionType, functionTitle, onClose]
  );

  const handleSelectContact = useCallback(
    (contact: Contact) => {
      onClose();
      navigation.getParent()?.navigate('MessagesTab', {
        screen: 'Chat',
        params: {
          contactName: contact.name,
          contactAvatar: contact.avatar || '',
          forwardedType: functionType,
          forwardedTitle: functionTitle,
        },
      });
    },
    [navigation, functionType, functionTitle, onClose]
  );

  const handleBack = useCallback(() => {
    setStep('destination');
    setSearchQuery('');
  }, []);

  const renderContact = useCallback(
    ({ item }: { item: Contact }) => (
      <ContactRow item={item} onPress={handleSelectContact} />
    ),
    [handleSelectContact]
  );

  const title =
    step === 'destination'
      ? t('forwardDestination')
      : step === 'forumType'
        ? t('shareToForum')
        : t('selectContact');

  const showBack = step !== 'destination';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.sheet, step === 'contact' && styles.sheetTall]}
          onStartShouldSetResponder={() => true}
        >
          {/* ── Drag handle ── */}
          <View style={styles.handle} />

          {/* ── Header ── */}
          <View style={styles.header}>
            {showBack ? (
              <TouchableOpacity onPress={handleBack} hitSlop={8} style={styles.headerBtn}>
                <BackIcon size={20} color={colors.onSurface} />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerBtn} />
            )}
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
              <CloseIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* ── Step: Destination ── */}
          {step === 'destination' && (
            <>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setStep('forumType')}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.primaryContainer }]}>
                  <ForwardIcon size={24} color={colors.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{t('forwardToForum')}</Text>
                  <Text style={styles.optionDesc}>{t('forwardToForumDesc')}</Text>
                </View>
                <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setStep('contact')}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.secondaryContainer }]}>
                  <MessageIcon size={24} color={colors.onSecondaryContainer} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{t('forwardToContact')}</Text>
                  <Text style={styles.optionDesc}>{t('forwardToContactDesc')}</Text>
                </View>
                <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </>
          )}

          {/* ── Step: Forum Type ── */}
          {step === 'forumType' && (
            <>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => handleForumType('image')}
              >
                <View style={styles.optionIcon}>
                  <ImageIcon size={24} color={colors.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{t('imagePost')}</Text>
                  <Text style={styles.optionDesc}>{t('imagePostDesc')}</Text>
                </View>
                <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => handleForumType('text')}
              >
                <View style={styles.optionIcon}>
                  <EditIcon size={24} color={colors.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{t('textPost')}</Text>
                  <Text style={styles.optionDesc}>{t('textPostDesc')}</Text>
                </View>
                <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => handleForumType('poll')}
              >
                <View style={styles.optionIcon}>
                  <BarChartIcon size={24} color={colors.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{t('poll')}</Text>
                  <Text style={styles.optionDesc}>{t('pollDesc')}</Text>
                </View>
                <ChevronRightIcon size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </>
          )}

          {/* ── Step: Contact ── */}
          {step === 'contact' && (
            <>
              <View style={styles.searchWrap}>
                <SearchInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('searchContacts') || 'Search contacts...'}
                />
              </View>
              <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.name}
                renderItem={renderContact}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: 32,
  },
  sheetTall: {
    height: SHEET_HEIGHT,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  /* Option rows (destination + forumType) */
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  optionDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  /* Contact step */
  searchWrap: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    minHeight: 52,
  },
  contactName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
    marginLeft: spacing.md,
  },
});
