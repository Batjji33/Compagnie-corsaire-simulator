import { DirectionalLight, Fog, HemisphereLight, Vector3 } from 'three';
import { CONFIG } from '../config';
export const sunDirection = new Vector3(...CONFIG.weather.sun).normalize();
export function createDaylight() {
  const sun = new DirectionalLight(0xfff1d6, 2.4);
  sun.position.copy(sunDirection).multiplyScalar(1000);
  return { sun, ambient: new HemisphereLight(0xc3dfef, 0x264438, 1.7),
    fog: new Fog(0xb5cbd1, CONFIG.weather.fogNear, CONFIG.weather.fogFar) };
}
