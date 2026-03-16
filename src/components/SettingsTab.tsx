import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Settings } from '../types';
import { C } from '../helpers';

interface Props {
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
}

export default function SettingsTab({ settings, onUpdateSettings }: Props) {
  const [mlInput, setMlInput] = useState(String(settings.defaultMl));
  const [timerInput, setTimerInput] = useState(String(settings.timerMinutes));

  useEffect(() => {
    setMlInput(String(settings.defaultMl));
    setTimerInput(String(settings.timerMinutes));
  }, [settings]);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
      <View style={s.card}>
        <Text style={s.settingLabel}>기본 분유량 (ml)</Text>
        <View style={s.chipRow}>
          {[80, 100, 120, 150, 180, 200].map((ml) => (
            <TouchableOpacity
              key={ml}
              style={[s.chip, settings.defaultMl === ml && s.chipActive]}
              onPress={() => {
                onUpdateSettings({ defaultMl: ml });
                setMlInput(String(ml));
              }}
            >
              <Text style={[s.chipText, settings.defaultMl === ml && s.chipTextActive]}>
                {ml}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          value={mlInput}
          onChangeText={setMlInput}
          placeholder="직접 입력"
          placeholderTextColor={C.gray400}
          onBlur={() => {
            const v = parseInt(mlInput, 10);
            if (v > 0) onUpdateSettings({ defaultMl: v });
            else setMlInput(String(settings.defaultMl));
          }}
        />
      </View>
      <View style={s.card}>
        <Text style={s.settingLabel}>타이머 간격 (분)</Text>
        <View style={s.chipRow}>
          {[120, 150, 180, 210, 240].map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.chip, settings.timerMinutes === m && s.chipActive]}
              onPress={() => {
                onUpdateSettings({ timerMinutes: m });
                setTimerInput(String(m));
              }}
            >
              <Text style={[s.chipText, settings.timerMinutes === m && s.chipTextActive]}>
                {m}분
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          value={timerInput}
          onChangeText={setTimerInput}
          placeholder="직접 입력"
          placeholderTextColor={C.gray400}
          onBlur={() => {
            const v = parseInt(timerInput, 10);
            if (v > 0) onUpdateSettings({ timerMinutes: v });
            else setTimerInput(String(settings.timerMinutes));
          }}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  settingLabel: { fontSize: 16, fontWeight: '700', color: C.black, marginBottom: 14, letterSpacing: -0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: C.gray100 },
  chipActive: { backgroundColor: C.blue },
  chipText: { fontSize: 14, fontWeight: '600', color: C.gray700 },
  chipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, color: C.black, backgroundColor: C.gray100 },
});
