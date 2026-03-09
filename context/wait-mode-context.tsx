import {
  startVoiceDetection,
  stopVoiceDetection
} from '@/services/voiceDetectionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaitModeContextValue {
  isActive: boolean;
  timeLeft: number;
  startWaitMode: (durationInMinutes?: number) => void;
  stopWaitMode: () => void;
  triggerAlert: (type?: 'timer' | 'voice') => void;
  scheduleAlertAfter: (seconds: number) => void;
  defaultDuration: number;
  setDefaultDuration: (minutes: number) => void;
  largerText: boolean;
  setLargerText: (v: boolean) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (v: boolean) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WaitModeContext = createContext<WaitModeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WaitModeProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [defaultDuration, setDefaultDuration] = useState(5);
  const [largerText, setLargerText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'timer' | 'voice'>('timer');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSoundRef = useRef<import('expo-av').Audio.Sound | null>(null);
  const naturallyExpiredRef = useRef(false);
  const durationRef = useRef<number>(5); // ← guarda la duración original

  // ── Helpers ────────────────────────────────────────────────────────────────

  const clearCountdown = useCallback(() => {
    if (countdownRef.current !== null) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const clearScheduled = useCallback(() => {
    if (scheduledRef.current !== null) {
      clearTimeout(scheduledRef.current);
      scheduledRef.current = null;
    }
  }, []);

  // ── stopAlertSound ─────────────────────────────────────────────────────────

  const stopAlertSound = useCallback(async () => {
    if (voiceSoundRef.current) {
      try {
        await voiceSoundRef.current.stopAsync();
        await voiceSoundRef.current.unloadAsync();
      } catch (_) {}
      voiceSoundRef.current = null;
    }
  }, []);

  // ── triggerAlert ───────────────────────────────────────────────────────────

  const triggerAlert = useCallback(async (type: 'timer' | 'voice' = 'timer') => {
    if (vibrationEnabled) {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    }
    if (soundEnabled) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        if (type === 'timer') {
          await stopAlertSound();
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/sounds/alert-timer.mp3'),
            { shouldPlay: true, volume: 0.9 },
          );
          voiceSoundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync();
              voiceSoundRef.current = null;
            }
          });
        } else {
          await stopAlertSound();
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/sounds/alert-voice.mp3'),
            { shouldPlay: true, volume: 1.0, isLooping: true },
          );
          voiceSoundRef.current = sound;
        }
      } catch (_) {}
    }
    setAlertType(type);
    setAlertVisible(true);
  }, [soundEnabled, vibrationEnabled, stopAlertSound]);

  // ── startWaitMode ──────────────────────────────────────────────────────────

  const startWaitMode = useCallback(
    (durationInMinutes: number = 30) => {
      durationRef.current = durationInMinutes; // ← guarda la duración
      clearCountdown();
      clearScheduled();

      const totalSeconds = durationInMinutes * 60;
      setTimeLeft(totalSeconds);
      setIsActive(true);

      countdownRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            countdownRef.current = null;
            naturallyExpiredRef.current = true;
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // ── Start voice detection ─────────────────────────────────────────────
      AsyncStorage.getItem('userName').then(storedName => {
        const name = storedName?.trim() ?? '';
        if (name.length > 0) {
          startVoiceDetection({
            userName: name,
            onNameDetected: () => {
              // Voice service already called stopVoiceDetection() before this cb.
              // Still need to fully stop the wait timer here.
              naturallyExpiredRef.current = false;
              clearCountdown();
              clearScheduled();
              setIsActive(false);
              setTimeLeft(0);
              triggerAlert('voice');
            },
          });
        }
      });
    },
    [clearCountdown, clearScheduled, triggerAlert],
  );

  // ── stopWaitMode ───────────────────────────────────────────────────────────

  const stopWaitMode = useCallback(() => {
    naturallyExpiredRef.current = false;
    clearCountdown();
    clearScheduled();
    setIsActive(false);
    setTimeLeft(0);
    stopVoiceDetection();
  }, [clearCountdown, clearScheduled]);

  // ── snooze ─────────────────────────────────────────────────────────────────

  const snooze = useCallback(() => {
    stopAlertSound();
    setAlertVisible(false);
    startWaitMode(durationRef.current);
  }, [stopAlertSound, startWaitMode]);

  // ── scheduleAlertAfter ─────────────────────────────────────────────────────

  const scheduleAlertAfter = useCallback(
    (seconds: number) => {
      clearScheduled();
      scheduledRef.current = setTimeout(() => {
        scheduledRef.current = null;
        triggerAlert();
      }, seconds * 1000);
    },
    [clearScheduled, triggerAlert],
  );

  // ── Fire alert when countdown naturally reaches 0 ─────────────────────────

  useEffect(() => {
    if (!isActive && naturallyExpiredRef.current) {
      naturallyExpiredRef.current = false;
      stopVoiceDetection(); // timer expired — stop listening before alert fires
      triggerAlert();
    }
  }, [isActive, triggerAlert]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearCountdown();
      clearScheduled();
    };
  }, [clearCountdown, clearScheduled]);

  // ── Value ──────────────────────────────────────────────────────────────────

  const value: WaitModeContextValue = {
    isActive,
    timeLeft,
    startWaitMode,
    stopWaitMode,
    triggerAlert,
    scheduleAlertAfter,
    defaultDuration,
    setDefaultDuration,
    largerText,
    setLargerText,
    highContrast,
    setHighContrast,
    soundEnabled,
    setSoundEnabled,
    vibrationEnabled,
    setVibrationEnabled,
  };

  return (
    <WaitModeContext.Provider value={value}>
      {children}

      <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          stopAlertSound();
          setAlertVisible(false);
        }}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>

            <View style={modalStyles.iconCircle}>
              <Text style={modalStyles.iconText}>{alertType === 'voice' ? '🔔' : '⏰'}</Text>
            </View>

            <Text style={modalStyles.heading}>
              {alertType === 'voice' ? '¡Es tu turno!' : 'Tiempo finalizado'}
            </Text>

            <Text style={modalStyles.body}>
              {alertType === 'voice'
                ? 'Tu nombre fue detectado.\nPor favor acércate al mostrador.'
                : 'Han pasado los minutos estimados.\nRevisa si tu turno ya fue llamado.'}
            </Text>

            <View style={modalStyles.divider} />

            {/* Entendido */}
            <Pressable
              style={modalStyles.button}
              accessibilityRole="button"
              accessibilityLabel="Entendido"
              onPress={() => {
                stopAlertSound();
                setAlertVisible(false);
                // Guarantee wait mode is fully stopped regardless of alert type
                clearCountdown();
                clearScheduled();
                stopVoiceDetection();
                setIsActive(false);
                setTimeLeft(0);
              }}
            >
              <Text style={modalStyles.buttonText}>ENTENDIDO</Text>
            </Pressable>

            {/* Posponer — solo para alerta de timer */}
            {alertType === 'timer' && (
              <Pressable
                style={[modalStyles.button, modalStyles.snoozeButton]}
                accessibilityRole="button"
                accessibilityLabel={`Posponer ${durationRef.current} minutos`}
                onPress={snooze}
              >
                <Text style={modalStyles.buttonText}>
                  POSPONER {durationRef.current} MIN
                </Text>
              </Pressable>
            )}

          </View>
        </View>
      </Modal>
    </WaitModeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWaitMode(): WaitModeContextValue {
  const ctx = useContext(WaitModeContext);
  if (!ctx) {
    throw new Error('useWaitMode must be used inside a <WaitModeProvider>.');
  }
  return ctx;
}

// ─── Modal styles ─────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    gap: 0,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 38,
  },
  heading: {
    fontSize: 32,
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#C0392B',
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    fontSize: 19,
    fontFamily: 'Montserrat_400Regular',
    color: '#333333',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 28,
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C0392B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  snoozeButton: {
    backgroundColor: '#1B3A6B',
    marginTop: 12,
    shadowColor: '#1B3A6B',
  },
  buttonText: {
    fontSize: 20,
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
});