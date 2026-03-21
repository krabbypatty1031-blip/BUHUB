import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { BackIcon } from '../../components/common/icons';
import LoadingDots from '../../components/common/LoadingDots';
import { UploadImageIcon, AISparkleIcon, CloseCircleIcon } from '../../components/functions/AIScheduleIcons';
import ImageSourcePopover from '../../components/functions/ImageSourcePopover';
import { uploadService } from '../../api/services/upload.service';
import { useParseSchedule, useSaveSchedule } from '../../hooks/useSchedule';
import { useUIStore } from '../../store/uiStore';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'AIScheduleUpload'>;

type ScreenState = 'idle' | 'uploading' | 'ready' | 'parsing' | 'error';

export default function AIScheduleUploadScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parseSchedule = useParseSchedule();
  const saveSchedule = useSaveSchedule();

  // --- Image picking ---

  const handleImageSelected = useCallback(async (uri: string) => {
    setLocalImageUri(uri);
    setScreenState('uploading');
    try {
      const fileName = uri.split('/').pop() || `schedule-${Date.now()}.jpg`;
      const result = await uploadService.uploadImage({
        uri,
        type: 'image/jpeg',
        name: fileName,
      });
      setUploadedImageUrl(result.url);
      setScreenState('ready');
    } catch {
      setLocalImageUri(null);
      setUploadedImageUrl(null);
      setScreenState('idle');
      showSnackbar({ message: t('dataLoadFailed'), type: 'error' });
    }
  }, [showSnackbar, t]);

  const handleSelectAlbum = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showSnackbar({ message: 'Please allow photo library access', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      handleImageSelected(result.assets[0].uri);
    }
  }, [handleImageSelected, showSnackbar]);

  const handleSelectCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showSnackbar({ message: 'Please allow camera access', type: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      handleImageSelected(result.assets[0].uri);
    }
  }, [handleImageSelected, showSnackbar]);


  const handleRemoveImage = useCallback(() => {
    setLocalImageUri(null);
    setUploadedImageUrl(null);
    setScreenState('idle');
  }, []);

  // --- Fake progress animation ---

  const startFakeProgress = useCallback(() => {
    setProgress(0);
    progressAnim.setValue(0);

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return 90;
        }
        const next = Math.min(prev + 3, 90);
        Animated.timing(progressAnim, {
          toValue: next / 100,
          duration: 400,
          useNativeDriver: false,
        }).start();
        return next;
      });
    }, 500);
  }, [progressAnim]);

  const finishProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(100);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // --- Parse ---

  const handleParse = useCallback(async () => {
    if (!uploadedImageUrl) return;

    setScreenState('parsing');
    startFakeProgress();

    try {
      const parseResult = await parseSchedule.mutateAsync(uploadedImageUrl);

      if (!parseResult.courses || parseResult.courses.length === 0) {
        finishProgress();
        setTimeout(() => {
          setScreenState('ready');
          showSnackbar({ message: t('noCoursesParsed'), type: 'error' });
        }, 350);
        return;
      }

      await saveSchedule.mutateAsync({
        imageUrl: uploadedImageUrl,
        courses: parseResult.courses,
      });

      finishProgress();
      setTimeout(() => {
        navigation.replace('AIScheduleView');
      }, 350);
    } catch {
      finishProgress();
      setTimeout(() => {
        setScreenState('ready');
        showSnackbar({ message: t('parseError'), type: 'error' });
      }, 350);
    }
  }, [uploadedImageUrl, parseSchedule, saveSchedule, startFakeProgress, finishProgress, navigation, showSnackbar, t]);

  // --- Render helpers ---

  const isButtonActive = screenState === 'ready';

  const renderUploadArea = () => {
    if (localImageUri) {
      return (
        <TouchableOpacity
          style={styles.imagePreviewContainer}
          activeOpacity={0.9}
          onPress={() => {
            if (screenState === 'ready') setPopoverVisible(true);
          }}
        >
          <Image
            source={{ uri: localImageUri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
          {screenState === 'uploading' && (
            <View style={styles.uploadingIndicator} pointerEvents="none">
              <View style={styles.uploadingBadge}>
                <LoadingDots color="#009AFF" dotSize={5} gap={4} />
              </View>
            </View>
          )}
          {screenState === 'ready' && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleRemoveImage}
              activeOpacity={0.7}
            >
              <CloseCircleIcon size={24} color="#999" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.uploadArea}
        activeOpacity={0.7}
        onPress={() => setPopoverVisible(true)}
      >
        <View style={styles.uploadCircle}>
          <UploadImageIcon size={32} color="#009AFF" />
        </View>
        <Text style={styles.uploadText}>{t('uploadImagePlaceholder')}</Text>
      </TouchableOpacity>
    );
  };

  const renderParsingOverlay = () => {
    if (screenState !== 'parsing') return null;

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 199],
    });

    return (
      <View style={styles.parsingOverlay}>
        <View style={styles.parsingCircle}>
          <AISparkleIcon size={41} color="#009AFF" />
        </View>
        <View style={{ height: 12 }} />
        <Text style={styles.parsingTitle}>{t('parsingTitle')}</Text>
        <View style={{ height: 10 }} />
        <Text style={styles.parsingSubtitle}>{t('parsingSubtitle')}</Text>
        <View style={{ height: 38 }} />
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressPercent}>{progress}%</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <BackIcon size={26} color="#0C1015" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('uploadSchedule')}</Text>
      </View>

      {/* Content area with gray background */}
      <View style={styles.contentArea}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.bigTitle}>{t('uploadScheduleTitle')}</Text>
          <Text style={styles.subtitle}>{t('uploadScheduleSubtitle')}</Text>
        </View>

        {/* Upload Area */}
        <View style={styles.uploadAreaWrapper}>
          {renderUploadArea()}
        </View>

        {/* Notice Section */}
        <View style={styles.noticeSection}>
          <Text style={styles.noticeTitle}>{t('uploadNoticeTitle')}</Text>
          <View style={{ height: 6 }} />
          <Text style={styles.noticeItem}>{t('noticeFormat')}</Text>
          <Text style={styles.noticeItem}>{t('noticeClear')}</Text>
          <Text style={styles.noticeItem}>{t('noticeLight')}</Text>
        </View>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.parseButton,
            isButtonActive ? styles.parseButtonActive : styles.parseButtonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={handleParse}
          disabled={!isButtonActive}
        >
          <Text
            style={[
              styles.parseButtonText,
              isButtonActive ? styles.parseButtonTextActive : styles.parseButtonTextDisabled,
            ]}
          >
            {t('parseScheduleBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Source Popover */}
      <ImageSourcePopover
        visible={popoverVisible}
        onClose={() => setPopoverVisible(false)}
        onSelectAlbum={handleSelectAlbum}
        onSelectCamera={handleSelectCamera}
      />

      {/* Parsing Overlay */}
      {renderParsingOverlay()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Top Bar
  topBar: {
    height: 62,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginLeft: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'SourceHanSansCN-Bold',
    fontSize: 18,
    color: '#0C1015',
    pointerEvents: 'none',
  },

  // Title Section
  titleSection: {
    marginLeft: 24,
    marginRight: 24,
    marginTop: 24,
  },
  bigTitle: {
    fontFamily: 'SourceHanSansCN-Bold',
    fontSize: 26,
    lineHeight: 34,
    color: 'black',
  },
  subtitle: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#4E5969',
    marginTop: 10,
  },

  // Upload Area
  uploadAreaWrapper: {
    marginLeft: 24,
    marginTop: 34,
  },
  uploadArea: {
    width: 342,
    height: 241,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE2E5',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  uploadCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,154,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 18,
    lineHeight: 24,
    color: '#0C1015',
  },

  // Image Preview
  imagePreviewContainer: {
    width: 342,
    height: 241,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEE2E5',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  uploadingIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingBadge: {
    minWidth: 44,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(0,154,255,0.12)',
    shadowColor: '#009AFF',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
  },

  // Notice Section
  noticeSection: {
    marginLeft: 24,
    marginTop: 32,
  },
  noticeTitle: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: '#222222',
  },
  noticeItem: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 12,
    lineHeight: 24,
    color: '#4E5969',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 94,
    backgroundColor: '#FFFFFF',
    justifyContent: 'flex-start',
    paddingTop: 12,
  },
  parseButton: {
    marginLeft: 24,
    width: 342,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parseButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  parseButtonActive: {
    backgroundColor: '#0C1015',
  },
  parseButtonText: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 15,
  },
  parseButtonTextDisabled: {
    color: '#9CA3AF',
  },
  parseButtonTextActive: {
    color: '#FFFFFF',
  },

  // Parsing Overlay
  parsingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parsingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parsingTitle: {
    fontFamily: 'SourceHanSansCN-Bold',
    fontSize: 28,
    color: '#0C1015',
  },
  parsingSubtitle: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 14,
    color: '#86909C',
    textAlign: 'center',
    width: 228,
  },
  progressContainer: {
    width: 228,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTrack: {
    width: 199,
    height: 6,
    borderRadius: 37,
    backgroundColor: 'rgba(138,144,151,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 37,
    backgroundColor: '#0C1015',
  },
  progressPercent: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
});
