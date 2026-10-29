import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Lazy-import this module when the first ship or scenery model is needed. */
export async function loadModel(relativePath: string) {
  const manager = new LoadingManager();
  const loader = new GLTFLoader(manager);
  const path = `${import.meta.env.BASE_URL}assets/${relativePath.replace(/^\/+/, '')}`;
  try { return await loader.loadAsync(path); }
  catch (cause) { throw new Error(`Impossible de charger la ressource 3D : ${relativePath}`, { cause }); }
}
