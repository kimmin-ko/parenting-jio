import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FeedingRecord, Settings, Tab } from './src/types';
import {
  loadRecords,
  addRecord,
  deleteRecord,
  updateRecord,
  loadSettings,
  saveSettings,
  loadTimerEnd,
  saveTimerEnd,
  mergeWidgetRecords,
} from './src/storage';
import { C, generateId, formatDate } from './src/helpers';
import { scheduleNotification, cancelScheduledNotification } from './src/notifications';
import { syncToWidget, loadPendingWidgetRecords, clearPendingWidgetRecords } from './src/sharedStorage';
import {
  loadFamilyCode,
  saveFamilyCode,
  clearFamilyCode,
  generateFamilyCode,
  initialSync,
  subscribeToRecords,
  pushRecordsToFirebase,
  deleteRecordFromFirebase,
  updateRecordInFirebase,
} from './src/sync';
import RecordTab from './src/components/RecordTab';
import HistoryTab from './src/components/HistoryTab';
import StatsTab from './src/components/StatsTab';
import SettingsTab from './src/components/SettingsTab';

// Sync data to iOS widget
function syncWidget(recs: FeedingRecord[], sets: Settings, timer: number | null): void {
  const today = formatDate(new Date());
  const todayRecs = recs.filter((r) => formatDate(new Date(r.timestamp)) === today);
  syncToWidget({
    lastFeedingTime: recs.length > 0 ? recs[0].timestamp : null,
    lastFeedingAmount: recs.length > 0 ? recs[0].amount : null,
    todayCount: todayRecs.length,
    todayTotal: todayRecs.reduce((s, r) => s + r.amount, 0),
    defaultMl: sets.defaultMl,
    timerEnd: timer,
  });
}

// ─── Tab Config ───
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
const TAB_CONFIG: { key: Tab; label: string; icon: IconName; iconOutline: IconName }[] = [
  { key: 'record', label: '기록', icon: 'baby-bottle', iconOutline: 'baby-bottle-outline' },
  { key: 'history', label: '목록', icon: 'clipboard-text-clock', iconOutline: 'clipboard-text-clock-outline' },
  { key: 'stats', label: '통계', icon: 'chart-bar', iconOutline: 'chart-line' },
  { key: 'settings', label: '설정', icon: 'cog', iconOutline: 'cog-outline' },
];

