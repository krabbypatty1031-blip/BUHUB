import { useUIStore } from '../store/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      snackbar: null,
      modal: { visible: false },
      composeType: null,
      isLoading: false,
    });
  });

  describe('snackbar', () => {
    it('shows snackbar with message', () => {
      useUIStore.getState().showSnackbar({ message: 'Test', type: 'success' });
      expect(useUIStore.getState().snackbar).toEqual({ message: 'Test', type: 'success' });
    });

    it('hides snackbar', () => {
      useUIStore.getState().showSnackbar({ message: 'Test' });
      useUIStore.getState().hideSnackbar();
      expect(useUIStore.getState().snackbar).toBeNull();
    });
  });

  describe('modal', () => {
    it('shows modal with config', () => {
      const onConfirm = jest.fn();
      useUIStore.getState().showModal({ title: 'Confirm?', message: 'Are you sure?', onConfirm });
      const modal = useUIStore.getState().modal;
      expect(modal.visible).toBe(true);
      expect(modal.title).toBe('Confirm?');
    });

    it('hides modal', () => {
      useUIStore.getState().showModal({ title: 'Test' });
      useUIStore.getState().hideModal();
      expect(useUIStore.getState().modal.visible).toBe(false);
    });
  });

  describe('composeType', () => {
    it('sets and clears compose type', () => {
      useUIStore.getState().setComposeType('image');
      expect(useUIStore.getState().composeType).toBe('image');

      useUIStore.getState().setComposeType(null);
      expect(useUIStore.getState().composeType).toBeNull();
    });
  });

  describe('loading', () => {
    it('toggles loading state', () => {
      useUIStore.getState().setLoading(true);
      expect(useUIStore.getState().isLoading).toBe(true);

      useUIStore.getState().setLoading(false);
      expect(useUIStore.getState().isLoading).toBe(false);
    });
  });
});
