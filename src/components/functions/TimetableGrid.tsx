import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import type { ScheduleCourse } from '../../types/schedule';
import { fontFamily } from '../../theme/typography';
import CourseCard from './CourseCard';

interface TimetableGridProps {
  courses: ScheduleCourse[];
  onPressCourse: (course: ScheduleCourse) => void;
  onLongPressEmpty?: (dayOfWeek: number, time: string) => void;
  hourHeight?: number; // override default 68px per hour (for export scaling)
}

const DEFAULT_HOUR_HEIGHT = 68;
const START_HOUR = 8;
const END_HOUR = 22;
const TOTAL_ROWS = END_HOUR - START_HOUR + 1; // 15 rows for grid lines
const TIME_LABEL_WIDTH = 28;
const NUM_DAYS = 7;

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
}

function formatHour(hour: number): string {
  return String(hour).padStart(2, '0');
}

function formatTimeString(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const TimetableGrid = React.memo(function TimetableGrid({
  courses,
  onPressCourse,
  onLongPressEmpty,
  hourHeight: HOUR_HEIGHT = DEFAULT_HOUR_HEIGHT,
}: TimetableGridProps) {
  const TOTAL_HEIGHT = TOTAL_ROWS * HOUR_HEIGHT;
  const [gridWidth, setGridWidth] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const columnWidth = useMemo(() => {
    if (gridWidth <= 0) return 0;
    return gridWidth / NUM_DAYS;
  }, [gridWidth]);

  const onGridLayout = useCallback((e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width);
  }, []);

  // Current time line position
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const currentDecimal = currentHour + currentMin / 60;
  const showTimeLine =
    currentDecimal >= START_HOUR && currentDecimal <= END_HOUR;
  const timeLineY = (currentDecimal - START_HOUR) * HOUR_HEIGHT;
  const timeLineLabel = formatTimeString(currentHour, currentMin);

  // Handle long press on empty area
  const handleLongPress = useCallback(
    (e: { nativeEvent: { locationX: number; locationY: number } }) => {
      if (!onLongPressEmpty || columnWidth <= 0) return;
      const { locationX, locationY } = e.nativeEvent;
      // Calculate day column (1-7)
      const dayOfWeek = Math.min(
        Math.max(Math.floor(locationX / columnWidth) + 1, 1),
        7,
      );
      // Calculate time from y position
      const hourDecimal = locationY / HOUR_HEIGHT + START_HOUR;
      // Round to nearest 30 minutes
      const roundedHours = Math.floor(hourDecimal);
      const roundedMinutes = Math.round((hourDecimal - roundedHours) * 2) * 30;
      const finalHours =
        roundedMinutes >= 60 ? roundedHours + 1 : roundedHours;
      const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes;
      const timeStr = formatTimeString(
        Math.min(finalHours, END_HOUR),
        finalMinutes,
      );
      onLongPressEmpty(dayOfWeek, timeStr);
    },
    [onLongPressEmpty, columnWidth],
  );

  // Generate hour labels
  const hourLabels = useMemo(() => {
    const labels: { hour: number; y: number; label: string }[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      labels.push({
        hour: h,
        y: (h - START_HOUR) * HOUR_HEIGHT,
        label: formatHour(h),
      });
    }
    return labels;
  }, []);

  // Generate grid rows
  const gridRows = useMemo(() => {
    const rows: number[] = [];
    for (let i = 0; i < TOTAL_ROWS; i++) {
      rows.push(i);
    }
    return rows;
  }, []);

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={[styles.contentContainer, { height: TOTAL_HEIGHT }]}>
        {/* Time labels column */}
        <View style={styles.timeLabelColumn}>
          {hourLabels.map((item) => (
            <Text
              key={item.hour}
              style={[
                styles.timeLabel,
                { top: item.y - 6 }, // offset by half line-height to center on grid line
              ]}
            >
              {item.label}
            </Text>
          ))}
        </View>

        {/* Grid area */}
        <View style={styles.gridArea} onLayout={onGridLayout}>
          {/* Horizontal dashed grid lines */}
          {gridRows.map((i) => (
            <View
              key={i}
              style={[
                styles.gridRow,
                { top: i * HOUR_HEIGHT, height: HOUR_HEIGHT },
              ]}
            />
          ))}

          {/* Long-pressable area */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onLongPress={handleLongPress}
          >
            {/* Course cards */}
            {columnWidth > 0 &&
              courses.map((course) => {
                const startDecimal = parseTime(course.startTime);
                const x = (course.dayOfWeek - 1) * columnWidth;
                const y = (startDecimal - START_HOUR) * HOUR_HEIGHT;

                return (
                  <View
                    key={course.id}
                    style={[
                      styles.courseCardWrapper,
                      { left: x, top: y },
                    ]}
                  >
                    <CourseCard
                      course={course}
                      hourHeight={HOUR_HEIGHT}
                      columnWidth={columnWidth}
                      onPress={() => onPressCourse(course)}
                    />
                  </View>
                );
              })}
          </Pressable>

          {/* Current time line */}
          {showTimeLine && (
            <View
              style={[styles.timeLineContainer, { top: timeLineY }]}
              pointerEvents="none"
            >
              <View style={styles.timeLine} />
            </View>
          )}
        </View>

        {/* Time label floats over the left time column */}
        {showTimeLine && (
          <View
            style={[styles.timeLineLabelWrap, { top: timeLineY - 8 }]}
            pointerEvents="none"
          >
            <Text style={styles.timeLineLabel}>{timeLineLabel}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
});

export default TimetableGrid;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  contentContainer: {
    flexDirection: 'row',
  },
  timeLabelColumn: {
    width: TIME_LABEL_WIDTH,
    position: 'relative',
  },
  timeLabel: {
    position: 'absolute',
    left: 0,
    width: TIME_LABEL_WIDTH,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#9CA3AF',
  },
  gridArea: {
    flex: 1,
    position: 'relative',
  },
  gridRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  courseCardWrapper: {
    position: 'absolute',
  },
  timeLineContainer: {
    position: 'absolute',
    left: -4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  timeLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#FF3B30',
    borderRadius: 1,
  },
  timeLineLabelWrap: {
    position: 'absolute',
    left: 0,
    width: TIME_LABEL_WIDTH,
    alignItems: 'center',
    zIndex: 11,
  },
  timeLineLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 9,
    color: '#FF3B30',
    backgroundColor: '#F3F5F7',
    paddingHorizontal: 2,
  },
});
