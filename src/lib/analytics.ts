// Lightweight analytics abstraction.
// Currently supports Google Analytics 4 (gtag.js) via VITE_GA_MEASUREMENT_ID.
// Easily extendable to other backends (PostHog, Plausible) by adding branches.

type AnalyticsEventParams = Record<string, any>;

interface AnalyticsBackend {
  init: () => void;
  pageview: (path?: string) => void;
  event: (name: string, params?: AnalyticsEventParams) => void;
  identify: (id: string | null, traits?: Record<string, any>) => void;
}

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const DISABLED = (import.meta.env.VITE_DISABLE_ANALYTICS as string | undefined)?.toLowerCase() === 'true';
const IS_LOCALHOST = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

function loadGa(measurementId: string) {
  if (window.gtag) return; // already loaded
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer!.push(arguments as any); }
  window.gtag = gtag as any;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(s);
  (window.gtag as any)('js', new Date());
  (window.gtag as any)('config', measurementId, { send_page_view: false }); // we control page views
}

const gaBackend: AnalyticsBackend = {
  init() {
    if (!GA_ID || DISABLED || IS_LOCALHOST) return;
    loadGa(GA_ID);
  },
  pageview(path = document.location.pathname + document.location.search) {
    if (!GA_ID || !window.gtag || DISABLED || IS_LOCALHOST) return;
  (window.gtag as any)('event', 'page_view', { page_location: window.location.href, page_path: path });
  },
  event(name, params) {
    if (!GA_ID || !window.gtag || DISABLED || IS_LOCALHOST) return;
  (window.gtag as any)('event', name, params || {});
  },
  identify(id, traits) {
    if (!GA_ID || !window.gtag || DISABLED || IS_LOCALHOST) return;
    if (id) {
      (window.gtag as any)('set', { user_id: id, ...traits });
    }
  }
};

// For now only GA; could switch based on env flags.
const backend: AnalyticsBackend = gaBackend;
let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  initialized = true;
  backend.init();
}

export function trackPage(path?: string) {
  backend.pageview(path);
}

export function trackEvent(name: string, params?: AnalyticsEventParams) {
  backend.event(name, params);
}

export function identifyUser(id: string | null, traits?: Record<string, any>) {
  backend.identify(id, traits);
}

// Convenience wrapper for actions
export const Analytics = { init: initAnalytics, page: trackPage, event: trackEvent, identify: identifyUser };
