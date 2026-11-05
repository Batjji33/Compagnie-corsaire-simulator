import type {Quality} from '../config';
/** Conservative adaptation from rendered frames; never claims a device FPS guarantee. */
export class ChannelQuality {
 mode:'auto'|Quality='auto';quality:Quality;fps=0;private since=0;private frames=0;private changed=0;
 constructor(cores=8){this.quality=cores<=4?'low':'medium';}
 choose(mode:'auto'|Quality):boolean{this.mode=mode;if(mode==='auto')return false;const changed=mode!==this.quality;this.quality=mode;return changed;}
 observe(now:number):boolean{
  if(!this.since){this.since=now;this.changed=now;return false;}this.frames++;
  if(now-this.since<4000)return false;this.fps=this.frames*1000/(now-this.since);this.frames=0;this.since=now;
  if(this.mode!=='auto'||this.fps>=26||now-this.changed<10000)return false;
  const next=this.quality==='high'?'medium':'low';if(next===this.quality)return false;this.quality=next;this.changed=now;return true;
 }
}
