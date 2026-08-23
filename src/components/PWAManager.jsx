import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { flushOfflineQueue, syncSharedDatabase } from '../services/googleSheets';

// ─── Install Banner ───────────────────────────────────────────────────────────
const InstallBanner = ({ onInstall, onDismiss }) => (
  <div
    style={{
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '520px',
      background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
      borderRadius: '18px',
      padding: '16px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      boxShadow: '0 8px 32px rgba(27, 94, 32, 0.45)',
      zIndex: 9999,
      animation: 'slideUpBanner 0.35s cubic-bezier(0.22,1,0.36,1)',
    }}
  >
    {/* App icon */}
    <img
      src="/pwa-icon-192.png"
      alt="Frutta"
      style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }}
    />

    {/* Text */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', marginBottom: '2px' }}>
        Install Frutta Utility
      </div>
      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', lineHeight: 1.4 }}>
        Add to your home screen for faster access — works offline too!
      </div>
    </div>

    {/* Buttons */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
      <button
        onClick={onInstall}
        style={{
          background: '#fff',
          color: '#1b5e20',
          border: 'none',
          borderRadius: '8px',
          padding: '7px 16px',
          fontWeight: 800,
          fontSize: '0.78rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Install
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          color: 'rgba(255,255,255,0.65)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '8px',
          padding: '5px 16px',
          fontWeight: 600,
          fontSize: '0.72rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Not now
      </button>
    </div>

    <style>{`
      @keyframes slideUpBanner {
        from { opacity: 0; transform: translateX(-50%) translateY(24px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `}</style>
  </div>
);

// ─── Update Toast ─────────────────────────────────────────────────────────────
const UpdateToast = ({ onUpdate, onDismiss }) => (
  <div
    style={{
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '520px',
      background: '#fff',
      borderRadius: '14px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      border: '1.5px solid #86efac',
      zIndex: 9999,
      animation: 'slideDownToast 0.3s cubic-bezier(0.22,1,0.36,1)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1b5e20', marginBottom: '1px' }}>
        Update Available
      </div>
      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
        A new version of Frutta Utility is ready.
      </div>
    </div>

    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
      <button
        onClick={onUpdate}
        style={{
          background: '#2e7d32',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '7px 14px',
          fontWeight: 700,
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        Reload
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          color: '#9ca3af',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '7px 12px',
          fontWeight: 600,
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        Later
      </button>
    </div>

    <style>{`
      @keyframes slideDownToast {
        from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `}</style>
  </div>
);

// ─── Main PWA Manager ─────────────────────────────────────────────────────────
const PWAManager = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // vite-plugin-pwa hook — detects when a new service worker is ready
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[PWA] Service worker registered:', r);
    },
    onRegisterError(error) {
      console.error('[PWA] SW registration error:', error);
    },
  });

  // Capture the browser's native install prompt
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Network] Connection restored — auto-flushing queue & syncing DB...');
      flushOfflineQueue();
      syncSharedDatabase();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Small delay so the page loads first, then show banner
      setTimeout(() => setShowInstallBanner(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    setShowInstallBanner(false);
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    setInstallPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa_install_dismissed', '1');
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
    setNeedRefresh(false);
  };

  const handleDismissUpdate = () => {
    setNeedRefresh(false);
  };

  return (
    <>
      {needRefresh && (
        <UpdateToast onUpdate={handleUpdate} onDismiss={handleDismissUpdate} />
      )}
      {showInstallBanner && installPrompt && (
        <InstallBanner onInstall={handleInstall} onDismiss={handleDismissInstall} />
      )}
    </>
  );
};

export default PWAManager;
