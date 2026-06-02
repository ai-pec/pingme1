import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initInstallTracking } from "@/lib/installTrackingService";

initInstallTracking();

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/firebase-image-sw.js").catch((error) => {
			console.warn("Image cache service worker registration failed", error);
		});
	});
}

createRoot(document.getElementById("root")!).render(<App />);
