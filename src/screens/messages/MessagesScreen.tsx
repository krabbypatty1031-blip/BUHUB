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
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { Contact } from '../../types';
import { useContacts, useDeleteConversation, useMessageSearch } from '../../hooks/useMessages';
import { useBlockUser, useBlockedList } from '../../hooks/useUser';
import { messageService } from '../../api/services/message.service';
import { normalizeLanguage } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useForumStore } from '../../store/forumStore';
import { useUIStore } from '../../store/uiStore';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import SwipeableBottomSheet from '../../components/common/SwipeableBottomSheet';
import { MessageListSkeleton } from '../../components/common/Skeleton';
import {
  CloseIcon,
  MessageIcon,
} from '../../components/common/icons';
import {
  FigmaSearchIcon,
  FigmaHeartIcon,
  FigmaNewFollowerIcon,
  FigmaCommentIcon,
} from '../../components/messages/MessagesFigmaIcons';
import { handleAvatarPressNavigation } from '../../utils/profileNavigation';
import { peekCachedChatHistory } from '../../utils/messageCache';

type Props = NativeStackScreenProps<MessagesStackParamList, 'MessagesList'>;

interface NotifyEntry {
  key: 'NotifyLikes' | 'NotifyFollowers' | 'NotifyComments';
  icon: React.ReactNode;
  labelKey: string;
  countKey: 'unreadLikes' | 'unreadFollowers' | 'unreadComments';
}

const NOTIFY_ICON_SIZE = 30;

