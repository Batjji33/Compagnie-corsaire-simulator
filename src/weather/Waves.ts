import { clamp } from '../ships/parameters.ts';

export const WAVE_COUNT=6;
const TAU=Math.PI*2;
const WEIGHTS=[.38,.25,.17,.1,.065,.035];
const LENGTHS=[1.8,1,.62,.39,.24,.15];
const ANGLES=[-.22,.17,-.58,.72,-1.08,1.34];
export interface WaveWeather {waves:number;wind:number;direction:number}
export interface HullFloat {heave:number;pitch:number;roll:number}

/** The same six Gerstner components feed the GPU surface, buoyancy and wake. */
export class WaveField {
  readonly components=new Float32Array(WAVE_COUNT*4); // direction X/Z, wavenumber, amplitude
  readonly phases=new Float32Array(WAVE_COUNT*2); // integrated phase, horizontal displacement / amplitude
  private frequencies=new Float64Array(WAVE_COUNT);
  private phase=new Float64Array(WAVE_COUNT);
  constructor(){for(let i=0;i<WAVE_COUNT;i++)this.phase[i]=i*2.39996;this.update(0,{waves:.6,wind:10,direction:250});}
  update(dt:number,weather:WaveWeather):void {
    const height=clamp(weather.waves,0,8),wind=clamp(weather.wind,0,70),direction=weather.direction*Math.PI/180;
    const wavelength=16+wind*1.1+height*6,chop=.65+clamp(height/5,0,1)*.65;
    for(let i=0;i<WAVE_COUNT;i++){
      const angle=direction+ANGLES[i],k=TAU/(wavelength*LENGTHS[i]);
      this.components.set([-Math.sin(angle),Math.cos(angle),k,height*.65*WEIGHTS[i]],i*4);
      this.frequencies[i]=Math.sqrt(9.81*k);
      // Integrating frequency prevents weather changes from jumping the time-dependent phase.
      this.phase[i]=(this.phase[i]+this.frequencies[i]*dt)%TAU;
      this.phases[i*2]=this.phase[i];this.phases[i*2+1]=chop;
    }
  }
  renderPhases(offset:number,out:Float32Array):void {
    for(let i=0;i<WAVE_COUNT;i++){out[i*2]=this.phase[i]+this.frequencies[i]*offset;out[i*2+1]=this.phases[i*2+1];}
  }
  /** Invert horizontal displacement: the caller supplies actual world X/Z, not the base grid. */
  height(x:number,z:number,offset=0):number {
    let qx=x,qz=z;
    for(let iteration=0;iteration<3;iteration++){
      let dx=0,dz=0;
      for(let i=0;i<WAVE_COUNT;i++){
        const j=i*4,c=this.components,phase=c[j+2]*(c[j]*qx+c[j+1]*qz)-this.phase[i]-this.frequencies[i]*offset;
        const displacement=c[j+3]*this.phases[i*2+1]*Math.cos(phase);
        dx+=c[j]*displacement;dz+=c[j+1]*displacement;
      }
      qx=x-dx;qz=z-dz;
    }
    let height=0;
    for(let i=0;i<WAVE_COUNT;i++){const j=i*4,c=this.components;height+=c[j+3]*Math.sin(c[j+2]*(c[j]*qx+c[j+1]*qz)-this.phase[i]-this.frequencies[i]*offset);}
    return height;
  }
  hull(x:number,z:number,heading:number,length:number,beam:number,offset:number,out:HullFloat):HullFloat {
    const sin=Math.sin(heading),cos=Math.cos(heading),fore=length*.4,side=beam*.4;
    const bow=this.height(x+sin*fore,z-cos*fore,offset),stern=this.height(x-sin*fore,z+cos*fore,offset);
    const port=this.height(x-cos*side,z-sin*side,offset),starboard=this.height(x+cos*side,z+sin*side,offset);
    out.heave=(bow+stern+port+starboard+this.height(x,z,offset)*2)/6;
    out.pitch=Math.atan2(bow-stern,fore*2);out.roll=Math.atan2(starboard-port,side*2);
    return out;
  }
}

/** Shared GLSL; phase, amplitude, direction and horizontal inversion mirror WaveField. */
export const WAVE_GLSL=`
  uniform vec4 uWaves[${WAVE_COUNT}];
  uniform vec2 uWavePhase[${WAVE_COUNT}];
  vec3 gerstner(vec2 base, float lod, out vec3 normal, out float compression) {
    vec3 p=vec3(base.x,0.,base.y),tx=vec3(1.,0.,0.),tz=vec3(0.,0.,1.);
    compression=0.;
    for(int i=0;i<${WAVE_COUNT};i++) {
      vec4 w=uWaves[i];float phase=w.z*dot(w.xy,base)-uWavePhase[i].x;
      float a=w.w*(1.-smoothstep(.3,1.,lod*w.z*12.));
      float s=sin(phase),c=cos(phase),h=a*uWavePhase[i].y,ak=a*w.z,hk=h*w.z;
      p+=vec3(h*w.x*c,a*s,h*w.y*c);
      tx+=vec3(-hk*w.x*w.x*s,ak*w.x*c,-hk*w.x*w.y*s);
      tz+=vec3(-hk*w.x*w.y*s,ak*w.y*c,-hk*w.y*w.y*s);
      compression+=hk*s*(i<4?1.:.2);
    }
    normal=normalize(cross(tz,tx));return p;
  }
  float waterHeight(vec2 world) {
    vec2 q=world;
    for(int iteration=0;iteration<3;iteration++) {
      vec2 displacement=vec2(0.);
      for(int i=0;i<${WAVE_COUNT};i++){vec4 w=uWaves[i];displacement+=w.xy*w.w*uWavePhase[i].y*cos(w.z*dot(w.xy,q)-uWavePhase[i].x);}
      q=world-displacement;
    }
    float y=0.;
    for(int i=0;i<${WAVE_COUNT};i++){vec4 w=uWaves[i];y+=w.w*sin(w.z*dot(w.xy,q)-uWavePhase[i].x);}
    return y;
  }
`;
