'use client';

import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [installed, setInstalled] = useState(false);
  const [hideInstall, setHideInstall] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    let cleanupSW: (() => void) | undefined;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (reg.waiting && navigator.serviceWorker.controller) {
            setUpdateWorker(reg.waiting);
          }
          reg.addEventListener('updatefound', () => {
            const sw = reg.installing;
            if (!sw) return;
            sw.addEventListener('statechange', () => {
              if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateWorker(sw);
              }
            });
          });

          const checkForUpdates = () => {
            reg.update().catch(() => {});
          };
          window.addEventListener('focus', checkForUpdates);
          const interval = window.setInterval(checkForUpdates, 30 * 60 * 1000);

          cleanupSW = () => {
            window.removeEventListener('focus', checkForUpdates);
            window.clearInterval(interval);
          };
        })
        .catch(() => {});

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      cleanupSW?.();
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const handleUpdate = () => {
    if (!updateWorker) return;
    updateWorker.postMessage('SKIP_WAITING');
  };

  return (
    <>
      {installPrompt && !installed && !hideInstall && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm bg-white shadow-2xl border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-brand-navy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Install Nexora as a desktop app</p>
            <p className="text-xs text-slate-500 mt-0.5">
              One-click install. Updates apply automatically when we ship a new version.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-brand-navy text-white text-xs font-semibold rounded-lg hover:bg-brand-navy/90"
              >
                Install
              </button>
              <button
                onClick={() => setHideInstall(true)}
                className="px-3 py-1.5 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={() => setHideInstall(true)}
            className="text-slate-300 hover:text-slate-500 -mt-1 -mr-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {updateWorker && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-brand-navy text-white shadow-2xl rounded-full pl-4 pr-1 py-1 flex items-center gap-3">
          <span className="text-xs font-semibold">A new version of Nexora is available.</span>
          <button
            onClick={handleUpdate}
            className="bg-white text-brand-navy text-xs font-bold px-3 py-1.5 rounded-full hover:bg-slate-100 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Reload
          </button>
        </div>
      )}
    </>
  );
}
