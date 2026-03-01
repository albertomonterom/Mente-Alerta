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
  const { isActive, timeLeft, startWaitMode, stopWaitMode } = useWaitMode();

  return (
    <View style={styles.screen}>
      {isActive ? (
        /* ── Active state ─────────────────────────────────── */
        <>
          <Text style={styles.pageTitle}>Modo Espera Activado</Text>

          <View style={styles.card}>
            <Text style={styles.hint}>Recuerda estar atento a tu turno</Text>

            <View style={styles.timerBox}>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            </View>

            <Text style={styles.subHint}>Tiempo restante estimado...</Text>

            <View style={styles.divider} />

            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.buttonStop]}
                accessibilityRole="button"
                accessibilityLabel="Parar alerta"
                onPress={stopWaitMode}
              >
                <Text style={styles.buttonStopText}>PARAR ALERTA</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.buttonChange]}
                accessibilityRole="button"
                accessibilityLabel="Cambiar tiempo"
                onPress={stopWaitMode}
              >
                <Text style={styles.buttonChangeText}>Cambiar{'\n'}tiempo</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        /* ── Idle state ───────────────────────────────────── */
        <>
          <Text style={styles.pageTitle}>Modo Espera</Text>
          <Text style={styles.subtitle}>
            Selecciona en cuánto tiempo{'\n'}deseas ser alertado.
          </Text>

          <View style={styles.card}>
            {DURATIONS.map(({ label, minutes }) => (
              <Pressable
                key={minutes}
                style={styles.durationButton}
                accessibilityRole="button"
                accessibilityLabel={`Iniciar ${label}`}
                onPress={() => startWaitMode(minutes)}
              >
                <Text style={styles.durationText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
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
  buttonChange: {
    backgroundColor: NAVY,
  },
  buttonChangeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Montserrat_600SemiBold',
    textAlign: 'center',
    lineHeight: 23,
  },
});
