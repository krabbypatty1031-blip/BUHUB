import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { Contact } from '../../types';
import { useContacts } from '../../hooks/useMessages';
import { useMessageStore } from '../../store/messageStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { MessageListSkeleton } from '../../components/common/Skeleton';
import Svg, { Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import {
  HeartIcon,
  UserIcon,
  CommentIcon,
  SearchIcon,
  CloseIcon,
  MessageIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<MessagesStackParamList, 'MessagesList'>;

interface NotifyEntry {
  key: 'NotifyLikes' | 'NotifyFollowers' | 'NotifyComments';
  icon: React.ReactNode;
  labelKey: string;
  countKey: 'unreadLikes' | 'unreadFollowers' | 'unreadComments';
  gradientId: string;
  gradientColor: string;
}

const ICON_SIZE = 60;

const NOTIFY_ENTRIES: NotifyEntry[] = [
  {
    key: 'NotifyLikes',
    icon: <HeartIcon size={26} color="#FF6B7A" fill="#FF6B7A" />,
    labelKey: 'likeNotifications',
    countKey: 'unreadLikes',
    gradientId: 'gradLikes',
    gradientColor: '#FF6B7A',
  },
  {
    key: 'NotifyFollowers',
    icon: <UserIcon size={26} color="#4A90FF" />,
    labelKey: 'followerNotifications',
    countKey: 'unreadFollowers',
    gradientId: 'gradFollowers',
    gradientColor: '#4A90FF',
  },
  {
    key: 'NotifyComments',
    icon: <CommentIcon size={26} color="#4CD964" fill="#4CD964" />,
    labelKey: 'commentNotifications',
    countKey: 'unreadComments',
    gradientId: 'gradComments',
    gradientColor: '#4CD964',
  },
];

/* ── Memoized contact row ── */
const ContactRow = React.memo(function ContactRow({
  item,
  isPinned,
  isMuted,
  effectiveUnread,
  onPress,
  onLongPress,
  onAvatarPress,
}: {
  item: Contact;
  isPinned: boolean;
  isMuted: boolean;
  effectiveUnread: number;
  onPress: () => void;
  onLongPress: () => void;
  onAvatarPress: () => void;
}) {
  const showUnread = effectiveUnread > 0;

  return (
    <TouchableOpacity
      style={[styles.contactItem, isPinned && styles.contactItemPinned]}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <TouchableOpacity
        style={styles.contactAvatarWrap}
        activeOpacity={0.8}
        onPress={onAvatarPress}
      >
        <Avatar text={item.name} uri={item.avatar || null} size="md" gender={item.gender} />
      </TouchableOpacity>
      <View style={styles.contactInfo}>
        <View style={styles.contactNameRow}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.contactTime}>{item.time}</Text>
        </View>
        <View style={styles.contactMessageRow}>
          <Text
            style={[styles.contactMessage, isMuted && styles.contactMessageMuted]}
            numberOfLines={1}
          >
            {isMuted ? '🔇 ' : ''}{item.message}
          </Text>
          {showUnread ? (
            isMuted ? (
              <View style={styles.unreadDot} />
            ) : (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {effectiveUnread > 99 ? '99+' : effectiveUnread}
                </Text>
              </View>
            )
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function MessagesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data: contacts, isLoading, refetch } = useContacts();
  const unreadLikes = useNotificationStore((s) => s.unreadLikes);
  const unreadFollowers = useNotificationStore((s) => s.unreadFollowers);
  const unreadComments = useNotificationStore((s) => s.unreadComments);
  const togglePin = useMessageStore((s) => s.togglePin);
  const toggleMute = useMessageStore((s) => s.toggleMute);
  const markAsUnread = useMessageStore((s) => s.markAsUnread);
  const markAsRead = useMessageStore((s) => s.markAsRead);
  const clearUnread = useMessageStore((s) => s.clearUnread);
  const pinnedContacts = useMessageStore((s) => s.pinnedContacts);
  const isPinned = useMessageStore((s) => s.isPinned);
  const isMuted = useMessageStore((s) => s.isMuted);
  const getEffectiveUnread = useMessageStore((s) => s.getEffectiveUnread);
  const markedUnreadContacts = useMessageStore((s) => s.markedUnreadContacts);
  const readContacts = useMessageStore((s) => s.readContacts);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSheetContact, setActionSheetContact] = useState<Contact | null>(null);

  const unreadCounts: Record<string, number> = {
    unreadLikes,
    unreadFollowers,
    unreadComments,
  };

  /* ── Filter & sort contacts: pinned first ── */
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    let list = contacts;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const aPinned = isPinned(a.name, a.pinned) ? 1 : 0;
      const bPinned = isPinned(b.name, b.pinned) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [contacts, searchQuery, pinnedContacts, isPinned]);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  const handleLongPress = useCallback((contact: Contact) => {
    setActionSheetContact(contact);
  }, []);

  const handleAvatarPress = useCallback(
    (contact: Contact) => {
      navigation.navigate('UserProfile', { userName: contact.name });
    },
    [navigation]
  );

  const handleActionToggleRead = useCallback(() => {
    if (actionSheetContact) {
      const effectiveCount = getEffectiveUnread(actionSheetContact.name, actionSheetContact.unread);
      if (effectiveCount > 0) {
        markAsRead(actionSheetContact.name);
      } else {
        markAsUnread(actionSheetContact.name);
        showSnackbar({ message: t('markedAsUnread'), type: 'info' });
      }
    }
    setActionSheetContact(null);
  }, [actionSheetContact, getEffectiveUnread, markAsRead, markAsUnread, showSnackbar, t]);

  const handleActionPin = useCallback(() => {
    if (actionSheetContact) {
      togglePin(actionSheetContact.name);
    }
    setActionSheetContact(null);
  }, [actionSheetContact, togglePin]);

  const handleActionMute = useCallback(() => {
    if (actionSheetContact) {
      toggleMute(actionSheetContact.name);
    }
    setActionSheetContact(null);
  }, [actionSheetContact, toggleMute]);

  /* ── List header: user avatar + notifications ── */
  const renderHeader = useCallback(() => {
    return (
      <View>
        {/* Notification entries */}
        <View style={styles.notifySection}>
          {NOTIFY_ENTRIES.map((entry) => {
            const count = unreadCounts[entry.countKey];
            return (
              <TouchableOpacity
                key={entry.key}
                style={styles.notifyCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(entry.key)}
              >
                <View style={styles.notifyIconSquare}>
                  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`} style={StyleSheet.absoluteFill}>
                    <Defs>
                      <RadialGradient id={entry.gradientId} cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor={entry.gradientColor} stopOpacity={0.45} />
                        <Stop offset="60%" stopColor={entry.gradientColor} stopOpacity={0.15} />
                        <Stop offset="100%" stopColor={entry.gradientColor} stopOpacity={0} />
                      </RadialGradient>
                    </Defs>
                    <SvgCircle cx={ICON_SIZE / 2} cy={ICON_SIZE / 2} r={ICON_SIZE / 2} fill={`url(#${entry.gradientId})`} />
                  </Svg>
                  {entry.icon}
                  {count > 0 && (
                    <View style={styles.notifyBadge}>
                      <Text style={styles.notifyBadgeText}>
                        {count > 99 ? '99+' : count}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.notifyLabel} numberOfLines={1}>
                  {t(entry.labelKey) || entry.labelKey}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section label */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('recentChats') || 'Recent Chats'}
          </Text>
        </View>
      </View>
    );
  }, [navigation, t, unreadCounts]);

  const renderContact = useCallback(
    ({ item }: { item: Contact }) => {
      const pinned = isPinned(item.name, item.pinned);
      const muted = isMuted(item.name);
      const effectiveUnread = getEffectiveUnread(item.name, item.unread);
      return (
        <ContactRow
          item={item}
          isPinned={pinned}
          isMuted={muted}
          effectiveUnread={effectiveUnread}
          onPress={() => {
            clearUnread(item.name);
            navigation.navigate('Chat', {
              contactName: item.name,
              contactAvatar: item.avatar,
            });
          }}
          onLongPress={() => handleLongPress(item)}
          onAvatarPress={() => handleAvatarPress(item)}
        />
      );
    },
    [navigation, isPinned, isMuted, getEffectiveUnread, markedUnreadContacts, readContacts, handleLongPress, handleAvatarPress, clearUnread]
  );

  /* ── Action sheet computed labels ── */
  const actionSheetPinned = actionSheetContact
    ? isPinned(actionSheetContact.name, actionSheetContact.pinned)
    : false;
  const actionSheetMuted = actionSheetContact
    ? isMuted(actionSheetContact.name)
    : false;
  const actionSheetHasUnread = actionSheetContact
    ? getEffectiveUnread(actionSheetContact.name, actionSheetContact.unread) > 0
    : false;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{t('messages')}</Text>
        <TouchableOpacity
          style={styles.topBarIconBtn}
          activeOpacity={0.6}
          onPress={toggleSearch}
        >
          {showSearch ? (
            <CloseIcon size={22} color={colors.onSurface} />
          ) : (
            <SearchIcon size={22} color={colors.onSurface} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search Bar (expandable) ── */}
      {showSearch && (
        <View style={styles.searchBar}>
          <SearchIcon size={18} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              t('searchMessagesPlaceholder') || 'Search messages...'
            }
            placeholderTextColor={colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <CloseIcon size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Main content ── */}
      {isLoading && !contacts ? (
        <MessageListSkeleton />
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.name}
          ListHeaderComponent={!showSearch ? renderHeader : undefined}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            showSearch && searchQuery.trim() ? (
              <EmptyState
                icon={
                  <SearchIcon size={36} color={colors.onSurfaceVariant} />
                }
                title={t('noSearchResults') || 'No results found'}
              />
            ) : (
              <EmptyState
                icon={
                  <MessageIcon size={36} color={colors.onSurfaceVariant} />
                }
                title={t('noMessages') || 'No messages yet'}
                message={
                  t('startChatHint') ||
                  'Start a conversation with someone!'
                }
              />
            )
          }
        />
      )}

      {/* ── Long-press Action Sheet Modal ── */}
      <Modal
        visible={!!actionSheetContact}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheetContact(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActionSheetContact(null)}
        >
          <View style={styles.actionSheet}>
            {actionSheetContact && (
              <Text style={styles.actionSheetTitle}>
                {actionSheetContact.name}
              </Text>
            )}

            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={handleActionToggleRead}
            >
              <Text style={styles.actionSheetText}>
                {actionSheetHasUnread ? t('markAsRead') : t('markAsUnread')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionSheetDivider} />

            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={handleActionPin}
            >
              <Text style={styles.actionSheetText}>
                {actionSheetPinned ? t('unpinChat') : t('pinChat')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionSheetDivider} />

            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={handleActionMute}
            >
              <Text style={styles.actionSheetText}>
                {actionSheetMuted ? t('unmuteChat') : t('muteChat')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionSheetDivider} />

            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={() => setActionSheetContact(null)}
            >
              <Text style={[styles.actionSheetText, { color: colors.onSurfaceVariant }]}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Top Bar ── */
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topBarTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: colors.onSurface,
    fontFamily: 'Poppins_900Black',
    letterSpacing: -0.5,
  },
  topBarIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Search Bar ── */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.onSurface,
    height: 44,
    padding: 0,
  },

  /* ── Notification section ── */
  notifySection: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  notifyCard: {
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 80,
  },
  notifyIconSquare: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  notifyBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background,
  },
  notifyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  notifyLabel: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  /* ── Section header ── */
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.onSurfaceVariant,
  },

  /* ── Contact list ── */
  listContent: {
    paddingBottom: 100,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  contactItemPinned: {
    backgroundColor: colors.surface3,
  },
  contactAvatarWrap: {
    position: 'relative',
  },
  contactInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    flex: 1,
    marginRight: spacing.sm,
  },
  contactTime: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  contactMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  contactMessage: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  contactMessageMuted: {
    color: colors.outline,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.outline,
  },

  /* ── Action Sheet Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 34,
    ...elevation[3],
  },
  actionSheetTitle: {
    ...typography.titleSmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  actionSheetItem: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  actionSheetText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  actionSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.lg,
  },
});
