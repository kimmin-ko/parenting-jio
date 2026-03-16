import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

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

export async function scheduleNotification(minutes: number): Promise<string | null> {
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

export async function cancelScheduledNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}
