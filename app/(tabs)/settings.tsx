import { useWaitMode } from '@/context/wait-mode-context';
import { updateUserName } from '@/services/voiceDetectionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const NAVY = '#1B3A6B';
const GREEN = '#2E7D32';

export default function SettingsScreen() {
  // ── Perfil ─────────────────────────────────────────────────────────────────
  const [userName, setUserName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userName').then(val => {
      if (val) setUserName(val);
    });
  }, []);

  async function saveUserName() {
    const trimmed = userName.trim();
    await AsyncStorage.setItem('userName', trimmed);
    updateUserName(trimmed); // keep voice detection in sync
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function resetOnboarding() {
    await AsyncStorage.removeItem('hasCompletedOnboarding');
    await AsyncStorage.removeItem('userName');
    router.replace('/onboarding');
  }

  // ── Tipo de alerta ─────────────────────────────────────────────────────────
  // ── Accesibilidad (from global context) ──────────────────────────────────
  const {
    largerText, setLargerText,
    highContrast, setHighContrast,
    soundEnabled, setSoundEnabled,
    vibrationEnabled, setVibrationEnabled,
  } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 5 : 0);

  return (
    <ScrollView
      style={[styles.scroll, highContrast && { backgroundColor: '#FFFFFF' }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Perfil ─────────────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { fontSize: fs(24), color: highContrast ? '#000000' : NAVY }]}>Perfil</Text>
      <View style={[styles.card, highContrast && { borderColor: '#888888', borderWidth: 2 }]}>
        <Text style={[styles.label, { fontSize: fs(22), color: highContrast ? '#000000' : '#333333' }]}>Tu nombre</Text>
        <TextInput
          style={styles.input}
          value={userName}
          onChangeText={v => { setUserName(v); setNameSaved(false); }}
          placeholder="Tu nombre"
          placeholderTextColor="#AAAAAA"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={saveUserName}
          accessibilityLabel="Tu nombre"
        />
        <TouchableOpacity
          style={[styles.saveBtn, nameSaved && styles.saveBtnDone]}
          onPress={saveUserName}
          accessibilityLabel="Guardar nombre"
        >
          <Text style={styles.saveBtnText}>{nameSaved ? '✓ Guardado' : 'Guardar'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tipo de alerta ─────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { fontSize: fs(24), color: highContrast ? '#000000' : NAVY }]}>Tipo de alerta</Text>
      <View style={[styles.card, highContrast && { borderColor: '#888888', borderWidth: 2 }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { fontSize: fs(22), color: highContrast ? '#000000' : '#222222' }]}>Activar sonido</Text>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: '#CCCCCC', true: GREEN }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Activar sonido"
          />
        </View>
        <View style={styles.separator} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { fontSize: fs(22), color: highContrast ? '#000000' : '#222222' }]}>Activar vibración</Text>
          <Switch
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
            trackColor={{ false: '#CCCCCC', true: GREEN }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Activar vibración"
          />
        </View>
      </View>

      {/* ── Accesibilidad ──────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { fontSize: fs(24), color: highContrast ? '#000000' : NAVY }]}>Accesibilidad</Text>
      <View style={[styles.card, highContrast && { borderColor: '#888888', borderWidth: 2 }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { fontSize: fs(22), color: highContrast ? '#000000' : '#222222' }]}>Texto más grande</Text>
          <Switch
            value={largerText}
            onValueChange={setLargerText}
            trackColor={{ false: '#CCCCCC', true: GREEN }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Texto más grande"
          />
        </View>
        <View style={styles.separator} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { fontSize: fs(22), color: highContrast ? '#000000' : '#222222' }]}>Alto contraste</Text>
          <Switch
            value={highContrast}
            onValueChange={setHighContrast}
            trackColor={{ false: '#CCCCCC', true: GREEN }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Alto contraste"
          />
        </View>
      </View>

      {/* ── Avanzado ───────────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { fontSize: fs(24), color: highContrast ? '#000000' : NAVY }]}>Avanzado</Text>
      <View style={[styles.card, highContrast && { borderColor: '#888888', borderWidth: 2 }]}>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={resetOnboarding}
          accessibilityLabel="Ver introducción de nuevo"
        >
          <Text style={styles.resetBtnText}>Ver introducción de nuevo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
    marginBottom: 10,
    marginTop: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0DCF0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 22,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#333333',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    fontSize: 23,
    fontFamily: 'Montserrat_400Regular',
    color: '#111111',
    borderWidth: 1.5,
    borderColor: '#B0C4DE',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: '#F7F9FF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowLabel: {
    fontSize: 22,
    fontFamily: 'Montserrat_400Regular',
    color: '#222222',
    flex: 1,
    paddingRight: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 16,
  },
  durationBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B0C4DE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
  },
  durationBtnSelected: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  durationBtnText: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
  },
  durationBtnTextSelected: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnDone: {
    backgroundColor: GREEN,
  },
  saveBtnText: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
  },
  resetBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 21,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#C0392B',
  },
});
