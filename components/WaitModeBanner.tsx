import { useWaitMode } from '@/context/wait-mode-context';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const ORANGE = '#E65100';

export default function WaitModeBanner() {
  const { isActive, stopWaitMode, largerText } = useWaitMode();
  const fs = (base: number) => base + (largerText ? 4 : 0);

  if (!isActive) return null;

  return (
    <View style={styles.banner}>
      <Text style={[styles.text, { fontSize: fs(22) }]}>⏳  Modo Espera Activado</Text>
      <Pressable style={styles.btn} onPress={stopWaitMode}>
        <Text style={[styles.btnText, { fontSize: fs(20) }]}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
    paddingHorizontal: 24,
    elevation: 10,
  },
  text: { color: '#FFF', fontFamily: 'Montserrat_700Bold', flex: 1 },
  btn: { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, marginLeft: 16 },
  btnText: { color: ORANGE, fontFamily: 'Montserrat_700Bold' },
});