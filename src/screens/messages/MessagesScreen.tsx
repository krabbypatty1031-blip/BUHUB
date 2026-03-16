import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { Contact } from '../../types';
import { useContacts, useMessageSearch } from '../../hooks/useMessages';
import { useBlockUser, useBlockedList } from '../../hooks/useUser';
import { messageService } from '../../api/services/message.service';
import { normalizeLanguage } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useForumStore } from '../../store/forumStore';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { MessageListSkeleton } from '../../components/common/Skeleton';
import {
  HeartIcon,
  UserIcon,
  CommentIcon,
  SearchIcon,
  CloseIcon,
  MessageIcon,
} from '../../components/common/icons';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';

type Props = NativeStackScreenProps<MessagesStackParamList, 'MessagesList'>;

interface NotifyEntry {
  key: 'NotifyLikes' | 'NotifyFollowers' | 'NotifyComments';
  icon: React.ReactNode;
  labelKey: string;
  countKey: 'unreadLikes' | 'unreadFollowers' | 'unreadComments';
}

const ICON_SIZE = 60;
const NOTIFY_ICON_SIZE = 32;

const NOTIFY_ENTRIES: NotifyEntry[] = [
  {
    key: 'NotifyLikes',
    icon: <HeartIcon size={NOTIFY_ICON_SIZE} color="#FF6B7A" fill="#FF6B7A" />,
    labelKey: 'likeNotifications',
    countKey: 'unreadLikes',
  },
  {
    key: 'NotifyFollowers',
    icon: <UserIcon size={NOTIFY_ICON_SIZE} color="#4A90FF" />,
    labelKey: 'followerNotifications',
    countKey: 'unreadFollowers',
  },
  {
    key: 'NotifyComments',
    icon: <CommentIcon size={NOTIFY_ICON_SIZE} color="#4CD964" fill="#4CD964" />,
    labelKey: 'commentNotifications',
    countKey: 'unreadComments',
  },
];

