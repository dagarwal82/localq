import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";

// Capture install prompt as early as possible and expose to app
declare global {
	interface Window {
		__deferredInstallPrompt?: any;
	}
}

window.addEventListener('beforeinstallprompt', (e: Event) => {
	// Chrome/Edge: prevent mini-infobar and keep event for custom UI
	(e as any).preventDefault?.();
	window.__deferredInstallPrompt = e;
	window.dispatchEvent(new CustomEvent('pwa:install-available'));
});

window.addEventListener('appinstalled', () => {
	window.__deferredInstallPrompt = undefined;
	window.dispatchEvent(new CustomEvent('pwa:installed'));
});

// Dispatch a custom event to notify React components about SW updates
function setupServiceWorkerUpdateChannel(reg: ServiceWorkerRegistration) {
	reg.addEventListener('updatefound', () => {
		const newWorker = reg.installing;
		if (!newWorker) return;
		newWorker.addEventListener('statechange', () => {
			if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
				// New version installed but waiting – announce availability
				window.dispatchEvent(new CustomEvent('pwa:update-available', { detail: { registration: reg } }));
			}
		});
	});
}

if ('serviceWorker' in navigator) {
	// Delay registration slightly to avoid competing with initial network critical path
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').then(reg => {
			setupServiceWorkerUpdateChannel(reg);
			// Periodic update check (every 60s while page open)
			setInterval(() => reg.update().catch(() => {}), 60000);
		}).catch(console.error);
	});
}

createRoot(document.getElementById("root")!).render(
	<QueryClientProvider client={queryClient}>
		<App />
	</QueryClientProvider>
);
