import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/layouts/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Download,
  Mail,
  Phone,
  Briefcase,
  RotateCcw,
  X,
  Check,
  Copy,
  Zap,
  AlertTriangle,
  Calendar,
  Sparkles,
} from "lucide-react";
import "./NfcLeadsDashboard.css";

interface LeadRecord {
  id: string;
  cardOwnerUsername: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string;
  visitorCompany?: string;
  leadAssessment?: string;
  personalizedEmailSubject?: string;
  personalizedEmailBody?: string;
  createdAt: string;
}

interface ApiResponse {
  ownedUsernames: string[];
  selectedUsername: string | null;
  leads: LeadRecord[];
}

const formatExactTime = (isoString?: string) => {
  if (!isoString) return "N/A";
  try {
    const dateObj = new Date(isoString);
    if (isNaN(dateObj.getTime())) {
      return isoString || "N/A";
    }
    const day = dateObj.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const seconds = String(dateObj.getSeconds()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
  } catch {
    return isoString || "N/A";
  }
};

const cleanHtmlToPlainText = (html?: string) => {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .trim();
};

export default function NfcLeadsDashboard() {
  const { user } = useAuth();
  const [selectedUsername, setSelectedUsername] = useState<string>("all");
  const [activeLead, setActiveLead] = useState<LeadRecord | null>(null);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeLead) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeLead]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery<ApiResponse>({
    queryKey: ["nfcLeads", selectedUsername],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Authentication token is required.");

      const baseUrl = (import.meta.env.VITE_PAYMENT_API_BASE_URL || "").replace(/\/$/, "");
      const url =
        selectedUsername && selectedUsername !== "all"
          ? `${baseUrl}/getNfcLeads?username=${encodeURIComponent(selectedUsername)}`
          : `${baseUrl}/getNfcLeads`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to fetch leads data.");
      }

      return res.json();
    },
    enabled: !!user,
  });

  const leads = data?.leads || [];
  const ownedUsernames = data?.ownedUsernames || [];

  // Export Leads to CSV helper
  const handleExportCSV = () => {
    if (leads.length === 0) return;

    const escapeCSV = (str?: string) => `"${String(str || "").replace(/"/g, '""')}"`;

    const headers = [
      "ID",
      "Date (IST)",
      "Card Profile",
      "Visitor Name",
      "Visitor Email",
      "Visitor Phone",
      "Visitor Company",
      "AI Assessment",
      "Follow-up Subject",
      "Follow-up Draft (Plain Text)"
    ];

    const rows = leads.map((lead) => {
      const dateStr = lead.createdAt && !isNaN(new Date(lead.createdAt).getTime())
        ? new Date(lead.createdAt).toLocaleString("en-IN")
        : "N/A";
      return [
        escapeCSV(lead.id),
        escapeCSV(dateStr),
        escapeCSV(`@${lead.cardOwnerUsername}`),
        escapeCSV(lead.visitorName),
        escapeCSV(lead.visitorEmail),
        escapeCSV(lead.visitorPhone),
        escapeCSV(lead.visitorCompany),
        escapeCSV(lead.leadAssessment),
        escapeCSV(lead.personalizedEmailSubject),
        escapeCSV(cleanHtmlToPlainText(lead.personalizedEmailBody))
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `pingme_leads_${selectedUsername}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy to Clipboard trigger
  const handleCopyToClipboard = (text: string, key: string) => {
    const fallbackCopy = (txt: string) => {
      const textarea = document.createElement("textarea");
      textarea.value = txt;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.error("Fallback copy failed", err);
      }
      document.body.removeChild(textarea);
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedMap((prev) => ({ ...prev, [key]: true }));
          setTimeout(() => {
            setCopiedMap((prev) => ({ ...prev, [key]: false }));
          }, 2000);
        })
        .catch((err) => {
          console.error("Clipboard write failed, using fallback", err);
          fallbackCopy(text);
          setCopiedMap((prev) => ({ ...prev, [key]: true }));
          setTimeout(() => {
            setCopiedMap((prev) => ({ ...prev, [key]: false }));
          }, 2000);
        });
    } else {
      fallbackCopy(text);
      setCopiedMap((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedMap((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    }
  };

  // Dashboard calculations
  const totalLeads = leads.length;
  const recentLeadTime = leads.length > 0 ? formatExactTime(leads[0].createdAt) : "N/A";

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
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
            <Users className="h-6 w-6 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-sm font-semibold tracking-wider text-muted-foreground animate-pulse">
            LOADING LEADS...
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
          <h2 className="text-xl font-bold">Failed to load leads</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error instanceof Error ? error.message : "Something went wrong while fetching leads."}
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
          {/* Header section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-6 h-6 text-amber-500" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  AI Lead Capture & CRM
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight leading-none">
                Leads & Outreach
              </h1>
              <p className="text-sm text-stone-500 mt-2">
                Manage contact info captured from NFC profile scans along with AI outreach drafts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {ownedUsernames.length > 1 && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="card-selector" className="text-xs font-semibold text-stone-500">
                    Select NFC Card:
                  </label>
                  <select
                    id="card-selector"
                    className="nfc-select"
                    value={selectedUsername}
                    onChange={(e) => setSelectedUsername(e.target.value)}
                  >
                    <option value="all">All Profiles ({ownedUsernames.length})</option>
                    {ownedUsernames.map((uname) => (
                      <option key={uname} value={uname}>
                        @{uname}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-end gap-2 self-end">
                {leads.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="export-csv-btn shadow-sm"
                    aria-label="Export leads to CSV"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                )}

                <button
                  onClick={() => void refetch()}
                  disabled={isRefetching}
                  className="flex items-center justify-center p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-amber-400 hover:text-amber-600 transition-all shadow-sm shrink-0"
                  aria-label="Refresh leads"
                >
                  <RotateCcw className={`w-4 h-4 ${isRefetching ? "animate-spin text-amber-500" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {ownedUsernames.length === 0 ? (
            /* Empty cards state */
            <div className="dashboard-card py-20 flex flex-col items-center justify-center text-center gap-6 max-w-lg mx-auto">
              <div className="h-16 w-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">No NFC cards registered</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                We couldn't find any confirmed NFC card profiles linked to this account. Visit and complete profile setup after purchasing cards.
              </p>
            </div>
          ) : leads.length === 0 ? (
            /* Empty leads state */
            <div className="dashboard-card py-16 flex flex-col items-center justify-center text-center gap-5 max-w-md mx-auto">
              <div className="h-14 w-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center">
                <Users className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold text-stone-900">No leads captured yet</h2>
              <p className="text-xs text-stone-500 leading-relaxed">
                When visitors scan your NFC card and fill out the "Share My Info" form, their details and AI-personalized outreach drafts will show up here.
              </p>
            </div>
          ) : (
            /* Main Leads content */
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-8"
            >
              {/* KPI Cards Grid */}
              <div className="kpi-grid">
                <motion.div variants={cardVariants} className="dashboard-card kpi-card">
                  <div className="kpi-icon-wrap">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="kpi-title">Total Leads Captured</h3>
                    <p className="kpi-value">{totalLeads}</p>
                    <p className="kpi-desc">Contact info shared from card scans</p>
                  </div>
                </motion.div>

                <motion.div variants={cardVariants} className="dashboard-card kpi-card">
                  <div className="kpi-icon-wrap">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="kpi-title">Latest Lead</h3>
                    <p className="kpi-value text-xl font-bold py-1">{recentLeadTime}</p>
                    <p className="kpi-desc">Most recent submission time</p>
                  </div>
                </motion.div>

                <motion.div variants={cardVariants} className="dashboard-card kpi-card">
                  <div className="kpi-icon-wrap">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="kpi-title">AI Powered Enrichment</h3>
                    <p className="kpi-value text-xl font-bold py-1">Active</p>
                    <p className="kpi-desc">Gemini copy-ready follow-up drafts</p>
                  </div>
                </motion.div>
              </div>

              {/* Leads Table Card */}
              <motion.div variants={cardVariants} className="dashboard-card overflow-hidden">
                <h3 className="font-bold text-stone-900 mb-6 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  All Captured Leads
                </h3>

                <div className="overflow-x-auto">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Visitor Details</th>
                        <th>Company</th>
                        <th>Contact info</th>
                        <th>Shared Time</th>
                        {selectedUsername === "all" && <th>Profile Card</th>}
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, index) => (
                        <tr key={lead.id || `lead-${index}`} className="cursor-pointer" onClick={() => setActiveLead(lead)}>
                          <td className="font-semibold text-stone-800">
                            {lead.visitorName}
                          </td>
                          <td className="text-stone-600">
                            {lead.visitorCompany && lead.visitorCompany !== "N/A" ? lead.visitorCompany : "-"}
                          </td>
                          <td>
                            <div className="flex flex-col gap-0.5 text-xs text-stone-500">
                              <span>{lead.visitorEmail}</span>
                              {lead.visitorPhone && lead.visitorPhone !== "N/A" && <span>{lead.visitorPhone}</span>}
                            </div>
                          </td>
                          <td className="text-stone-600">
                            {formatExactTime(lead.createdAt)}
                          </td>
                          {selectedUsername === "all" && (
                            <td className="text-amber-600 font-semibold text-xs">
                              @{lead.cardOwnerUsername}
                            </td>
                          )}
                          <td className="text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveLead(lead);
                              }}
                              className="view-details-btn shadow-sm"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> View AI Draft
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Slide-over details drawer panel */}
      <AnimatePresence>
        {activeLead && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveLead(null)}
              className="drawer-backdrop"
            />

            {/* Sidebar drawer body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="leads-drawer"
              data-lenis-prevent
            >
              <div className="drawer-header">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                    Lead Details
                  </span>
                  <h2 className="drawer-title">{activeLead.visitorName}</h2>
                </div>
                <button
                  onClick={() => setActiveLead(null)}
                  className="close-drawer-btn"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="drawer-content">
                {/* Meta details card */}
                <div className="space-y-3 p-4 bg-stone-50 rounded-xl border border-stone-200 text-sm">
                  {activeLead.visitorCompany && activeLead.visitorCompany !== "N/A" && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-stone-400 shrink-0" />
                      <span className="text-stone-600">Company:</span>
                      <strong className="text-stone-800">{activeLead.visitorCompany}</strong>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                    <span className="text-stone-600">Email:</span>
                    <a
                      href={`mailto:${activeLead.visitorEmail}`}
                      className="text-amber-600 font-semibold hover:underline"
                    >
                      {activeLead.visitorEmail}
                    </a>
                  </div>
                  {activeLead.visitorPhone && activeLead.visitorPhone !== "N/A" && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                      <span className="text-stone-600">Phone:</span>
                      <a
                        href={`tel:${activeLead.visitorPhone}`}
                        className="text-stone-700 font-semibold hover:underline"
                      >
                        {activeLead.visitorPhone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60 text-xs text-stone-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Captured on{" "}
                      {activeLead.createdAt && !isNaN(new Date(activeLead.createdAt).getTime())
                        ? new Date(activeLead.createdAt).toLocaleString("en-IN")
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* AI Assessment block */}
                {activeLead.leadAssessment && activeLead.leadAssessment !== "N/A" && (
                  <div className="ai-assessment-box">
                    <h3 className="ai-box-title">
                      <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                      AI Lead Assistant Assessment
                    </h3>
                    <p className="ai-box-desc">{activeLead.leadAssessment}</p>
                  </div>
                )}

                {/* AI Follow-up Email template */}
                {activeLead.personalizedEmailBody && activeLead.personalizedEmailBody !== "N/A" && (
                  <div className="email-outreach-panel">
                    <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-stone-400" />
                      Suggested Outreach Follow-up
                    </h3>

                    <div className="email-meta-row space-y-1">
                      <div>
                        <strong>To:</strong> {activeLead.visitorName} ({activeLead.visitorEmail})
                      </div>
                      {activeLead.personalizedEmailSubject && activeLead.personalizedEmailSubject !== "N/A" && (
                        <div>
                          <strong>Subject:</strong> {activeLead.personalizedEmailSubject}
                        </div>
                      )}
                    </div>

                    <div
                      className="email-preview-body"
                      dangerouslySetInnerHTML={{ __html: activeLead.personalizedEmailBody }}
                    />

                    {/* Clipboard copy triggers */}
                    <button
                      onClick={() =>
                        handleCopyToClipboard(
                          `Subject: ${activeLead.personalizedEmailSubject || ""}\n\n${cleanHtmlToPlainText(
                            activeLead.personalizedEmailBody
                          )}`,
                          "outreach"
                        )
                      }
                      className={`copy-draft-btn ${
                        copiedMap["outreach"]
                          ? "copy-draft-btn-copied"
                          : "copy-draft-btn-default"
                      }`}
                    >
                      {copiedMap["outreach"] ? (
                        <>
                          <Check className="w-4 h-4" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy Subject & Body
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
