import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useWaitMode } from '@/context/wait-mode-context';

const NAVY = '#1B3A6B';
const RED = '#C0392B';
const GREEN = '#2E7D32';

const DURATIONS = [
  { label: '2 minutos', minutes: 2 },
  { label: '5 minutos', minutes: 5 },
  { label: '10 minutos', minutes: 10 },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WaitScreen() {
  const { isActive, timeLeft, startWaitMode, stopWaitMode, triggerAlert, largerText, highContrast } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 5 : 0);

  return (
    <View style={[styles.screen, highContrast && { backgroundColor: '#FFFFFF' }]}>
      {isActive ? (
        /* ── Active state ─────────────────────────────────── */
        <>
          <Text style={[styles.pageTitle, { fontSize: fs(30), color: highContrast ? '#000000' : NAVY }]}>Modo Espera Activado</Text>

          <View style={[styles.card, highContrast && { borderColor: '#555555', borderWidth: 2 }]}>
            <Text style={[styles.hint, { fontSize: fs(19), color: highContrast ? '#222222' : '#555555' }]}>Recuerda estar atento a tu turno</Text>

            <View style={styles.timerBox}>
              <Text style={[styles.timerText, { fontSize: fs(56) }]}>{formatTime(timeLeft)}</Text>
            </View>

            <Text style={[styles.subHint, { fontSize: fs(17), color: highContrast ? '#333333' : '#777777' }]}>Tiempo restante estimado...</Text>

            <View style={styles.divider} />

            <Pressable
              style={[styles.button, styles.buttonStop]}
              accessibilityRole="button"
              accessibilityLabel="Parar alerta"
              onPress={stopWaitMode}
            >
              <Text style={[styles.buttonStopText, { fontSize: fs(17) }]}>PARAR ALERTA</Text>
            </Pressable>
          </View>
        </>
      ) : (
        /* ── Idle state ───────────────────────────────────── */
        <>
          <Text style={[styles.pageTitle, { fontSize: fs(30), color: highContrast ? '#000000' : NAVY }]}>Modo Espera</Text>
          <Text style={[styles.subtitle, { fontSize: fs(19), color: highContrast ? '#222222' : '#555555' }]}>
            Selecciona en cuánto tiempo{'\n'}deseas ser alertado.
          </Text>

          <View style={[styles.card, highContrast && { borderColor: '#555555', borderWidth: 2 }]}>
            {DURATIONS.map(({ label, minutes }) => (
              <Pressable
                key={minutes}
                style={styles.durationButton}
                accessibilityRole="button"
                accessibilityLabel={`Iniciar ${label}`}
                onPress={() => startWaitMode(minutes)}
              >
                <Text style={[styles.durationText, { fontSize: fs(22) }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ── DEV: Test alert modals ─────────────────────────────────── */}
      <View style={styles.devRow}>
        <Text style={styles.devLabel}>🛠 DEV</Text>
        <Pressable
          style={[styles.devButton, { backgroundColor: '#1B3A6B' }]}
          onPress={() => triggerAlert('timer')}
        >
          <Text style={styles.devButtonText}>Timer</Text>
        </Pressable>
        <Pressable
          style={[styles.devButton, { backgroundColor: '#6A0DAD' }]}
          onPress={() => triggerAlert('voice')}
        >
          <Text style={styles.devButtonText}>Voice</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 19,
    fontFamily: 'Montserrat_400Regular',
    color: '#555555',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#A8C4E8',
    padding: 24,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  /* Duration selection */
  durationButton: {
    width: '100%',
    minHeight: 68,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
  },
  /* Active timer */
  hint: {
    fontSize: 19,
    fontFamily: 'Montserrat_400Regular',
    color: '#555555',
    textAlign: 'center',
  },
  timerBox: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 36,
  },
  timerText: {
    fontSize: 56,
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  subHint: {
    fontSize: 17,
    fontFamily: 'Montserrat_400Regular',
    color: '#777777',
    textAlign: 'center',
    lineHeight: 24,
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DDDDDD',
    marginVertical: 6,
  },
  button: {
    width: '100%',
    minHeight: 68,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  buttonStop: {
    backgroundColor: RED,
  },
  buttonStopText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Montserrat_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  /* ── Dev test row ───────────────────────────────────────────────── */
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 32,
    paddingHorizontal: 8,
  },
  devLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#AAAAAA',
  },
  devButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  devButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
  },
});
