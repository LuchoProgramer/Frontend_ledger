'use client';

import { useState, useEffect, useRef } from 'react';

export interface UseServiceWorkerReturn {
  needsRefresh: boolean;
  updateSW: () => void;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);
  const isUpdating = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      swRef.current = reg;
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedsRefresh(true);
          }
        });
      });
    }).catch(console.error);

    const handleControllerChange = () => {
      if (isUpdating.current) window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const updateSW = () => {
    isUpdating.current = true;
    swRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  return { needsRefresh, updateSW };
}
