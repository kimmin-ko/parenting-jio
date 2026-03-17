import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { FeedingRecord } from '../types';
import { C, formatTime, formatDateKr, groupByDate } from '../helpers';

interface Props {
  records: FeedingRecord[];
  onDelete: (id: string) => void;
  onUpdateTime: (id: string, timestamp: number) => void;
}

export default function HistoryTab({ records, onDelete, onUpdateTime }: Props) {
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null);
  const [pickerHour, setPickerHour] = useState(0);
  const [pickerMin, setPickerMin] = useState(0);

  const openTimePicker = useCallback((record: FeedingRecord) => {
    const d = new Date(record.timestamp);
    setPickerHour(d.getHours());
    setPickerMin(d.getMinutes());
    setEditingRecord(record);
  }, []);

  const confirmTimePicker = useCallback(() => {
    if (!editingRecord) return;
    const d = new Date(editingRecord.timestamp);
    d.setHours(pickerHour, pickerMin);
    onUpdateTime(editingRecord.id, d.getTime());
    setEditingRecord(null);
  }, [editingRecord, pickerHour, pickerMin, onUpdateTime]);

  const stepHour = (delta: number) => setPickerHour((h) => (h + delta + 24) % 24);
  const stepMin = (delta: number) => setPickerMin((m) => (m + delta + 60) % 60);

  const grouped = groupByDate(records);
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <>
      <Modal visible={!!editingRecord} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>시간 변경</Text>
            <View style={s.pickerRow}>
              <View style={s.pickerCol}>
                <TouchableOpacity style={s.stepBtn} onPress={() => stepHour(1)}>
                  <Text style={s.stepBtnText}>▲</Text>
                </TouchableOpacity>
                <Text style={s.pickerValue}>{String(pickerHour).padStart(2, '0')}</Text>
                <TouchableOpacity style={s.stepBtn} onPress={() => stepHour(-1)}>
                  <Text style={s.stepBtnText}>▼</Text>
                </TouchableOpacity>
                <Text style={s.pickerUnit}>시</Text>
              </View>
              <Text style={s.pickerColon}>:</Text>
              <View style={s.pickerCol}>
                <TouchableOpacity style={s.stepBtn} onPress={() => stepMin(1)}>
                  <Text style={s.stepBtnText}>▲</Text>
                </TouchableOpacity>
                <Text style={s.pickerValue}>{String(pickerMin).padStart(2, '0')}</Text>
                <TouchableOpacity style={s.stepBtn} onPress={() => stepMin(-1)}>
                  <Text style={s.stepBtnText}>▼</Text>
                </TouchableOpacity>
                <Text style={s.pickerUnit}>분</Text>
              </View>
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnGhost} onPress={() => setEditingRecord(null)}>
                <Text style={s.btnGhostText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnPrimary} onPress={confirmTimePicker}>
                <Text style={s.btnPrimaryText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {dates.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>아직 기록이 없어요</Text>
          </View>
        ) : (
          dates.map((date) => {
            const dayRecords = grouped[date];
            const dayTotal = dayRecords.reduce((sum, r) => sum + r.amount, 0);
            return (
              <View key={date} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardDate}>{formatDateKr(new Date(date))}</Text>
                  <Text style={s.cardSummary}>{dayRecords.length}회 · {dayTotal}ml</Text>
                </View>
                {dayRecords.map((r, i) => (
                  <View key={r.id} style={[s.historyRow, i === 0 && { borderTopWidth: 0 }]}>
                    <View style={s.historyLeft}>
                      <TouchableOpacity onPress={() => openTimePicker(r)}>
                        <Text style={s.historyTimeEditable}>{formatTime(new Date(r.timestamp))}</Text>
                      </TouchableOpacity>
                      <Text style={s.historyAmount}>{r.amount}ml</Text>
                    </View>
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => onDelete(r.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={s.deleteBtnText}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: C.gray400 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardDate: { fontSize: 16, fontWeight: '700', color: C.black, letterSpacing: -0.3 },
  cardSummary: { fontSize: 13, color: C.gray500, fontWeight: '500' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.gray100 },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyTimeEditable: { fontSize: 15, color: C.blue, fontWeight: '600', fontVariant: ['tabular-nums'] },
  historyAmount: { fontSize: 15, fontWeight: '700', color: C.black },
  deleteBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: C.redBg },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: C.red },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: C.white, borderRadius: 20, padding: 24, width: 300, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.black, marginBottom: 20, letterSpacing: -0.3 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  pickerCol: { alignItems: 'center' },
  pickerValue: { fontSize: 36, fontWeight: '800', color: C.black, fontVariant: ['tabular-nums'], marginVertical: 4 },
  stepBtn: { width: 48, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: C.gray100 },
  stepBtnText: { fontSize: 18, color: C.gray700 },
  pickerUnit: { fontSize: 13, color: C.gray500, marginTop: 6 },
  pickerColon: { fontSize: 30, fontWeight: '700', color: C.black, marginHorizontal: 16 },
  modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  btnPrimary: { flex: 1, backgroundColor: C.blue, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnGhost: { flex: 1, backgroundColor: C.gray100, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnGhostText: { fontSize: 15, fontWeight: '600', color: C.gray700 },
});
ext: { fontSize: 15, fontWeight: '600', color: C.gray700 },
});