// ─── Main Content ───
function AppContent() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('record');
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [settings, setSettings] = useState<Settings>({ defaultMl: 120, timerMinutes: 180 });
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [showAfterRecord, setShowAfterRecord] = useState(false);
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIdRef = useRef<string | null>(null);
  const timerRecordIdRef = useRef<string | null>(null);
  const lastRecordIdRef = useRef<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const familyCodeRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const [r, s, t, fc] = await Promise.all([
        loadRecords(), loadSettings(), loadTimerEnd(), loadFamilyCode(),
      ]);
      const pending = await loadPendingWidgetRecords();
      const merged = await mergeWidgetRecords(pending);
      if (pending.length > 0) await clearPendingWidgetRecords();
      const finalRecords = pending.length > 0 ? merged : r;
      setRecords(finalRecords);
      setSettings(s);
      const validTimer = t && t > Date.now() ? t : null;
      if (t && !validTimer) saveTimerEnd(null);
      setTimerEnd(validTimer);
      syncWidget(finalRecords, s, validTimer);

      // Firebase sync
      if (fc) {
        setFamilyCode(fc);
        familyCodeRef.current = fc;
        await initialSync(fc);
        unsubRef.current = subscribeToRecords(fc, (synced) => {
          setRecords(synced);
          syncWidget(synced, s, validTimer);
        });
      }
    })();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timerEnd) {
      const tick = () => {
        const left = timerEnd - Date.now();
        if (left <= 0) {
          setRemaining(0);
          setTimerEnd(null);
          saveTimerEnd(null);
          notifIdRef.current = null;
          Alert.alert('분유 시간', '지오 분유 먹일 시간이에요!');
          return;
        }
        setRemaining(left);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setRemaining(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerEnd]);

  const handleRecord = useCallback(async () => {
    const record: FeedingRecord = {
      id: generateId(),
      timestamp: Date.now(),
      amount: settings.defaultMl,
    };
    lastRecordIdRef.current = record.id;
    const updated = await addRecord(record);
    setRecords(updated);
    setShowAfterRecord(true);
    syncWidget(updated, settings, timerEnd);
    if (familyCodeRef.current) pushRecordsToFirebase(familyCodeRef.current, updated);
  }, [settings, timerEnd]);

  const handleStartTimer = useCallback(async () => {
    const end = Date.now() + settings.timerMinutes * 60 * 1000;
    setTimerEnd(end);
    await saveTimerEnd(end);
    timerRecordIdRef.current = lastRecordIdRef.current;
    if (Platform.OS !== 'web') {
      const nid = await scheduleNotification(settings.timerMinutes);
      notifIdRef.current = nid;
    }
    setShowAfterRecord(false);
  }, [settings.timerMinutes]);

  const handleCancelTimer = useCallback(async () => {
    setTimerEnd(null);
    setRemaining(0);
    await saveTimerEnd(null);
    timerRecordIdRef.current = null;
    if (notifIdRef.current) {
      await cancelScheduledNotification(notifIdRef.current);
      notifIdRef.current = null;
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const updated = await deleteRecord(id);
    setRecords(updated);
    if (timerRecordIdRef.current === id) {
      setTimerEnd(null);
      setRemaining(0);
      await saveTimerEnd(null);
      timerRecordIdRef.current = null;
      if (notifIdRef.current) {
        await cancelScheduledNotification(notifIdRef.current);
        notifIdRef.current = null;
      }
      syncWidget(updated, settings, null);
    } else {
      syncWidget(updated, settings, timerEnd);
    }
    if (familyCodeRef.current) deleteRecordFromFirebase(familyCodeRef.current, id);
  }, [settings, timerEnd]);

  const handleUpdateTime = useCallback(async (id: string, timestamp: number) => {
    const updated = await updateRecord(id, { timestamp });
    setRecords(updated);
    syncWidget(updated, settings, timerEnd);
    if (familyCodeRef.current) {
      const record = updated.find((r) => r.id === id);
      if (record) updateRecordInFirebase(familyCodeRef.current, id, record);
    }
  }, [settings, timerEnd]);

  const handleDismissPrompt = useCallback(() => {
    setShowAfterRecord(false);
  }, []);

  const handleUpdateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
    syncWidget(records, next, timerEnd);
  }, [settings, records, timerEnd]);

  const handleCreateFamily = useCallback(async () => {
    const code = generateFamilyCode();
    await saveFamilyCode(code);
    setFamilyCode(code);
    familyCodeRef.current = code;
    await initialSync(code);
    unsubRef.current = subscribeToRecords(code, (synced) => {
      setRecords(synced);
    });
  }, []);

  const handleJoinFamily = useCallback(async (code: string) => {
    const upper = code.toUpperCase().trim();
    if (upper.length !== 6) {
      Alert.alert('오류', '6자리 가족 코드를 입력해주세요.');
      return;
    }
    await saveFamilyCode(upper);
    setFamilyCode(upper);
    familyCodeRef.current = upper;
    await initialSync(upper);
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeToRecords(upper, (synced) => {
      setRecords(synced);
    });
  }, []);

  const handleLeaveFamily = useCallback(async () => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    await clearFamilyCode();
    setFamilyCode(null);
    familyCodeRef.current = null;
  }, []);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.headerTitle}>지오 분유 기록</Text>
        <Text style={s.headerSub}>우리 아이 수유 관리</Text>
      </View>
      <View style={s.content}>
        {tab === 'record' && (
          <RecordTab
            records={records}
            settings={settings}
            timerEnd={timerEnd}
            remaining={remaining}
            showAfterRecord={showAfterRecord}
            onRecord={handleRecord}
            onStartTimer={handleStartTimer}
            onCancelTimer={handleCancelTimer}
            onDismissPrompt={handleDismissPrompt}
          />
        )}
        {tab === 'history' && (
          <HistoryTab
            records={records}
            onDelete={handleDelete}
            onUpdateTime={handleUpdateTime}
          />
        )}
        {tab === 'stats' && <StatsTab records={records} />}
        {tab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            familyCode={familyCode}
            onCreateFamily={handleCreateFamily}
            onJoinFamily={handleJoinFamily}
            onLeaveFamily={handleLeaveFamily}
          />
        )}
      </View>
      <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TAB_CONFIG.map((t) => {
          const isActive = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={s.tabItem}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <View style={[s.tabIconWrap, isActive && s.tabIconWrapActive]}>
                <MaterialCommunityIcons
                  name={isActive ? t.icon : t.iconOutline}
                  size={22}
                  color={isActive ? C.blue : C.gray400}
                />
              </View>
              <Text style={[s.tabText, isActive && s.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Root App ───
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

// ─── Styles ───
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: C.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.gray200,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.black, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontWeight: '500', color: C.gray500, marginTop: 2 },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.gray200,
    paddingTop: 6,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIconWrap: {
    width: 36,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: C.blueBg,
  },
  tabText: { fontSize: 10, color: C.gray400, fontWeight: '500' },
  tabTextActive: { color: C.blue, fontWeight: '700' },
});
