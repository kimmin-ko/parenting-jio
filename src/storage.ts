import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedingRecord, Settings } from './types';

const RECORDS_KEY = 'feeding_records';
const SETTINGS_KEY = 'settings';
const TIMER_KEY = 'timer_end';
const MAX_RECORDS = 5000;

const DEFAULT_SETTINGS: Settings = {
  defaultMl: 120,
  timerMinutes: 180,
};

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export async function loadRecords(): Promise<FeedingRecord[]> {
  const json = await AsyncStorage.getItem(RECORDS_KEY);
  return safeParse<FeedingRecord[]>(json, []);
}

export async function saveRecords(records: FeedingRecord[]): Promise<void> {
  const trimmed = records.length > MAX_RECORDS ? records.slice(0, MAX_RECORDS) : records;
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(trimmed));
}

export async function addRecord(record: FeedingRecord): Promise<FeedingRecord[]> {
  const records = await loadRecords();
  records.unshift(record);
  await saveRecords(records);
  return records;
}

export async function deleteRecord(id: string): Promise<FeedingRecord[]> {
  const records = await loadRecords();
  const filtered = records.filter((r) => r.id !== id);
  await saveRecords(filtered);
  return filtered;
}

export async function updateRecord(id: string, patch: Partial<FeedingRecord>): Promise<FeedingRecord[]> {
  const records = await loadRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx !== -1) records[idx] = { ...records[idx], ...patch };
  await saveRecords(records);
  return records;
}

export async function loadSettings(): Promise<Settings> {
  const json = await AsyncStorage.getItem(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...safeParse<Partial<Settings>>(json, {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function mergeWidgetRecords(pending: FeedingRecord[]): Promise<FeedingRecord[]> {
  if (pending.length === 0) return loadRecords();
  const existing = await loadRecords();
  const existingIds = new Set(existing.map((r) => r.id));
  const newRecords = pending.filter((r) => !existingIds.has(r.id));
  if (newRecords.length === 0) return existing;
  const merged = [...existing, ...newRecords].sort((a, b) => b.timestamp - a.timestamp);
  await saveRecords(merged);
  return merged;
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
