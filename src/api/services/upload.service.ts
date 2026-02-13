import { uploadClient } from '../client';
import ENDPOINTS from '../endpoints';

const USE_MOCK = false;

export const uploadService = {
  async uploadImage(file: { uri: string; type: string; name: string }): Promise<{ url: string }> {
    if (USE_MOCK) {
      return { url: `https://mock.buhub.com/images/${file.name}` };
    }
    const formData = new FormData();
    formData.append('image', file as any);
    const { data } = await uploadClient.post(ENDPOINTS.UPLOAD.IMAGE, formData);
    return data;
  },

  async uploadAvatar(file: { uri: string; type: string; name: string }): Promise<{ url: string }> {
    if (USE_MOCK) {
      return { url: `https://mock.buhub.com/avatars/${file.name}` };
    }
    const formData = new FormData();
    formData.append('avatar', file as any);
    const { data } = await uploadClient.post(ENDPOINTS.UPLOAD.AVATAR, formData);
    return data;
  },

  async uploadImages(files: { uri: string; type: string; name: string }[]): Promise<{ urls: string[] }> {
    if (USE_MOCK) {
      return { urls: files.map((f) => `https://mock.buhub.com/images/${f.name}`) };
    }
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file as any);
    });
    const { data } = await uploadClient.post(ENDPOINTS.UPLOAD.IMAGE, formData);
    return data;
  },
};
