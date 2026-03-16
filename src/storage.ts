import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedingRecord, Settings } from './types';

const RECORDS_KEY = 'feeding_records';
const SETTINGS_KEY = 'settings';
const TIMER_KEY = 'timer_end';

const DEFAULT_SETTINGS: Settings = {
  defaultMl: 120,
  timerMinutes: 180,
};

export async function loadRecords(): Promise<FeedingRecord[]> {
  const json = await AsyncStorage.getItem(RECORDS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveRecords(records: FeedingRecord[]): Promise<void> {
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export async function addRecord(record: FeedingRecord): Promise<FeedingRecord[]> {
  const records = await loadRecords();
  records.unshift(record);
  await saveRecords(records);
  return records;
}

export async function loadSettings(): Promise<Settings> {
  const json = await AsyncStorage.getItem(SETTINGS_KEY);
  return json ? { ...DEFAULT_SETTINGS, ...JSON.parse(json) } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadTimerEnd(): Promise<number | null> {
  const val = await AsyncStorage.getItem(TIMER_KEY);
  return val ? Number(val) : null;
}

export async function saveTimerEnd(timestamp: number | null): Promise<void> {
  if (timestamp === null) {
    await AsyncStorage.removeItem(TIMER_KEY);
  } else {
    await AsyncStorage.setItem(TIMER_KEY, String(timestamp));
  }
}
