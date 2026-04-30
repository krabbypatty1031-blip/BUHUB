import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlbumIcon, CameraIcon } from './AIScheduleIcons';
import { fontFamily } from '../../theme/typography';

interface ImageSourcePopoverProps {
  visible: boolean;
  onClose: () => void;
  onSelectAlbum: () => void;
  onSelectCamera: () => void;
}

export default function ImageSourcePopover({
  visible,
  onClose,
  onSelectAlbum,
  onSelectCamera,
}: ImageSourcePopoverProps) {
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const popoverLeft = (screenWidth - 236) / 2;
  const popoverTop = screenHeight * 0.38;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.popover,
          {
            left: popoverLeft,
            top: popoverTop,
          },
        ]}
      >
        {/* Album row */}
        <TouchableOpacity
          style={[styles.row, styles.rowFirst]}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            onSelectAlbum();
          }}
        >
          <Text style={styles.rowText}>{t('imageSourceAlbum')}</Text>
          <AlbumIcon size={24} color="#333" />
        </TouchableOpacity>

        {/* Camera row */}
        <TouchableOpacity
          style={[styles.row, styles.rowLast]}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            onSelectCamera();
          }}
        >
          <Text style={styles.rowText}>{t('imageSourceCamera')}</Text>
          <CameraIcon size={24} color="#333" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  popover: {
    position: 'absolute',
    width: 236,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 30,
    elevation: 8,
  },
  row: {
    height: 46,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DEE2E5',
  },
  rowFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  rowLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 0,
  },
  rowText: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: '#0A0A0A',
  },
});
