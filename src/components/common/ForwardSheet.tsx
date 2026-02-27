import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CommonActions } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { useContacts } from '../../hooks';
import Avatar from './Avatar';
import SearchInput from './SearchInput';
import { CloseIcon, SendIcon, CheckIcon } from './icons';
import type { ForumPost, Contact } from '../../types';
import { buildChatBackTarget } from '../../utils/chatNavigation';

interface ForwardSheetProps {
  visible: boolean;
  post: ForumPost | null;
  onClose: () => void;
  navigation: any;
}

/* ── Memoised contact row (per RN stack guideline) ── */
interface ContactRowProps {
  item: Contact;
  isSelected: boolean;
  onPress: (contact: Contact) => void;
}

const ContactRow = React.memo(function ContactRow({ item, isSelected, onPress }: ContactRowProps) {
  return (
    <TouchableOpacity
      style={[styles.contactRow, isSelected && styles.contactRowSelected]}
      activeOpacity={0.65}
      onPress={() => onPress(item)}
    >
      <Avatar text={item.name} uri={item.avatar || null} size="sm" />
      <Text
        style={[styles.contactName, isSelected && styles.contactNameSelected]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
      {isSelected && (
        <View style={styles.checkBadge}>
          <CheckIcon size={14} color={colors.onPrimary} />
        </View>
      )}
    </TouchableOpacity>
  );
});

export default function ForwardSheet({ visible, post, onClose, navigation }: ForwardSheetProps) {
  const { t } = useTranslation();
  const { data: contacts } = useContacts();
  const inputRef = useRef<TextInput>(null);
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = Math.max(screenHeight * 0.55, 420);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState('');

  const canSend = !!selectedContact;

  // Reset all state when sheet closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSelectedContact(null);
      setMessageText('');
    }
  }, [visible]);

  const filteredContacts =
    contacts?.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  const handleToggleContact = useCallback((contact: Contact) => {
    setSelectedContact((prev) => (prev?.id === contact.id ? null : contact));
  }, []);

  const handleSend = useCallback(() => {
    if (!selectedContact || !post) return;
    const targetPostId = post.sourcePostId ?? post.id;
    const backTo = buildChatBackTarget(navigation);
    onClose();
    navigation.dispatch(
      CommonActions.navigate({
        name: 'MessagesTab',
        params: {
          screen: 'Chat',
          params: {
            contactId: selectedContact.id,
            contactName: selectedContact.name,
            contactAvatar: selectedContact.avatar || selectedContact.name,
            forwardedType: 'post',
            forwardedTitle: post.content,
            forwardedPosterName: post.name,
            forwardedId: targetPostId,
            forwardedPostId: targetPostId,
            forwardedMessage: messageText.trim() || undefined,
            forwardedNonce: `${Date.now()}-${selectedContact.id}-${targetPostId}`,
            ...(backTo ? { backTo } : {}),
          },
        },
      })
    );
  }, [selectedContact, post, messageText, onClose, navigation]);

  const renderContact = useCallback(
    ({ item }: { item: Contact }) => (
      <ContactRow
        item={item}
        isSelected={selectedContact?.id === item.id}
        onPress={handleToggleContact}
      />
    ),
    [selectedContact, handleToggleContact]
  );

  if (!post) return null;

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavContainer}
        >
          <View
            style={[styles.sheet, { height: sheetHeight }]}
            onStartShouldSetResponder={() => true}
          >
            {/* ── Drag handle ── */}
            <View style={styles.handle} />

            {/* ── Header ── */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('forwardTo')}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <CloseIcon size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* ── Search bar ── */}
            <View style={styles.searchWrap}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('searchContacts')}
              />
            </View>

            {/* ── Contact list ── */}
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              renderItem={renderContact}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />

            {/* ── Divider ── */}
            <View style={styles.divider} />

            {/* ── Bottom input bar ── */}
            <View style={styles.inputBar}>
              <TextInput
                ref={inputRef}
                style={styles.messageInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder={t('addMessagePlaceholder')}
                placeholderTextColor={colors.outline}
                editable={canSend}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  canSend ? styles.sendBtnActive : styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={canSend ? 0.7 : 1}
                disabled={!canSend}
              >
                <SendIcon
                  size={18}
                  color={canSend ? colors.onPrimary : colors.outlineVariant}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  /* Overlay & layout */
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  kavContainer: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },

  /* Drag handle */
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Search */
  searchWrap: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },

  /* Contact list */
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
  contactRowSelected: {
    backgroundColor: colors.primaryContainer,
  },
  contactName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
    marginLeft: spacing.md,
  },
  contactNameSelected: {
    color: colors.onPrimaryContainer,
    fontWeight: '500',
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Divider */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.xl,
  },

  /* Bottom input bar */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 88,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
});
