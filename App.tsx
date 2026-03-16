import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { FeedingRecord, Settings, Tab } from './src/types';
import {
  loadRecords,
  addRecord,
  loadSettings,
  saveSettings,
  loadTimerEnd,
  saveTimerEnd,
} from './src/storage';

// ─── Notifications Setup ───
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleNotification(minutes: number): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) {
    Alert.alert('알림 권한', '알림 권한을 허용해주세요.');
    return null;
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '지오 분유 시간',
      body: '분유 먹일 시간이에요!',
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
  });
  return id;
}

async function cancelScheduledNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// ─── Helpers ───
function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const mo = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function groupByDate(records: FeedingRecord[]): Record<string, FeedingRecord[]> {
  const groups: Record<string, FeedingRecord[]> = {};
  for (const r of records) {
    const key = formatDate(new Date(r.timestamp));
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

// ─── Main App ───
export default function App() {
  const [tab, setTab] = useState<Tab>('record');
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [settings, setSettings] = useState<Settings>({ defaultMl: 120, timerMinutes: 180 });
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [showAfterRecord, setShowAfterRecord] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load data on mount
  useEffect(() => {
    (async () => {
      const [r, s, t] = await Promise.all([loadRecords(), loadSettings(), loadTimerEnd()]);
      setRecords(r);
      setSettings(s);
      if (t && t > Date.now()) {
        setTimerEnd(t);
      } else if (t) {
        saveTimerEnd(null);
      }
    })();
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timerEnd) {
      const tick = () => {
        const left = timerEnd - Date.now();
        if (left <= 0) {
          setRemaining(0);
          setTimerEnd(null);
          saveTimerEnd(null);
          if (Platform.OS === 'web') {
            alert('지오 분유 시간이에요!');
          } else {
            Alert.alert('알림', '지오 분유 시간이에요!');
          }
          return;
        }
        setRemaining(left);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setRemaining(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerEnd]);

  // Record feeding
  const handleRecord = useCallback(async () => {
    const record: FeedingRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      amount: settings.defaultMl,
    };
    const updated = await addRecord(record);
    setRecords(updated);
    setShowAfterRecord(true);
  }, [settings.defaultMl]);

  // Start timer
  const handleStartTimer = useCallback(async () => {
    const end = Date.now() + settings.timerMinutes * 60 * 1000;
    setTimerEnd(end);
    await saveTimerEnd(end);
    setShowAfterRecord(false);
    setTab('record');
  }, [settings.timerMinutes]);

  // Cancel timer
  const handleCancelTimer = useCallback(async () => {
    setTimerEnd(null);
    setRemaining(0);
    await saveTimerEnd(null);
  }, []);

  // Update settings
  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  }, [settings]);

  // ─── Record Tab ───
  const renderRecord = () => (
    <View style={styles.center}>
      {/* Timer display */}
      {timerEnd ? (
        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>다음 분유까지</Text>
          <Text style={styles.timerText}>{formatCountdown(remaining)}</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelTimer}>
            <Text style={styles.cancelBtnText}>타이머 취소</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* After record prompt */}
      {showAfterRecord ? (
        <View style={styles.promptBox}>
          <Text style={styles.promptText}>
            {settings.defaultMl}ml 기록 완료!
          </Text>
          <View style={styles.promptButtons}>
            <TouchableOpacity
              style={[styles.promptBtn, styles.primaryBtn]}
              onPress={handleStartTimer}
            >
              <Text style={styles.primaryBtnText}>타이머 설정</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.promptBtn, styles.secondaryBtn]}
              onPress={() => setShowAfterRecord(false)}
            >
              <Text style={styles.secondaryBtnText}>기록만</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.babyName}>지오</Text>
          <Text style={styles.defaultMlText}>{settings.defaultMl}ml</Text>
          <TouchableOpacity style={styles.recordBtn} onPress={handleRecord}>
            <Text style={styles.recordBtnText}>분유 기록</Text>
          </TouchableOpacity>
          {records.length > 0 && (
            <Text style={styles.lastRecord}>
              마지막: {formatTime(new Date(records[0].timestamp))} - {records[0].amount}ml
            </Text>
          )}
        </>
      )}
    </View>
  );

  // ─── History Tab ───
  const renderHistory = () => {
    const grouped = groupByDate(records);
    const dates = Object.keys(grouped).sort().reverse();
    return (
      <ScrollView style={styles.scrollView}>
        {dates.length === 0 ? (
          <Text style={styles.emptyText}>기록이 없습니다</Text>
        ) : (
          dates.map((date) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {grouped[date].map((r) => (
                <View key={r.id} style={styles.recordRow}>
                  <Text style={styles.recordTime}>
                    {formatTime(new Date(r.timestamp))}
                  </Text>
                  <Text style={styles.recordAmount}>{r.amount}ml</Text>
                </View>
              ))}
              <Text style={styles.dateSummary}>
                총 {grouped[date].length}회 / {grouped[date].reduce((s, r) => s + r.amount, 0)}ml
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  // ─── Stats Tab ───
  const renderStats = () => {
    const today = formatDate(new Date());
    const todayRecords = records.filter((r) => formatDate(new Date(r.timestamp)) === today);
    const totalMl = todayRecords.reduce((s, r) => s + r.amount, 0);
    const count = todayRecords.length;
    const avgMl = count > 0 ? Math.round(totalMl / count) : 0;

    // Last 7 days
    const last7: { date: string; total: number; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      const dayRecords = records.filter((r) => formatDate(new Date(r.timestamp)) === key);
      last7.push({
        date: key,
        total: dayRecords.reduce((s, r) => s + r.amount, 0),
        count: dayRecords.length,
      });
    }

    return (
      <ScrollView style={styles.scrollView}>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>오늘 ({today})</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{count}</Text>
              <Text style={styles.statLabel}>횟수</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalMl}</Text>
              <Text style={styles.statLabel}>총 ml</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgMl}</Text>
              <Text style={styles.statLabel}>평균 ml</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>최근 7일</Text>
          {last7.map((d) => (
            <View key={d.date} style={styles.weekRow}>
              <Text style={styles.weekDate}>{d.date.slice(5)}</Text>
              <View style={styles.weekBar}>
                <View
                  style={[
                    styles.weekBarFill,
                    { flex: d.total > 0 ? d.total / 1000 : 0 },
                  ]}
                />
                <View style={{ flex: Math.max(0, 1 - d.total / 1000) }} />
              </View>
              <Text style={styles.weekTotal}>{d.total}ml</Text>
              <Text style={styles.weekCount}>{d.count}회</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  // ─── Settings Tab ───
  const [mlInput, setMlInput] = useState('');
  const [timerInput, setTimerInput] = useState('');

  useEffect(() => {
    setMlInput(String(settings.defaultMl));
    setTimerInput(String(settings.timerMinutes));
  }, [settings]);

  const renderSettings = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.settingsCard}>
        <Text style={styles.settingsLabel}>기본 분유량 (ml)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={mlInput}
          onChangeText={setMlInput}
          onBlur={() => {
            const v = parseInt(mlInput, 10);
            if (v > 0) updateSettings({ defaultMl: v });
            else setMlInput(String(settings.defaultMl));
          }}
        />
      </View>
      <View style={styles.settingsCard}>
        <Text style={styles.settingsLabel}>타이머 간격 (분)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={timerInput}
          onChangeText={setTimerInput}
          onBlur={() => {
            const v = parseInt(timerInput, 10);
            if (v > 0) updateSettings({ timerMinutes: v });
            else setTimerInput(String(settings.timerMinutes));
          }}
        />
      </View>
      <View style={styles.settingsCard}>
        <Text style={styles.settingsLabel}>빠른 설정</Text>
        <View style={styles.quickSettings}>
          {[80, 100, 120, 150, 180, 200].map((ml) => (
            <TouchableOpacity
              key={ml}
              style={[
                styles.quickBtn,
                settings.defaultMl === ml && styles.quickBtnActive,
              ]}
              onPress={() => {
                updateSettings({ defaultMl: ml });
                setMlInput(String(ml));
              }}
            >
              <Text
                style={[
                  styles.quickBtnText,
                  settings.defaultMl === ml && styles.quickBtnTextActive,
                ]}
              >
                {ml}ml
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  // ─── Tab Bar ───
  const tabs: { key: Tab; label: string }[] = [
    { key: 'record', label: '기록' },
    { key: 'history', label: '목록' },
    { key: 'stats', label: '통계' },
    { key: 'settings', label: '설정' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>지오 분유 기록</Text>
      </View>
      <View style={styles.content}>
        {tab === 'record' && renderRecord()}
        {tab === 'history' && renderHistory()}
        {tab === 'stats' && renderStats()}
        {tab === 'settings' && renderSettings()}
      </View>
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FF9F43',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  content: { flex: 1 },

  // Record
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  babyName: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  defaultMlText: { fontSize: 18, color: '#666', marginBottom: 30 },
  recordBtn: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FF9F43',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9F43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordBtnText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  lastRecord: { marginTop: 24, fontSize: 14, color: '#999' },

  // After record prompt
  promptBox: { alignItems: 'center', padding: 20 },
  promptText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 24 },
  promptButtons: { flexDirection: 'row', gap: 12 },
  promptBtn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  primaryBtn: { backgroundColor: '#FF9F43' },
  primaryBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  secondaryBtn: { backgroundColor: '#E8E8E8' },
  secondaryBtnText: { fontSize: 16, fontWeight: 'bold', color: '#666' },

  // Timer
  timerBox: { alignItems: 'center', marginBottom: 30, padding: 20, backgroundColor: '#FFF0DB', borderRadius: 16 },
  timerLabel: { fontSize: 14, color: '#999', marginBottom: 4 },
  timerText: { fontSize: 48, fontWeight: 'bold', color: '#FF9F43', fontVariant: ['tabular-nums'] },
  cancelBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#FFD9A0' },
  cancelBtnText: { fontSize: 13, color: '#C67600' },

  // History
  scrollView: { flex: 1, padding: 16 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 16 },
  dateGroup: { marginBottom: 20, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  dateHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  recordTime: { fontSize: 15, color: '#555' },
  recordAmount: { fontSize: 15, fontWeight: '600', color: '#FF9F43' },
  dateSummary: { marginTop: 8, fontSize: 13, color: '#999', textAlign: 'right' },

  // Stats
  statsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statsTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#FF9F43' },
  statLabel: { fontSize: 13, color: '#999', marginTop: 4 },
  weekRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  weekDate: { width: 50, fontSize: 13, color: '#666' },
  weekBar: { flex: 1, flexDirection: 'row', height: 16, backgroundColor: '#F0F0F0', borderRadius: 8, marginHorizontal: 8, overflow: 'hidden' },
  weekBarFill: { backgroundColor: '#FF9F43', borderRadius: 8 },
  weekTotal: { width: 50, fontSize: 13, color: '#666', textAlign: 'right' },
  weekCount: { width: 30, fontSize: 13, color: '#999', textAlign: 'right' },

  // Settings
  settingsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  settingsLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#FAFAFA' },
  quickSettings: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F0F0F0' },
  quickBtnActive: { backgroundColor: '#FF9F43' },
  quickBtnText: { fontSize: 14, color: '#666' },
  quickBtnTextActive: { color: '#fff', fontWeight: 'bold' },

  // Tab bar
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E8E8E8', backgroundColor: '#fff', paddingBottom: Platform.OS === 'web' ? 8 : 20 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabItemActive: { borderTopWidth: 2, borderTopColor: '#FF9F43' },
  tabText: { fontSize: 13, color: '#999' },
  tabTextActive: { color: '#FF9F43', fontWeight: 'bold' },
});
