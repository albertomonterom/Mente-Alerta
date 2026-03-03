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
  /** Whether wait mode is currently running */
  isActive: boolean;
  /** Remaining seconds in the countdown (0 when finished or inactive) */
  timeLeft: number;
  /** Start countdown. Pass duration in minutes (defaults to 30). */
  startWaitMode: (durationInMinutes?: number) => void;
  /** Stop countdown and reset state. */
  stopWaitMode: () => void;
  /** Fire the alert immediately. */
  triggerAlert: (type?: 'timer' | 'voice') => void;
  /** Start a one-shot alert after the given number of seconds. */
  scheduleAlertAfter: (seconds: number) => void;
  /** Default duration (minutes) selected in Settings */
  defaultDuration: number;
  /** Update the default duration */
  setDefaultDuration: (minutes: number) => void;
  /** Whether larger text mode is enabled */
  largerText: boolean;
  setLargerText: (v: boolean) => void;
  /** Whether high contrast mode is enabled */
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  /** Whether alert sound is enabled */
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  /** Whether alert vibration is enabled */
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
  /** True only when the timer reaches 0 on its own — not on manual stop */
  const naturallyExpiredRef = useRef(false);

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
          // Play once — soft notification ding
          await stopAlertSound(); // clear any previous
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
          // Loop until dismissed — urgent alarm
          await stopAlertSound(); // clear any previous
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/sounds/alert-voice.mp3'),
            { shouldPlay: true, volume: 1.0, isLooping: true },
          );
          voiceSoundRef.current = sound;
        }
      } catch (_) {
        // Audio unavailable — fail silently
      }
    }
    setAlertType(type);
    setAlertVisible(true);
  }, [soundEnabled, vibrationEnabled, stopAlertSound]);

  // ── startWaitMode ──────────────────────────────────────────────────────────

  const startWaitMode = useCallback(
    (durationInMinutes: number = 30) => {
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
    },
    [clearCountdown, clearScheduled],
  );

  // ── stopWaitMode ───────────────────────────────────────────────────────────

  const stopWaitMode = useCallback(() => {
    naturallyExpiredRef.current = false;
    clearCountdown();
    clearScheduled();
    setIsActive(false);
    setTimeLeft(0);
  }, [clearCountdown, clearScheduled]);

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

  // ── Fire alert only when countdown naturally reaches 0 ───────────────────
  useEffect(() => {
    if (!isActive && naturallyExpiredRef.current) {
      naturallyExpiredRef.current = false;
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
            {/* Icon row */}
            <View style={modalStyles.iconCircle}>
              <Text style={modalStyles.iconText}>{alertType === 'voice' ? '🔔' : '⏰'}</Text>
            </View>

            {/* Heading */}
            <Text style={modalStyles.heading}>
              {alertType === 'voice' ? '¡Es tu turno!' : 'Tiempo finalizado'}
            </Text>

            {/* Body */}
            <Text style={modalStyles.body}>
              {alertType === 'voice'
                ? 'Tu nombre fue detectado.\nPor favor acércate al mostrador.'
                : 'Han pasado los minutos estimados.\nRevisa si tu turno ya fue llamado.'}
            </Text>

            {/* Divider */}
            <View style={modalStyles.divider} />

            {/* CTA */}
            <Pressable
              style={modalStyles.button}
              accessibilityRole="button"
              accessibilityLabel="Entendido"
              onPress={() => {
                stopAlertSound();
                setAlertVisible(false);
              }}
            >
              <Text style={modalStyles.buttonText}>ENTENDIDO</Text>
            </Pressable>
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
  buttonText: {
    fontSize: 20,
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
});
