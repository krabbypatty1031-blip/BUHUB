import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../client';
import ENDPOINTS from '../endpoints';

const TOKEN_KEY = 'buhub-token';
const USE_MOCK = false;

async function uploadViaPresigned(
  file: { uri: string; type: string; name: string }
): Promise<{ url: string }> {
  const localResponse = await fetch(file.uri);
  const fileBlob = await localResponse.blob();
  const fileSize = fileBlob.size ?? 0;
  if (fileSize <= 0) {
    throw new Error('Could not determine file size');
  }

  const { data } = await apiClient.post(ENDPOINTS.UPLOAD.PRESIGNED_URL, {
    fileName: file.name,
    fileSize,
    mimeType: file.type,
  });

  const { uploadUrl, fileUrl } = data;

  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { 'Content-Type': file.type };
  if (token) headers.Authorization = `Bearer ${token}`;

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: fileBlob,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Upload failed with status ${uploadResponse.status}`);
  }

  return { url: fileUrl };
}

export const uploadService = {
  async uploadImage(file: { uri: string; type: string; name: string }): Promise<{ url: string }> {
    if (USE_MOCK) {
      return { url: `https://mock.buhub.com/images/${file.name}` };
    }
    return uploadViaPresigned(file);
  },

  async uploadAvatar(file: { uri: string; type: string; name: string }): Promise<{ url: string }> {
    if (USE_MOCK) {
      return { url: `https://mock.buhub.com/avatars/${file.name}` };
    }
    return uploadViaPresigned(file);
  },

  async uploadImages(files: { uri: string; type: string; name: string }[]): Promise<{ urls: string[] }> {
    if (USE_MOCK) {
      return { urls: files.map((f) => `https://mock.buhub.com/images/${f.name}`) };
    }
    const urls = await Promise.all(files.map((f) => uploadViaPresigned(f)));
    return { urls: urls.map((u) => u.url) };
  },
};
