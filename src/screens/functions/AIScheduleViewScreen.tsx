import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { ScheduleCourse } from '../../types/schedule';
import ScreenHeader from '../../components/common/ScreenHeader';
import { DownloadIcon, ReuploadIcon } from '../../components/functions/AIScheduleIcons';
import WeekCalendarHeader from '../../components/functions/WeekCalendarHeader';
import TimetableGrid from '../../components/functions/TimetableGrid';
import CourseEditSheet from '../../components/functions/CourseEditSheet';
import { useScheduleStore } from '../../store/scheduleStore';
import {
  useSchedule,
  useAddCourse,
  useUpdateCourse,
  useDeleteCourse,
} from '../../hooks/useSchedule';
import { useUIStore } from '../../store/uiStore';
import { scheduleService } from '../../api/services/schedule.service';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'AIScheduleView'>;

export default function AIScheduleViewScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const schedule = useScheduleStore((s) => s.schedule);
  useSchedule(); // background refresh

  const addCourseMutation = useAddCourse();
  const updateCourseMutation = useUpdateCourse();
  const deleteCourseMutation = useDeleteCourse();

  const [weekOffset, setWeekOffset] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<ScheduleCourse | undefined>();
  const [warningDismissed, setWarningDismissed] = useState(false);
  const showDayDetectionWarning =
    !warningDismissed && route.params?.dayDetectionWarning === true;

  const exportRef = useRef<ViewShot>(null);

  const courses = useMemo(
    () => schedule?.courses ?? [],
    [schedule?.courses],
  );

  const courseDays = useMemo(() => {
    const days = new Set<number>();
    for (const c of courses) {
      days.add(c.dayOfWeek);
    }
    return days;
  }, [courses]);

  // Calculate export hour height to fit all courses in the screenshot
  const exportHourHeight = useMemo(() => {
    // Target: fit 15 rows (8:00-22:00) into ~750px available height
    const TOTAL_ROWS = 15;
    const EXPORT_AVAILABLE_HEIGHT = 750;
    return Math.floor(EXPORT_AVAILABLE_HEIGHT / TOTAL_ROWS); // ~50px per hour
  }, []);

  const handleWeekChange = useCallback((delta: number) => {
    setWeekOffset((prev) => prev + delta);
  }, []);

  const handlePressCourse = useCallback((course: ScheduleCourse) => {
    setEditingCourse(course);
    setEditVisible(true);
  }, []);

  const [prefillDay, setPrefillDay] = useState(1);
  const [prefillTime, setPrefillTime] = useState('08:00');

  const handleLongPressEmpty = useCallback((dayOfWeek: number, time: string) => {
    setPrefillDay(dayOfWeek);
    setPrefillTime(time);
    setEditingCourse(undefined);
    setEditVisible(true);
  }, []);

  const handleSave = useCallback(
    async (data: {
      name: string;
      location: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }) => {
      try {
        if (editingCourse) {
          await updateCourseMutation.mutateAsync({
            id: editingCourse.id,
            data,
          });
        } else {
          await addCourseMutation.mutateAsync({
            ...data,
            color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
          });
        }
        setEditVisible(false);
        setEditingCourse(undefined);
      } catch {
        showSnackbar({ message: t('saveError'), type: 'error' });
      }
    },
    [editingCourse, updateCourseMutation, addCourseMutation, showSnackbar, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteCourseMutation.mutateAsync(id);
        setEditVisible(false);
        setEditingCourse(undefined);
      } catch {
        showSnackbar({ message: t('dataLoadFailed'), type: 'error' });
      }
    },
    [deleteCourseMutation, showSnackbar, t],
  );

  const handleExport = useCallback(() => {
    Alert.alert(
      t('exportScheduleTitle'),
      t('exportScheduleMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: async () => {
            try {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(t('permissionNeededTitle'), t('photoPermissionMessage'));
                return;
              }
              const uri = await captureRef(exportRef, {
                format: 'png',
                quality: 1,
              });
              await MediaLibrary.saveToLibraryAsync(uri);
              showSnackbar({ message: t('savedToAlbum'), type: 'success' });
            } catch {
              showSnackbar({ message: t('saveError'), type: 'error' });
            }
          },
        },
      ]
    );
  }, [showSnackbar, t]);

  const handleReupload = useCallback(() => {
    Alert.alert(
      t('reuploadScheduleTitle'),
      t('reuploadScheduleMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await scheduleService.deleteSchedule();              // 1. Delete from backend DB
            } catch { /* ignore — proceed with local cleanup */ }
            useScheduleStore.getState().setSchedule(null);         // 2. Clear Zustand + AsyncStorage
            queryClient.removeQueries({ queryKey: ['schedule'] }); // 3. Clear React Query cache
            navigation.replace('AIScheduleUpload');                // 4. Navigate
          },
        },
      ]
    );
  }, [navigation, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        variant="campus"
        title={t('aiScheduleTitle')}
        onBack={() => navigation.goBack()}
        titleStyle={{ fontFamily: 'SourceHanSansCN-Bold' }}
        rightAction={
          <View style={styles.topBarRight}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleExport}>
              <DownloadIcon size={24} color="#0C1015" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={handleReupload}>
              <ReuploadIcon size={24} color="#0C1015" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Week Calendar Header */}
      <WeekCalendarHeader
        weekOffset={weekOffset}
        onWeekChange={handleWeekChange}
        courseDays={courseDays}
      />

      {showDayDetectionWarning && (
        <View style={styles.warningBanner}>
          <View style={styles.warningTextGroup}>
            <Text style={styles.warningTitle}>
              {t('aiScheduleDayHeadersUnclearTitle')}
            </Text>
            <Text style={styles.warningBody}>
              {t('aiScheduleDayHeadersUnclearBody')}
            </Text>
          </View>
          <View style={styles.warningActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setWarningDismissed(true)}
              style={styles.warningDismiss}
            >
              <Text style={styles.warningDismissText}>
                {t('aiScheduleDayHeadersUnclearDismiss')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleReupload}
              style={styles.warningPrimary}
            >
              <Text style={styles.warningPrimaryText}>
                {t('aiScheduleDayHeadersUnclearReupload')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Timetable Grid */}
      <TimetableGrid
        courses={courses}
        onPressCourse={handlePressCourse}
        onLongPressEmpty={handleLongPressEmpty}
      />

      {/* Course Edit Sheet */}
      <CourseEditSheet
        visible={editVisible}
        onClose={() => {
          setEditVisible(false);
          setEditingCourse(undefined);
        }}
        course={editingCourse}
        defaultDayOfWeek={prefillDay}
        defaultStartTime={prefillTime}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {/* Hidden export view for screenshot — sized for phone wallpaper (9:19.5 ratio) */}
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot ref={exportRef} options={{ format: 'png', quality: 1 }}>
          <View style={styles.exportContainer}>
            {/* Header with title */}
            <View style={styles.exportHeader}>
              <Text style={styles.exportTitle}>{t('aiScheduleTitle')}</Text>
            </View>
            {/* Calendar header */}
            <WeekCalendarHeader
              weekOffset={weekOffset}
              onWeekChange={handleWeekChange}
              courseDays={courseDays}
            />
            {/* Timetable grid — sized to fit all courses */}
            <View style={styles.exportGrid}>
              <TimetableGrid
                courses={courses}
                onPressCourse={() => {}}
                hourHeight={exportHourHeight}
              />
            </View>
            {/* Footer branding */}
            <View style={styles.exportFooter}>
              <Text style={styles.exportFooterText}>ULinks · AI Timetable</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  offscreen: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 390,
    opacity: 0,
    pointerEvents: 'none',
  },
  exportContainer: {
    backgroundColor: '#FFFFFF',
    width: 390,
  },
  exportHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  exportTitle: {
    fontFamily: 'SourceHanSansCN-Bold',
    fontSize: 18,
    color: '#0C1015',
  },
  exportGrid: {
    overflow: 'hidden',
  },
  exportFooter: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportFooterText: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 10,
    color: '#C7C7CC',
  },
  warningBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF4E0',
    borderWidth: 1,
    borderColor: '#F5C97A',
  },
  warningTextGroup: {
    marginBottom: 10,
  },
  warningTitle: {
    fontFamily: 'SourceHanSansCN-Bold',
    fontSize: 13,
    color: '#8A5A00',
    marginBottom: 2,
  },
  warningBody: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 12,
    color: '#8A5A00',
    lineHeight: 16,
  },
  warningActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  warningDismiss: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  warningDismissText: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 12,
    color: '#8A5A00',
  },
  warningPrimary: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F5A623',
  },
  warningPrimaryText: {
    fontFamily: 'SourceHanSansCN-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
});
