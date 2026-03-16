export interface FeedingRecord {
  id: string;
  timestamp: number;
  amount: number;
  memo?: string;
}

export interface Settings {
  defaultMl: number;
  timerMinutes: number;
}

export type Tab = 'record' | 'history' | 'stats' | 'settings';