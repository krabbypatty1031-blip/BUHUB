import { Audio } from 'expo-av';
import { getSpeechRecognitionModule } from './speechRecognition';

export type VoicePermissionsResult = {
  microphone: boolean;
  speech: boolean;
};

/**
 * Checks if both microphone and speech recognition permissions are granted.
 */
export async function checkVoicePermissions(): Promise<VoicePermissionsResult> {
  const [audioStatus, speechModule] = await Promise.all([
    Audio.getPermissionsAsync(),
    getSpeechRecognitionModule(),
  ]);

  const microGranted = audioStatus.status === 'granted';
  let speechGranted = true; // Default to true if module not linked (let it fail elsewhere)

  if (speechModule) {
    const speechStatus = await speechModule.requestPermissionsAsync();
    speechGranted = speechStatus.granted ?? false;
  }

  return {
    microphone: microGranted,
    speech: speechGranted,
  };
}

/**
 * Requests both microphone and speech recognition permissions.
 */
export async function requestVoicePermissions(): Promise<VoicePermissionsResult> {
  const [audioStatus, speechModule] = await Promise.all([
    Audio.requestPermissionsAsync(),
    getSpeechRecognitionModule(),
  ]);

  const microGranted = audioStatus.status === 'granted';
  let speechGranted = true;

  if (speechModule) {
    const speechStatus = await speechModule.requestPermissionsAsync();
    speechGranted = speechStatus.granted ?? false;
  }

  return {
    microphone: microGranted,
    speech: speechGranted,
  };
}
