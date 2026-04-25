import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import apiClient, { API_BASE } from '../client';
import ENDPOINTS from '../endpoints';

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

import { useAuthStore } from '../../store/authStore';
const MAX_IMAGE_EDGE = 1600;
const TARGET_MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB
const AVATAR_MAX_EDGE = 320;
const AVATAR_TARGET_MAX_SIZE = 120 * 1024; // 120KB
const MAX_BATCH_IMAGE_UPLOAD_COUNT = 12;
const IMAGE_UPLOAD_CONCURRENCY = 5;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/m4a',
  'audio/mp4',
  'audio/x-m4a',
  'audio/x-caf',
  'audio/wav',
  'audio/aac',
  'audio/amr-wb',
]);

type UploadInput = { uri: string; type: string; name: string };
type ImageCompressionMode = 'general' | 'avatar';

const getMockBaseUrl = (): string => {
  const u = process.env.EXPO_PUBLIC_MOCK_BASE_URL || process.env.EXPO_PUBLIC_APP_URL;
  if (u) return u.replace(/\/$/, '');
  const api = process.env.EXPO_PUBLIC_API_URL;
  if (api) return api.replace(/\/api\/?$/, '');
  return '';
};

function getApiOrigin(): string {
  if (API_BASE) return API_BASE.replace(/\/api\/?$/i, '');
  const fromEnv = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_DEV_API_URL;
  return (fromEnv || '').replace(/\/api\/?$/i, '');
}

function resolveProxyUploadUrl(uploadUrl: string, fileKey?: string): string {
  if (!fileKey) return uploadUrl;
  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return uploadUrl;
  return `${apiOrigin}/api/upload/${fileKey}`;
}

function normalizeMimeType(type: string | undefined): string {
  const raw = (type ?? '').toLowerCase().trim();
  if (ALLOWED_MIME_TYPES.has(raw)) return raw;
  if (raw.startsWith('image/')) return 'image/jpeg';
  if (raw.startsWith('audio/')) return 'audio/m4a';
  return 'image/jpeg';
}

function ensureJpegName(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
}

function ensureAudioName(name: string): string {
  const trimmed = (name || '').trim();
  const hasExt = /\.[a-z0-9]+$/i.test(trimmed);
  return hasExt ? trimmed : `${trimmed || `voice-${Date.now()}`}.m4a`;
}

function isImageMimeType(type: string): boolean {
  return type.startsWith('image/');
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

async function compressImage(
  file: UploadInput,
  mode: ImageCompressionMode = 'general'
): Promise<UploadInput> {
  const cached = compressionCache.get(file.uri);
  if (cached) {
    compressionCache.delete(file.uri);
    return cached;
  }

  const normalizedType = normalizeMimeType(file.type);
  if (!normalizedType.startsWith('image/')) {
    throw new Error('Only image files are supported for image compression.');
  }

  // Keep GIF as-is to avoid dropping animation frames.
  if (normalizedType === 'image/gif') {
    return { ...file, type: normalizedType };
  }

  let originalSize = 0;
  try {
    const info = await FileSystem.getInfoAsync(file.uri);
    if (info.exists && typeof info.size === 'number') {
      originalSize = info.size;
    }
  } catch {
    // Some Android content:// URIs are not directly fetchable.
  }

  const targetMaxSize = mode === 'avatar' ? AVATAR_TARGET_MAX_SIZE : TARGET_MAX_IMAGE_SIZE;
  const maxEdge = mode === 'avatar' ? AVATAR_MAX_EDGE : MAX_IMAGE_EDGE;
  const width =
    mode === 'avatar'
      ? (originalSize > targetMaxSize ? 280 : 320)
      : (originalSize > 4 * 1024 * 1024 ? 1080 : originalSize > targetMaxSize ? 1280 : 1600);
  const qualityEstimate =
    originalSize > 0
      ? mode === 'avatar'
        ? Math.max(0.4, Math.min(0.75, (targetMaxSize / originalSize) * 0.95))
        : Math.max(0.45, Math.min(0.82, (targetMaxSize / originalSize) * 0.95))
      : mode === 'avatar'
        ? 0.65
        : 0.72;

  const manipulated = await manipulateAsync(
    file.uri,
    [{ resize: { width: Math.min(width, maxEdge) } }],
    {
      compress: qualityEstimate,
      format: SaveFormat.JPEG,
    }
  );

  return {
    uri: manipulated.uri,
    type: 'image/jpeg',
    name: ensureJpegName(file.name),
  };
}

const UPLOAD_TIMEOUT_MS = 30_000; // 30s per upload attempt

async function uploadBinary(
  targetUrl: string,
  headers: Record<string, string>,
  blob: Blob,
  retries = 2
): Promise<Response> {
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const response = await fetch(targetUrl, {
        method: 'PUT',
        headers,
        body: blob,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (response.ok) return response;
      lastResponse = response;
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`);
      } else {
        lastError = error;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('Upload request failed.');
}

async function uploadViaPresigned(
  file: UploadInput,
  options?: { imageMode?: ImageCompressionMode }
): Promise<{ url: string }> {
  const normalizedType = normalizeMimeType(file.type);
  const preparedFile = isImageMimeType(normalizedType)
    ? await compressImage(file, options?.imageMode ?? 'general')
    : {
        ...file,
        type: normalizedType,
        name: ensureAudioName(file.name),
      };

  const fileBlob = await readLocalFileBlob(preparedFile.uri);
  const fileSize = fileBlob.size ?? 0;
  if (fileSize <= 0) {
    throw new Error('Could not determine file size.');
  }

  // Use the prepared file's type (post-compression), not the original type.
  // After compression, images become JPEG — the Content-Type and mimeType
  // must match the actual file bytes for backend magic-byte validation.
  const uploadMimeType = preparedFile.type || normalizedType;

  const { data: presignedData } = await apiClient.post(ENDPOINTS.UPLOAD.PRESIGNED_URL, {
    fileName: preparedFile.name,
    fileSize,
    mimeType: uploadMimeType,
  });

  const { uploadUrl, fileUrl, fileKey } = presignedData;
  const finalUploadUrl = resolveProxyUploadUrl(uploadUrl, fileKey);

  const headers: Record<string, string> = { 'Content-Type': uploadMimeType };
  const token = useAuthStore.getState().token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const targets = finalUploadUrl !== uploadUrl ? [uploadUrl, finalUploadUrl] : [uploadUrl];
  let uploadResponse: Response | null = null;
  let lastUploadError: unknown = null;

  for (const target of targets) {
    try {
      uploadResponse = await uploadBinary(target, headers, fileBlob, 2);
      if (uploadResponse.ok) break;
    } catch (error) {
      lastUploadError = error;
    }
  }

  if (!uploadResponse) {
    throw new Error(
      `Upload failed: ${
        lastUploadError instanceof Error ? lastUploadError.message : 'network error'
      }`
    );
  }
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed (${uploadResponse.status}): ${errorText || 'unknown error'}`);
  }

  return { url: fileUrl };
}

async function uploadImagesWithConcurrency(files: UploadInput[]): Promise<string[]> {
  if (files.length === 0) return [];

  const results: string[] = new Array(files.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(IMAGE_UPLOAD_CONCURRENCY, files.length) },
    async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= files.length) break;
        const uploaded = await uploadViaPresigned(files[index], { imageMode: 'general' });
        results[index] = uploaded.url;
      }
    }
  );

  await Promise.all(workers);
  return results;
}

