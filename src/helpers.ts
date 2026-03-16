import { FeedingRecord } from './types';

// ─── Colors (Toss-inspired) ───
export const C = {
  bg: '#F7F8FA',
  white: '#FFFFFF',
  black: '#191F28',
  gray900: '#333D4B',
  gray700: '#4E5968',
  gray500: '#8B95A1',
  gray400: '#B0B8C1',
  gray200: '#E5E8EB',
  gray100: '#F2F4F6',
  blue: '#3182F6',
  blueBg: '#EBF3FE',
  blueLight: '#D0E2FC',
  red: '#F04452',
  redBg: '#FFF0F0',
};

// ─── ID Generation ───
let idCounter = 0;
export function generateId(): string {
  idCounter += 1;
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${idCounter}`;
}

// ─── Formatters ───
export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const mo = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

export function formatDateKr(date: Date): string {
  const mo = date.getMonth() + 1;
  const d = date.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${mo}월 ${d}일 (${days[date.getDay()]})`;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export function groupByDate(records: FeedingRecord[]): Record<string, FeedingRecord[]> {
  const groups: Record<string, FeedingRecord[]> = {};
  for (const r of records) {
    const key = formatDate(new Date(r.timestamp));
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}
