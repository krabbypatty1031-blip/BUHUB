import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { userService } from '../api/services/user.service';
import { forumService } from '../api/services/forum.service';
import { useForumStore } from '../store/forumStore';
import type { User, FollowListItem, MyContent, UserPublicProfile, FollowerNotification, ForumCircleSummary } from '../types';

function normalizeHandle(handle: string | null | undefined): string {
  return (handle ?? '').trim().toLowerCase();
}

function isSameHandle(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = normalizeHandle(left);
  const b = normalizeHandle(right);
  return a.length > 0 && b.length > 0 && a === b;
}

function filterBlockedFollowList(
  list: FollowListItem[] | undefined,
  blockedUsers: Record<string, true>
): FollowListItem[] | undefined {
  if (!list) return list;
  const keys = Object.keys(blockedUsers);
  if (keys.length === 0) return list;

  const normalizedBlockedUsers = new Set(
    keys
      .map((userName) => normalizeHandle(userName))
      .filter((userName) => userName.length > 0)
  );

  return list.filter((item) => !normalizedBlockedUsers.has(normalizeHandle(item.userName)));
}

function applyFollowStateToFollowerNotifications(
  list: FollowerNotification[] | undefined,
  userName: string,
  followed: boolean
): FollowerNotification[] | undefined {
  if (!list) return list;
  return list.map((item) =>
    isSameHandle(item.userName ?? item.user, userName)
      ? {
          ...item,
          isFollowed: followed,
          // Mutual cannot survive me unfollowing. When I follow, defer to the
          // API's value (refetched on settle); we don't optimistically promote
          // to mutual because we don't know if they still follow me.
          isMutuallyFollowing: followed ? (item.isMutuallyFollowing ?? false) : false,
        }
      : item
  );
}

function buildFollowListItem(
  userName: string,
  publicProfile?: UserPublicProfile,
  followersList?: FollowListItem[]
): FollowListItem {
  const existingFollower = followersList?.find((item) => item.userName === userName);
  return {
    userName,
    nickname: existingFollower?.nickname ?? publicProfile?.nickname,
    avatar: existingFollower?.avatar ?? publicProfile?.avatar ?? '',
    gender: existingFollower?.gender ?? publicProfile?.gender ?? 'other',
    bio: existingFollower?.bio ?? publicProfile?.bio ?? '',
    major: existingFollower?.major ?? publicProfile?.major ?? '',
    grade: existingFollower?.grade ?? publicProfile?.grade ?? '',
    isFollowed: true,
  };
}

