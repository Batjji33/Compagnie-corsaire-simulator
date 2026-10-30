import { Color, Mesh, PlaneGeometry, ShaderMaterial, Float32BufferAttribute, Vector4, DoubleSide } from 'three';
import { CONFIG } from '../config';
import type { Quality } from '../config';
import { sunDirection } from '../weather/daylight';
import { WaveField, WAVE_GLSL, WAVE_COUNT } from '../weather/Waves';
import type { VesselState } from '../physics/VesselDynamics';
import { createCoastAtlas } from './CoastAtlas';
import { createFoamTexture } from './FoamTexture';

export class Ocean {
  private coast=createCoastAtlas();
  private foamTexture=createFoamTexture();
  readonly phases=new Float32Array(WAVE_COUNT*2);
  readonly material:ShaderMaterial;
  readonly mesh:Mesh<PlaneGeometry,ShaderMaterial>;
  constructor(quality:Quality,water:WaveField){
    this.material=new ShaderMaterial({side:DoubleSide,
      uniforms:{uLight:{value:1},uTime:{value:0},uHeight:{value:.6},uTide:{value:0},uWaves:{value:water.components},uWavePhase:{value:this.phases},
        uSun:{value:sunDirection},uFog:{value:new Color(0xb5cbd1)},uFogNear:{value:CONFIG.weather.fogNear},uFogFar:{value:CONFIG.weather.fogFar},
        uCoast:{value:this.coast.texture},uFoamNoise:{value:this.foamTexture},uBounds:{value:this.coast.bounds},uShip:{value:new Vector4()},uPower:{value:0}},
      vertexShader:`
        ${WAVE_GLSL}
        uniform float uTide;
        attribute float aLod;
        varying vec3 vWorld;
        varying vec3 vNormal;
        varying vec2 vBase;
        varying float vElevation;
        void main(){
          vec2 base=(modelMatrix*vec4(position,1.)).xz;vBase=base;
          float compression;vec3 p=gerstner(base,aLod,vNormal,compression);vElevation=p.y;p.y+=uTide;
          vWorld=p;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
        }`,
      fragmentShader:`
        uniform float uTime,uLight,uHeight,uFogNear,uFogFar,uPower;
        uniform vec3 uSun,uFog;
        uniform sampler2D uCoast,uFoamNoise;
        uniform vec4 uBounds,uShip;
        uniform vec4 uWaves[${WAVE_COUNT}];
        uniform vec2 uWavePhase[${WAVE_COUNT}];
        varying vec3 vWorld,vNormal;
        varying vec2 vBase;
        varying float vElevation;
        void main(){
          vec2 p=vWorld.xz;float distanceToEye=length(cameraPosition-vWorld);
          float detail=1.-smoothstep(100.,650.,distanceToEye);
          float footprint=max(length(dFdx(p)),length(dFdy(p)));
          float filtered=1.-smoothstep(.6,6.,footprint);
          vec2 ripple=vec2(cos(p.x*.74-p.y*.43+uTime*2.1),sin(p.y*.87+p.x*.38-uTime*1.7));
          vec3 normal=normalize(vNormal+vec3(ripple.x,0.,ripple.y)*(.008+min(uHeight,4.)*.007)*detail*filtered);
          vec3 view=normalize(cameraPosition-vWorld);
          float fresnel=pow(1.-clamp(dot(normal,view),0.,1.),4.);
          vec2 uv=(p-uBounds.xy)/uBounds.zw;
          float inMap=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
          vec2 coast=texture2D(uCoast,clamp(uv,0.,1.)).rg;
          float shallow=(1.-smoothstep(.04,.85,coast.r))*inMap;
          float shoal=exp(-dot((p-vec2(-340.,-560.))/vec2(180.,110.),(p-vec2(-340.,-560.))/vec2(180.,110.)));
          vec3 deep=mix(vec3(.018,.095,.13),vec3(.045,.29,.25),max(shallow*.8,shoal*.65));
          vec3 reflection=mix(vec3(.31,.48,.59),vec3(.66,.76,.81),pow(1.-max(view.y,0.),3.));
          float diffuse=.65+.35*max(dot(normal,normalize(uSun)),0.);
          vec3 water=mix(deep*diffuse,reflection,fresnel*.78);
          water+=vec3(.012,.035,.035)*clamp(vElevation/max(.15,uHeight),-.7,.8);
          float specular=pow(max(dot(normal,normalize(view+uSun)),0.),mix(180.,70.,clamp(uHeight/5.,0.,1.)));
          water+=vec3(1.,.9,.72)*specular*.7;
          vec2 foamNoise=texture2D(uFoamNoise,p*.035+vec2(uTime*.006,-uTime*.004)).rg;
          float crest=0.;
          for(int i=0;i<4;i++){vec4 w=uWaves[i];crest+=w.w*w.z*uWavePhase[i].y*sin(w.z*dot(w.xy,vBase)-uWavePhase[i].x);}
          float whitecaps=smoothstep(.06,.2,crest)*smoothstep(.7,3.5,uHeight)*smoothstep(.3,.7,foamNoise.x)*.75;
          float shore=(1.-smoothstep(.015,.13,coast.r))*smoothstep(0.,.018,coast.r)*(1.-coast.g)*inMap;
          float shoreFoam=shore*(.3+.7*pow(.5+.5*sin(p.x*.24+p.y*.33-uTime*1.6),3.));
          vec2 forward=vec2(sin(uShip.z),-cos(uShip.z)),right=vec2(-forward.y,forward.x),delta=p-uShip.xy;
          float signSpeed=uShip.w<-.15?-1.:1.,along=dot(delta,forward)*signSpeed,side=dot(delta,right);
          float speed=abs(uShip.w),washLength=3.+speed*1.25+uPower*4.;
          float aft=(-along-12.4)/washLength;
          float wash=step(0.,aft)*(1.-smoothstep(.2,1.,aft))*exp(-side*side/(3.+aft*8.));
          float washPower=clamp(speed*.08+uPower*.55,0.,.9);
          float churn=smoothstep(.28,.72,foamNoise.x*.45+foamNoise.y*.55);
          float bowDistance=(along-11.)/3.,bowSide=(abs(side)-2.5)/1.2;
          float bow=exp(-bowDistance*bowDistance-bowSide*bowSide)*clamp((speed-.5)/8.,0.,.65);
          float foam=clamp(whitecaps+shoreFoam*.45+wash*washPower*churn+bow*.65,0.,.9);
          water=mix(water,vec3(.86,.92,.9),foam);water*=.18+.82*uLight;
          water=mix(water,uFog,smoothstep(uFogNear,uFogFar,distanceToEye));gl_FragColor=vec4(water,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh=new Mesh(this.geometry(quality),this.material);this.mesh.frustumCulled=false;this.mesh.name='Mer Gerstner à maillage adaptatif';
  }
  private geometry(quality:Quality):PlaneGeometry {
    const geometry=new PlaneGeometry(2,2,CONFIG.quality[quality].segments,CONFIG.quality[quality].segments);geometry.rotateX(-Math.PI/2);
    const p=geometry.getAttribute('position'),lod=new Float32Array(p.count);
    const spread=(v:number)=>Math.sign(v)*(Math.abs(v)<=.625?Math.abs(v)/.625*120:120+Math.pow((Math.abs(v)-.625)/.375,3.2)*(CONFIG.sea.size/2-120));
    for(let i=0;i<p.count;i++){
      const x=spread(p.getX(i)),z=spread(p.getZ(i));p.setXYZ(i,x,0,z);lod[i]=Math.max(0,(Math.max(Math.abs(x),Math.abs(z))-150)/500);
    }
    geometry.setAttribute('aLod',new Float32BufferAttribute(lod,1));geometry.computeBoundingSphere();return geometry;
  }
  setQuality(quality:Quality):void {const old=this.mesh.geometry;this.mesh.geometry=this.geometry(quality);old.dispose();}
  update(time:number,center:{x:number;z:number},water:WaveField,offset:number,tide:number,height:number,ship:VesselState):void {
    water.renderPhases(offset,this.phases);this.material.uniforms.uTime.value=time;this.material.uniforms.uTide.value=tide;this.material.uniforms.uHeight.value=height;
    this.material.uniforms.uShip.value.set(ship.x,ship.z,ship.heading,ship.surge);
    this.material.uniforms.uPower.value=(Math.abs(ship.port)+Math.abs(ship.starboard))/2;
    this.mesh.position.set(center.x,0,center.z);
  }
  dispose():void {this.mesh.geometry.dispose();this.material.dispose();this.coast.texture.dispose();this.foamTexture.dispose();}
}
