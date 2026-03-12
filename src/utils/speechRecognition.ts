type SpeechRecognitionListenerEvent = 'result' | 'error' | 'end';

type SpeechRecognitionSubscription = {
  remove: () => void;
};

type SpeechRecognitionResult = {
  transcript?: string;
};

export type SpeechRecognitionEvent = {
  results?: SpeechRecognitionResult[];
  isFinal?: boolean;
  error?: string;
  message?: string;
};

export type SpeechRecognitionModuleLike = {
  addListener: (
    eventName: SpeechRecognitionListenerEvent,
    listener: (event: SpeechRecognitionEvent) => void
  ) => SpeechRecognitionSubscription;
  abort: () => void;
  stop: () => void;
  start: (options: Record<string, unknown>) => void;
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted?: boolean }>;
};

let cachedSpeechRecognitionModule: SpeechRecognitionModuleLike | null | undefined;

export function getSpeechRecognitionModule(): SpeechRecognitionModuleLike | null {
  if (cachedSpeechRecognitionModule !== undefined) {
    return cachedSpeechRecognitionModule;
  }

  // Expo Go does not bundle this native module.
  if (Constants.appOwnership === 'expo') {
    cachedSpeechRecognitionModule = null;
    return cachedSpeechRecognitionModule;
  }

  try {
    // Avoid hard crash when running in Expo Go / unlinked native runtime.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const speechModulePackage = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: SpeechRecognitionModuleLike;
    };
    cachedSpeechRecognitionModule = speechModulePackage?.ExpoSpeechRecognitionModule ?? null;
  } catch {
    cachedSpeechRecognitionModule = null;
  }

  return cachedSpeechRecognitionModule;
}
import Constants from 'expo-constants';
