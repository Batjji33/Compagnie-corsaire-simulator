import type { Quality } from '../config';
export interface Settings { quality: Quality; showFps: boolean }
const KEY = 'corsaire.settings.v1';
export function loadSettings(): Settings {
  const fallback: Settings = { quality: 'low', showFps: false };
  // One-way migration of phase 0–3 preferences; all new writes use IndexedDB.
  if(typeof window==='undefined')return fallback;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!value || typeof value !== 'object') return fallback;
    const data = value as Record<string, unknown>;
    return {
      quality: data.quality === 'low' || data.quality === 'medium' || data.quality === 'high' ? data.quality : fallback.quality,
      showFps: typeof data.showFps === 'boolean' ? data.showFps : false,
    };
  } catch { return fallback; }
}
