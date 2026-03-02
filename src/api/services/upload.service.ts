import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import apiClient, { API_BASE } from '../client';
import ENDPOINTS from '../endpoints';

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

const getMockBaseUrl = (): string => {
  const u = process.env.EXPO_PUBLIC_MOCK_BASE_URL || process.env.EXPO_PUBLIC_APP_URL;
  if (u) return u.replace(/\/$/, '');
  const api = process.env.EXPO_PUBLIC_API_URL;
  if (api) return api.replace(/\/api\/?$/, '');
  return '';
};
const TOKEN_KEY = 'buhub-token';
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);
const MAX_IMAGE_EDGE = 1600;
const TARGET_MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB

type UploadInput = { uri: string; type: string; name: string };

function getApiOrigin(): string {
  if (API_BASE) return API_BASE.replace(/\/api\/?$/i, '');
  const fromEnv = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_DEV_API_URL;
  return (fromEnv || '').replace(/\/api\/?$/i, '');
}

function resolveDevUploadUrl(uploadUrl: string, fileKey?: string): string {
  if (!__DEV__) return uploadUrl;
  if (!fileKey) return uploadUrl;
  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return uploadUrl;
  return `${apiOrigin}/api/upload/${fileKey}`;
}

function normalizeMimeType(type: string | undefined): string {
  const raw = (type ?? '').toLowerCase().trim();
  if (ALLOWED_MIME_TYPES.has(raw)) return raw;
  if (raw.startsWith('image/')) return 'image/jpeg';
  return 'image/jpeg';
}

function ensureJpegName(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
}

async function compressImage(file: UploadInput): Promise<UploadInput> {
  const normalizedType = normalizeMimeType(file.type);
  if (!normalizedType.startsWith('image/')) {
    throw new Error('仅支持图片上传');
  }

  if (normalizedType === 'image/gif') {
    // Keep GIF as-is to avoid losing animation frames.
    return { ...file, type: normalizedType };
  }

  let originalSize = 0;
  try {
    const originalBlob = await readLocalFileBlob(file.uri);
    originalSize = originalBlob.size;
  } catch {
    // Some Android content:// URIs are not directly fetchable; keep going.
  }

  const width = originalSize > 4 * 1024 * 1024 ? 1080 : originalSize > TARGET_MAX_IMAGE_SIZE ? 1280 : 1600;
  const qualityEstimate = originalSize > 0
    ? Math.max(0.45, Math.min(0.82, (TARGET_MAX_IMAGE_SIZE / originalSize) * 0.95))
    : 0.72;

  let manipulated;
  try {
    manipulated = await manipulateAsync(
      file.uri,
      [{ resize: { width: Math.min(width, MAX_IMAGE_EDGE) } }],
      {
        compress: qualityEstimate,
        format: SaveFormat.JPEG,
      }
    );
  } catch (error) {
    throw new Error(`图片压缩失败: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  const compressedBlob = await readLocalFileBlob(manipulated.uri);
  const compressedSize = compressedBlob.size;
  if (__DEV__) {
    console.log('[Upload] Compression summary:', {
      originalSize,
      compressedSize,
      targetSize: TARGET_MAX_IMAGE_SIZE,
      width,
      quality: Number(qualityEstimate.toFixed(3)),
    });
  }

  return {
    uri: manipulated.uri,
    type: 'image/jpeg',
    name: ensureJpegName(file.name),
  };
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
  file: UploadInput
): Promise<{ url: string }> {
  const compressedFile = await compressImage(file);
  const normalizedType = normalizeMimeType(compressedFile.type);

  let fileBlob: Blob;
  try {
    fileBlob = await readLocalFileBlob(compressedFile.uri);
  } catch (fetchError) {
    throw new Error(`读取图片文件失败: ${fetchError instanceof Error ? fetchError.message : '未知错误'}`);
  }

  const fileSize = fileBlob.size ?? 0;
  if (fileSize <= 0) {
    throw new Error('Could not determine file size');
  }

  let presignedData;
  try {
    const { data } = await apiClient.post(ENDPOINTS.UPLOAD.PRESIGNED_URL, {
      fileName: compressedFile.name,
      fileSize,
      mimeType: normalizedType,
    });
    presignedData = data;
  } catch (apiError) {
    throw new Error(`获取上传链接失败: ${apiError instanceof Error ? apiError.message : '未知错误'}`);
  }

  const { uploadUrl, fileUrl, fileKey } = presignedData;
  const finalUploadUrl = resolveDevUploadUrl(uploadUrl, fileKey);

  const headers: Record<string, string> = { 'Content-Type': normalizedType };
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let uploadResponse;
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: fileBlob,
    });
    if (!uploadResponse.ok && finalUploadUrl !== uploadUrl) {
      uploadResponse = await fetch(finalUploadUrl, {
        method: 'PUT',
        headers,
        body: fileBlob,
      });
    }
  } catch (uploadError) {
    throw new Error(`上传文件失败: ${uploadError instanceof Error ? uploadError.message : '网络错误，请检查网络连接'}`);
  }

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`上传失败(${uploadResponse.status}): ${errorText || 'unknown error'}`);
  }

  return { url: fileUrl };
}

export const uploadService = {
  async uploadFile(file: UploadInput): Promise<{ url: string }> {
    if (USE_MOCK) {
      const base = getMockBaseUrl();
      return { url: `${base}/mock/files/${file.name}` };
    }
    return uploadViaPresigned(file);
  },

  async uploadImage(file: UploadInput): Promise<{ url: string }> {
    if (USE_MOCK) {
      const base = getMockBaseUrl();
      return { url: `${base}/mock/images/${file.name}` };
    }
    return uploadViaPresigned(file);
  },

  async uploadAvatar(file: UploadInput): Promise<{ url: string }> {
    if (USE_MOCK) {
      const base = getMockBaseUrl();
      return { url: `${base}/mock/avatars/${file.name}` };
    }
    return uploadViaPresigned(file);
  },

  async uploadImages(files: UploadInput[]): Promise<{ urls: string[] }> {
    if (USE_MOCK) {
      const base = getMockBaseUrl();
      return { urls: files.map((f) => `${base}/mock/images/${f.name}`) };
    }
    const urls = await Promise.all(files.map((f) => uploadViaPresigned(f)));
    return { urls: urls.map((u) => u.url) };
  },
};
