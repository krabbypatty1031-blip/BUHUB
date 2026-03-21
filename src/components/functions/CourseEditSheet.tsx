import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import SwipeableBottomSheet from '../common/SwipeableBottomSheet';
import type { ScheduleCourse } from '../../types/schedule';

interface CourseEditSheetProps {
  visible: boolean;
  onClose: () => void;
  course?: ScheduleCourse;
  defaultDayOfWeek?: number;
  defaultStartTime?: string;
  onSave: (data: {
    name: string;
    location: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) => void;
  onDelete?: (id: string) => void;
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function validateTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export default function CourseEditSheet({
  visible,
  onClose,
  course,
  defaultDayOfWeek,
  defaultStartTime,
  onSave,
  onDelete,
}: CourseEditSheetProps) {
  const { t } = useTranslation();
  const isEdit = course !== undefined;

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');

  useEffect(() => {
    if (visible) {
      if (course) {
        setName(course.name);
        setLocation(course.location);
        setDayOfWeek(course.dayOfWeek);
        setStartTime(course.startTime);
        setEndTime(course.endTime);
      } else {
        setName('');
        setLocation('');
        setDayOfWeek(defaultDayOfWeek ?? 1);
        setStartTime(defaultStartTime ?? '08:00');
        setEndTime('09:00');
      }
    }
  }, [visible, course]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    if (!validateTime(startTime) || !validateTime(endTime)) return;
    onSave({
      name: name.trim(),
      location: location.trim(),
      dayOfWeek,
      startTime,
      endTime,
    });
  }, [name, location, dayOfWeek, startTime, endTime, onSave]);

  const handleDelete = useCallback(() => {
    if (course?.id && onDelete) {
      onDelete(course.id);
    }
  }, [course, onDelete]);

  return (
    <SwipeableBottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        style={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>
          {isEdit ? t('courseEditTitle') : t('courseAddTitle')}
        </Text>

        {/* Course Name */}
        <Text style={styles.label}>{t('courseNameLabel')}</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder={t('courseNameLabel')}
          placeholderTextColor="#C4C7CC"
        />

        {/* Location */}
        <Text style={styles.label}>{t('courseLocationLabel')}</Text>
        <TextInput
          style={styles.textInput}
          value={location}
          onChangeText={setLocation}
          placeholder={t('courseLocationLabel')}
          placeholderTextColor="#C4C7CC"
        />

        {/* Day of Week */}
        <Text style={styles.label}>{t('dayOfWeekLabel')}</Text>
        <View style={styles.dayRow}>
          {DAY_LABELS.map((label, index) => {
            const day = index + 1;
            const isActive = dayOfWeek === day;
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  isActive ? styles.dayButtonActive : styles.dayButtonInactive,
                ]}
                activeOpacity={0.7}
                onPress={() => setDayOfWeek(day)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    isActive
                      ? styles.dayButtonTextActive
                      : styles.dayButtonTextInactive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Time Row */}
        <View style={styles.timeRow}>
          <View style={styles.timeColumn}>
            <Text style={styles.label}>{t('startTimeLabel')}</Text>
            <TextInput
              style={styles.timeInput}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="08:00"
              placeholderTextColor="#C4C7CC"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <View style={styles.timeColumn}>
            <Text style={styles.label}>{t('endTimeLabel')}</Text>
            <TextInput
              style={styles.timeInput}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="09:00"
              placeholderTextColor="#C4C7CC"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>

        {/* Bottom Buttons */}
        {isEdit ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.deleteButton}
              activeOpacity={0.7}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>{t('delete')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.85}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>{t('save')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SwipeableBottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'SourceHanSansCN-Bold',
    fontSize: 18,
    color: '#0C1015',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 14,
    color: '#4E5969',
    marginBottom: 8,
  },
  textInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE2E5',
    paddingHorizontal: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 15,
    color: '#0C1015',
    marginBottom: 16,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#0C1015',
  },
  dayButtonInactive: {
    backgroundColor: '#F3F5F7',
  },
  dayButtonText: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 13,
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  dayButtonTextInactive: {
    color: '#4E5969',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  timeColumn: {
    flex: 1,
  },
  timeInput: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F5F7',
    textAlign: 'center',
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 15,
    color: '#0C1015',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  deleteButton: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF4D4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 15,
    color: '#FF4D4F',
  },
  saveButton: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#0C1015',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 15,
    color: '#FFFFFF',
  },
  addButton: {
    height: 46,
    borderRadius: 13,
    backgroundColor: '#0C1015',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
