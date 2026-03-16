import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { FeedingRecord, Settings } from '../types';
import { C, formatTime, formatCountdown, timeAgo } from '../helpers';

interface Props {
  records: FeedingRecord[];
  settings: Settings;
  timerEnd: number | null;
  remaining: number;
  showAfterRecord: boolean;
  onRecord: () => void;
  onStartTimer: () => void;
  onCancelTimer: () => void;
  onDismissPrompt: () => void;
}

export default function RecordTab({
  records,
  settings,
  timerEnd,
  remaining,
  showAfterRecord,
  onRecord,
  onStartTimer,
  onCancelTimer,
  onDismissPrompt,
}: Props) {
  return (
    <View style={s.center}>
      {timerEnd ? (
        <View style={s.timerCard}>
          <Text style={s.timerLabel}>다음 분유까지</Text>
          <Text style={s.timerText}>{formatCountdown(remaining)}</Text>
          <TouchableOpacity style={s.timerCancelBtn} onPress={onCancelTimer}>
            <Text style={s.timerCancelText}>타이머 취소</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showAfterRecord ? (
        <View style={s.afterCard}>
          <Text style={s.afterEmoji}>✓</Text>
          <Text style={s.afterTitle}>{settings.defaultMl}ml 기록 완료</Text>
          <Text style={s.afterSub}>{formatTime(new Date())}에 기록했어요</Text>
          <View style={s.afterBtns}>
            <TouchableOpacity style={s.btnPrimary} onPress={onStartTimer}>
              <Text style={s.btnPrimaryText}>타이머 설정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnGhost} onPress={onDismissPrompt}>
              <Text style={s.btnGhostText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <Text style={s.heroTitle}>지오</Text>
          <Text style={s.heroSub}>
            {records.length > 0
              ? `마지막 수유 ${timeAgo(records[0].timestamp)}`
              : '첫 기록을 남겨보세요'}
          </Text>
          <TouchableOpacity style={s.recordBtn} onPress={onRecord} activeOpacity={0.85}>
            <Text style={s.recordBtnAmount}>{settings.defaultMl}ml</Text>
            <Text style={s.recordBtnLabel}>기록하기</Text>
          </TouchableOpacity>
          {records.length > 0 && (
            <View style={s.lastInfo}>
              <Text style={s.lastInfoText}>
                {formatTime(new Date(records[0].timestamp))} · {records[0].amount}ml
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: C.black, letterSpacing: -0.5 },
  heroSub: { fontSize: 15, color: C.gray500, marginTop: 6, marginBottom: 40 },
  recordBtn: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: C.blue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  recordBtnAmount: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  recordBtnLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  lastInfo: { marginTop: 28, backgroundColor: C.gray100, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
  lastInfoText: { fontSize: 14, color: C.gray700 },
  afterCard: { alignItems: 'center', backgroundColor: C.white, borderRadius: 20, padding: 32, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  afterEmoji: { fontSize: 32, fontWeight: '700', color: C.blue, marginBottom: 12, width: 56, height: 56, lineHeight: 56, textAlign: 'center', backgroundColor: C.blueBg, borderRadius: 28, overflow: 'hidden' },
  afterTitle: { fontSize: 20, fontWeight: '700', color: C.black, letterSpacing: -0.3 },
  afterSub: { fontSize: 14, color: C.gray500, marginTop: 4, marginBottom: 24 },
  afterBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  btnPrimary: { flex: 1, backgroundColor: C.blue, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnGhost: { flex: 1, backgroundColor: C.gray100, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnGhostText: { fontSize: 15, fontWeight: '600', color: C.gray700 },
  timerCard: { alignItems: 'center', backgroundColor: C.blueBg, borderRadius: 16, padding: 20, marginBottom: 24, width: '100%' },
  timerLabel: { fontSize: 13, color: C.blue, fontWeight: '600', marginBottom: 4 },
  timerText: { fontSize: 44, fontWeight: '800', color: C.blue, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  timerCancelBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: C.blueLight },
  timerCancelText: { fontSize: 13, fontWeight: '600', color: C.blue },
});
