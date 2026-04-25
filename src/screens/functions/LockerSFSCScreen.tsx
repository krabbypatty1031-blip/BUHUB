import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScrollPickerSheet, { type PickerOption } from '../../components/common/ScrollPickerSheet';
import { HelpCircleIcon } from '../../components/common/icons';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import * as Notifications from 'expo-notifications';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import {
  lockerService,
  type LockerRequestInput,
  type LockerRequestRecord,
  type DropOffDate,
} from '../../api/services/locker.service';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import ScreenHeader from '../../components/common/ScreenHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { RESIDENCE_HALLS, findHall, type HallOption } from '../../data/residenceHalls';

function hallLabel(h: HallOption, lang: string) {
  if (lang === 'sc') return h.labelSc;
  if (lang === 'tc') return h.labelTc;
  return h.labelEn;
}

const LIFE_EMAIL_SUFFIX = '@life.hkbu.edu.hk';

function deriveStudentIdFromEmail(email: string | undefined | null): string {
  if (!email) return '';
  const lower = email.toLowerCase();
  if (!lower.endsWith(LIFE_EMAIL_SUFFIX)) return '';
  const localPart = email.slice(0, email.length - LIFE_EMAIL_SUFFIX.length);
  // Auto-fill only when the local-part is purely numeric (i.e. a HKBU student ID).
  // If it contains letters (a named alias), leave blank so the user fills it manually.
  return /^\d+$/.test(localPart) ? localPart : '';
}

type Props = NativeStackScreenProps<FunctionsStackParamList, 'LockerSFSC'>;

interface DropOffOption {
  date: DropOffDate;
  labelKey: string;
}
const DROP_OFF_OPTIONS: DropOffOption[] = [
  { date: '2026-05-07', labelKey: 'lockerSfscDropOffOption1' },
  { date: '2026-05-11', labelKey: 'lockerSfscDropOffOption2' },
  { date: '2026-05-16', labelKey: 'lockerSfscDropOffOption3' },
];

// Metro bundler requires static require() paths — declare all three up front,
// pick at render time based on the user's language.
/* eslint-disable @typescript-eslint/no-var-requires */
const promoImgEn = require('../../../assets/images/locker-sfsc-promo-en.png');
const promoImgSc = require('../../../assets/images/locker-sfsc-promo-sc.png');
const promoImgTc = require('../../../assets/images/locker-sfsc-promo-tc.png');
/* eslint-enable @typescript-eslint/no-var-requires */
const PROMO_BY_LANG: Record<string, number> = {
  en: promoImgEn,
  sc: promoImgSc,
  tc: promoImgTc,
};

const MAX_MODIFICATIONS = 1;

const FIRST_BOX_PRICE_HKD = 150;
const ADDITIONAL_BOX_PRICE_HKD = 185;
const MIN_BOXES = 1;
const MAX_BOXES = 10;

// Information-collection deadline: 2026-05-03 23:59 HKT (UTC+8).
const COLLECTION_DEADLINE_MS = Date.parse('2026-05-03T23:59:00+08:00');

const BROADCAST_POLL_INTERVAL_MS = 30_000;

