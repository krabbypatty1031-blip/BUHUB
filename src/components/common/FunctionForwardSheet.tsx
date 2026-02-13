import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  useWindowDimensions,
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
  ChevronRightIcon,
} from './icons';
import type { Contact } from '../../types';

interface FunctionForwardSheetProps {
  visible: boolean;
  onClose: () => void;
  functionType: 'partner' | 'errand' | 'secondhand';
  functionTitle: string;
  functionPosterName: string;
  functionIndex: number;
  navigation: any;
}

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
  functionPosterName,
  functionIndex,
  navigation,
}: FunctionForwardSheetProps) {
  const { t } = useTranslation();
  const { data: contacts } = useContacts();
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = Math.max(screenHeight * 0.55, 420);

  const [searchQuery, setSearchQuery] = useState('');

  // Reset state when sheet closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  const filteredContacts =
    contacts?.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

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
          forwardedPosterName: functionPosterName,
          forwardedIndex: functionIndex,
        },
      });
    },
    [navigation, functionType, functionTitle, functionPosterName, functionIndex, onClose]
  );

  const renderContact = useCallback(
    ({ item }: { item: Contact }) => (
      <ContactRow item={item} onPress={handleSelectContact} />
    ),
    [handleSelectContact]
  );

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
          style={[styles.sheet, { height: sheetHeight }]}
          onStartShouldSetResponder={() => true}
        >
          {/* ── Drag handle ── */}
          <View style={styles.handle} />

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerBtn} />
            <Text style={styles.title}>{t('selectContact')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
              <CloseIcon size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* ── Contact List ── */}
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

  /* Contact list */
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
