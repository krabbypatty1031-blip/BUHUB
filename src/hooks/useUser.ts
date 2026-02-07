import { useQuery, useMutation } from '@tanstack/react-query';
import { userService } from '../api/services/user.service';
import type { User } from '../types';

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
  return useMutation({
    mutationFn: (profile: Partial<User>) => userService.updateProfile(profile),
  });
}

export function usePublicProfile(userName: string) {
  return useQuery({
    queryKey: ['publicProfile', userName],
    queryFn: () => userService.getPublicProfile(userName),
    enabled: userName.length > 0,
  });
}

export function useFollowUser() {
  return useMutation({
    mutationFn: (userName: string) => userService.followUser(userName),
  });
}
