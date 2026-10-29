import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { CONFIG } from '../config';
import type { Quality } from '../config';
import { sunDirection } from '../weather/daylight';
import { createCoastAtlas } from './CoastAtlas';

export class Ocean {
  private coast = createCoastAtlas();
  readonly material = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmplitude: { value: CONFIG.sea.amplitude },
      uSun: { value: sunDirection }, uFog: { value: new Color(0xb5cbd1) },
      uFogNear: { value: CONFIG.weather.fogNear }, uFogFar: { value: CONFIG.weather.fogFar },
      uCoast: { value: this.coast.texture }, uBounds: { value: this.coast.bounds } },
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
      uniform sampler2D uCoast;
      uniform vec4 uBounds;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz;
        float distanceToEye = length(cameraPosition - vWorld);
        float detail = 1.0 - smoothstep(80.0, 650.0, distanceToEye);
        vec2 warped = p + vec2(sin(p.y*.017),cos(p.x*.023))*7.;
        float dx = .045*cos(warped.x*.11 + warped.y*.07 + uTime*.9) + detail*.04*cos(p.x*.72-p.y*.42+uTime*1.5);
        float dz = .05*cos(warped.y*.14-warped.x*.06-uTime*.7) + detail*.035*sin(p.y*.83+p.x*.37+uTime*1.8);
        float footprint = max(length(dFdx(p)),length(dFdy(p)));
        float filtered = 1.-smoothstep(1.5,18.,footprint);
        dx *= filtered; dz *= filtered;
        vec3 normal = normalize(vec3(-dx, 1.0, -dz));
        vec3 view = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0-max(dot(normal, view), 0.0), 4.0);
        vec2 coastUV = (p-uBounds.xy)/uBounds.zw;
        float inMap = step(0.,coastUV.x)*step(coastUV.x,1.)*step(0.,coastUV.y)*step(coastUV.y,1.);
        vec2 coast = texture2D(uCoast,clamp(coastUV,0.,1.)).rg;
        float shallow = (1.-smoothstep(.04,.85,coast.r))*inMap;
        float shoal = exp(-dot((p-vec2(-340.,-560.))/vec2(180.,110.),(p-vec2(-340.,-560.))/vec2(180.,110.)));
        vec3 deep = mix(vec3(.025,.13,.16),vec3(.055,.30,.27),max(shallow*.8,shoal*.65));
        vec3 skyReflection = mix(vec3(.38,.57,.66), vec3(.66,.74,.76), pow(1.-max(view.y,0.),3.));
        vec3 water = mix(deep, skyReflection, fresnel*.72);
        float specular = pow(max(dot(normal, normalize(view + uSun)),0.0), 180.0);
        water += vec3(1.0,.89,.65)*specular*.65;
        water += .018*sin(p.x*.19+p.y*.22+uTime)*detail;
        float foamBand = (1.-smoothstep(.015,.13,coast.r))*smoothstep(.0,.018,coast.r)*(1.-coast.g)*inMap;
        float foam = foamBand*(.3+.7*pow(.5+.5*sin(p.x*.24+p.y*.33-uTime*1.6),3.));
        water = mix(water,vec3(.75,.82,.77),foam*.45);
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
  dispose(): void { this.mesh.geometry.dispose(); this.material.dispose(); this.coast.texture.dispose(); }
}