// ── Pre-compression cache ──
const compressionCache = new Map<string, UploadInput>();

async function preCompressSingleImage(file: UploadInput): Promise<UploadInput> {
  const compressed = await compressImage(file, 'general');
  compressionCache.set(file.uri, compressed);
  return compressed;
}

export const uploadService = {
  async uploadFile(file: UploadInput): Promise<{ url: string }> {
    if (USE_MOCK) {
      const base = getMockBaseUrl();
      return { url: `${base}/mock/files/${file.name}` };
    }
    // Skip image compression — upload original quality.
    // Used by AI schedule parser which needs high-res text for accurate recognition.
    const normalizedType = normalizeMimeType(file.type);
    const fileBlob = await readLocalFileBlob(file.uri);
    const fileSize = fileBlob.size ?? 0;
    if (fileSize <= 0) {
      throw new Error('Could not determine file size.');
    }
    const { data: presignedData } = await apiClient.post(ENDPOINTS.UPLOAD.PRESIGNED_URL, {
      fileName: file.name,
      fileSize,
      mimeType: normalizedType,
    });
    const { uploadUrl, fileUrl, fileKey } = presignedData;
    const finalUploadUrl = resolveProxyUploadUrl(uploadUrl, fileKey);
    const headers: Record<string, string> = { 'Content-Type': normalizedType };
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
    const targets = finalUploadUrl !== uploadUrl ? [uploadUrl, finalUploadUrl] : [uploadUrl];
    let uploadResponse: Response | null = null;
    let lastUploadError: unknown = null;
    for (const target of targets) {
      try {
        uploadResponse = await uploadBinary(target, headers, fileBlob, 2);
        if (uploadResponse.ok) break;
      } catch (error) { lastUploadError = error; }
    }
    if (!uploadResponse) throw new Error(`Upload failed: ${lastUploadError instanceof Error ? lastUploadError.message : 'network error'}`);
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed (${uploadResponse.status}): ${errorText || 'unknown error'}`);
    }
    return { url: fileUrl };
  },

  async uploadImage(file: UploadInput): Promise<{ url: string }> {
    if (USE_MOCK) {
      const base = getMockBaseUrl();
      return { url: `${base}/mock/images/${file.name}` };
    }
    return uploadViaPresigned(file, { imageMode: 'general' });
  },

  async uploadAvatar(file: UploadInput): Promise<{ url: string }> {
    if (USE_MOCK) {
      const base = getMockBaseUrl();
      return { url: `${base}/mock/avatars/${file.name}` };
    }
    return uploadViaPresigned(file, { imageMode: 'avatar' });
  },

  async uploadImages(files: UploadInput[]): Promise<{ urls: string[] }> {
    if (files.length > MAX_BATCH_IMAGE_UPLOAD_COUNT) {
      throw new Error(`Too many images. Maximum allowed is ${MAX_BATCH_IMAGE_UPLOAD_COUNT}.`);
    }

    if (USE_MOCK) {
      const base = getMockBaseUrl();
      return { urls: files.map((f) => `${base}/mock/images/${f.name}`) };
    }

    const urls = await uploadImagesWithConcurrency(files);
    return { urls };
  },

  async preCompressImages(files: UploadInput[]): Promise<void> {
    await Promise.allSettled(files.map(preCompressSingleImage));
  },

  clearCompressionCache(): void {
    compressionCache.clear();
  },
};
