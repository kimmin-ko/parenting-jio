import { Platform } from 'react-native';
import { FeedingRecord } from './types';

const APP_GROUP = 'group.com.kimmin.parentingjio';

interface WidgetData {
  lastFeedingTime: number | null;
  lastFeedingAmount: number | null;
  todayCount: number;
  todayTotal: number;
  defaultMl: number;
  timerEnd: number | null;
}

function getSharedGroupPreferences() {
  const mod = require('react-native-shared-group-preferences');
  return mod.default ?? mod;
}

export async function syncToWidget(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await getSharedGroupPreferences().setItem(
      'widgetData',
      JSON.stringify(data),
      APP_GROUP,
    );
  } catch {
    // Silently fail on web or when native module isn't available
  }
}

export async function loadPendingWidgetRecords(): Promise<FeedingRecord[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const value = await getSharedGroupPreferences().getItem(
      'pending_widget_records',
      APP_GROUP,
    );
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as FeedingRecord[]) : [];
  } catch {
    return [];
  }
}

export async function clearPendingWidgetRecords(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await getSharedGroupPreferences().setItem(
      'pending_widget_records',
      JSON.stringify([]),
      APP_GROUP,
    );
  } catch {
    // Silently fail
  }
}
