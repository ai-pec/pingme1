import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import MainLayout from "@/layouts/MainLayout";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Nfc,
  Smartphone,
  Laptop,
  Tablet,
  HelpCircle,
  Eye,
  TrendingUp,
  Calendar,
  Zap,
  RotateCcw,
  AlertTriangle,
  Info,
} from "lucide-react";
import "./NfcVisitsDashboard.css";

interface VisitRecord {
  id: string;
  username: string;
  timestamp: string;
  device: string;
  os: string;
  browser: string;
}

interface AnalyticsData {
  totalVisits: number;
  deviceBreakdown: Record<string, number>;
  osBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  trafficOverTime: Array<{ date: string; count: number }>;
  recentVisits: VisitRecord[];
}

interface ApiResponse {
  ownedUsernames: string[];
  selectedUsername: string | null;
  analytics: AnalyticsData;
}

const formatRelativeTime = (isoString: string) => {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0) return "Just now";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Some time ago";
  }
};

const getDeviceIcon = (device: string) => {
  const cls = "w-4 h-4";
  switch (device.toLowerCase()) {
    case "mobile":
      return <Smartphone className={`${cls} text-amber-500`} />;
    case "tablet":
      return <Tablet className={`${cls} text-emerald-500`} />;
    case "desktop":
      return <Laptop className={`${cls} text-blue-500`} />;
    default:
      return <HelpCircle className={`${cls} text-gray-400`} />;
  }
};

const getDeviceBadgeClass = (device: string) => {
  switch (device.toLowerCase()) {
    case "mobile":
      return "badge-device-mobile";
    case "tablet":
      return "badge-device-tablet";
    case "desktop":
      return "badge-device-desktop";
    default:
      return "badge-device-unknown";
  }
};

