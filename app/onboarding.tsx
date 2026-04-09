import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type EventSubscription } from 'expo-modules-core';
import { router } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const NAVY = '#1B3A6B';
const GREEN = '#2E7D32';

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  async function handleComplete() {
    await AsyncStorage.setItem('userName', name.trim());
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    router.replace('/(tabs)/games');
  }

  function handleNext() {
    if (step < 2) setStep(step + 1);
    else handleComplete();
  }

  const canAdvance = step !== 1 || name.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        {/* Content area */}
        <View style={styles.content}>
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepName name={name} setName={setName} />}
          {step === 2 && <StepHowItWorks />}
        </View>

        {/* Footer: dots + button */}
        <View style={styles.footer}>
          <View style={styles.dots}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          <Pressable
            style={[styles.btn, !canAdvance && styles.btnDisabled]}
            onPress={handleNext}
            disabled={!canAdvance}
            accessibilityLabel={step === 2 ? 'Comenzar' : 'Siguiente'}
          >
            <Text style={styles.btnText}>
              {step === 2 ? '¡Comenzar!' : 'Siguiente'}
            </Text>
            {step < 2 && (
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" style={{ marginLeft: 10 }} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ── Step 0: Welcome ───────────────────────────────────────────────────────────
function StepWelcome() {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <Ionicons name="heart" size={64} color={NAVY} />
      </View>
      <Text style={styles.title}>{'Bienvenido a\nMente Alerta'}</Text>
      <Text style={styles.body}>
        {'Tu compañero de juegos mientras esperas tu turno.\n\nMantente activo y recibe una alerta cuando sea tu momento.'}
      </Text>
    </View>
  );
}

// ── Step 1: Name input ────────────────────────────────────────────────────────
function StepName({ name, setName }: { name: string; setName: (v: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const resultSubscriptionRef = useRef<EventSubscription | null>(null);
  const endSubscriptionRef = useRef<EventSubscription | null>(null);
  const errorSubscriptionRef = useRef<EventSubscription | null>(null);

  function clearListeners() {
    resultSubscriptionRef.current?.remove();
    endSubscriptionRef.current?.remove();
    errorSubscriptionRef.current?.remove();
    resultSubscriptionRef.current = null;
    endSubscriptionRef.current = null;
    errorSubscriptionRef.current = null;
  }

  function stopVoiceInput() {
    setIsListening(false);
    clearListeners();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Ignore stop errors when the recognizer is already inactive.
    }
  }

  async function startVoiceInput() {
    setVoiceError(null);

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setVoiceError('El reconocimiento de voz no esta disponible en este dispositivo.');
      return;
    }

    let permissions = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!permissions.granted) {
      permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    }

    if (!permissions.granted) {
      setVoiceError('Necesitamos permiso de microfono para capturar tu nombre por voz.');
      return;
    }

    clearListeners();

    resultSubscriptionRef.current = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event: ExpoSpeechRecognitionResultEvent) => {
        const transcript = event.results
          .map(result => result.transcript)
          .join(' ')
          .trim();

        if (transcript.length > 0) {
          setName(transcript);
        }

        if (event.isFinal) {
          stopVoiceInput();
        }
      },
    );

    endSubscriptionRef.current = ExpoSpeechRecognitionModule.addListener('end', () => {
      setIsListening(false);
      clearListeners();
    });

    errorSubscriptionRef.current = ExpoSpeechRecognitionModule.addListener('error', () => {
      setVoiceError('No pudimos reconocer tu voz. Intentalo de nuevo.');
      setIsListening(false);
      clearListeners();
    });

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'es-MX',
        interimResults: true,
        continuous: false,
      });
      setIsListening(true);
    } catch {
      setVoiceError('No se pudo iniciar el reconocimiento de voz.');
      clearListeners();
      setIsListening(false);
    }
  }

  useEffect(() => {
    return () => {
      stopVoiceInput();
    };
  }, []);

  function handleVoiceButtonPress() {
    if (isListening) {
      stopVoiceInput();
      return;
    }
    startVoiceInput();
  }

  return (
    <View style={[styles.stepContainer, styles.nameStepContainer]}>
      <View style={styles.iconCircle}>
        <Ionicons name="person" size={64} color={NAVY} />
      </View>
      <Text style={styles.title}>¿Cómo te llamas?</Text>
      <Text style={styles.body}>
        Usaremos tu nombre para avisarte cuando sea tu turno.
      </Text>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="Tu nombre"
        placeholderTextColor="#AAAAAA"
        autoCorrect={false}
        returnKeyType="done"
        maxLength={40}
        accessibilityLabel="Escribe tu nombre"
      />

      <Pressable
        style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}
        onPress={handleVoiceButtonPress}
        accessibilityLabel={isListening ? 'Detener reconocimiento de voz' : 'Ingresar nombre por voz'}
      >
        <Ionicons
          name={isListening ? 'mic' : 'mic-outline'}
          size={22}
          color={isListening ? '#FFFFFF' : NAVY}
        />
        <Text style={[styles.voiceBtnText, isListening && styles.voiceBtnTextActive]}>
          {isListening ? 'Escuchando...' : 'Usar voz'}
        </Text>
      </Pressable>

      <Text style={styles.voiceHint}>
        Tambien puedes escribir tu nombre manualmente en el campo de arriba.
      </Text>

      {voiceError ? <Text style={styles.voiceError}>{voiceError}</Text> : null}
    </View>
  );
}

// ── Step 2: How it works ──────────────────────────────────────────────────────
function StepHowItWorks() {
  const items: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
    { icon: 'game-controller', text: 'Juega y mantén tu mente activa' },
    { icon: 'timer-outline',   text: 'Activa el Modo Espera cuando tu turno esté cerca' },
    { icon: 'notifications',   text: 'Recibe una alerta cuando sea tu momento' },
  ];
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>¿Cómo funciona?</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.howItem}>
          <View style={styles.howIconBox}>
            <Ionicons name={item.icon} size={32} color={NAVY} />
          </View>
          <Text style={styles.howText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: 4,
  },
  stepContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  nameStepContainer: {
    marginTop: -18,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 40,
    fontFamily: 'Montserrat_800ExtraBold',
    color: NAVY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 52,
  },
  body: {
    fontSize: 24,
    fontFamily: 'Montserrat_400Regular',
    color: '#444444',
    textAlign: 'center',
    lineHeight: 38,
  },
  nameInput: {
    marginTop: 12,
    width: '100%',
    fontSize: 32,
    fontFamily: 'Montserrat_600SemiBold',
    color: NAVY,
    borderWidth: 2.5,
    borderColor: NAVY,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  voiceBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: NAVY,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  voiceBtnActive: {
    backgroundColor: NAVY,
  },
  voiceBtnText: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: NAVY,
  },
  voiceBtnTextActive: {
    color: '#FFFFFF',
  },
  voiceHint: {
    marginTop: 6,
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
    color: '#555555',
    textAlign: 'center',
    lineHeight: 24,
  },
  voiceError: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#B3261E',
    textAlign: 'center',
    lineHeight: 22,
  },
  howItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  howIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  howText: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#333333',
    lineHeight: 32,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    paddingTop: 0,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#B0C4DE',
  },
  dotActive: {
    width: 30,
    backgroundColor: NAVY,
  },
  btn: {
    flexDirection: 'row',
    backgroundColor: GREEN,
    borderRadius: 18,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: '#AAAAAA',
  },
  btnText: {
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: '#FFFFFF',
  },
});
