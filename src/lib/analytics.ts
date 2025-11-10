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

// Raw env may include accidental wrapping quotes in .env; normalize.
const GA_ID_RAW = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
// Strip single or double quotes if user included them in .env (common mistake)
const GA_ID = GA_ID_RAW?.replace(/^['"]|['"]$/g, '') || undefined;
const DISABLED = (import.meta.env.VITE_DISABLE_ANALYTICS as string | undefined)?.toLowerCase() === 'true';
const IS_LOCALHOST = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

interface AnalyticsStatus {
  gaId?: string;
  disabled: boolean;
  isLocalhost: boolean;
  initialized: boolean;
  gtagPresent: boolean;
  reason?: string;
}

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
    if (!GA_ID) {
      debug("GA init skipped: GA_ID missing", { GA_ID_RAW });
      return;
    }
    if (DISABLED) {
      debug("GA init skipped: disabled flag set");
      return;
    }
    if (IS_LOCALHOST) {
      debug("GA init skipped: localhost environment");
      return;
    }
    loadGa(GA_ID);
    debug("GA init loaded", { GA_ID });
  },
  pageview(path = document.location.pathname + document.location.search) {
    if (!GA_ID) return;
    if (DISABLED || IS_LOCALHOST) return;
    if (!window.gtag) {
      debug("pageview skipped: gtag not present yet", { path });
      return;
    }
    (window.gtag as any)('event', 'page_view', { page_location: window.location.href, page_path: path });
    debug("pageview", { path });
  },
  event(name, params) {
    if (!GA_ID) return;
    if (DISABLED || IS_LOCALHOST) return;
    if (!window.gtag) {
      debug("event skipped: gtag not present", { name, params });
      return;
    }
    (window.gtag as any)('event', name, params || {});
    debug("event", { name, params });
  },
  identify(id, traits) {
    if (!GA_ID || DISABLED || IS_LOCALHOST || !window.gtag) return;
    if (id) {
      (window.gtag as any)('set', { user_id: id, ...traits });
      debug("identify", { id, traits });
    }
  }
};

// For now only GA; could switch based on env flags.
const backend: AnalyticsBackend = gaBackend;
let initialized = false;

function debug(msg: string, extra?: Record<string, any>) {
  // Guard behind a condition so we can silence in prod easily later.
  if ((import.meta.env.VITE_ANALYTICS_DEBUG as string | undefined)?.toLowerCase() === 'true') {
    // eslint-disable-next-line no-console
    console.info(`[analytics] ${msg}`, extra || {});
  }
}

export function analyticsStatus(): AnalyticsStatus {
  return {
    gaId: GA_ID,
    disabled: DISABLED,
    isLocalhost: IS_LOCALHOST,
    initialized,
    gtagPresent: typeof window !== 'undefined' && !!window.gtag,
    reason: !GA_ID ? 'missing-id' : DISABLED ? 'disabled-flag' : IS_LOCALHOST ? 'localhost' : undefined,
  };
}

export function initAnalytics() {
  if (initialized) return;
  initialized = true;
  backend.init();
  debug("initAnalytics called", analyticsStatus());
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
