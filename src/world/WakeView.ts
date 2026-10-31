import { BufferGeometry, BufferAttribute, DynamicDrawUsage, Mesh, ShaderMaterial, DoubleSide } from 'three';
import { WakeTrail, WAKE_CAPACITY, WAKE_LIFETIME } from '../ships/WakeTrail';
import { WAVE_GLSL } from '../weather/Waves';
import type { Ocean } from './Ocean';
import type { Marine } from '../weather/Marine';

/** Three foam ribbons sharing a bounded history and one draw call. */
export class WakeView {
  readonly trail=new WakeTrail();
  private geometry=new BufferGeometry();
  private positions=new Float32Array(WAKE_CAPACITY*3*3*3);
  private foam=new Float32Array(WAKE_CAPACITY*3*3*3);
  readonly material:ShaderMaterial;
  readonly mesh:Mesh<BufferGeometry,ShaderMaterial>;
  constructor(ocean:Ocean){
    const uniforms=ocean.material.uniforms;
    this.material=new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
      uniforms:{uWaves:uniforms.uWaves,uWavePhase:uniforms.uWavePhase,uTide:uniforms.uTide,uTime:uniforms.uTime,uLight:uniforms.uLight,uFoamNoise:uniforms.uFoamNoise,uFog:uniforms.uFog,uFogNear:uniforms.uFogNear,uFogFar:uniforms.uFogFar},
      vertexShader:`${WAVE_GLSL}
        uniform float uTide;
        attribute vec3 aFoam;
        varying vec3 vFoam,vWorld;
        void main(){vFoam=aFoam;float ridge=(1.-abs(aFoam.x))*aFoam.y*.23;vWorld=vec3(position.x,uTide+waterHeight(position.xz)+.07+ridge,position.z);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
      fragmentShader:`
        uniform float uTime,uLight,uFogNear,uFogFar;
        uniform vec3 uFog;
        uniform sampler2D uFoamNoise;
        varying vec3 vFoam,vWorld;
        void main(){
          float edge=1.-smoothstep(.35,1.,abs(vFoam.x));
          vec2 noise=texture2D(uFoamNoise,vWorld.xz*.045+vec2(uTime*.004,-uTime*.003)).rg;
          float bubbles=smoothstep(.22,.7,noise.r*.6+noise.g*.4);
          float alpha=vFoam.y*edge*(.38+bubbles*.62);
          if(alpha<.015)discard;
          vec3 color=vec3(.84,.93,.92)*(.18+.82*uLight);
          color=mix(color,uFog,smoothstep(uFogNear,uFogFar,length(cameraPosition-vWorld)));
          gl_FragColor=vec4(color,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.geometry.setAttribute('position',new BufferAttribute(this.positions,3).setUsage(DynamicDrawUsage));
    this.geometry.setAttribute('aFoam',new BufferAttribute(this.foam,3).setUsage(DynamicDrawUsage));
    const indices:number[]=[];
    for(let row=0;row<WAKE_CAPACITY-1;row++)for(let band=0;band<3;band++)for(let side=0;side<2;side++){
      const a=band*WAKE_CAPACITY*3+row*3+side,b=a+3;indices.push(a,b,a+1,a+1,b,b+1);
    }
    this.geometry.setIndex(indices);this.geometry.setDrawRange(0,0);
    this.mesh=new Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=1;this.mesh.name='Sillage persistant du Corsaire';
  }
  render(time:number,marine:Marine):void {
    const trail=this.trail;this.mesh.visible=trail.count>1;if(!this.mesh.visible)return;
    for(let row=0;row<trail.count;row++){
      const s=trail.at(row),age=Math.max(0,time-s.time),fade=Math.max(0,1-age/WAKE_LIFETIME),speed=Math.min(1,s.speed/10);
      const catamaran=trail.parameters.catamaran===true;
      const width=catamaran?.9+s.speed*.12+age*.08:2+s.speed*.35+age*.12,spread=(catamaran?2.8:3)+s.speed*age*.34;
      for(let band=0;band<3;band++){
        const side=band===0?0:band===1?-1:1,offset=side*spread,half=band===0?width:(catamaran?.8:.45)+speed*.8+age*.025;
        const strength=band===0?(catamaran?.035:.045+speed*.64+s.power*.1):(catamaran?.12+speed*.5+s.power*.1:speed*speed*.56);
        for(let edge=0;edge<3;edge++){
          const v=(band*WAKE_CAPACITY*3+row*3+edge)*3,lateral=offset+(edge-1)*half;
          this.positions[v]=s.x-s.dz*lateral+marine.currentX*age*.35;this.positions[v+1]=0;this.positions[v+2]=s.z+s.dx*lateral+marine.currentZ*age*.35;
          this.foam[v]=edge-1;this.foam[v+1]=strength*fade*fade;this.foam[v+2]=age;
        }
      }
    }
    this.geometry.getAttribute('position').needsUpdate=true;this.geometry.getAttribute('aFoam').needsUpdate=true;
    this.geometry.setDrawRange(0,(trail.count-1)*36);
  }
  dispose():void {this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