function resolveContactActivityTs(contact: Contact): number {
  if (typeof contact.lastMessageAt === 'string' && contact.lastMessageAt.length > 0) {
    const parsed = Date.parse(contact.lastMessageAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/* Memoized contact row */
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
            {isMuted ? '\u{1F507} ' : ''}{item.message}
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
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const language = useAuthStore((s) => s.language);
  const normalizedLanguage = normalizeLanguage(language) ?? 'tc';
  const { data: contacts, isLoading, isFetching, refetch } = useContacts({ polling: isFocused });
  const unreadLikes = useNotificationStore((s) => s.unreadLikes);
  const unreadFollowers = useNotificationStore((s) => s.unreadFollowers);
  const unreadComments = useNotificationStore((s) => s.unreadComments);
  const togglePin = useMessageStore((s) => s.togglePin);
  const toggleMute = useMessageStore((s) => s.toggleMute);
  const markAsUnread = useMessageStore((s) => s.markAsUnread);
  const markConversationAsRead = useMessageStore((s) => s.markAsRead);
  const clearUnread = useMessageStore((s) => s.clearUnread);
  const markInboxSeen = useMessageStore((s) => s.markInboxSeen);
  const pinnedContacts = useMessageStore((s) => s.pinnedContacts);
  const isPinned = useMessageStore((s) => s.isPinned);
  const isMuted = useMessageStore((s) => s.isMuted);
  const getEffectiveUnread = useMessageStore((s) => s.getEffectiveUnread);
  const getEffectiveTabUnread = useMessageStore((s) => s.getEffectiveTabUnread);
  const markedUnreadContacts = useMessageStore((s) => s.markedUnreadContacts);
  const readContacts = useMessageStore((s) => s.readContacts);
  const inboxSeenContacts = useMessageStore((s) => s.inboxSeenContacts);
  const setUnreadMessages = useNotificationStore((s) => s.setUnreadMessages);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const blockedUsers = useForumStore((s) => s.blockedUsers);
  const isBlocked = useForumStore((s) => s.isBlocked);
  const setBlockedUsers = useForumStore((s) => s.setBlockedUsers);
  const blockUserMutation = useBlockUser();
  const { data: blockedList } = useBlockedList();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSheetContact, setActionSheetContact] = useState<Contact | null>(null);
  const shouldSnapshotInboxSeenRef = useRef(false);
  const normalizedSearchQuery = searchQuery.trim();
  const { data: searchedContacts } = useMessageSearch(normalizedSearchQuery, {
    enabled: showSearch && normalizedSearchQuery.length > 0,
  });

  useEffect(() => {
    if (!blockedList) return;
    setBlockedUsers(blockedList.map((u) => u.userName));
  }, [blockedList, setBlockedUsers]);

  useEffect(() => {
    if (!contacts) {
      setUnreadMessages(0);
      return;
    }
    const unreadMessageCount = contacts.reduce(
      (count, contact) => count + getEffectiveTabUnread(contact.id, contact.unread),
      0
    );
    setUnreadMessages(unreadMessageCount);
  }, [
    contacts,
    getEffectiveTabUnread,
    markedUnreadContacts,
    readContacts,
    inboxSeenContacts,
    setUnreadMessages,
  ]);

  useFocusEffect(
    useCallback(() => {
      shouldSnapshotInboxSeenRef.current = true;
      void queryClient.refetchQueries({ queryKey: ['notifications', 'unreadCount'], type: 'active' });
      void refetch();
      return () => {
        shouldSnapshotInboxSeenRef.current = false;
      };
    }, [queryClient, refetch])
  );

  useEffect(() => {
    if (!isFocused || !contacts || isFetching) return;
    if (!shouldSnapshotInboxSeenRef.current) return;
    shouldSnapshotInboxSeenRef.current = false;
    const unreadContactIds = contacts
      .filter((contact) => getEffectiveUnread(contact.id, contact.unread) > 0)
      .map((contact) => contact.id);
    markInboxSeen(unreadContactIds);
  }, [contacts, getEffectiveUnread, isFetching, isFocused, markInboxSeen]);

  const unreadCounts: Record<string, number> = {
    unreadLikes,
    unreadFollowers,
    unreadComments,
  };

  /* Filter & sort contacts: pinned first (skip pin sort when searching) */
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    const visible = contacts.filter((c) => !isBlocked(c.userName ?? c.name));
    if (showSearch) {
      const q = normalizedSearchQuery.toLowerCase();
      if (q.length > 0) {
        const localMatches = visible.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.userName ?? '').toLowerCase().includes(q) ||
            c.message.toLowerCase().includes(q)
        );
        const remoteMatches = (searchedContacts ?? []).filter(
          (c) => !isBlocked(c.userName ?? c.name)
        );
        const mergedMatches = new Map<string, Contact>();

        localMatches.forEach((contact) => {
          mergedMatches.set(contact.id, contact);
        });
        remoteMatches.forEach((contact) => {
          if (!mergedMatches.has(contact.id)) {
            mergedMatches.set(contact.id, contact);
          }
        });

        return Array.from(mergedMatches.values()).sort(
          (a, b) => resolveContactActivityTs(b) - resolveContactActivityTs(a)
        );
      }
      return [...visible].sort(
        (a, b) => resolveContactActivityTs(b) - resolveContactActivityTs(a)
      );
    }
    return [...visible].sort((a, b) => {
      const aPinned = isPinned(a.id, a.pinned) ? 1 : 0;
      const bPinned = isPinned(b.id, b.pinned) ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return resolveContactActivityTs(b) - resolveContactActivityTs(a);
    });
  }, [
    contacts,
    showSearch,
    normalizedSearchQuery,
    searchedContacts,
    pinnedContacts,
    isPinned,
    blockedUsers,
    isBlocked,
  ]);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  const handleLongPress = useCallback((contact: Contact) => {
    setActionSheetContact(contact);
  }, []);

  const currentUser = useAuthStore((s) => s.user);

  const handleAvatarPress = useCallback(
    (contact: Contact) => {
      handleAvatarPressNavigation({
        navigation,
        currentUser,
        userName: contact.userName,
        displayName: contact.name,
      });
    },
    [navigation, currentUser]
  );

  const handleActionToggleRead = useCallback(() => {
    if (actionSheetContact) {
      const effectiveCount = getEffectiveUnread(actionSheetContact.id, actionSheetContact.unread);
      if (effectiveCount > 0) {
        markConversationAsRead(actionSheetContact.id);
      } else {
        markAsUnread(actionSheetContact.id);
        showSnackbar({ message: t('markedAsUnread'), type: 'info' });
      }
    }
    setActionSheetContact(null);
  }, [actionSheetContact, getEffectiveUnread, markConversationAsRead, markAsUnread, showSnackbar, t]);

  const handleOpenNotification = useCallback(
    (entry: NotifyEntry) => {
      navigation.navigate(entry.key);
    },
    [navigation]
  );

  const handleActionPin = useCallback(() => {
    if (actionSheetContact) {
      togglePin(actionSheetContact.id);
    }
    setActionSheetContact(null);
  }, [actionSheetContact, togglePin]);

  const handleActionMute = useCallback(() => {
    if (actionSheetContact) {
      toggleMute(actionSheetContact.id);
    }
    setActionSheetContact(null);
  }, [actionSheetContact, toggleMute]);

  const handleActionBlock = useCallback(() => {
    if (actionSheetContact) {
      const blockHandle = actionSheetContact.userName ?? actionSheetContact.name;
      setActionSheetContact(null);
      Alert.alert(t('blockContact'), t('blockContactConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirmBtn'),
          style: 'destructive',
          onPress: () => {
            blockUserMutation.mutate(blockHandle);
            showSnackbar({ message: t('blocked'), type: 'success' });
          },
        },
      ]);
    } else {
      setActionSheetContact(null);
    }
  }, [actionSheetContact, blockUserMutation, showSnackbar, t]);

  /* List header: user avatar + notifications */
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
                onPress={() => handleOpenNotification(entry)}
              >
                <View style={styles.notifyIconSquare}>
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
                  {t(entry.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section label */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('recentChats')}
          </Text>
        </View>
      </View>
    );
  }, [handleOpenNotification, t, unreadCounts]);

  const renderContact = useCallback(
    ({ item }: { item: Contact }) => {
      const pinned = showSearch ? false : isPinned(item.id, item.pinned);
      const muted = isMuted(item.id);
      const effectiveUnread = getEffectiveUnread(item.id, item.unread);
      return (
        <ContactRow
          item={item}
          isPinned={pinned}
          isMuted={muted}
          effectiveUnread={effectiveUnread}
          onPress={() => {
            clearUnread(item.id);
            void queryClient.prefetchQuery({
              queryKey: ['chat', item.id, normalizedLanguage],
              queryFn: () => messageService.getChatHistory(item.id),
              staleTime: 60 * 1000,
            });
            void queryClient.prefetchQuery({
              queryKey: ['chat-can-send', item.id],
              queryFn: () => messageService.canSendMessage(item.id),
              staleTime: 60 * 1000,
            });
            void queryClient.prefetchQuery({
              queryKey: ['presence', item.id],
              queryFn: () => messageService.getPresence(item.id),
              staleTime: 10 * 1000,
            });
            navigation.navigate('Chat', {
              contactId: item.id,
              contactName: item.name,
              contactAvatar: item.avatar,
            });
          }}
          onLongPress={() => handleLongPress(item)}
          onAvatarPress={() => handleAvatarPress(item)}
        />
      );
    },
    [navigation, isPinned, isMuted, getEffectiveUnread, markedUnreadContacts, readContacts, handleLongPress, handleAvatarPress, clearUnread, queryClient, normalizedLanguage, showSearch]
  );

  /* Action sheet computed labels */
  const actionSheetPinned = actionSheetContact
    ? isPinned(actionSheetContact.id, actionSheetContact.pinned)
    : false;
  const actionSheetMuted = actionSheetContact
    ? isMuted(actionSheetContact.id)
    : false;
  const actionSheetHasUnread = actionSheetContact
    ? getEffectiveUnread(actionSheetContact.id, actionSheetContact.unread) > 0
    : false;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{t('messages')}</Text>
        <TouchableOpacity
          style={styles.topBarIconBtn}
          activeOpacity={0.6}
          onPress={toggleSearch}
        >
          {showSearch ? (
            <CloseIcon size={24} color={colors.onSurface} />
          ) : (
            <SearchIcon size={24} color={colors.onSurface} />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar (expandable) */}
      {showSearch && (
        <View style={styles.searchBar}>
          <SearchIcon size={18} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchMessagesPlaceholder')}
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

      {/* Main content */}
      {isLoading && !contacts ? (
        <MessageListSkeleton />
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={!showSearch ? renderHeader : undefined}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            showSearch && searchQuery.trim() ? (
              <EmptyState
                icon={
                  <SearchIcon size={36} color={colors.onSurfaceVariant} />
                }
                title={t('noSearchResults')}
              />
            ) : (
              <EmptyState
                icon={
                  <MessageIcon size={36} color={colors.onSurfaceVariant} />
                }
                title={t('noMessages')}
              />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.contactSeparator} />}
        />
      )}

      {/* Long-press Action Sheet Modal */}
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
              onPress={handleActionBlock}
            >
              <Text style={[styles.actionSheetText, { color: colors.error }]}>
                {t('blockContact')}
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

  /* Top Bar */
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
    fontFamily: 'SourceHanSansCN-Bold',
    letterSpacing: -0.5,
  },
  topBarIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Search Bar */
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

  /* Notification section */
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
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
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
    color: colors.onSurface,
    textAlign: 'center',
  },

  /* Section header */
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },

  /* Contact list */
  listContent: {
    flexGrow: 1,
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
  contactSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginLeft: 76,
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

  /* Action Sheet Modal */
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
