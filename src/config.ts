export const CONFIG = {
  simulation: { step: 1 / 60, maxFrame: 0.15, maxSteps: 64 },
  camera: { fov: 55, near: 0.5, far: 18000, position: [0, 12, 45] as const, target: [0, 3, 0] as const },
  sea: { size: 28000 },
  weather: { sun: [-0.55, 0.55, 0.67] as const, fogNear: 3000, fogFar: 11000 },
  quality: {
    low: { label: 'Légère', pixelRatio: 1, segments: 128, fps: 30 },
    medium: { label: 'Équilibrée', pixelRatio: 1.5, segments: 160, fps: 30 },
    high: { label: 'Élevée', pixelRatio: 2, segments: 224, fps: 60 },
  },
} as const;
export type Quality = keyof typeof CONFIG.quality;
