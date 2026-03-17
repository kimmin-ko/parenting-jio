import { ref, onValue, set, remove, off, get } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { db, auth } from './firebase';
import { FeedingRecord } from './types';
import { loadRecords, saveRecords } from './storage';

const FAMILY_CODE_KEY = 'family_code';

// ─── Family Code ───
export async function loadFamilyCode(): Promise<string | null> {
  const code = await AsyncStorage.getItem(FAMILY_CODE_KEY);
  if (code) sendFamilyCodeToWatch(code);
  return code;
}

export async function saveFamilyCode(code: string): Promise<void> {
  await AsyncStorage.setItem(FAMILY_CODE_KEY, code);
  sendFamilyCodeToWatch(code);
}

function sendFamilyCodeToWatch(code: string): void {
  if (Platform.OS !== 'ios') return;
  try {
    NativeModules.WatchConnectivitySender?.sendFamilyCode(code);
  } catch {
    // Watch not available
  }
}

export async function clearFamilyCode(): Promise<void> {
  await AsyncStorage.removeItem(FAMILY_CODE_KEY);
}

export function generateFamilyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Auth ───
export async function ensureAuth(): Promise<void> {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

// ─── Sync ───
function familyRef(familyCode: string) {
  return ref(db, `families/${familyCode}/records`);
}

function recordsToMap(records: FeedingRecord[]): Record<string, FeedingRecord> {
  const map: Record<string, FeedingRecord> = {};
  for (const r of records) {
    map[r.id] = r;
  }
  return map;
}

function mapToRecords(map: Record<string, FeedingRecord> | null): FeedingRecord[] {
  if (!map) return [];
  return Object.values(map).sort((a, b) => b.timestamp - a.timestamp);
}

export async function pushRecordsToFirebase(familyCode: string, records: FeedingRecord[]): Promise<void> {
  try {
    await ensureAuth();
    await set(familyRef(familyCode), recordsToMap(records));
  } catch {
    // Silently fail — offline records stay in AsyncStorage
  }
}

export async function deleteRecordFromFirebase(familyCode: string, id: string): Promise<void> {
  try {
    await ensureAuth();
    await remove(ref(db, `families/${familyCode}/records/${id}`));
  } catch {
    // Silently fail
  }
}

export async function updateRecordInFirebase(
  familyCode: string,
  id: string,
  record: FeedingRecord,
): Promise<void> {
  try {
    await ensureAuth();
    await set(ref(db, `families/${familyCode}/records/${id}`), record);
  } catch {
    // Silently fail
  }
}

// ─── Real-time Listener ───
export function subscribeToRecords(
  familyCode: string,
  onRecordsChanged: (records: FeedingRecord[]) => void,
): () => void {
  const dbRef = familyRef(familyCode);

  const unsubscribe = onValue(dbRef, (snapshot) => {
    const data = snapshot.val() as Record<string, FeedingRecord> | null;
    const records = mapToRecords(data);
    // Save to local cache
    saveRecords(records);
    onRecordsChanged(records);
  });

  return () => {
    off(dbRef);
  };
}

// ─── Initial Sync ───
export async function initialSync(familyCode: string): Promise<FeedingRecord[]> {
  await ensureAuth();
  const local = await loadRecords();

  // Fetch remote records and merge with local by id
  const snapshot = await get(familyRef(familyCode));
  const remoteData = snapshot.val() as Record<string, FeedingRecord> | null;
  const remote = mapToRecords(remoteData);

  const mergedMap: Record<string, FeedingRecord> = {};
  for (const r of remote) mergedMap[r.id] = r;
  for (const r of local) mergedMap[r.id] = r;
  const merged = Object.values(mergedMap).sort((a, b) => b.timestamp - a.timestamp);

  await set(familyRef(familyCode), recordsToMap(merged));
  await saveRecords(merged);

  return merged;
}
