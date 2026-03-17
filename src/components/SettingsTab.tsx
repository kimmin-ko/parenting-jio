import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Settings } from '../types';
import { C } from '../helpers';

interface Props {
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  familyCode: string | null;
  onCreateFamily: () => void;
  onJoinFamily: (code: string) => void;
  onLeaveFamily: () => void;
}

export default function SettingsTab({
  settings,
  onUpdateSettings,
  familyCode,
  onCreateFamily,
  onJoinFamily,
  onLeaveFamily,
}: Props) {
  const [joinCode, setJoinCode] = useState('');

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
      {/* 가족 동기화 */}
      <View style={s.card}>
        <Text style={s.settingLabel}>가족 동기화</Text>
        {familyCode ? (
          <View>
            <View style={s.codeDisplay}>
              <Text style={s.codeLabel}>가족 코드</Text>
              <Text style={s.codeValue}>{familyCode}</Text>
            </View>
            <Text style={s.codeHint}>
              다른 기기에서 이 코드를 입력하면 기록이 동기화됩니다
            </Text>
            <TouchableOpacity
              style={s.btnDanger}
              onPress={() => {
                if (Platform.OS === 'web') {
                  onLeaveFamily();
                } else {
                  Alert.alert('동기화 해제', '가족 동기화를 해제할까요?\n로컬 기록은 유지됩니다.', [
                    { text: '취소', style: 'cancel' },
                    { text: '해제', style: 'destructive', onPress: onLeaveFamily },
                  ]);
                }
              }}
            >
              <Text style={s.btnDangerText}>동기화 해제</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TouchableOpacity style={s.btnPrimary} onPress={onCreateFamily}>
              <Text style={s.btnPrimaryText}>새 가족 코드 만들기</Text>
            </TouchableOpacity>
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>또는</Text>
              <View style={s.dividerLine} />
            </View>
            <Text style={s.joinLabel}>기존 가족 코드 입력</Text>
            <View style={s.joinRow}>
              <TextInput
                style={s.joinInput}
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="6자리 코드"
                placeholderTextColor={C.gray400}
                maxLength={6}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[s.btnJoin, joinCode.length < 6 && s.btnJoinDisabled]}
                onPress={() => {
                  onJoinFamily(joinCode);
                  setJoinCode('');
                }}
                disabled={joinCode.length < 6}
              >
                <Text style={s.btnJoinText}>참여</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 기본 분유량 */}
      <View style={s.card}>
        <Text style={s.settingLabel}>기본 분유량</Text>
        <View style={s.stepperRow}>
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => {
              const next = Math.max(5, settings.defaultMl - 5);
              onUpdateSettings({ defaultMl: next });
            }}
          >
            <Text style={s.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <View style={s.stepperValue}>
            <Text style={s.stepperValueText}>{settings.defaultMl}</Text>
            <Text style={s.stepperUnit}>ml</Text>
          </View>
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => {
              const next = settings.defaultMl + 5;
              onUpdateSettings({ defaultMl: next });
            }}
          >
            <Text style={s.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 타이머 간격 */}
      <View style={s.card}>
        <Text style={s.settingLabel}>타이머 간격</Text>
        <View style={s.stepperRow}>
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => {
              const next = Math.max(10, settings.timerMinutes - 10);
              onUpdateSettings({ timerMinutes: next });
            }}
          >
            <Text style={s.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <View style={s.stepperValue}>
            <Text style={s.stepperValueText}>{settings.timerMinutes}</Text>
            <Text style={s.stepperUnit}>분</Text>
          </View>
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => {
              const next = settings.timerMinutes + 10;
              onUpdateSettings({ timerMinutes: next });
            }}
          >
            <Text style={s.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  settingLabel: { fontSize: 16, fontWeight: '700', color: C.black, marginBottom: 14, letterSpacing: -0.3 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepperBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.gray100, justifyContent: 'center', alignItems: 'center' },
  stepperBtnText: { fontSize: 24, fontWeight: '600', color: C.gray700 },
  stepperValue: { alignItems: 'center', minWidth: 80 },
  stepperValueText: { fontSize: 32, fontWeight: '800', color: C.black, fontVariant: ['tabular-nums'] },
  stepperUnit: { fontSize: 13, fontWeight: '500', color: C.gray500, marginTop: 2 },
  // Family code styles
  codeDisplay: { backgroundColor: C.blueBg, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  codeLabel: { fontSize: 12, fontWeight: '600', color: C.blue, marginBottom: 4 },
  codeValue: { fontSize: 28, fontWeight: '800', color: C.blue, letterSpacing: 4, fontVariant: ['tabular-nums'] },
  codeHint: { fontSize: 13, color: C.gray500, textAlign: 'center', marginBottom: 16 },
  btnPrimary: { backgroundColor: C.blue, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDanger: { backgroundColor: C.redBg, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnDangerText: { fontSize: 14, fontWeight: '600', color: C.red },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.gray200 },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: C.gray400 },
  joinLabel: { fontSize: 14, fontWeight: '600', color: C.gray700, marginBottom: 8 },
  joinRow: { flexDirection: 'row', gap: 8 },
  joinInput: { flex: 1, borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 18, fontWeight: '700', color: C.black, backgroundColor: C.gray100, letterSpacing: 4, textAlign: 'center' },
  btnJoin: { backgroundColor: C.blue, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center' },
  btnJoinDisabled: { backgroundColor: C.gray200 },
  btnJoinText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
