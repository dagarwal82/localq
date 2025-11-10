import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Type for the deferred install prompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAControls: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);
    const [showInstall, setShowInstall] = useState(false);
    const [installed, setInstalled] = useState(false);

  // Detect installability
  useEffect(() => {
    // If already installed, never show install option
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setInstalled(!!isStandalone);
    if (isStandalone) setShowInstall(false);
  }, []);

  useEffect(() => {
    // Sync with global stored prompt if already captured in main.tsx
    if (window.__deferredInstallPrompt) {
      setDeferredPrompt(window.__deferredInstallPrompt as BeforeInstallPromptEvent);
      setShowInstall(true);
    }
    function handleInstallAvailable() {
      if (window.__deferredInstallPrompt) {
        setDeferredPrompt(window.__deferredInstallPrompt as BeforeInstallPromptEvent);
        setShowInstall(true);
        toast({ title: 'Install available', description: 'You can install SpaceVox as an app.', duration: 5000 });
      }
    }
      function handleInstalled() {
        setInstalled(true);
        setShowInstall(false);
        setDeferredPrompt(null);
        toast({ title: 'Installed', description: 'SpaceVox added to your device.' });
      }
    window.addEventListener('pwa:install-available', handleInstallAvailable);
    window.addEventListener('pwa:installed', handleInstalled);
    return () => {
      window.removeEventListener('pwa:install-available', handleInstallAvailable);
      window.removeEventListener('pwa:installed', handleInstalled);
    };
  }, []);

  useEffect(() => {
    function handleUpdate(e: Event) {
      const ce = e as CustomEvent<{ registration: ServiceWorkerRegistration }>;
      setUpdateRegistration(ce.detail.registration);
      setShowUpdate(true);
      toast({ title: 'Update ready', description: 'New version available. Click update to refresh.', duration: 7000 });
    }
    window.addEventListener('pwa:update-available', handleUpdate as any);
    return () => window.removeEventListener('pwa:update-available', handleUpdate as any);
  }, []);

  const doInstall = useCallback(async () => {
    const promptEvt = deferredPrompt || (window.__deferredInstallPrompt as BeforeInstallPromptEvent | undefined);
    if (!promptEvt) return;
    try {
      await promptEvt.prompt();
      const choice = await promptEvt.userChoice;
      if (choice.outcome === 'accepted') {
        toast({ title: 'Installed', description: 'SpaceVox was added to your device.' });
        setShowInstall(false);
      } else {
        toast({ title: 'Install dismissed', description: 'Install canceled.' });
      }
    } catch (err) {
      console.error('Install error', err);
      toast({ title: 'Install failed', description: 'Unable to trigger install.' });
    }
  }, [deferredPrompt]);

  const applyUpdate = useCallback(() => {
    if (!updateRegistration) return;
    updateRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    // Give SW a moment to activate then reload
    setTimeout(() => window.location.reload(), 300);
  }, [updateRegistration]);

  // Only show install if we actually have a deferred prompt to trigger
  const canInstall = !!deferredPrompt && !installed;
  if (!canInstall && !showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {canInstall && (
        <Button variant="secondary" onClick={doInstall} className="shadow" data-testid="btn-install-app">
          Install App
        </Button>
      )}
      {showUpdate && (
        <Button variant="default" onClick={applyUpdate} className="shadow">
          Update Available – Refresh
        </Button>
      )}
    </div>
  );
};

export default PWAControls;