export default function NfcVisitsDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [selectedUsername, setSelectedUsername] = useState<string>("all");

  const isDark = theme === "dark";

  const { data, isLoading, error, refetch, isRefetching } = useQuery<ApiResponse>({
    queryKey: ["nfcVisitAnalytics", selectedUsername],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Authentication token is required.");

      const baseUrl = (import.meta.env.VITE_PAYMENT_API_BASE_URL || "").replace(/\/$/, "");
      const url =
        selectedUsername && selectedUsername !== "all"
          ? `${baseUrl}/getNfcVisitAnalytics?username=${encodeURIComponent(selectedUsername)}`
          : `${baseUrl}/getNfcVisitAnalytics`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to fetch analytics data.");
      }

      return res.json();
    },
    enabled: !!user,
  });

  const analytics = data?.analytics;
  const ownedUsernames = data?.ownedUsernames || [];

  // Computed values
  const totalVisits = analytics?.totalVisits || 0;

  const mobileCount = analytics?.deviceBreakdown?.["Mobile"] || 0;
  const tabletCount = analytics?.deviceBreakdown?.["Tablet"] || 0;
  const desktopCount = analytics?.deviceBreakdown?.["Desktop"] || 0;
  const unknownDeviceCount = analytics?.deviceBreakdown?.["Unknown"] || 0;

  const mobilePercentage = totalVisits > 0 ? Math.round((mobileCount / totalVisits) * 100) : 0;
  const tabletPercentage = totalVisits > 0 ? Math.round((tabletCount / totalVisits) * 100) : 0;
  const desktopPercentage = totalVisits > 0 ? Math.round((desktopCount / totalVisits) * 100) : 0;
  const unknownDevicePercentage = totalVisits > 0 ? Math.round((unknownDeviceCount / totalVisits) * 100) : 0;

  // OS List sorting
  const osList = analytics?.osBreakdown
    ? Object.entries(analytics.osBreakdown)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  const topOS = osList[0]?.name || "N/A";

  // Browser List sorting
  const browserList = analytics?.browserBreakdown
    ? Object.entries(analytics.browserBreakdown)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  const topBrowser = browserList[0]?.name || "N/A";

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-12 w-12 animate-ping rounded-full bg-primary/20" />
            <Nfc className="h-6 w-6 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-sm font-semibold tracking-wider text-muted-foreground animate-pulse">
            LOADING ANALYTICS...
          </p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container py-16 flex flex-col items-center justify-center text-center gap-6 max-w-md mx-auto">
          <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Failed to load analytics</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error instanceof Error ? error.message : "Something went wrong while fetching visit analytics."}
          </p>
          <button
            onClick={() => void refetch()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950 font-bold hover:shadow-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="dashboard-wrapper py-10">
        <div className="container px-4 md:px-6 lg:px-8">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-200 dark:border-stone-800">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Nfc className="w-6 h-6 text-amber-500" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 px-2.5 py-1 rounded-full">
                  NFC Live Tracking
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight leading-none">
                NFC Profile Visits
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">
                Real-time scans, traffic trends, and system metadata breakdown.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {ownedUsernames.length > 1 && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="card-selector" className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                    Select NFC Card Profile:
                  </label>
                  <select
                    id="card-selector"
                    className="nfc-select"
                    value={selectedUsername}
                    onChange={(e) => setSelectedUsername(e.target.value)}
                  >
                    <option value="all">All NFC Cards ({ownedUsernames.length})</option>
                    {ownedUsernames.map((uname) => (
                      <option key={uname} value={uname}>
                        @{uname}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => void refetch()}
                disabled={isRefetching}
                className="flex items-center justify-center p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-amber-400 hover:text-amber-600 transition-all shadow-sm shrink-0 self-end"
                aria-label="Refresh statistics"
              >
                <RotateCcw className={`w-4 h-4 ${isRefetching ? "animate-spin text-amber-500" : ""}`} />
              </button>
            </div>
          </div>

          {ownedUsernames.length === 0 ? (
            /* Empty state */
            <div className="dashboard-card py-20 flex flex-col items-center justify-center text-center gap-6 max-w-lg mx-auto">
              <div className="h-16 w-16 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-full flex items-center justify-center">
                <Nfc className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">No NFC cards registered</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                We couldn't find any confirmed NFC card profiles linked to this account. Visit and complete profile setup after purchasing cards.
              </p>
            </div>
          ) : (
            /* Main Dashboard content */
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-8"
            >
              {/* KPI section */}
              <div className="kpi-grid">
                <motion.div variants={cardVariants} className="dashboard-card kpi-card">
                  <div className="kpi-icon-wrap">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="kpi-title">Total Scans / Views</h3>
                    <p className="kpi-value">{totalVisits.toLocaleString("en-IN")}</p>
                    <p className="kpi-desc">Overall view count since creation</p>
                  </div>
                </motion.div>

                <motion.div variants={cardVariants} className="dashboard-card kpi-card">
                  <div className="kpi-icon-wrap">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="kpi-title">Mobile Views</h3>
                    <p className="kpi-value">{mobilePercentage}%</p>
                    <p className="kpi-desc">
                      {mobileCount} mobile scans out of {totalVisits}
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={cardVariants} className="dashboard-card kpi-card">
                  <div className="kpi-icon-wrap">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="kpi-title">Top Platform</h3>
                    <p className="kpi-value truncate max-w-[150px]">{topOS}</p>
                    <p className="kpi-desc">Mainly using {topBrowser} browser</p>
                  </div>
                </motion.div>
              </div>

              {/* Chart section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={cardVariants} className="dashboard-card lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-stone-900 dark:text-stone-100">Traffic History (Last 30 Days)</h3>
                    </div>
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> Live scan rate
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    {analytics?.trafficOverTime && analytics.trafficOverTime.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={analytics.trafficOverTime}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F4B400" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#F4B400" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0,0,0,0.05)"} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(str) => {
                              try {
                                const parts = str.split("-");
                                if (parts.length < 3) return str;
                                return `${parts[2]}/${parts[1]}`;
                              } catch {
                                return str;
                              }
                            }}
                            stroke={isDark ? "#a8a29e" : "#78716c"}
                            fontSize={11}
                            tickLine={false}
                          />
                          <YAxis stroke={isDark ? "#a8a29e" : "#78716c"} fontSize={11} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              background: isDark ? "rgba(28, 25, 23, 0.95)" : "rgba(255, 255, 255, 0.95)",
                              border: isDark ? "1px solid rgba(244, 180, 0, 0.3)" : "1px solid rgba(244, 180, 0, 0.2)",
                              borderRadius: "12px",
                              fontSize: "12px",
                              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                              color: isDark ? "#ffffff" : "#1a1a1a",
                            }}
                            labelFormatter={(label) => {
                              try {
                                return new Date(label).toLocaleDateString("en-IN", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                });
                              } catch {
                                return label;
                              }
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#D97706"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorVisits)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-stone-400">
                        No traffic data to display
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Device Breakdown Card */}
                <motion.div variants={cardVariants} className="dashboard-card">
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-6 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-500" />
                    Device Breakdown
                  </h3>

                  <div className="space-y-5">
                    <div className="breakdown-row">
                      <div className="breakdown-header">
                        <span className="flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-amber-500" /> Mobile
                        </span>
                        <span>
                          {mobileCount} ({mobilePercentage}%)
                        </span>
                      </div>
                      <div className="breakdown-bar-bg">
                        <div className="breakdown-bar-fill" style={{ width: `${mobilePercentage}%` }} />
                      </div>
                    </div>

                    <div className="breakdown-row">
                      <div className="breakdown-header">
                        <span className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-blue-500" /> Desktop
                        </span>
                        <span>
                          {desktopCount} ({desktopPercentage}%)
                        </span>
                      </div>
                      <div className="breakdown-bar-bg">
                        <div className="breakdown-bar-fill" style={{ width: `${desktopPercentage}%` }} />
                      </div>
                    </div>

                    <div className="breakdown-row">
                      <div className="breakdown-header">
                        <span className="flex items-center gap-1.5">
                          <Tablet className="w-3.5 h-3.5 text-emerald-500" /> Tablet
                        </span>
                        <span>
                          {tabletCount} ({tabletPercentage}%)
                        </span>
                      </div>
                      <div className="breakdown-bar-bg">
                        <div className="breakdown-bar-fill" style={{ width: `${tabletPercentage}%` }} />
                      </div>
                    </div>

                    {unknownDeviceCount > 0 && (
                      <div className="breakdown-row">
                        <div className="breakdown-header">
                          <span className="flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-stone-400" /> Other
                          </span>
                          <span>
                            {unknownDeviceCount} ({unknownDevicePercentage}%)
                          </span>
                        </div>
                        <div className="breakdown-bar-bg">
                          <div className="breakdown-bar-fill" style={{ width: `${unknownDevicePercentage}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-stone-100 dark:border-stone-800 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider">Top Operating System</p>
                      <p className="text-base font-extrabold text-stone-800 dark:text-stone-200">{topOS}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider">Top Browser</p>
                      <p className="text-base font-extrabold text-stone-800 dark:text-stone-200">{topBrowser}</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Recent Visits Table */}
              <motion.div variants={cardVariants} className="dashboard-card overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Recent Visits Activity (Last 15)
                  </h3>
                  {selectedUsername === "all" && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                      Multi-card aggregations
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {analytics?.recentVisits && analytics.recentVisits.length > 0 ? (
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          {selectedUsername === "all" && <th>Profile</th>}
                          <th>Device</th>
                          <th>Operating System</th>
                          <th>Browser</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recentVisits.map((visit) => (
                          <tr key={visit.id}>
                            <td className="font-semibold text-stone-800 dark:text-stone-200">
                              {formatRelativeTime(visit.timestamp)}
                            </td>
                            {selectedUsername === "all" && (
                              <td className="text-amber-600 dark:text-amber-400 font-bold">
                                @{visit.username}
                              </td>
                            )}
                            <td>
                              <span className={`badge-device ${getDeviceBadgeClass(visit.device)}`}>
                                {getDeviceIcon(visit.device)}
                                {visit.device}
                              </span>
                            </td>
                            <td className="text-stone-600 dark:text-stone-400">{visit.os}</td>
                            <td className="text-stone-600 dark:text-stone-400">{visit.browser}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-12 text-center text-sm text-stone-400">
                      No visits activity logged yet. Taps will display here in real time.
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