export default function LockerSFSCScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const promoImg = PROMO_BY_LANG[i18n.language] ?? promoImgTc;
  const { height: screenHeight } = useWindowDimensions();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const authUser = useAuthStore((s) => s.user);

  const derivedStudentId =
    authUser?.linkedEmails?.find(
      (e) => e.verified && e.email.toLowerCase().endsWith(LIFE_EMAIL_SUFFIX),
    )?.email ?? '';

  const [fetching, setFetching] = useState(true);
  const [mineRecord, setMineRecord] = useState<LockerRequestRecord | null>(null);
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState(() => deriveStudentIdFromEmail(derivedStudentId));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [residenceAddress, setResidenceAddress] = useState('');
  const [dropOffDate, setDropOffDate] = useState<DropOffDate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hallPickerOpen, setHallPickerOpen] = useState(false);
  const [boxCount, setBoxCount] = useState<number>(MIN_BOXES);
  const [boxPickerOpen, setBoxPickerOpen] = useState(false);
  const [boxInfoOpen, setBoxInfoOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);

  const selectedHall = useMemo(() => findHall(residenceAddress), [residenceAddress]);
  const selectedHallLabel = selectedHall ? hallLabel(selectedHall, i18n.language) : '';

  const hallPickerOptions: PickerOption[] = useMemo(
    () => RESIDENCE_HALLS.map((h) => ({ value: h.value, label: hallLabel(h, i18n.language) })),
    [i18n.language],
  );

  const handleHallSelect = useCallback((value: string) => {
    setResidenceAddress(value);
    setHallPickerOpen(false);
  }, []);

  const boxPickerOptions: PickerOption[] = useMemo(
    () =>
      Array.from({ length: MAX_BOXES - MIN_BOXES + 1 }, (_, i) => {
        const n = MIN_BOXES + i;
        return { value: String(n), label: String(n) };
      }),
    [],
  );

  const handleBoxSelect = useCallback((value: string) => {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n >= MIN_BOXES && n <= MAX_BOXES) {
      setBoxCount(n);
    }
    setBoxPickerOpen(false);
  }, []);

  const estimatedPriceHkd =
    boxCount <= 1
      ? FIRST_BOX_PRICE_HKD
      : FIRST_BOX_PRICE_HKD + (boxCount - 1) * ADDITIONAL_BOX_PRICE_HKD;

  const promoHeight = screenHeight / 4;

  const isModifying = mineRecord !== null;
  const remainingModifies = mineRecord
    ? Math.max(0, MAX_MODIFICATIONS - mineRecord.modifyCount)
    : MAX_MODIFICATIONS;
  const modifyExhausted = isModifying && remainingModifies === 0;
  const [isExpired, setIsExpired] = useState(() => Date.now() > COLLECTION_DEADLINE_MS);

  // One-shot timer aligned to the exact deadline moment — flips `isExpired`
  // ~100ms after the cutoff with no recurring ticks.
  useEffect(() => {
    if (isExpired) return undefined;
    const ms = COLLECTION_DEADLINE_MS - Date.now();
    if (ms <= 0) {
      setIsExpired(true);
      return undefined;
    }
    const timer = setTimeout(() => setIsExpired(true), ms + 100);
    return () => clearTimeout(timer);
  }, [isExpired]);

  // Poll the admin broadcast message every 30s while the banner is visible
  // (post-deadline, user has a record). A single fetch kicks off immediately;
  // the interval keeps users in sync with admin edits without WebSocket infra.
  // Depend on a boolean rather than `mineRecord` itself — the 10s record poll
  // mutates `mineRecord.status` frequently, and depending on the object would
  // tear down + restart this interval every 10s (firing an extra broadcast
  // fetch each time).
  // Force an immediate broadcast refetch when a locker-broadcast push lands,
  // whether the user is in the app (received listener) or tapped the
  // notification from the lock screen (response listener). Otherwise the
  // banner would be up to 30s stale relative to the push that just arrived.
  useEffect(() => {
    const matches = (data: unknown): boolean => {
      if (!data || typeof data !== 'object') return false;
      return (data as { type?: unknown }).type === 'locker_broadcast';
    };
    const refetch = async () => {
      try {
        const { message } = await lockerService.fetchBroadcast();
        setBroadcastMessage(message);
      } catch {
        // Leave prior message visible; regular 30s poll will retry.
      }
    };
    const recv = Notifications.addNotificationReceivedListener((n) => {
      if (matches(n.request?.content?.data)) refetch();
    });
    const resp = Notifications.addNotificationResponseReceivedListener((r) => {
      if (matches(r.notification.request?.content?.data)) refetch();
    });
    return () => {
      recv.remove();
      resp.remove();
    };
  }, []);

  const hasRecord = mineRecord !== null;
  useEffect(() => {
    if (!isExpired || !hasRecord) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const { message } = await lockerService.fetchBroadcast();
        if (!cancelled) setBroadcastMessage(message);
      } catch {
        // Keep prior message on transient failure; default shows if never set.
      }
    };
    load();
    const interval = setInterval(load, BROADCAST_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isExpired, hasRecord]);

  const applyRecord = useCallback((record: LockerRequestRecord) => {
    setMineRecord(record);
    setFullName(record.fullName);
    setStudentId(record.studentId);
    setPhoneNumber(record.phoneNumber);
    setResidenceAddress(record.residenceAddress);
    const droppedIso = record.dropOffDate?.slice(0, 10);
    if (droppedIso && DROP_OFF_OPTIONS.some((o) => o.date === droppedIso)) {
      setDropOffDate(droppedIso as DropOffDate);
    }
    if (
      typeof record.boxCount === 'number' &&
      record.boxCount >= MIN_BOXES &&
      record.boxCount <= MAX_BOXES
    ) {
      setBoxCount(record.boxCount);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const record = await lockerService.getMine();
        if (active && record) applyRecord(record);
      } catch {
        // Silent — user can still submit fresh; errors surface on submit.
      } finally {
        if (active) setFetching(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyRecord]);

  // Poll every 10s to surface admin-driven status changes. Only merges `status`
  // so local form edits aren't clobbered. A transient null from the server is
  // ignored (keeps prev state) — the admin-delete case is resolved on the next
  // screen remount via fetch-on-mount, which avoids wiping the form mid-session
  // on a flaky response.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const record = await lockerService.getMine();
        if (!record) return;
        setMineRecord((prev) => (prev ? { ...prev, status: record.status } : record));
      } catch {
        // Swallow — network blips are non-fatal for polling.
      }
    }, 10000);
    return () => clearInterval(id);
  }, []);

  // When mineRecord transitions from present → null (admin deleted the row),
  // reset form state so the user sees a clean fresh-submit form.
  const hadRecordRef = useRef(false);
  useEffect(() => {
    if (hadRecordRef.current && mineRecord === null) {
      setFullName('');
      setStudentId(deriveStudentIdFromEmail(derivedStudentId));
      setPhoneNumber('');
      setResidenceAddress('');
      setDropOffDate(null);
      setBoxCount(MIN_BOXES);
    }
    hadRecordRef.current = mineRecord !== null;
  }, [mineRecord, derivedStudentId]);

  // When the deadline crosses MID-SESSION, wipe typed-but-unsaved edits:
  //  - no existing record → blank the form
  //  - has existing record → restore the original DB values
  // On a remount where `isExpired` is already true (user re-opens the screen
  // after deadline), DO NOT run the wipe — the fetch-on-mount effect below is
  // responsible for restoring the submitted record, and the wipe branch would
  // race the fetch and erase the form before the network call resolves.
  const expiredOnMountRef = useRef(isExpired);
  useEffect(() => {
    if (!isExpired) return;
    if (expiredOnMountRef.current) return;
    if (mineRecord) {
      applyRecord(mineRecord);
    } else {
      setFullName('');
      setStudentId('');
      setPhoneNumber('');
      setResidenceAddress('');
      setDropOffDate(null);
      setBoxCount(MIN_BOXES);
    }
  }, [isExpired, mineRecord, applyRecord]);

  const isValid =
    !modifyExhausted &&
    !isExpired &&
    fullName.trim().length > 0 &&
    studentId.trim().length > 0 &&
    phoneNumber.trim().length > 0 &&
    residenceAddress.trim().length > 0 &&
    dropOffDate !== null;

  // In modify mode, require at least one field to differ from the existing record.
  // Fresh-submit mode (no record yet) always counts as "changed".
  const hasChanges = useMemo(() => {
    if (!mineRecord) return true;
    const recordDropOff = mineRecord.dropOffDate?.slice(0, 10) ?? null;
    return (
      fullName.trim() !== mineRecord.fullName ||
      studentId.trim() !== mineRecord.studentId ||
      phoneNumber.trim() !== mineRecord.phoneNumber ||
      residenceAddress.trim() !== mineRecord.residenceAddress ||
      dropOffDate !== recordDropOff ||
      boxCount !== mineRecord.boxCount
    );
  }, [mineRecord, fullName, studentId, phoneNumber, residenceAddress, dropOffDate, boxCount]);

  const canSubmit = isValid && (!isModifying || hasChanges);

  const performSubmit = useCallback(async () => {
    if (!isValid || !dropOffDate) return;
    setSubmitting(true);
    try {
      const payload: LockerRequestInput = {
        fullName: fullName.trim(),
        studentId: studentId.trim(),
        phoneNumber: phoneNumber.trim(),
        residenceAddress: residenceAddress.trim(),
        dropOffDate,
        boxCount,
      };
      const record = await lockerService.submit(payload);
      applyRecord(record);
      showSnackbar({ message: t('lockerSfscSubmitSuccess'), type: 'success' });
    } catch {
      showSnackbar({ message: t('lockerSfscSubmitFailed'), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [isValid, dropOffDate, fullName, studentId, phoneNumber, residenceAddress, boxCount, showSnackbar, t, applyRecord]);

  const onSubmitPressed = useCallback(() => {
    if (!canSubmit || submitting) return;
    setReviewOpen(true);
  }, [canSubmit, submitting]);

  const onReviewConfirm = useCallback(() => {
    setReviewOpen(false);
    void performSubmit();
  }, [performSubmit]);

  const renderForm = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.label}>{t('lockerSfscFullName')}</Text>
        <TextInput
          style={[styles.input, isExpired && styles.inputReadOnly]}
          value={fullName}
          onChangeText={setFullName}
          editable={!isExpired}
          placeholder={t('lockerSfscFullNamePlaceholder')}
          placeholderTextColor={colors.outline}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>{t('lockerSfscStudentId')}</Text>
        <TextInput
          style={[styles.input, isExpired && styles.inputReadOnly]}
          value={studentId}
          onChangeText={(text) => {
            // Reject any change that contains non-digits (e.g. paste of "abc123",
            // external keyboard letter, IME input). Keeps the previous value on reject.
            if (/^\d*$/.test(text)) setStudentId(text);
          }}
          editable={!isExpired}
          placeholder={t('lockerSfscStudentIdPlaceholder')}
          placeholderTextColor={colors.outline}
          keyboardType="number-pad"
          maxLength={32}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>{t('lockerSfscPhone')}</Text>
        <TextInput
          style={[styles.input, isExpired && styles.inputReadOnly]}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          editable={!isExpired}
          placeholder={t('lockerSfscPhonePlaceholder')}
          placeholderTextColor={colors.outline}
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>{t('lockerSfscAddress')}</Text>
        <TouchableOpacity
          style={[styles.input, isExpired && styles.inputReadOnly]}
          onPress={() => setHallPickerOpen(true)}
          activeOpacity={0.7}
          disabled={isExpired}
        >
          <Text
            style={selectedHallLabel ? styles.pickerValue : styles.pickerPlaceholder}
            numberOfLines={1}
          >
            {selectedHallLabel || t('lockerSfscAddressPlaceholder')}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, styles.labelInRow]}>{t('lockerSfscBoxCount')}</Text>
          <TouchableOpacity
            onPress={() => setBoxInfoOpen(true)}
            accessibilityLabel={t('lockerSfscBoxInfoTitle')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.infoButton}
          >
            <HelpCircleIcon size={16} color="#86909C" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.input,
            (isExpired || modifyExhausted) && styles.inputReadOnly,
          ]}
          onPress={() => setBoxPickerOpen(true)}
          activeOpacity={0.7}
          disabled={isExpired || modifyExhausted}
        >
          <Text style={styles.pickerValue} numberOfLines={1}>{String(boxCount)}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>{t('lockerSfscDropOffDate')}</Text>
        <View style={styles.chipRow}>
          {DROP_OFF_OPTIONS.map((opt) => {
            const selected = dropOffDate === opt.date;
            return (
              <TouchableOpacity
                key={opt.date}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                  isExpired && !selected && styles.chipDisabled,
                ]}
                onPress={() => setDropOffDate(selected ? null : opt.date)}
                disabled={isExpired}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                    isExpired && !selected && styles.chipTextDisabled,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
        disabled={!canSubmit || submitting}
        onPress={onSubmitPressed}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={styles.submitBtnText}>
            {t(isModifying ? 'lockerSfscModify' : 'lockerSfscSubmit')}
          </Text>
        )}
      </TouchableOpacity>
      <Text style={styles.deadlineText}>
        {isExpired ? t('lockerSfscDeadlineEnded') : t('lockerSfscDeadlineBefore')}
      </Text>
      {isModifying && !isExpired && (
        <Text style={styles.modifyHint}>
          {remainingModifies > 0
            ? t('lockerSfscModifyHint', { count: remainingModifies })
            : t('lockerSfscNoModifyLeft')}
        </Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        variant="campus"
        title={t('lockerSfscFormTitle')}
        onBack={() => navigation.goBack()}
        titleStyle={{ fontFamily: 'SourceHanSansCN-Bold' }}
      />
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
      >
        <ExpoImage source={promoImg} style={[styles.promo, { height: promoHeight }]} contentFit="cover" />
        {isExpired && mineRecord && (
          <View style={styles.broadcastCard}>
            <Text style={styles.broadcastNoticeTag}>{t('lockerSfscBroadcastNoticeTag')}</Text>
            <Text style={styles.broadcastText}>
              {broadcastMessage?.trim() ? broadcastMessage : t('lockerSfscBroadcastDefault')}
            </Text>
          </View>
        )}
        {fetching ? (
          <View style={styles.fetchingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          renderForm()
        )}
      </ScrollView>

      <ScrollPickerSheet
        visible={hallPickerOpen}
        onClose={() => setHallPickerOpen(false)}
        onConfirm={handleHallSelect}
        options={hallPickerOptions}
        initialValue={residenceAddress}
        title={t('lockerSfscHallPickerTitle')}
      />

      <ScrollPickerSheet
        visible={boxPickerOpen}
        onClose={() => setBoxPickerOpen(false)}
        onConfirm={handleBoxSelect}
        options={boxPickerOptions}
        initialValue={String(boxCount)}
        title={t('lockerSfscBoxCount')}
      />

      <Modal
        visible={boxInfoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBoxInfoOpen(false)}
      >
        <View style={styles.reviewBackdrop}>
          <View style={styles.reviewSheet}>
            <Text style={styles.reviewTitle}>{t('lockerSfscBoxInfoTitle')}</Text>
            <View style={styles.boxInfoBody}>
              <Text style={styles.boxInfoLine}>1. {t('lockerSfscBoxInfoSize')}</Text>
              <Text style={styles.boxInfoLine}>2. {t('lockerSfscBoxInfoStorage')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.reviewBtn, styles.reviewBtnConfirm, styles.boxInfoCloseBtn]}
              onPress={() => setBoxInfoOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.reviewBtnTextConfirm}>{t('lockerSfscBoxInfoClose')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={reviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewOpen(false)}
      >
        <View style={styles.reviewBackdrop}>
          <View style={styles.reviewSheet}>
            <Text style={styles.reviewTitle}>
              {t(isModifying ? 'lockerSfscConfirmModifyTitle' : 'lockerSfscConfirmTitle')}
            </Text>
            <ScrollView style={styles.reviewBody} contentContainerStyle={styles.reviewBodyContent}>
              {[
                { label: t('lockerSfscFullName'), value: fullName.trim() },
                { label: t('lockerSfscStudentId'), value: studentId.trim() },
                { label: t('lockerSfscPhone'), value: phoneNumber.trim() },
                { label: t('lockerSfscAddress'), value: selectedHallLabel },
                {
                  label: t('lockerSfscBoxCount'),
                  value: String(boxCount),
                },
                {
                  label: t('lockerSfscDropOffDate'),
                  value: (() => {
                    const opt = DROP_OFF_OPTIONS.find((o) => o.date === dropOffDate);
                    return opt ? t(opt.labelKey) : (dropOffDate ?? '');
                  })(),
                },
              ].map((row) => (
                <View key={row.label} style={styles.reviewRow}>
                  <Text style={styles.reviewRowLabel}>{row.label}</Text>
                  <Text style={styles.reviewRowValue}>{row.value || '—'}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.reviewActions}>
              <TouchableOpacity
                style={[styles.reviewBtn, styles.reviewBtnCancel]}
                onPress={() => setReviewOpen(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.reviewBtnTextCancel}>{t('lockerSfscConfirmNo')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reviewBtn, styles.reviewBtnConfirm]}
                onPress={onReviewConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.reviewBtnTextConfirm}>{t('lockerSfscConfirmYes')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },
  promo: { width: '100%', backgroundColor: '#F3F5F7' },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  label: { fontSize: 14, fontFamily: 'SourceHanSansCN-Medium', color: '#0C1015', marginBottom: 12 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelInRow: {
    marginBottom: 0,
  },
  infoButton: {
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimatedPrice: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#DC2626',
    textAlign: 'right',
  },
  boxInfoBody: {
    marginBottom: spacing.lg,
  },
  boxInfoCloseBtn: {
    flex: 0,
    alignSelf: 'stretch',
  },
  boxInfoLine: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
    lineHeight: 22,
    marginBottom: 8,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DEE2E5',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },
  multilineInput: { minHeight: 80 },
  inputReadOnly: {
    backgroundColor: '#F3F5F7',
    color: '#0C1015',
  },
  pickerValue: {
    fontSize: 15,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
    lineHeight: 20,
  },
  pickerPlaceholder: {
    fontSize: 15,
    fontFamily: 'SourceHanSansCN-Regular',
    color: colors.outline,
    lineHeight: 20,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DEE2E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipDisabled: { backgroundColor: '#F3F5F7', borderColor: '#E5E7EB' },
  chipText: { fontSize: 13, fontFamily: 'SourceHanSansCN-Regular', color: '#0C1015', textAlign: 'center' },
  chipTextSelected: { color: colors.onPrimary },
  chipTextDisabled: { color: '#C1C1C1' },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    lineHeight: 18,
  },
  submitBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontFamily: 'SourceHanSansCN-Bold', color: colors.onPrimary },
  modifyHint: {
    marginTop: 6,
    marginHorizontal: spacing.lg,
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    textAlign: 'center',
    lineHeight: 18,
  },
  deadlineText: {
    marginTop: 10,
    marginHorizontal: spacing.lg,
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 18,
  },
  fetchingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 16, 21, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  reviewSheet: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  reviewTitle: {
    fontSize: 17,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  reviewBody: {
    flexGrow: 0,
  },
  reviewBodyContent: {
    paddingBottom: 4,
  },
  reviewRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5F7',
  },
  reviewRowLabel: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
    marginBottom: 4,
  },
  reviewRowValue: {
    fontSize: 15,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },
  reviewActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: 10,
  },
  reviewBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnCancel: {
    backgroundColor: '#F3F5F7',
  },
  reviewBtnConfirm: {
    backgroundColor: colors.primary,
  },
  reviewBtnTextCancel: {
    fontSize: 15,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
  },
  reviewBtnTextConfirm: {
    fontSize: 15,
    fontFamily: 'SourceHanSansCN-Bold',
    color: colors.onPrimary,
  },
  broadcastCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF4E0',
    borderWidth: 1,
    borderColor: '#F5C97A',
  },
  broadcastNoticeTag: {
    fontFamily: 'SourceHanSansCN-Bold',
    fontSize: 13,
    color: '#DC2626',
    marginBottom: 2,
  },
  broadcastText: {
    fontFamily: 'SourceHanSansCN-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#0C1015',
    textAlign: 'center',
    transform: [{ skewX: '-10deg' }],
  },
});
