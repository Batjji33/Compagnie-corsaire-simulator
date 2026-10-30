import { clamp } from '../ships/parameters.ts';
import { DOCKS } from '../world/geography.ts';
import type { VesselState } from '../physics/VesselDynamics.ts';
import type { Marine } from '../weather/Marine.ts';
export interface AudioSettings {enabled:boolean;master:number;engines:number;waves:number;wind:number;port:number;alerts:number;voice:number}
export const defaultAudio=():AudioSettings=>({enabled:false,master:.55,engines:.45,waves:.4,wind:.3,port:.25,alerts:.7,voice:.9});
export function readAudio(value:unknown):AudioSettings {
  const result=defaultAudio();if(!value||typeof value!=='object')return result;const v=value as Record<string,unknown>;
  if(typeof v.enabled==='boolean')result.enabled=v.enabled;
  for(const key of ['master','engines','waves','wind','port','alerts','voice'] as const)if(typeof v[key]==='number'&&Number.isFinite(v[key]))result[key]=clamp(v[key],0,1);
  return result;
}
export function audioLevels(s:VesselState,waves:number,wind:number):{engine:number;wave:number;wind:number;port:number} {
  const distance=Math.min(...DOCKS.map(d=>Math.hypot(d.point[0]-s.x,d.point[1]-s.z)));
  return {engine:.08+.6*(Math.abs(s.port)+Math.abs(s.starboard))/2,wave:clamp(.12+waves*.25,0,1),wind:clamp(wind/32,0,1),port:clamp(1-distance/500,0,1)};
}
/** Original procedural synthesis: no downloaded audio, tracking or external service. */
export class MaritimeAudio {
  settings=defaultAudio();voiceStatus='Lecture française : texte disponible.';
  private context:AudioContext|undefined;
  private master:GainNode|undefined;
  private buses:Partial<Record<'engines'|'waves'|'wind'|'port',GainNode>>={};
  private engines:OscillatorNode[]=[];
  private sources:AudioScheduledSourceNode[]=[];
  private paused=true;private alarmTime=-10;private gullTime=-20;
  private speech:SpeechSynthesisUtterance|undefined;
  private voiceTimer:ReturnType<typeof setTimeout>|undefined;
  private disposed=false;
  unlock():void {
    if(this.disposed||!this.settings.enabled)return;
    try{
      if(!this.context){
        const c=this.context=new AudioContext();this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
        for(const name of ['engines','waves','wind','port'] as const){const bus=c.createGain();bus.gain.value=0;bus.connect(this.master);this.buses[name]=bus;}
        for(const frequency of [38,42]){const osc=c.createOscillator(),filter=c.createBiquadFilter();osc.type='sawtooth';osc.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=220;osc.connect(filter);filter.connect(this.buses.engines!);osc.start();this.sources.push(osc);this.engines.push(osc);}
        const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);let seed=17;
        for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
        for(const [name,frequency,type] of [['waves',480,'lowpass'],['wind',1100,'bandpass'],['port',150,'lowpass']] as const){
          const source=c.createBufferSource(),filter=c.createBiquadFilter();source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.6;source.connect(filter);filter.connect(this.buses[name]!);source.start();this.sources.push(source);
        }
      }
      if(!this.paused&&this.context.state==='suspended')void this.context.resume().catch(()=>{});
    }catch{this.voiceStatus='Audio indisponible ; textes et alertes visuelles conservés.';}
  }
  setPaused(paused:boolean):void {
    this.paused=paused;
    if(paused){this.stopSpeech();if(this.context?.state==='running')void this.context.suspend().catch(()=>{});}
    else this.unlock();
  }
  apply(settings:AudioSettings):void {
    this.settings=readAudio(settings);
    if(!this.settings.enabled||this.settings.master===0||this.settings.voice===0)this.stopSpeech();
    if(this.master&&this.context)this.master.gain.setTargetAtTime(this.settings.enabled&&!this.paused?this.settings.master:0,this.context.currentTime,.06);
    if(!this.settings.enabled&&this.context?.state==='running')void this.context.suspend().catch(()=>{});
  }
  update(s:VesselState,m:Marine,risk:boolean):void {
    const c=this.context;if(!c||this.paused||!this.master)return;
    const levels=audioLevels(s,m.waves,m.wind),settings=this.settings;
    this.master.gain.setTargetAtTime(settings.enabled?settings.master:0,c.currentTime,.1);
    for(const [key,level] of [['engines',levels.engine*.035],['waves',levels.wave*.13],['wind',levels.wind*.08],['port',levels.port*.06]] as const)this.buses[key]?.gain.setTargetAtTime(level*settings[key],c.currentTime,.1);
    this.engines.forEach((osc,i)=>osc.frequency.setTargetAtTime(36+i*4+Math.abs(i?s.starboard:s.port)*95,c.currentTime,.15));
    if(settings.enabled&&m.sound&&(risk||!!m.warning)&&m.time-this.alarmTime>4){this.alarmTime=m.time;this.horn();}
    if(settings.enabled&&levels.port>.4&&m.time-this.gullTime>14){this.gullTime=m.time;this.tone(1300,800,.6,settings.port*.018);}
  }
  private tone(start:number,end:number,seconds:number,gain:number):void {
    const c=this.context;if(!c||!this.master||c.state!=='running'||gain<=0)return;
    const osc=c.createOscillator(),volume=c.createGain();osc.frequency.setValueAtTime(start,c.currentTime);osc.frequency.exponentialRampToValueAtTime(end,c.currentTime+seconds);
    volume.gain.setValueAtTime(.001,c.currentTime);volume.gain.linearRampToValueAtTime(gain,c.currentTime+.05);volume.gain.exponentialRampToValueAtTime(.001,c.currentTime+seconds);
    osc.connect(volume);volume.connect(this.master);osc.start();osc.stop(c.currentTime+seconds+.01);osc.onended=()=>{osc.disconnect();volume.disconnect();};
  }
  horn():void {
    if(!this.settings.enabled||this.paused)return;
    if(this.settings.alerts>0)this.stopSpeech();
    this.tone(130,130,.45,this.settings.alerts*.07);this.tone(165,165,.45,this.settings.alerts*.045);
  }
  frenchVoice():SpeechSynthesisVoice|undefined {
    try{
      if(typeof speechSynthesis==='undefined')return;
      return speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('fr')).sort((a,b)=>Number(b.localService)-Number(a.localService))[0];
    }catch{return;}
  }
  speak(text:string,allowPaused=false):boolean {
    this.stopSpeech();
    if(!this.settings.enabled||this.settings.master===0||this.settings.voice===0){this.voiceStatus='Annonces silencieuses : le texte reste disponible.';return false;}
    if(this.paused&&!allowPaused){this.voiceStatus='Reprenez la navigation pour écouter cette annonce.';return false;}
    const voice=this.frenchVoice();
    if(!voice||typeof SpeechSynthesisUtterance==='undefined'){this.voiceStatus='Voix française indisponible. Lisez le texte ou activez une voix française dans votre appareil.';return false;}
    try{
      const speech=this.speech=new SpeechSynthesisUtterance(text);speech.lang='fr-FR';speech.voice=voice;speech.volume=this.settings.voice*this.settings.master;speech.rate=.95;
      this.voiceStatus='Préparation de la lecture…';
      speech.onstart=()=>{clearTimeout(this.voiceTimer);this.voiceStatus='Lecture en cours.';};
      speech.onend=()=>{clearTimeout(this.voiceTimer);this.speech=undefined;this.voiceStatus='Lecture terminée.';};
      speech.onerror=()=>{clearTimeout(this.voiceTimer);this.speech=undefined;this.voiceStatus='Lecture vocale indisponible : le commentaire reste affiché.';};
      speechSynthesis.speak(speech);
      this.voiceTimer=setTimeout(()=>{if(this.speech===speech){this.stopSpeech();this.voiceStatus='Le navigateur bloque la voix. Utilisez le bouton Lire ; le texte reste disponible.';}},4500);
      return true;
    }catch{this.voiceStatus='Lecture vocale indisponible : le commentaire reste affiché.';return false;}
  }
  stopSpeech():void {
    clearTimeout(this.voiceTimer);
    if(this.speech){this.speech.onend=this.speech.onerror=this.speech.onstart=null;try{if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();}catch{/* Text is always available. */}this.speech=undefined;this.voiceStatus='Lecture arrêtée.';}
  }
  dispose():void {this.disposed=true;this.stopSpeech();for(const source of this.sources){try{source.stop();source.disconnect();}catch{/* Already stopped. */}}void this.context?.close().catch(()=>{});}
}
