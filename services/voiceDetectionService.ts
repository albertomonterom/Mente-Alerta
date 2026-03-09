/**
 * voiceDetectionService
 *
 * Listens continuously via expo-speech-recognition while Wait Mode is active.
 * When the spoken transcript contains the user's name it invokes the provided
 * onNameDetected callback (which calls triggerAlert("voice") in WaitModeContext).
 */

import { type EventSubscription } from 'expo-modules-core';
import {
    ExpoSpeechRecognitionModule,
    type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

interface VoiceDetectionOptions {
  userName: string;
  onNameDetected: () => void;
}

let isListening = false;
let resultSubscription: EventSubscription | null = null;
let errorSubscription: EventSubscription | null = null;
let endSubscription: EventSubscription | null = null;

let activeOptions: VoiceDetectionOptions | null = null;

// ── Internal helpers ──────────────────────────────────────────────────────────

function removeSubscriptions() {
  resultSubscription?.remove();
  errorSubscription?.remove();
  endSubscription?.remove();
  resultSubscription = null;
  errorSubscription = null;
  endSubscription = null;
}

function startListening() {
  ExpoSpeechRecognitionModule.start({
    lang: 'es-MX',
    interimResults: true,
    continuous: true,
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start voice detection.
 * Safe to call multiple times — a second call replaces the active session.
 */
export function startVoiceDetection(options: VoiceDetectionOptions): void {
  if (isListening) {
    stopVoiceDetection();
  }

  activeOptions = options;
  isListening = true;

  // Result handler — fires for both interim and final results
  resultSubscription = ExpoSpeechRecognitionModule.addListener(
    'result',
    (event: ExpoSpeechRecognitionResultEvent) => {
      if (!activeOptions) return;

      const transcript = event.results
        .map(r => r.transcript)
        .join(' ')
        .toLowerCase();

      const name = activeOptions.userName.trim().toLowerCase();

      if (name.length > 0 && transcript.includes(name)) {
        const cb = activeOptions.onNameDetected;
        stopVoiceDetection();
        cb();
      }
    },
  );

  // Auto-restart on end so we listen continuously
  endSubscription = ExpoSpeechRecognitionModule.addListener('end', () => {
    if (isListening && activeOptions) {
      // Small delay before restarting to avoid rapid cycling
      setTimeout(startListening, 300);
    }
  });

  // Log errors in dev but don't crash
  errorSubscription = ExpoSpeechRecognitionModule.addListener('error', (event) => {
    if (__DEV__) {
      console.warn('[VoiceDetection] error:', event);
    }
    // Attempt restart after recoverable errors
    if (isListening && activeOptions) {
      setTimeout(startListening, 1000);
    }
  });

  startListening();
}

/**
 * Stop voice detection and clean up all listeners.
 */
export function stopVoiceDetection(): void {
  isListening = false;
  activeOptions = null;
  removeSubscriptions();
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (_) {
    // Already stopped — ignore
  }
}

/**
 * Update the userName without restarting the listener session.
 */
export function updateUserName(name: string): void {
  if (activeOptions) {
    activeOptions.userName = name;
  }
}

