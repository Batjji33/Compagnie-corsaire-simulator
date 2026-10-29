import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { CONFIG } from '../config';
import type { Quality } from '../config';
import { sunDirection } from '../weather/daylight';

export class Ocean {
  readonly material = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmplitude: { value: CONFIG.sea.amplitude },
      uSun: { value: sunDirection }, uFog: { value: new Color(0xb5cbd1) },
      uFogNear: { value: CONFIG.weather.fogNear }, uFogFar: { value: CONFIG.weather.fogFar } },
    vertexShader: `
      uniform float uTime;
      uniform float uAmplitude;
      varying vec3 vWorld;
      void main() {
        vec3 p = position;
        vec4 world = modelMatrix * vec4(p, 1.0);
        world.y += uAmplitude * (sin(world.x * .035 + uTime * .8) + .5 * sin(world.z * .06 - uTime * 1.1));
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSun;
      uniform vec3 uFog;
      uniform float uFogNear;
      uniform float uFogFar;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz;
        float distanceToEye = length(cameraPosition - vWorld);
        float detail = 1.0 - smoothstep(80.0, 650.0, distanceToEye);
        float dx = .10*cos(p.x*.11 + p.y*.07 + uTime*.9) + detail*.09*cos(p.x*.72-p.y*.42+uTime*1.5);
        float dz = .12*cos(p.y*.14-p.x*.06-uTime*.7) + detail*.07*sin(p.y*.83+p.x*.37+uTime*1.8);
        vec3 normal = normalize(vec3(-dx, 1.0, -dz));
        vec3 view = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0-max(dot(normal, view), 0.0), 4.0);
        vec3 water = mix(vec3(.025,.16,.18), vec3(.40,.59,.64), fresnel*.88);
        float specular = pow(max(dot(normal, normalize(view + uSun)),0.0), 180.0);
        water += vec3(1.0,.89,.65)*specular*1.5;
        water += .018*sin(p.x*.19+p.y*.22+uTime)*detail;
        water = mix(water, uFog, smoothstep(uFogNear,uFogFar,distanceToEye));
        gl_FragColor = vec4(water, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  constructor(quality: Quality) {
    this.mesh = new Mesh(this.geometry(quality), this.material);
    this.mesh.frustumCulled = false;
  }
  private geometry(quality: Quality): PlaneGeometry {
    const geometry = new PlaneGeometry(CONFIG.sea.size, CONFIG.sea.size, CONFIG.quality[quality].segments, CONFIG.quality[quality].segments);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }
  setQuality(quality: Quality): void {
    const old = this.mesh.geometry;
    this.mesh.geometry = this.geometry(quality);
    old.dispose();
  }
  update(time: number, camera: Vector3): void {
    this.material.uniforms.uTime.value = time;
    this.mesh.position.set(camera.x, 0, camera.z);
  }
  dispose(): void { this.mesh.geometry.dispose(); this.material.dispose(); }
}
