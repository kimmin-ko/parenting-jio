import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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
} from './src/storage';
import { C, generateId } from './src/helpers';
import { scheduleNotification, cancelScheduledNotification } from './src/notifications';
import RecordTab from './src/components/RecordTab';
import HistoryTab from './src/components/HistoryTab';
import StatsTab from './src/components/StatsTab';
import SettingsTab from './src/components/SettingsTab';

// ─── Main App ───
export default function App() {
  const [tab, setTab] = useState<Tab>('record');
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [settings, setSettings] = useState<Settings>({ defaultMl: 120, timerMinutes: 180 });
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [showAfterRecord, setShowAfterRecord] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIdRef = useRef<string | null>(null);

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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerEnd]);

  const handleRecord = useCallback(async () => {
    const record: FeedingRecord = {
      id: generateId(),
      timestamp: Date.now(),
      amount: settings.defaultMl,
    };
    const updated = await addRecord(record);
    setRecords(updated);
    setShowAfterRecord(true);
  }, [settings.defaultMl]);

  const handleStartTimer = useCallback(async () => {
    const end = Date.now() + settings.timerMinutes * 60 * 1000;
    setTimerEnd(end);
    await saveTimerEnd(end);
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
    if (notifIdRef.current) {
      await cancelScheduledNotification(notifIdRef.current);
      notifIdRef.current = null;
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const updated = await deleteRecord(id);
    setRecords(updated);
  }, []);

  const handleUpdateTime = useCallback(async (id: string, timestamp: number) => {
    const updated = await updateRecord(id, { timestamp });
    setRecords(updated);
  }, []);

  const handleDismissPrompt = useCallback(() => {
    setShowAfterRecord(false);
  }, []);

  const handleUpdateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  }, [settings]);

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'record', label: '기록', icon: 'add-circle', iconOutline: 'add-circle-outline' },
    { key: 'history', label: '목록', icon: 'list', iconOutline: 'list-outline' },
    { key: 'stats', label: '통계', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
    { key: 'settings', label: '설정', icon: 'settings', iconOutline: 'settings-outline' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.headerTitle}>지오 분유</Text>
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
          <SettingsTab settings={settings} onUpdateSettings={handleUpdateSettings} />
        )}
      </View>
      <View style={s.tabBar}>
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={s.tabItem}
              onPress={() => setTab(t.key)}
            >
              <Ionicons
                name={isActive ? t.icon : t.iconOutline}
                size={22}
                color={isActive ? C.blue : C.gray400}
              />
              <Text style={[s.tabText, isActive && s.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: Platform.OS === 'web' ? 16 : 8,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.black, textAlign: 'center', letterSpacing: -0.3 },
  content: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.gray200, paddingBottom: Platform.OS === 'web' ? 10 : 26, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabText: { fontSize: 10, color: C.gray400, fontWeight: '500', marginTop: 2 },
  tabTextActive: { color: C.blue, fontWeight: '700' },
});