function applyFollowStateToCache(
  params: {
    userName: string;
    followed: boolean;
    publicProfile?: UserPublicProfile;
    followingList?: FollowListItem[];
    followersList?: FollowListItem[];
    followerNotifications?: FollowerNotification[];
    myContent?: MyContent;
  }
) {
  const {
    userName,
    followed,
    publicProfile,
    followingList,
    followersList,
    followerNotifications,
    myContent,
  } = params;

  if (publicProfile) {
    const nextFollowerCount = Math.max(
      0,
      (publicProfile.stats?.followerCount ?? 0) + (followed ? 1 : -1)
    );
    const isFollowedByThem = publicProfile.isFollowedByThem ?? false;
    return {
      publicProfile: {
        ...publicProfile,
        isFollowedByMe: followed,
        isMutuallyFollowing: followed && isFollowedByThem,
        stats: {
          ...publicProfile.stats,
          followerCount: nextFollowerCount,
        },
      },
      followingList: followingList
        ? followed
          ? followingList.some((item) => item.userName === userName)
            ? followingList.map((item) =>
                item.userName === userName
                  ? { ...item, isFollowed: true, isMutuallyFollowing: isFollowedByThem }
                  : item
              )
            : [
                {
                  ...buildFollowListItem(userName, publicProfile, followersList),
                  isMutuallyFollowing: isFollowedByThem,
                },
                ...followingList,
              ]
          : followingList.filter((item) => item.userName !== userName)
        : followingList,
      followersList: followersList
        ? followersList.map((item) =>
            item.userName === userName
              ? { ...item, isFollowed: followed, isMutuallyFollowing: followed }
              : item
          )
        : followersList,
      followerNotifications: applyFollowStateToFollowerNotifications(
        followerNotifications,
        userName,
        followed
      ),
      myContent: myContent
        ? {
            ...myContent,
            stats: {
              ...myContent.stats,
              following: Math.max(0, (myContent.stats?.following ?? 0) + (followed ? 1 : -1)),
            },
          }
        : myContent,
    };
  }

  return {
    publicProfile,
    followingList: followingList
      ? followed
        ? followingList.some((item) => item.userName === userName)
          ? followingList.map((item) =>
              item.userName === userName ? { ...item, isFollowed: true } : item
            )
          : [buildFollowListItem(userName, undefined, followersList), ...followingList]
        : followingList.filter((item) => item.userName !== userName)
      : followingList,
    followersList: followersList
      ? followersList.map((item) =>
          item.userName === userName
            ? { ...item, isFollowed: followed, isMutuallyFollowing: followed }
            : item
        )
      : followersList,
    followerNotifications: applyFollowStateToFollowerNotifications(
      followerNotifications,
      userName,
      followed
    ),
    myContent: myContent
      ? {
          ...myContent,
          stats: {
            ...myContent.stats,
            following: Math.max(0, (myContent.stats?.following ?? 0) + (followed ? 1 : -1)),
          },
        }
      : myContent,
  };
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => userService.getProfile(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useMyContent() {
  return useQuery({
    queryKey: ['myContent'],
    queryFn: () => userService.getMyContent(),
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: Partial<User>) => userService.updateProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function usePublicProfile(userName: string) {
  return useQuery({
    queryKey: ['publicProfile', userName],
    queryFn: () => userService.getPublicProfile(userName),
    enabled: userName.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFollowingList(options?: { enabled?: boolean }) {
  const blockedUsers = useForumStore((s) => s.blockedUsers);
  return useQuery({
    queryKey: ['followingList'],
    queryFn: () => userService.getFollowingList(),
    enabled: options?.enabled ?? true,
    select: (data: FollowListItem[]) => filterBlockedFollowList(data, blockedUsers) ?? [],
  });
}

export function useFollowersList(options?: { enabled?: boolean }) {
  const blockedUsers = useForumStore((s) => s.blockedUsers);
  return useQuery({
    queryKey: ['followersList'],
    queryFn: () => userService.getFollowersList(),
    enabled: options?.enabled ?? true,
    select: (data: FollowListItem[]) => filterBlockedFollowList(data, blockedUsers) ?? [],
  });
}

export function useFollowedCircles(options?: { enabled?: boolean }) {
  return useQuery<ForumCircleSummary[]>({
    queryKey: ['followedCircles'],
    queryFn: () => forumService.getCircles({ followedOnly: true }),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userName: string) => userService.followUser(userName),
    onMutate: async (userName) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['publicProfile', userName] }),
        queryClient.cancelQueries({ queryKey: ['followingList'] }),
        queryClient.cancelQueries({ queryKey: ['followersList'] }),
        queryClient.cancelQueries({ queryKey: ['notifications', 'followers'] }),
        queryClient.cancelQueries({ queryKey: ['myContent'] }),
      ]);

      const previousPublicProfile = queryClient.getQueryData<UserPublicProfile>(['publicProfile', userName]);
      const previousFollowingList = queryClient.getQueryData<FollowListItem[]>(['followingList']);
      const previousFollowersList = queryClient.getQueryData<FollowListItem[]>(['followersList']);
      const previousFollowerNotifications = queryClient.getQueryData<FollowerNotification[]>(['notifications', 'followers']);
      const previousMyContent = queryClient.getQueryData<MyContent>(['myContent']);

      const currentlyFollowed =
        previousPublicProfile?.isFollowedByMe ??
        previousFollowingList?.some((item) => item.userName === userName) ??
        previousFollowersList?.find((item) => item.userName === userName)?.isFollowed ??
        previousFollowerNotifications?.find((item) => isSameHandle(item.userName ?? item.user, userName))?.isFollowed ??
        false;
      const nextFollowed = !currentlyFollowed;

      const next = applyFollowStateToCache({
        userName,
        followed: nextFollowed,
        publicProfile: previousPublicProfile,
        followingList: previousFollowingList,
        followersList: previousFollowersList,
        followerNotifications: previousFollowerNotifications,
        myContent: previousMyContent,
      });

      if (previousPublicProfile) {
        queryClient.setQueryData(['publicProfile', userName], next.publicProfile);
      }
      if (previousFollowingList) {
        queryClient.setQueryData(['followingList'], next.followingList);
      }
      if (previousFollowersList) {
        queryClient.setQueryData(['followersList'], next.followersList);
      }
      if (previousFollowerNotifications) {
        queryClient.setQueryData(['notifications', 'followers'], next.followerNotifications);
      }
      if (previousMyContent) {
        queryClient.setQueryData(['myContent'], next.myContent);
      }

      // When unfollowing, optimistically empty the target's posts cache so any
      // active UserProfileScreen for them immediately stops showing posts (in
      // case they have a MUTUAL profile that now becomes invisible). The next
      // refetch (in onSettled) restores the canonical state from the server.
      if (!nextFollowed) {
        queryClient.removeQueries({ queryKey: ['userPosts', userName], exact: false });
      }

      return {
        userName,
        previousPublicProfile,
        previousFollowingList,
        previousFollowersList,
        previousFollowerNotifications,
        previousMyContent,
      };
    },
    onError: (_error, _userName, context) => {
      if (!context) return;
      const {
        userName,
        previousPublicProfile,
        previousFollowingList,
        previousFollowersList,
        previousFollowerNotifications,
        previousMyContent,
      } = context;

      if (previousPublicProfile) {
        queryClient.setQueryData(['publicProfile', userName], previousPublicProfile);
      }
      if (previousFollowingList) {
        queryClient.setQueryData(['followingList'], previousFollowingList);
      }
      if (previousFollowersList) {
        queryClient.setQueryData(['followersList'], previousFollowersList);
      }
      if (previousFollowerNotifications) {
        queryClient.setQueryData(['notifications', 'followers'], previousFollowerNotifications);
      }
      if (previousMyContent) {
        queryClient.setQueryData(['myContent'], previousMyContent);
      }
    },
    onSuccess: (result, userName) => {
      const currentPublicProfile = queryClient.getQueryData<UserPublicProfile>(['publicProfile', userName]);
      const currentFollowingList = queryClient.getQueryData<FollowListItem[]>(['followingList']);
      const currentFollowersList = queryClient.getQueryData<FollowListItem[]>(['followersList']);
      const currentFollowerNotifications = queryClient.getQueryData<FollowerNotification[]>(['notifications', 'followers']);
      const currentMyContent = queryClient.getQueryData<MyContent>(['myContent']);

      const currentFollowed =
        currentPublicProfile?.isFollowedByMe ??
        currentFollowingList?.some((item) => item.userName === userName) ??
        currentFollowersList?.find((item) => item.userName === userName)?.isFollowed ??
        currentFollowerNotifications?.find((item) => isSameHandle(item.userName ?? item.user, userName))?.isFollowed ??
        false;

      if (result.followed !== currentFollowed) {
        const next = applyFollowStateToCache({
          userName,
          followed: result.followed,
          publicProfile: currentPublicProfile,
          followingList: currentFollowingList,
          followersList: currentFollowersList,
          followerNotifications: currentFollowerNotifications,
          myContent: currentMyContent,
        });

        if (currentPublicProfile) {
          queryClient.setQueryData(['publicProfile', userName], next.publicProfile);
        }
        if (currentFollowingList) {
          queryClient.setQueryData(['followingList'], next.followingList);
        }
        if (currentFollowersList) {
          queryClient.setQueryData(['followersList'], next.followersList);
        }
        if (currentFollowerNotifications) {
          queryClient.setQueryData(['notifications', 'followers'], next.followerNotifications);
        }
        if (currentMyContent) {
          queryClient.setQueryData(['myContent'], next.myContent);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['followingList'] });
      queryClient.invalidateQueries({ queryKey: ['followersList'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'followers'] });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  const blockUser = useForumStore((s) => s.blockUser);
  const unblockUser = useForumStore((s) => s.unblockUser);
  return useMutation({
    mutationFn: (userName: string) => userService.blockUser(userName),
    onMutate: async (userName) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['followingList'] }),
        queryClient.cancelQueries({ queryKey: ['followersList'] }),
        queryClient.cancelQueries({ queryKey: ['myContent'] }),
      ]);

      blockUser(userName);

      const previousFollowingList = queryClient.getQueryData<FollowListItem[]>(['followingList']);
      const previousFollowersList = queryClient.getQueryData<FollowListItem[]>(['followersList']);
      const previousMyContent = queryClient.getQueryData<MyContent>(['myContent']);

      const wasFollowing = previousFollowingList?.some((item) => isSameHandle(item.userName, userName)) ?? false;
      const wasFollower = previousFollowersList?.some((item) => isSameHandle(item.userName, userName)) ?? false;

      const nextFollowingList = previousFollowingList?.filter((item) => !isSameHandle(item.userName, userName));
      const nextFollowersList = previousFollowersList?.filter((item) => !isSameHandle(item.userName, userName));

      if (previousFollowingList) {
        queryClient.setQueryData(['followingList'], nextFollowingList);
      }
      if (previousFollowersList) {
        queryClient.setQueryData(['followersList'], nextFollowersList);
      }
      if (previousMyContent) {
        queryClient.setQueryData<MyContent>(['myContent'], {
          ...previousMyContent,
          stats: {
            ...previousMyContent.stats,
            following: Math.max(0, previousMyContent.stats.following - (wasFollowing ? 1 : 0)),
            followers: Math.max(0, previousMyContent.stats.followers - (wasFollower ? 1 : 0)),
          },
        });
      }

      return {
        previousFollowingList,
        previousFollowersList,
        previousMyContent,
      };
    },
    onError: (_err, userName, context) => {
      unblockUser(userName);

      if (context?.previousFollowingList) {
        queryClient.setQueryData(['followingList'], context.previousFollowingList);
      }
      if (context?.previousFollowersList) {
        queryClient.setQueryData(['followersList'], context.previousFollowersList);
      }
      if (context?.previousMyContent) {
        queryClient.setQueryData(['myContent'], context.previousMyContent);
      }
    },
    onSuccess: (_data, userName) => {
      queryClient.invalidateQueries({ queryKey: ['blockedList'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['followingList'] });
      queryClient.invalidateQueries({ queryKey: ['followersList'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
      queryClient.invalidateQueries({ queryKey: ['publicProfile', userName] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  const blockUser = useForumStore((s) => s.blockUser);
  const unblockUser = useForumStore((s) => s.unblockUser);
  return useMutation({
    mutationFn: (userName: string) => userService.unblockUser(userName),
    onMutate: (userName) => {
      unblockUser(userName);
    },
    onError: (_err, userName) => {
      blockUser(userName);
    },
    onSuccess: (_data, userName) => {
      queryClient.invalidateQueries({ queryKey: ['blockedList'] });
      queryClient.invalidateQueries({ queryKey: ['followingList'] });
      queryClient.invalidateQueries({ queryKey: ['followersList'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['publicProfile', userName] });
    },
  });
}

export function useBlockedList() {
  return useQuery<FollowListItem[]>({
    queryKey: ['blockedList'],
    queryFn: () => userService.getBlockedList(),
  });
}
