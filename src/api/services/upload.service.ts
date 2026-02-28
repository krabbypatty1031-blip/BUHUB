import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../client';
import ENDPOINTS from '../endpoints';

const USE_MOCK = false;
const TOKEN_KEY = 'buhub-token';
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/m4a',
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/webm',
]);

function normalizeMimeType(type: string | undefined): string {
  const raw = (type ?? '').toLowerCase().trim();
  if (ALLOWED_MIME_TYPES.has(raw)) return raw;
  if (raw.startsWith('image/')) return 'image/jpeg';
  if (raw.startsWith('audio/')) return 'audio/m4a';
  return 'image/jpeg';
}

async function readLocalFileBlob(uri: string): Promise<Blob> {
  const candidates =
    Platform.OS === 'android' && uri.startsWith('file://')
      ? [uri, uri.replace('file://', '')]
      : [uri];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const localResponse = await fetch(candidate);
      console.log('[Upload] Step 1 result:', localResponse.status, localResponse.statusText, '| URI:', candidate);
      if (!localResponse.ok) {
        throw new Error(`Failed to fetch file: ${localResponse.status}`);
      }
      return await localResponse.blob();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to read local file');
}

async function uploadViaPresigned(
  file: { uri: string; type: string; name: string }
): Promise<{ url: string }> {
  const normalizedType = normalizeMimeType(file.type);
  console.log('[Upload] Step 1: Reading file from:', file.uri);

  let fileBlob: Blob;
  try {
    fileBlob = await readLocalFileBlob(file.uri);
    console.log('[Upload] File blob size:', fileBlob.size);
  } catch (fetchError) {
    console.error('[Upload] Step 1 error:', fetchError);
    throw new Error(`读取图片文件失败: ${fetchError instanceof Error ? fetchError.message : '未知错误'}`);
  }

  const fileSize = fileBlob.size ?? 0;
  if (fileSize <= 0) {
    throw new Error('Could not determine file size');
  }

  console.log('[Upload] Step 2: Getting presigned URL...');
  let presignedData;
  try {
    const { data } = await apiClient.post(ENDPOINTS.UPLOAD.PRESIGNED_URL, {
      fileName: file.name,
      fileSize,
      mimeType: normalizedType,
    });
    presignedData = data;
    console.log('[Upload] Step 2 result:', presignedData);
  } catch (apiError) {
    console.error('[Upload] Step 2 error:', apiError);
    throw new Error(`获取上传链接失败: ${apiError instanceof Error ? apiError.message : '未知错误'}`);
  }

  const { uploadUrl, fileUrl } = presignedData;
  console.log('[Upload] Upload URL:', uploadUrl);

  const headers: Record<string, string> = { 'Content-Type': normalizedType };
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log('[Upload] Step 3: Uploading file...');
  let uploadResponse;
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: fileBlob,
    });
    console.log('[Upload] Step 3 result:', uploadResponse.status, uploadResponse.statusText);
  } catch (uploadError) {
    console.error('[Upload] Step 3 error:', uploadError);
    throw new Error(`上传文件失败: ${uploadError instanceof Error ? uploadError.message : '网络错误，请检查网络连接'}`);
  }

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('[Upload] Step 3 failed:', uploadResponse.status, errorText);
    throw new Error(`Upload failed with status ${uploadResponse.status}`);
  }

  return { url: fileUrl };
}

export const uploadService = {
  async uploadFile(file: { uri: string; type: string; name: string }): Promise<{ url: string }> {
    if (USE_MOCK) {
      return { url: `https://mock.buhub.com/files/${file.name}` };
    }
    return uploadViaPresigned(file);
  },

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
