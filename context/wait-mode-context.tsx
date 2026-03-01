import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Alert, Vibration } from 'react-native';

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
  triggerAlert: () => void;
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

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // ── triggerAlert ───────────────────────────────────────────────────────────

  const triggerAlert = useCallback(() => {
    Vibration.vibrate([0, 500, 200, 500]);
    Alert.alert(
      '¡Tu turno!',
      'Es tu momento. Por favor acércate al mostrador.',
      [{ text: 'Entendido', style: 'default' }],
    );
  }, []);

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
  };

  return (
    <WaitModeContext.Provider value={value}>
      {children}
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
