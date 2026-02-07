import { create } from 'zustand';

export type ComposeType = 'text' | 'image' | 'poll' | 'partner' | 'errand' | 'secondhand';

interface SnackbarConfig {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

interface ModalConfig {
  visible: boolean;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface UIState {
  // Snackbar
  snackbar: SnackbarConfig | null;
  showSnackbar: (config: SnackbarConfig) => void;
  hideSnackbar: () => void;

  // Modal
  modal: ModalConfig;
  showModal: (config: Omit<ModalConfig, 'visible'>) => void;
  hideModal: () => void;

  // Compose
  composeType: ComposeType | null;
  setComposeType: (type: ComposeType | null) => void;

  // Loading
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  // Snackbar
  snackbar: null,
  showSnackbar: (config) => set({ snackbar: config }),
  hideSnackbar: () => set({ snackbar: null }),

  // Modal
  modal: { visible: false },
  showModal: (config) => set({ modal: { ...config, visible: true } }),
  hideModal: () => set({ modal: { visible: false } }),

  // Compose
  composeType: null,
  setComposeType: (composeType) => set({ composeType }),

  // Loading
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
}));
