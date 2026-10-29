import type { Quality } from '../config';
export interface Settings { quality: Quality; showFps: boolean }
const KEY = 'corsaire.settings.v1';
export function loadSettings(): Settings {
  const fallback: Settings = { quality: 'low', showFps: false };
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
export function saveSettings(settings: Settings): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); return true; }
  catch { return false; }
}
