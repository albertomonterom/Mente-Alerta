import { useWaitMode } from '@/context/wait-mode-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Deep green: universally means "active/on", clearly distinct from the NAVY
// app chrome, not aggressive, easy for elderly users to recognise at a glance.
const GREEN_DARK = '#1A6B3A';

export default function WaitModeBanner() {
  const { isActive, stopWaitMode, largerText } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 4 : 0);

  if (!isActive) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Ionicons name="time-outline" size={36} color="rgba(255,255,255,0.90)" />
        <View style={styles.textGroup}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>MODO ESPERA</Text>
          <Text style={[styles.status, { fontSize: fs(22) }]}>Activo</Text>
        </View>
      </View>
      <Pressable
        style={styles.btn}
        onPress={stopWaitMode}
        accessibilityRole="button"
        accessibilityLabel="Cancelar modo espera"
      >
        <Text style={[styles.btnText, { fontSize: fs(17) }]}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: GREEN_DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    minHeight: 82,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.12)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textGroup: {
    gap: 2,
  },
  label: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 1,
  },
  status: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_800ExtraBold',
  },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 110,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
  },
});