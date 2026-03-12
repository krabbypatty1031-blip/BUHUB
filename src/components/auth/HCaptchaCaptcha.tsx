import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import ConfirmHcaptcha from '@hcaptcha/react-native-hcaptcha';
import { useTranslation } from 'react-i18next';

const HCAPTCHA_LANG_MAP: Record<string, string> = {
  en: 'en',
  tc: 'zh-TW',
  sc: 'zh-CN',
};

export interface HCaptchaCaptchaRef {
  show: () => void;
  hide: () => void;
}

interface HCaptchaCaptchaProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
}

type HCaptchaMessageEvent = {
  nativeEvent?: {
    data?: string;
  };
  success?: boolean;
  markUsed?: () => void;
};

const HCaptchaCaptcha = forwardRef<HCaptchaCaptchaRef, HCaptchaCaptchaProps>(
  function HCaptchaCaptcha({ siteKey, onSuccess, onError }, ref) {
    const { i18n } = useTranslation();
    const captchaRef = useRef<ConfirmHcaptcha>(null);

    useImperativeHandle(ref, () => ({
      show: () => captchaRef.current?.show?.(),
      hide: () => captchaRef.current?.hide?.(),
    }));

    const languageCode = HCAPTCHA_LANG_MAP[i18n.language] || 'en';

    const handleMessage = (event: HCaptchaMessageEvent) => {
      const data = event?.nativeEvent?.data;
      if (!data) return;

      if (data === 'open') {
        // hCaptcha modal opened
      } else if (event.success) {
        captchaRef.current?.hide?.();
        const token = data;
        onSuccess(token);
        event.markUsed?.();
      } else if (data === 'challenge-closed') {
        captchaRef.current?.hide?.();
      } else {
        // Error: data contains error code
        onError?.(data);
      }
    };

    return (
      <ConfirmHcaptcha
        ref={captchaRef}
        siteKey={siteKey}
        languageCode={languageCode}
        onMessage={handleMessage}
        size="normal"
        showLoading
      />
    );
  }
);

export default HCaptchaCaptcha;
