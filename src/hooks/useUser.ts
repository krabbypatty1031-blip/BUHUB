import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../api/services/user.service';
import { useForumStore } from '../store/forumStore';
import type { User, Language, FollowListItem } from '../types';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => userService.getProfile(),
  });
}

export function useMyContent() {
  return useQuery({
    queryKey: ['myContent'],
    queryFn: () => userService.getMyContent(),
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

export function useUpdateLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (language: Language) => userService.updateLanguage(language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function usePublicProfile(userName: string) {
  return useQuery({
    queryKey: ['publicProfile', userName],
    queryFn: () => userService.getPublicProfile(userName),
    enabled: userName.length > 0,
  });
}

export function useFollowingList() {
  return useQuery({
    queryKey: ['followingList'],
    queryFn: () => userService.getFollowingList(),
  });
}

export function useFollowersList() {
  return useQuery({
    queryKey: ['followersList'],
    queryFn: () => userService.getFollowersList(),
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userName: string) => userService.followUser(userName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followingList'] });
      queryClient.invalidateQueries({ queryKey: ['followersList'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  const blockUser = useForumStore((s) => s.blockUser);
  const unblockUser = useForumStore((s) => s.unblockUser);
  return useMutation({
    mutationFn: (userName: string) => userService.blockUser(userName),
    onMutate: (userName) => {
      blockUser(userName);
    },
    onError: (_err, userName) => {
      unblockUser(userName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedList'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedList'] });
    },
  });
}

export function useBlockedList() {
  return useQuery<FollowListItem[]>({
    queryKey: ['blockedList'],
    queryFn: () => userService.getBlockedList(),
  });
}
