import React, { useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { useTranslation } from 'react-i18next';

interface WeekCalendarHeaderProps {
  weekOffset: number;
  onWeekChange: (delta: number) => void;
  courseDays: Set<number>; // days of week (1-7) that have courses
}

const WEEKDAY_LABELS: Record<string, string[]> = {
  tc: ['一', '二', '三', '四', '五', '六', '日'],
  sc: ['一', '二', '三', '四', '五', '六', '日'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const MONTH_ABBR: Record<string, string[]> = {
  tc: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  sc: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
};

const TODAY_LABEL: Record<string, string> = {
  tc: '今',
  sc: '今',
  en: 'Now',
};

function getWeekDates(weekOffset: number): Date[] {
  const base = new Date();
  base.setDate(base.getDate() + weekOffset * 7);
  // Find Monday of that week (getDay(): 0=Sun, 1=Mon, ..., 6=Sat)
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WeekCalendarHeader = React.memo(function WeekCalendarHeader({
  weekOffset,
  onWeekChange,
  courseDays,
}: WeekCalendarHeaderProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language === 'sc' ? 'sc' : i18n.language === 'en' ? 'en' : 'tc') as 'tc' | 'sc' | 'en';
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const monthOfMonday = weekDates[0].getMonth(); // 0-based
  const monthAbbr = (MONTH_ABBR[lang] || MONTH_ABBR.tc)[monthOfMonday];
  const weekdayLabels = WEEKDAY_LABELS[lang] || WEEKDAY_LABELS.tc;
  const todayLabel = TODAY_LABEL[lang] || TODAY_LABEL.tc;
  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 12,
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx <= -30) {
            onWeekChange(1);
            return;
          }
          if (gestureState.dx >= 30) {
            onWeekChange(-1);
          }
        },
      }),
    [onWeekChange]
  );

  return (
    <View style={styles.container} {...swipeResponder.panHandlers}>
      {/* Left month section — aligned with grid time label column (34px) */}
      <View style={styles.monthSection}>
        <Text style={styles.monthAbbr}>{monthAbbr}</Text>
      </View>

      {/* 7 day columns */}
      <View style={styles.daysRow}>
        {weekDates.map((date, index) => {
          const dayOfWeek = index + 1; // 1=Mon ... 7=Sun
          const isToday = isSameDay(date, today);
          const isWeekend = dayOfWeek === 6 || dayOfWeek === 7;
          return (
            <View key={dayOfWeek} style={styles.dayColumn}>
              <Text
                style={[
                  styles.weekdayText,
                  isWeekend && styles.weekendText,
                ]}
              >
                {weekdayLabels[index]}
              </Text>
              {isToday ? (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayText}>{date.getDate()}</Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.dateNumber,
                    isWeekend && styles.weekendText,
                  ]}
                >
                  {date.getDate()}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
});

export default WeekCalendarHeader;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 4,
    paddingLeft: 0,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5.4,
    elevation: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DEE2E5',
  },
  monthSection: {
    width: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthAbbr: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 9,
    color: '#9CA3AF',
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekdayText: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 14,
    color: '#4E5969',
    letterSpacing: -0.33,
  },
  dateNumber: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 12,
    color: '#9CA3AF',
  },
  weekendText: {
    color: '#9CA3AF',
  },
  todayBadge: {
    backgroundColor: 'red',
    width: 14,
    borderRadius: 2,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    fontFamily: 'SourceHanSansCN-Bold',
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  courseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4E5969',
  },
});
