export interface PublicStats {
  happyCustomers: number;
  vehiclesProtected: number;
  citiesCovered: number;
  googleRating: number;
  installCount: number;
}

interface PublicStatsCacheEntry {
  data: PublicStats;
  timestamp: number;
}

const defaultStats: PublicStats = {
  happyCustomers: 0,
  vehiclesProtected: 0,
  citiesCovered: 0,
  googleRating: 0,
  installCount: 0,
};

const PUBLIC_STATS_CACHE_KEY = "pingme_public_stats_v1";
const PUBLIC_STATS_CACHE_TTL_MS = 5 * 60 * 1000;

const getApiBaseUrl = () => {
  const base = import.meta.env.VITE_PAYMENT_API_BASE_URL;
  return typeof base === "string" ? base.replace(/\/$/, "") : "";
};

const parsePublicStats = (data: Partial<PublicStats>): PublicStats => ({
  happyCustomers: Number(data.happyCustomers || 0),
  vehiclesProtected: Number(data.vehiclesProtected || 0),
  citiesCovered: Number(data.citiesCovered || 0),
  googleRating: Number(data.googleRating || 0),
  installCount: Number(data.installCount || 0),
});

const readStatsCache = (): PublicStatsCacheEntry | null => {
  try {
    const raw = localStorage.getItem(PUBLIC_STATS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PublicStatsCacheEntry>;
    if (!parsed || typeof parsed.timestamp !== "number" || !parsed.data) {
      return null;
    }

    return {
      data: parsePublicStats(parsed.data),
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
};

const writeStatsCache = (stats: PublicStats) => {
  try {
    const payload: PublicStatsCacheEntry = {
      data: stats,
      timestamp: Date.now(),
    };
    localStorage.setItem(PUBLIC_STATS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures (private mode/quota).
  }
};

export const getCachedPublicStats = (): PublicStats | null => {
  const cache = readStatsCache();
  if (!cache) return null;

  if (Date.now() - cache.timestamp > PUBLIC_STATS_CACHE_TTL_MS) {
    return null;
  }

  return cache.data;
};

export const getPublicStats = async (): Promise<PublicStats> => {
  const cachedStats = getCachedPublicStats();
  if (cachedStats) {
    return cachedStats;
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return defaultStats;

  try {
    const res = await fetch(`${baseUrl}/getPublicStats`, {
      method: "GET",
    });

    if (!res.ok) return defaultStats;

    const data = (await res.json()) as Partial<PublicStats>;
    const parsed = parsePublicStats(data);
    writeStatsCache(parsed);
    return parsed;
  } catch {
    const staleCache = readStatsCache();
    return staleCache?.data || defaultStats;
  }
};

export const refreshPublicStats = async (): Promise<PublicStats> => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return defaultStats;

  try {
    const res = await fetch(`${baseUrl}/getPublicStats`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      const staleCache = readStatsCache();
      return staleCache?.data || defaultStats;
    }

    const data = (await res.json()) as Partial<PublicStats>;
    const parsed = parsePublicStats(data);
    writeStatsCache(parsed);
    return parsed;
  } catch {
    const staleCache = readStatsCache();
    return staleCache?.data || defaultStats;
  }
};
