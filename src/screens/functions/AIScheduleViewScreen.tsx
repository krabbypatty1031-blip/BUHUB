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
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { ScheduleCourse } from '../../types/schedule';
import { BackIcon } from '../../components/common/icons';
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

type Props = NativeStackScreenProps<FunctionsStackParamList, 'AIScheduleView'>;

export default function AIScheduleViewScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const schedule = useScheduleStore((s) => s.schedule);
  useSchedule(); // background refresh

  const addCourseMutation = useAddCourse();
  const updateCourseMutation = useUpdateCourse();
  const deleteCourseMutation = useDeleteCourse();

  const [weekOffset, setWeekOffset] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<ScheduleCourse | undefined>();

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
          onPress: () => navigation.navigate('AIScheduleUpload'),
        },
      ]
    );
  }, [navigation, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <BackIcon size={26} color="#0C1015" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('aiScheduleTitle')}</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleExport}
          >
            <DownloadIcon size={24} color="#0C1015" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleReupload}
          >
            <ReuploadIcon size={24} color="#0C1015" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Week Calendar Header */}
      <WeekCalendarHeader
        weekOffset={weekOffset}
        onWeekChange={handleWeekChange}
        courseDays={courseDays}
      />

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

      {/* Hidden export view for screenshot */}
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot ref={exportRef} options={{ format: 'png', quality: 1 }}>
          <View style={styles.exportContainer}>
            <WeekCalendarHeader
              weekOffset={weekOffset}
              onWeekChange={handleWeekChange}
              courseDays={courseDays}
            />
            <View style={styles.exportGrid}>
              <TimetableGrid
                courses={courses}
                onPressCourse={() => {}}
              />
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: 'auto',
    marginRight: 16,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 390,
  },
  exportContainer: {
    backgroundColor: '#FFFFFF',
  },
  exportGrid: {
    height: 816,
  },
});
