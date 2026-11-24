declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackPixel(event: string, params?: Record<string, unknown>) {
  window.fbq?.('track', event, params);
}
