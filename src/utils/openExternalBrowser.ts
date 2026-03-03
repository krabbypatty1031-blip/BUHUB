import { Linking, Platform } from 'react-native';

export type BrowserOptionKey = 'system' | 'chrome' | 'edge' | 'firefox';

function buildAndroidIntentUrl(url: string, browserPackage: string): string {
  const parsedUrl = new URL(url);
  const scheme = parsedUrl.protocol.replace(':', '');
  const path = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  return `intent://${parsedUrl.host}${path}#Intent;scheme=${scheme};package=${browserPackage};end`;
}

function buildIOSBrowserUrl(url: string, browser: Exclude<BrowserOptionKey, 'system'>): string {
  const isHttps = url.startsWith('https://');
  const urlWithoutScheme = url.replace(/^https?:\/\//, '');

  switch (browser) {
    case 'chrome':
      return `${isHttps ? 'googlechromes://' : 'googlechrome://'}${urlWithoutScheme}`;
    case 'edge':
      return `${isHttps ? 'microsoft-edge-https://' : 'microsoft-edge-http://'}${urlWithoutScheme}`;
    case 'firefox':
      return `firefox://open-url?url=${encodeURIComponent(url)}`;
  }
}

function buildBrowserUrl(url: string, browser: Exclude<BrowserOptionKey, 'system'>): string {
  if (Platform.OS === 'android') {
    const browserPackageMap = {
      chrome: 'com.android.chrome',
      edge: 'com.microsoft.emmx',
      firefox: 'org.mozilla.firefox',
    } as const;

    return buildAndroidIntentUrl(url, browserPackageMap[browser]);
  }

  return buildIOSBrowserUrl(url, browser);
}

export async function openExternalBrowser(
  url: string,
  browser: BrowserOptionKey,
): Promise<void> {
  if (browser === 'system') {
    await Linking.openURL(url);
    return;
  }

  const browserUrl = buildBrowserUrl(url, browser);

  try {
    await Linking.openURL(browserUrl);
  } catch {
    await Linking.openURL(url);
  }
}
