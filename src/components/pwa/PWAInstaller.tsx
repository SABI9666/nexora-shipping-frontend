'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// How long the toast counts down before applying the update silently.
// Gives users a chance to finish typing in a form, then auto-applies.
const AUTO_APPLY_SECONDS = 8;
// How often we ping the server to check for a new service worker (in ms).
// Combined with the focus + visibility listeners, this makes the desktop PWA
// pick up new releases within minutes of deploy.
const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_APPLY_SECONDS);
  const [installed, setInstalled] = useState(false);
  const [hideInstall, setHideInstall] = useState(false);
  const [postponed, setPostponed] = useState(false);
  const updateWorkerRef = useRef<ServiceWorker | null>(null);

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
          const captureWorker = (sw: ServiceWorker) => {
            updateWorkerRef.current = sw;
            setUpdateWorker(sw);
          };

          if (reg.waiting && navigator.serviceWorker.controller) {
            captureWorker(reg.waiting);
          }

          reg.addEventListener('updatefound', () => {
            const sw = reg.installing;
            if (!sw) return;
            sw.addEventListener('statechange', () => {
              if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                captureWorker(sw);
              }
            });
          });

          const checkForUpdates = () => {
            reg.update().catch(() => {});
          };
          // Check on focus + tab-visibility change (covers desktop PWA windows)
          window.addEventListener('focus', checkForUpdates);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkForUpdates();
          });
          const interval = window.setInterval(checkForUpdates, POLL_INTERVAL_MS);

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

  // Countdown + auto-apply once a new SW is detected
  useEffect(() => {
    if (!updateWorker || postponed) return;
    setSecondsLeft(AUTO_APPLY_SECONDS);
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(timer);
          updateWorkerRef.current?.postMessage('SKIP_WAITING');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [updateWorker, postponed]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const handleUpdateNow = () => {
    updateWorkerRef.current?.postMessage('SKIP_WAITING');
  };

  const handlePostpone = () => {
    setPostponed(true);
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

      {updateWorker && !postponed && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-brand-navy text-white shadow-2xl rounded-full pl-4 pr-1 py-1 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs font-semibold">
            New version available — auto-updating in {secondsLeft}s
          </span>
          <button
            onClick={handleUpdateNow}
            className="bg-white text-brand-navy text-xs font-bold px-3 py-1.5 rounded-full hover:bg-slate-100"
          >
            Update now
          </button>
          <button
            onClick={handlePostpone}
            className="text-white/70 hover:text-white text-xs px-2"
            aria-label="Postpone"
          >
            Later
          </button>
        </div>
      )}

      {updateWorker && postponed && (
        <button
          onClick={() => { setPostponed(false); }}
          className="fixed bottom-4 right-4 z-[60] bg-brand-navy text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg flex items-center gap-1.5 hover:bg-brand-navy/90"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Update available
        </button>
      )}
    </>
  );
}
