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

export async function syncToWidget(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const SharedGroupPreferences = require('react-native-shared-group-preferences');
    await SharedGroupPreferences.default.setItem(
      'widgetData',
      JSON.stringify(data),
      APP_GROUP,
    );
  } catch {
    // Silently fail on web or when native module isn't available
  }
}
