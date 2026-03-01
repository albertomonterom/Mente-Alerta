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
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WaitModeContext = createContext<WaitModeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WaitModeProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Fire alert when countdown hits 0 ──────────────────────────────────────

  useEffect(() => {
    if (timeLeft === 0 && !isActive && countdownRef.current === null) {
      // only fire if we were previously running (avoid firing on initial mount)
    }
  }, [timeLeft, isActive]);

  // Trigger alert when countdown naturally finishes
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (isActive) {
      hasStartedRef.current = true;
    }
    if (!isActive && timeLeft === 0 && hasStartedRef.current) {
      hasStartedRef.current = false;
      triggerAlert();
    }
  }, [isActive, timeLeft, triggerAlert]);

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
