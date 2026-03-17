import { Platform } from 'react-native';

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

export async function syncFamilyCodeToWidget(code: string | null): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await getSharedGroupPreferences().setItem(
      'familyCode',
      code ?? '',
      APP_GROUP,
    );
  } catch {
    // Silently fail
  }
}

