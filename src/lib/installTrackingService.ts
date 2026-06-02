import { auth } from "@/lib/firebase";

const INSTALL_TRACKED_KEY = "pingme_install_tracked_v1";

const getApiBaseUrl = () => {
  const base = import.meta.env.VITE_PAYMENT_API_BASE_URL;
  return typeof base === "string" ? base.replace(/\/$/, "") : "";
};

const postInstallEvent = async () => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return;

  const currentUser = auth.currentUser;
  if (!currentUser) return; // Only track for logged in users to satisfy security audit

  const idToken = await currentUser.getIdToken();

  await fetch(`${baseUrl}/trackInstall`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      installedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }),
  });
};

export const initInstallTracking = () => {
  if (typeof window === "undefined") return;

  const hasTracked = () => localStorage.getItem(INSTALL_TRACKED_KEY) === "1";
  const setTracked = () => localStorage.setItem(INSTALL_TRACKED_KEY, "1");

  const trackOnce = () => {
    if (hasTracked()) return;

    setTracked();
    void postInstallEvent().catch(() => {
      localStorage.removeItem(INSTALL_TRACKED_KEY);
    });
  };

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (standalone) {
    trackOnce();
  }

  window.addEventListener("appinstalled", trackOnce, { once: true });
};
