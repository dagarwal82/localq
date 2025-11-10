export type AppConfig = {
  analytics?: {
    gaMeasurementId?: string;
    disable?: boolean;
    enableOnLocalhost?: boolean;
    debug?: boolean;
  };
  api?: {
    baseUrl?: string;
  };
};

let configCache: AppConfig | null = null;
let configPromise: Promise<AppConfig> | null = null;

function normalizeBoolean(v: any, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return fallback;
}

function stripQuotes(v?: string): string | undefined {
  return v ? v.replace(/^['"]|['"]$/g, '') : v;
}

export async function loadConfig(): Promise<AppConfig> {
  if (configCache) return configCache;
  if (!configPromise) {
    // Try root-relative first; many CDNs rewrite unknown paths to index.html.
    // If that happens, we'll detect HTML content and fall back to env.
    configPromise = fetch('/config.json', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) return {} as AppConfig;
        const text = await r.text();
        // Heuristic: if it starts with '<!DOCTYPE' or '<html', it's not JSON.
        const looksLikeHtml = /^\s*<!DOCTYPE|^\s*<html/i.test(text);
        if (looksLikeHtml) {
          console.warn('[config] /config.json returned HTML; falling back to env');
          return {} as AppConfig;
        }
        try {
          return JSON.parse(text) as AppConfig;
        } catch {
          console.warn('[config] Failed to parse /config.json; falling back to env');
          return {} as AppConfig;
        }
      })
      .catch(() => ({}) as AppConfig)
      .then((raw) => {
        // Normalize
        const analytics = raw.analytics || {};
        const api = raw.api || {};
        const cfg: AppConfig = {
          analytics: {
            gaMeasurementId: stripQuotes(analytics.gaMeasurementId),
            disable: normalizeBoolean(analytics.disable, false),
            enableOnLocalhost: normalizeBoolean(analytics.enableOnLocalhost, false),
            debug: normalizeBoolean(analytics.debug, false),
          },
          api: {
            baseUrl: api.baseUrl,
          },
        };
        configCache = cfg;
        return cfg;
      });
  }
  return configPromise;
}

export function getCachedConfig(): AppConfig | null {
  return configCache;
}
