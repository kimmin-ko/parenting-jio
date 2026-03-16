import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { FeedingRecord } from '../types';
import { C, formatDate } from '../helpers';

interface Props {
  records: FeedingRecord[];
}

export default function StatsTab({ records }: Props) {
  const { today, count, totalMl, avgMl, last7, maxTotal } = useMemo(() => {
    const todayStr = formatDate(new Date());
    const todayRecords = records.filter((r) => formatDate(new Date(r.timestamp)) === todayStr);
    const total = todayRecords.reduce((sum, r) => sum + r.amount, 0);
    const cnt = todayRecords.length;

    const days: { date: string; total: number; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      const dayRecords = records.filter((r) => formatDate(new Date(r.timestamp)) === key);
      days.push({
        date: key,
        total: dayRecords.reduce((sum, r) => sum + r.amount, 0),
        count: dayRecords.length,
      });
    }

    return {
      today: todayStr,
      count: cnt,
      totalMl: total,
      avgMl: cnt > 0 ? Math.round(total / cnt) : 0,
      last7: days,
      maxTotal: Math.max(...days.map((d) => d.total), 1),
    };
  }, [records]);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
      <View style={s.card}>
        <Text style={s.cardTitle}>오늘의 수유</Text>
        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{count}</Text>
            <Text style={s.statUnit}>회</Text>
          </View>
          <View style={[s.statBox, s.statBoxCenter]}>
            <Text style={s.statNum}>{totalMl}</Text>
            <Text style={s.statUnit}>ml</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{avgMl}</Text>
            <Text style={s.statUnit}>평균 ml</Text>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>최근 7일</Text>
        {last7.map((d) => (
          <View key={d.date} style={s.barRow}>
            <Text style={s.barDate}>{d.date.slice(5)}</Text>
            <View style={s.barTrack}>
              <View
                style={[
                  s.barFill,
                  { width: `${Math.round((d.total / maxTotal) * 100)}%` },
                ]}
              />
            </View>
            <Text style={s.barValue}>{d.total}ml</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.black, marginBottom: 16, letterSpacing: -0.3 },
  statsGrid: { flexDirection: 'row' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statBoxCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.gray100 },
  statNum: { fontSize: 28, fontWeight: '800', color: C.black, letterSpacing: -0.5 },
  statUnit: { fontSize: 13, color: C.gray500, marginTop: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barDate: { width: 44, fontSize: 13, color: C.gray500, fontVariant: ['tabular-nums'] },
  barTrack: { flex: 1, height: 20, backgroundColor: C.gray100, borderRadius: 10, marginHorizontal: 10, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.blue, borderRadius: 10 },
  barValue: { width: 52, fontSize: 13, color: C.gray700, textAlign: 'right', fontWeight: '500', fontVariant: ['tabular-nums'] },
});
