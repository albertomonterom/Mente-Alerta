import { useWaitMode } from '@/context/wait-mode-context';
import { useState } from 'react';
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
const DURATIONS = [2, 5, 10];

export default function SettingsScreen() {
  // ── Perfil ─────────────────────────────────────────────────────────────────
  const [nameForAlert, setNameForAlert] = useState('');

  // ── Tipo de alerta ─────────────────────────────────────────────────────────
  // ── Tiempo predeterminado + Accesibilidad (from global context) ──────────
  const {
    defaultDuration, setDefaultDuration,
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
      <Text style={[styles.sectionTitle, { fontSize: fs(20), color: highContrast ? '#000000' : NAVY }]}>Perfil</Text>
      <View style={[styles.card, highContrast && { borderColor: '#888888', borderWidth: 2 }]}>
        <Text style={[styles.label, { fontSize: fs(18), color: highContrast ? '#000000' : '#333333' }]}>Nombre para alerta</Text>
        <TextInput
          style={styles.input}
          value={nameForAlert}
          onChangeText={setNameForAlert}
          placeholder="Tu nombre"
          placeholderTextColor="#AAAAAA"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="Nombre para alerta"
        />
      </View>

      {/* ── Tipo de alerta ─────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { fontSize: fs(20), color: highContrast ? '#000000' : NAVY }]}>Tipo de alerta</Text>
      <View style={[styles.card, highContrast && { borderColor: '#888888', borderWidth: 2 }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { fontSize: fs(19), color: highContrast ? '#000000' : '#222222' }]}>Activar sonido</Text>
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
          <Text style={[styles.rowLabel, { fontSize: fs(19), color: highContrast ? '#000000' : '#222222' }]}>Activar vibración</Text>
          <Switch
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
            trackColor={{ false: '#CCCCCC', true: GREEN }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Activar vibración"
          />
        </View>
      </View>

      {/* ── Tiempo predeterminado ──────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { fontSize: fs(20), color: highContrast ? '#000000' : NAVY }]}>Tiempo predeterminado</Text>
      <View style={[styles.card, highContrast && { borderColor: '#888888', borderWidth: 2 }]}>
        <View style={styles.durationRow}>
          {DURATIONS.map((min) => {
            const selected = defaultDuration === min;
            return (
              <TouchableOpacity
                key={min}
                style={[styles.durationBtn, selected && styles.durationBtnSelected]}
                onPress={() => setDefaultDuration(min)}
                accessibilityRole="button"
                accessibilityLabel={`${min} minutos`}
                accessibilityState={{ selected }}
              >
                <Text style={[styles.durationBtnText, selected && styles.durationBtnTextSelected]}>
                  {min} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Accesibilidad ──────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { fontSize: fs(20), color: highContrast ? '#000000' : NAVY }]}>Accesibilidad</Text>
      <View style={[styles.card, highContrast && { borderColor: '#888888', borderWidth: 2 }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { fontSize: fs(19), color: highContrast ? '#000000' : '#222222' }]}>Texto más grande</Text>
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
          <Text style={[styles.rowLabel, { fontSize: fs(19), color: highContrast ? '#000000' : '#222222' }]}>Alto contraste</Text>
          <Switch
            value={highContrast}
            onValueChange={setHighContrast}
            trackColor={{ false: '#CCCCCC', true: GREEN }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Alto contraste"
          />
        </View>
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
    fontSize: 20,
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
    fontSize: 18,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#333333',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    fontSize: 19,
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
    fontSize: 19,
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
});
