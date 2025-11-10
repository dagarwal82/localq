// Lightweight analytics abstraction.
// Currently supports Google Analytics 4 (gtag.js) via VITE_GA_MEASUREMENT_ID.
// Easily extendable to other backends (PostHog, Plausible) by adding branches.

import { loadConfig, getCachedConfig } from './config';

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

// Build-time env fallbacks (used if runtime config.json missing)
const GA_ID_ENV_RAW = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const GA_ID_ENV = GA_ID_ENV_RAW?.replace(/^['"]|['"]$/g, '') || undefined;
const DISABLED_ENV = (import.meta.env.VITE_DISABLE_ANALYTICS as string | undefined)?.toLowerCase() === 'true';
const ENABLE_LOCALHOST_ENV = (import.meta.env.VITE_ENABLE_ANALYTICS_ON_LOCALHOST as string | undefined)?.toLowerCase() === 'true';
const DEBUG_ENV = (import.meta.env.VITE_ANALYTICS_DEBUG as string | undefined)?.toLowerCase() === 'true';
const IS_LOCALHOST = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

type AnalyticsSettings = {
  gaId?: string;
  disabled: boolean;
  enableLocalhost: boolean;
  debug: boolean;
};

let settingsLoaded = false;
let settings: AnalyticsSettings = {
  gaId: GA_ID_ENV,
  disabled: !!DISABLED_ENV,
  enableLocalhost: !!ENABLE_LOCALHOST_ENV,
  debug: !!DEBUG_ENV,
};

async function ensureSettings(): Promise<void> {
  if (settingsLoaded) return;
  try {
    const cfg = await loadConfig();
    const a = cfg.analytics || {};
    settings = {
      gaId: a.gaMeasurementId ?? GA_ID_ENV,
      disabled: (typeof a.disable === 'boolean' ? a.disable : DISABLED_ENV) ?? false,
      enableLocalhost: (typeof a.enableOnLocalhost === 'boolean' ? a.enableOnLocalhost : ENABLE_LOCALHOST_ENV) ?? false,
      debug: (typeof a.debug === 'boolean' ? a.debug : DEBUG_ENV) ?? false,
    };
    debug('settings loaded', settings);
  } catch {
    // keep env fallbacks
    debug('settings load failed; using env fallbacks', settings);
  }
  settingsLoaded = true;
}

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
  async init() {
    await ensureSettings();
    const { gaId, disabled, enableLocalhost } = settings;
    if (!gaId) {
      debug("GA init skipped: GA_ID missing", { envFallback: GA_ID_ENV });
      return;
    }
    if (disabled) {
      debug("GA init skipped: disabled flag set");
      return;
    }
    if (IS_LOCALHOST && !enableLocalhost) {
      debug("GA init skipped: localhost environment (set config.analytics.enableOnLocalhost=true) ");
      return;
    }
    loadGa(gaId);
    debug("GA init loaded", { gaId });
  },
  pageview(path = document.location.pathname + document.location.search) {
    const { gaId, disabled, enableLocalhost } = settings;
    if (!gaId) return;
    if (disabled || (IS_LOCALHOST && !enableLocalhost)) return;
    if (!window.gtag) {
      ensureSettings().then(() => {
        if (window.gtag) {
          (window.gtag as any)('event', 'page_view', { page_location: window.location.href, page_path: path });
          debug("pageview (late)", { path });
        }
      });
      debug("pageview skipped: gtag not present yet", { path });
      return;
    }
    (window.gtag as any)('event', 'page_view', { page_location: window.location.href, page_path: path });
    debug("pageview", { path });
  },
  event(name, params) {
    const { gaId, disabled, enableLocalhost } = settings;
    if (!gaId) return;
    if (disabled || (IS_LOCALHOST && !enableLocalhost)) return;
    if (!window.gtag) {
      ensureSettings().then(() => {
        if (window.gtag) {
          (window.gtag as any)('event', name, params || {});
          debug("event (late)", { name, params });
        }
      });
      debug("event skipped: gtag not present", { name, params });
      return;
    }
    (window.gtag as any)('event', name, params || {});
    debug("event", { name, params });
  },
  identify(id, traits) {
    const { gaId, disabled, enableLocalhost } = settings;
    if (!gaId || disabled || (IS_LOCALHOST && !enableLocalhost) || !window.gtag) return;
    if (id) {
      (window.gtag as any)('set', { user_id: id, ...traits });
      debug("identify", { id, traits });
    }
  }
};

// For now only GA; could switch based on env flags and runtime config.
const backend: AnalyticsBackend = gaBackend;
let initialized = false;

function debug(msg: string, extra?: Record<string, any>) {
  const cfg = getCachedConfig();
  const cfgDebug = cfg?.analytics?.debug;
  if (cfgDebug || settings.debug) {
    // eslint-disable-next-line no-console
    console.info(`[analytics] ${msg}`, extra || {});
  }
}

export function analyticsStatus(): AnalyticsStatus {
  const { gaId, disabled, enableLocalhost } = settings;
  return {
    gaId,
    disabled,
    isLocalhost: IS_LOCALHOST,
    initialized,
    gtagPresent: typeof window !== 'undefined' && !!window.gtag,
    reason: !gaId ? 'missing-id' : disabled ? 'disabled-flag' : (IS_LOCALHOST && !enableLocalhost) ? 'localhost-blocked' : undefined,
  };
}

export async function initAnalytics() {
  if (initialized) return;
  initialized = true;
  await backend.init();
  debug("initAnalytics called", analyticsStatus());
  // If GA script hasn't attached after short delay, log status for troubleshooting.
  setTimeout(() => {
    if (!window.gtag) {
      debug('gtag still missing after init delay', analyticsStatus());
    }
  }, 1000);
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
