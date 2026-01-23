import { useEffect, useState, useCallback } from 'react';

export const APP_MODE_KEY = 'ugms_mode'; // 'city' | 'sim'
export const APP_MODE_EVENT = 'ugms-mode-changed';

export function getStoredMode() {
  if (typeof localStorage === 'undefined') return 'city';
  const v = (localStorage.getItem(APP_MODE_KEY) || '').toLowerCase();
  return v === 'sim' ? 'sim' : 'city';
}

export function setStoredMode(mode) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(APP_MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent(APP_MODE_EVENT, { detail: { mode } }));
}

/**
 * Global app mode hook (City Live vs Simulated).
 * Uses localStorage + custom event so all components update instantly.
 */
export function useAppMode() {
  const [mode, setModeState] = useState(getStoredMode);

  useEffect(() => {
    const onCustom = (e) => {
      const next = (e?.detail?.mode || getStoredMode()).toLowerCase();
      setModeState(next === 'sim' ? 'sim' : 'city');
    };
    const onStorage = () => setModeState(getStoredMode());

    window.addEventListener(APP_MODE_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(APP_MODE_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setMode = useCallback((next) => {
    const normalized = next === 'sim' ? 'sim' : 'city';
    setStoredMode(normalized);
    setModeState(normalized);
  }, []);

  return { mode, setMode };
}

