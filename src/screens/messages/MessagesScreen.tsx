import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { Contact } from '../../types';
import { useContacts } from '../../hooks/useMessages';
import { useNotificationStore } from '../../store/notificationStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import { MessageListSkeleton } from '../../components/common/Skeleton';
import {
  HeartIcon,
  UsersIcon,
  CommentIcon,
  PinIcon,
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
  bgColor: string;
}

const NOTIFY_ENTRIES: NotifyEntry[] = [
  {
    key: 'NotifyLikes',
    icon: <HeartIcon size={18} color={colors.white} />,
    labelKey: 'likeNotifications',
    countKey: 'unreadLikes',
    bgColor: colors.error,
  },
  {
    key: 'NotifyFollowers',
    icon: <UsersIcon size={18} color={colors.white} />,
    labelKey: 'followerNotifications',
    countKey: 'unreadFollowers',
    bgColor: colors.primary,
  },
  {
    key: 'NotifyComments',
    icon: <CommentIcon size={18} color={colors.white} />,
    labelKey: 'commentNotifications',
    countKey: 'unreadComments',
    bgColor: colors.tertiary,
  },
];

/* ── Memoized contact row ── */
const ContactRow = React.memo(function ContactRow({
  item,
  onPress,
}: {
  item: Contact;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.contactItem}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.contactAvatarWrap}>
        <Avatar text={item.name} uri={item.avatar || null} size="md" gender={item.gender} />
        {item.pinned && (
          <View style={styles.pinIndicator}>
            <PinIcon size={10} color={colors.onSurfaceVariant} />
          </View>
        )}
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.contactNameRow}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.contactTime}>{item.time}</Text>
        </View>
        <View style={styles.contactMessageRow}>
          <Text style={styles.contactMessage} numberOfLines={1}>
            {item.message}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unread > 99 ? '99+' : item.unread}
              </Text>
            </View>
          )}
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCounts: Record<string, number> = {
    unreadLikes,
    unreadFollowers,
    unreadComments,
  };

  /* ── Filter contacts by search query ── */
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.trim().toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.message.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

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
                <View
                  style={[
                    styles.notifyIconCircle,
                    { backgroundColor: entry.bgColor },
                  ]}
                >
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
    ({ item }: { item: Contact }) => (
      <ContactRow
        item={item}
        onPress={() =>
          navigation.navigate('Chat', {
            contactName: item.name,
            contactAvatar: item.avatar,
          })
        }
      />
    ),
    [navigation]
  );

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
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: '700',
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
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  notifyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 72,
  },
  notifyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...typography.labelSmall,
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
  contactAvatarWrap: {
    position: 'relative',
  },
  pinIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
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
});
