import { getSpeechRecognitionModule } from './speechRecognition';

type NativeSpeechToTextOptions = {
  uri: string;
  languageHint?: string;
  timeoutMs?: number;
};

function resolveSpeechLocale(languageHint?: string): string {
  const normalized = (languageHint || '').toLowerCase();
  if (normalized.startsWith('en')) return 'en-US';
  if (normalized.startsWith('sc') || normalized.includes('hans') || normalized.includes('zh-cn')) {
    return 'zh-CN';
  }
  if (normalized.startsWith('tc') || normalized.includes('hant') || normalized.includes('zh-hk')) {
    return 'zh-HK';
  }
  return 'zh-HK';
}

function readBestTranscript(event: { results?: Array<{ transcript?: string }> } | null | undefined): string {
  const transcript = event?.results?.[0]?.transcript;
  return typeof transcript === 'string' ? transcript.trim() : '';
}

export async function transcribeAudioFileWithNativeSpeech(
  options: NativeSpeechToTextOptions
): Promise<string> {
  const { uri, languageHint, timeoutMs = 12000 } = options;
  if (!uri) return '';

  const speechRecognitionModule = getSpeechRecognitionModule();
  if (!speechRecognitionModule) {
    throw new Error('NATIVE_SPEECH_NOT_LINKED');
  }

  const isAvailable = speechRecognitionModule.isRecognitionAvailable();
  if (!isAvailable) {
    throw new Error('NATIVE_SPEECH_NOT_AVAILABLE');
  }

  const permission = await speechRecognitionModule.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('NATIVE_SPEECH_PERMISSION_DENIED');
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let finalTranscript = '';
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const resultSubscription = speechRecognitionModule.addListener(
      'result',
      (event) => {
        const next = readBestTranscript(event);
        if (next) {
          finalTranscript = next;
          if (event.isFinal) {
            finishResolve(finalTranscript);
          }
        }
      }
    );

    const errorSubscription = speechRecognitionModule.addListener(
      'error',
      (event) => {
        finishReject(new Error(event?.error || event?.message || 'NATIVE_SPEECH_FAILED'));
      }
    );

    const endSubscription = speechRecognitionModule.addListener('end', () => {
      finishResolve(finalTranscript);
    });

    const cleanup = () => {
      resultSubscription.remove();
      errorSubscription.remove();
      endSubscription.remove();
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      try {
        speechRecognitionModule.abort();
      } catch {
        // Ignore abort cleanup failures.
      }
    };

    const finishResolve = (text: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(text);
    };

    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    timeoutHandle = setTimeout(() => {
      finishResolve(finalTranscript);
    }, timeoutMs);

    try {
      speechRecognitionModule.start({
        lang: resolveSpeechLocale(languageHint),
        interimResults: true,
        addsPunctuation: true,
        maxAlternatives: 1,
        continuous: false,
        audioSource: { uri },
      });
    } catch (error) {
      finishReject(
        error instanceof Error ? error : new Error('NATIVE_SPEECH_START_FAILED')
      );
    }
  });
}
