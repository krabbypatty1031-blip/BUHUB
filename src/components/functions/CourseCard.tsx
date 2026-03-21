import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ScheduleCourse } from '../../types/schedule';

interface CourseCardProps {
  course: ScheduleCourse;
  hourHeight: number; // 68 pixels per hour
  columnWidth: number; // width of one day column
  onPress: () => void;
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
}

const CourseCard = React.memo(function CourseCard({
  course,
  hourHeight,
  columnWidth,
  onPress,
}: CourseCardProps) {
  const startDecimal = parseTime(course.startTime);
  const endDecimal = parseTime(course.endTime);
  const durationHours = endDecimal - startDecimal;
  const cardHeight = durationHours * hourHeight;

  const showLocation = cardHeight >= 36;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: columnWidth - 1,
          height: Math.max(cardHeight, 20),
          backgroundColor: course.color,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text
        style={styles.courseName}
      >
        {course.name}
      </Text>
      {showLocation && course.location ? (
        <Text style={styles.location}>
          {course.location}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});

export default CourseCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    paddingTop: 4,
    paddingLeft: 4,
    paddingRight: 2,
    paddingBottom: 4,
    overflow: 'hidden',
    gap: 4,
  },
  courseName: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 10,
    lineHeight: 12,
    color: '#0C1015',
  },
  location: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 9,
    lineHeight: 10,
    color: '#4E5969',
  },
});
