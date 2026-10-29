/** Authored, approximate metre-space layout, NOT chart or survey data. X east, Z south. */
export type Point = readonly [number, number];
export interface Land { id: string; name: string; zone: string; height: number; surface: 'grass' | 'town' | 'sand'; outline: readonly Point[] }
export const BAY = { minX: -4200, maxX: 4200, minZ: -3600, maxZ: 4200, atlasSize: 512, shoreRange: 150,
  detailDistance: { low: 1000, medium: 1700, high: 2400 }, minCameraDistance: 25, maxCameraDistance: 4800 } as const;
export const LANDS: readonly Land[] = [
  { id: 'intra', name: 'Saint-Malo · Intra-Muros', zone: 'saint-malo', height: 9, surface: 'town', outline: [[660,100],[590,-110],[610,-390],[750,-650],[1010,-730],[1260,-560],[1380,-300],[1330,60],[1100,170],[870,170]] },
  { id: 'sillon', name: 'Le Sillon · côte de Saint-Malo', zone: 'saint-malo', height: 12, surface: 'grass', outline: [[1240,-500],[1580,-680],[1940,-1000],[2370,-1150],[3000,-1500],[4200,-1900],[4900,-1900],[4900,4600],[1400,4600],[1350,2600],[1080,2100],[730,1730],[650,1430],[820,1180],[1100,1100],[1450,1300],[1730,1020],[1720,460],[1380,210],[1300,-80]] },
  { id: 'dinard', name: 'Dinard · Moulinet et Malouine', zone: 'dinard', height: 24, surface: 'grass', outline: [[-4600,600],[-3300,440],[-2850,570],[-2460,500],[-2250,260],[-2090,220],[-1950,420],[-1850,820],[-1610,910],[-1400,810],[-1330,350],[-1160,280],[-970,420],[-910,650],[-1050,860],[-1100,1110],[-1200,1430],[-1290,1800],[-1110,2150],[-1030,2800],[-700,3600],[-700,4600],[-4600,4600]] },
  { id: 'grand-be', name: 'Grand Bé', zone: 'islands', height: 20, surface: 'grass', outline: [[280,-760],[180,-900],[230,-1100],[420,-1190],[550,-1070],[530,-850],[420,-740]] },
  { id: 'petit-be', name: 'Petit Bé', zone: 'islands', height: 7, surface: 'grass', outline: [[-100,-1100],[-180,-1210],[-90,-1330],[35,-1310],[90,-1170],[30,-1080]] },
  { id: 'national', name: 'Fort National', zone: 'islands', height: 6, surface: 'sand', outline: [[1080,-1020],[1010,-1110],[1050,-1230],[1210,-1250],[1290,-1150],[1240,-1030]] },
  { id: 'harbour', name: 'Môle des Noires', zone: 'saint-malo', height: 4, surface: 'town', outline: [[680,100],[650,135],[360,20],[170,-160],[190,-180],[390,-15]] },
  { id: 'ecluse', name: 'Plage de l’Écluse', zone: 'dinard', height: 2.2, surface: 'sand', outline: [[-1900,685],[-1660,765],[-1400,665],[-1370,840],[-1610,950],[-1880,860]] },
  { id: 'bon-secours', name: 'Plage de Bon Secours', zone: 'saint-malo', height: 1.5, surface: 'sand', outline: [[620,-240],[530,-310],[495,-510],[605,-670],[755,-675],[680,-490]] },
];
export const DOCKS = [
  { id: 'malo', name: 'Saint-Malo · Cale de Dinan', point: [920, 245] as Point, land: [920, 145] as Point, heading: Math.PI, provenance: 'Lieu réel ; cale et dimensions interprétées' },
  { id: 'dinard', name: 'Dinard · Clair de Lune', point: [-970, 1120] as Point, land: [-1165, 1120] as Point, heading: Math.PI / 2, provenance: 'Lieu réel ; ponton et dimensions interprétés' },
] as const;
export const ROUTE: readonly Point[] = [[920,285],[720,440],[300,650],[-200,850],[-650,1030],[-925,1120]];
export const BUOYS = [
  { x: 710, z: 510, red: true }, { x: 610, z: 320, red: false },
  { x: 100, z: 840, red: true }, { x: 15, z: 600, red: false },
  { x: -690, z: 1190, red: true }, { x: -750, z: 920, red: false },
] as const;
export const ROCKS = [
  { x: -340, z: -560, radius: 70 }, { x: -520, z: -650, radius: 32 },
  { x: -710, z: 250, radius: 48 }, { x: 410, z: -460, radius: 38 },
  { x: 1300, z: 800, radius: 55 }, { x: -1650, z: 280, radius: 44 },
] as const;
export const VIEWS = {
  malo: { label: 'Saint-Malo', position: [670, 55, 470], target: [990, 25, -140] },
  dinard: { label: 'Dinard', position: [-650, 65, 1280], target: [-1250, 35, 970] },
  bay: { label: 'Toute la baie', position: [-300, 1950, 3400], target: [0, 0, 0] },
  islands: { label: 'Les forts', position: [-500, 100, -1750], target: [490, 18, -650] },
} as const;
export type ViewId = keyof typeof VIEWS;
export const EXTENSIONS = [
  { id: 'cezembre', direction: 'nord-ouest', status: 'reserved' },
  { id: 'cancale', direction: 'nord-est', status: 'reserved' },
  { id: 'cap-frehel', direction: 'ouest', status: 'reserved' },
] as const;
export function inside(x: number, z: number, polygon: readonly Point[]): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}
export function groundHeight(x: number, z: number): number {
  let height = 0;
  for (const land of LANDS) if (inside(x, z, land.outline)) height = Math.max(height, land.height);
  return height;
}
export function random(seed: number): () => number {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