const NOTIFY_ENTRIES: NotifyEntry[] = [
  {
    key: 'NotifyLikes',
    icon: <FigmaHeartIcon size={NOTIFY_ICON_SIZE} />,
    labelKey: 'likeNotifications',
    countKey: 'unreadLikes',
  },
  {
    key: 'NotifyFollowers',
    icon: <FigmaNewFollowerIcon size={NOTIFY_ICON_SIZE} />,
    labelKey: 'followerNotifications',
    countKey: 'unreadFollowers',
  },
  {
    key: 'NotifyComments',
    icon: <FigmaCommentIcon size={NOTIFY_ICON_SIZE} />,
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
        <Avatar text={item.name} uri={item.avatar || null} size="ml" gender={item.gender} />
        {showUnread && <View style={styles.avatarUnreadDot} />}
      </TouchableOpacity>
      <View style={styles.contactContent}>
        <View style={styles.contactTextCol}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text
            style={[styles.contactMessage, isMuted && styles.contactMessageMuted]}
            numberOfLines={1}
          >
            {isMuted ? '\u{1F507} ' : ''}{item.message}
          </Text>
        </View>
        <Text style={styles.contactTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function MessagesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const language = useAuthStore((s) => s.language);
  const currentUserId = useAuthStore((s) => s.user?.id);
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
  const deleteConversationMutation = useDeleteConversation();
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

  // Prefetch chat history + canSendMessage for top contacts
  // so entering a chat feels instant
  const prefetchedContactsRef = useRef(new Set<string>());
  useEffect(() => {
    if (!contacts || contacts.length === 0) return;
    const topContacts = contacts.slice(0, 8);
    for (const contact of topContacts) {
      if (prefetchedContactsRef.current.has(contact.id)) continue;
      const existingHistory = queryClient.getQueryData(['chat', contact.id, normalizedLanguage]);
      const persistedHistory =
        currentUserId
          ? peekCachedChatHistory(currentUserId, normalizedLanguage, contact.id)
          : undefined;
      const existingHistoryCount = Array.isArray(existingHistory)
        ? existingHistory.reduce((sum, group) => sum + group.messages.length, 0)
        : 0;
      const persistedHistoryCount = Array.isArray(persistedHistory)
        ? persistedHistory.reduce((sum, group) => sum + group.messages.length, 0)
        : 0;
      if (existingHistoryCount > 0 || persistedHistoryCount > 0) {
        continue;
      }
      prefetchedContactsRef.current.add(contact.id);
      // Prefetch chat history
      void queryClient.prefetchQuery({
        queryKey: ['chat', contact.id, normalizedLanguage],
        queryFn: () => messageService.getChatHistory(contact.id),
        staleTime: 30 * 1000,
      });
      // Prefetch canSendMessage
      void queryClient.prefetchQuery({
        queryKey: ['chat-can-send', contact.id],
        queryFn: () => messageService.canSendMessage(contact.id),
        staleTime: 60 * 1000,
      });
    }
  }, [contacts, currentUserId, normalizedLanguage, queryClient]);

  const lastRefetchRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      shouldSnapshotInboxSeenRef.current = true;
      void queryClient.refetchQueries({ queryKey: ['notifications', 'unreadCount'], type: 'active' });
      const now = Date.now();
      if (now - lastRefetchRef.current > 10_000) {
        lastRefetchRef.current = now;
        void refetch();
      }
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
        cachedAvatar: contact.avatar,
        cachedNickname: contact.name,
        cachedGender: contact.gender,
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

  const handleActionDeleteConversation = useCallback(() => {
    if (!actionSheetContact) {
      setActionSheetContact(null);
      return;
    }

    const targetContact = actionSheetContact;
    setActionSheetContact(null);
    Alert.alert(t('deleteConversation'), t('deleteConversationConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirmBtn'),
        style: 'destructive',
        onPress: () => {
          deleteConversationMutation.mutate(targetContact.id, {
            onSuccess: () => {
              showSnackbar({ message: t('conversationDeleted'), type: 'success' });
            },
          });
        },
      },
    ]);
  }, [actionSheetContact, deleteConversationMutation, showSnackbar, t]);

  /* List header: user avatar + notifications */
  const renderHeader = useCallback(() => {
    return (
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
              <View style={styles.notifyIconWrap}>
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
            <CloseIcon size={30} color="#010101" />
          ) : (
            <FigmaSearchIcon size={30} />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar (expandable) */}
      {showSearch && (
        <View style={styles.searchBar}>
          <FigmaSearchIcon size={18} color="#999999" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchMessagesPlaceholder')}
            placeholderTextColor={'#999999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <CloseIcon size={18} color={'#999999'} />
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
                  <FigmaSearchIcon size={36} color="#999999" />
                }
                title={t('noSearchResults')}
              />
            ) : (
              <EmptyState
                icon={
                  <MessageIcon size={36} color={'#999999'} />
                }
                title={t('noMessages')}
              />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.contactSeparator} />}
          ListFooterComponent={
            filteredContacts.length === 1 ? <View style={styles.contactSeparator} /> : null
          }
        />
      )}

      {/* Long-press Action Sheet Modal */}
      <SwipeableBottomSheet visible={!!actionSheetContact} onClose={() => setActionSheetContact(null)}>
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
              onPress={handleActionDeleteConversation}
            >
              <Text style={[styles.actionSheetText, { color: '#ED4956' }]}>
                {t('deleteConversation')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionSheetDivider} />

            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={handleActionBlock}
            >
              <Text style={[styles.actionSheetText, { color: '#ED4956' }]}>
                {t('blockContact')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionSheetDivider} />

            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={() => setActionSheetContact(null)}
            >
              <Text style={[styles.actionSheetText, { color: '#999999' }]}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
      </SwipeableBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Top Bar — Figma: title left:20 top:68, icon left:330 top:76 */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 16,
    paddingLeft: 20,
    paddingRight: 30,
  },
  topBarTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
    includeFontPadding: false,
  },
  topBarIconBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
    height: 44,
    padding: 0,
  },

  /* Notification section — Figma: 3 cards gap:19, centered, top:150 */
  notifySection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 19,
    paddingTop: 32,
    paddingBottom: 32,
  },
  notifyCard: {
    width: 96,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 12,
    gap: Platform.OS === 'android' ? 4 : 6,
  },
  notifyIconWrap: {
    width: 30,
    height: 30,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ED4956',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notifyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifyLabel: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#000000',
    textAlign: 'center',
  },

  /* Contact list */
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  /* Figma: left:20, py:16, gap:11, avatar 50px */
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 11,
  },
  contactItemPinned: {
    backgroundColor: '#EEEEEE',
  },
  contactSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  /* Figma: avatar 50px with unread dot at right:4 top:2 */
  contactAvatarWrap: {
    position: 'relative',
    width: 50,
    height: 50,
  },
  avatarUnreadDot: {
    position: 'absolute',
    right: 0,
    top: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E35B49',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  /* Figma: row with items-start, left column + time */
  contactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactTextCol: {
    flex: 1,
    gap: 7,
    marginRight: 8,
  },
  /* Figma: 14px Bold #3F3F41 */
  contactName: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#3F3F41',
    includeFontPadding: false,
  },
  /* Figma: 12px Regular #999 */
  contactMessage: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#999999',
    includeFontPadding: false,
  },
  contactMessageMuted: {
    color: '#C7C7CC',
  },
  /* Figma: 13px Regular #999, text-right, aligned top */
  contactTime: {
    fontSize: 13,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#999999',
  },

  /* Action Sheet Modal */
  actionSheetTitle: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  actionSheetItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  actionSheetText: {
    fontSize: 16,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },
  actionSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginHorizontal: 16,
  },
});
