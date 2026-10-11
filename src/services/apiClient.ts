/**
 * Helper to determine the API base URL in both Web and Electron Desktop environments.
 * - In Web: returns empty string "" (relative path `/api/...` uses same origin).
 * - In Electron Desktop: if backend is hosted on a specific loopback port, returns that base URL.
 */

declare global {
  interface Window {
    lbookDesktop?: {
      isDesktop: boolean;
      platform: string;
      getApiBaseUrl: () => Promise<string>;
      getVersion: () => Promise<string>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

let cachedApiBase = '';
let isInitialized = false;

export async function initApiClient(): Promise<string> {
  if (isInitialized) return cachedApiBase;

  if (typeof window !== 'undefined' && window.lbookDesktop?.getApiBaseUrl) {
    try {
      const base = await window.lbookDesktop.getApiBaseUrl();
      if (base) {
        cachedApiBase = base.replace(/\/+$/, '');
      }
    } catch (e) {
      console.warn('Could not retrieve Electron API base URL, using relative origin', e);
    }
  }

  isInitialized = true;
  return cachedApiBase;
}

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cachedApiBase}${cleanEndpoint}`;
}

export function isElectronDesktop(): boolean {
  return typeof window !== 'undefined' && Boolean(window.lbookDesktop?.isDesktop);
}
