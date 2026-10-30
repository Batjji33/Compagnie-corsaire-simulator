import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three';
import { random } from './geography';

/** Small original procedural textures. No network, external licence or per-building texture. */
export function createMaterials() {
  const textures: CanvasTexture[] = [];
  function texture(kind: 'stone' | 'facade' | 'roof' | 'ground' | 'cliff') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!; const rng = random(42);
    ctx.fillStyle = kind === 'roof' ? '#707b83' : '#d6d0bd'; ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) for (let x = -32; x < 256; x += 32) {
      const tone = Math.floor(155 + rng() * 60);
      ctx.fillStyle = kind === 'roof' ? `rgb(${tone*.48},${tone*.54},${tone*.6})` : `rgb(${tone},${tone*.97},${tone*.88})`;
      ctx.fillRect(x + (y % 32 ? 16 : 0), y, 30, 14);
    }
    if (kind === 'facade') {
      ctx.fillStyle = '#dcd6c4'; ctx.fillRect(0,0,256,256);
      for (let y = 20; y < 240; y += 58) for (let x = 22; x < 240; x += 58) {
        ctx.fillStyle = '#f5e9d4'; ctx.fillRect(x-4,y-4,28,40);
        ctx.fillStyle = '#334b58'; ctx.fillRect(x,y,20,31);
        ctx.fillStyle = '#a6b5b9'; ctx.fillRect(x+3,y+3,6,12);
        ctx.fillStyle = '#e5dac2'; ctx.fillRect(x+9,y,2,31); ctx.fillRect(x,y+15,20,2);
        ctx.fillStyle = '#a79880'; ctx.fillRect(x-5,y+34,30,3);
      }
    }
    if (kind === 'ground') {
      ctx.fillStyle='#9aab77';ctx.fillRect(0,0,256,256);
      for(let i=0;i<5500;i++) { const tone=110+rng()*70;ctx.fillStyle=`rgba(${tone},${tone+12},${tone*.7},.26)`;ctx.fillRect(rng()*256,rng()*256,2+rng()*14,2+rng()*14); }
    }
    if(kind==='cliff') {
      ctx.fillStyle='#baa18e';ctx.fillRect(0,0,256,256);
      for(let i=0;i<1800;i++) {
        const tone=100+rng()*90;ctx.fillStyle=`rgba(${tone+25},${tone+8},${tone},.3)`;
        ctx.fillRect(rng()*256,rng()*256,8+rng()*55,1+rng()*4);
      }
    }
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace;
    map.wrapS = map.wrapT = RepeatWrapping; map.anisotropy = 2;
    textures.push(map); return map;
  }
  const stone = texture('stone'), facade = texture('facade'), roof = texture('roof'), ground=texture('ground');
  const materials = {
    stone: new MeshStandardMaterial({ map: stone, color: 0xaaa596, roughness: 0.95 }),
    facade: new MeshStandardMaterial({ map: facade, roughness: 0.9 }),
    roof: new MeshStandardMaterial({ map: roof, color: 0xa2b1c0, roughness: 0.85 }),
    grass: new MeshStandardMaterial({ map: ground, color: 0xb0bd92, roughness: 1 }),
    sand: new MeshStandardMaterial({ color: 0xd7c39a, roughness: 1 }),
    town: new MeshStandardMaterial({ color: 0xa89d87, roughness: 1 }),
    rock: new MeshStandardMaterial({ map: stone, color: 0x797d76, roughness: 1 }),
    cliff: new MeshStandardMaterial({ map: texture('cliff'), color: 0xd6bfae, roughness: 1 }),
    foliage: new MeshStandardMaterial({ color: 0x395d3e, roughness: 1 }),
    wood: new MeshStandardMaterial({ color: 0x726353, roughness: 0.9 }),
    white: new MeshStandardMaterial({ color: 0xe6e3d5, roughness: 0.7 }),
    red: new MeshStandardMaterial({ color: 0xb84332, roughness: 0.65 }),
    green: new MeshStandardMaterial({ color: 0x258863, roughness: 0.65 }),
    dark: new MeshStandardMaterial({ color: 0x28323a, roughness: 0.85 }),
  };
  return { materials, dispose() { textures.forEach(t => t.dispose()); Object.values(materials).forEach(m => m.dispose()); } };
}
export type MaterialId = keyof ReturnType<typeof createMaterials>['materials'];
