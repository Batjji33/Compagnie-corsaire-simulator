import { BoxGeometry, CanvasTexture, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, TorusGeometry } from 'three';
import type { VesselState } from '../physics/VesselDynamics';
import { KNOT } from './parameters';

/** Lightweight, camera-attached instruments; no render target or HTML texture dependency. */
export class Cockpit {
  readonly root=new Group();
  private material=new MeshStandardMaterial({color:0x26343a,roughness:.85});
  private frameMaterial=new MeshStandardMaterial({color:0xe6e7df,roughness:.8});
  private wheel=new Mesh(new TorusGeometry(.26,.025,6,20),this.material);
  private displays:{canvas:HTMLCanvasElement;texture:CanvasTexture;text:string}[]=[];
  constructor(){
    const console=new Mesh(new BoxGeometry(3.8,.65,.8),this.material);console.position.set(0,-1.05,-1.5);this.root.add(console);
    this.wheel.position.set(0,-.65,-1);this.root.add(this.wheel);
    for(const x of [-1.85,1.85]){const frame=new Mesh(new BoxGeometry(.065,2.5,.07),this.frameMaterial);frame.position.set(x,.15,-2.25);frame.rotation.x=-.25;this.root.add(frame);}
    for(const x of [-.8,.8]){
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
      const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;this.displays.push({canvas,texture,text:''});
      const screen=new Mesh(new PlaneGeometry(.65,.3),new MeshBasicMaterial({map:texture}));screen.position.set(x,-.54,-1.5);screen.rotation.x=-.6;this.root.add(screen);
    }
  }
  updateWheel(rudder:number):void {this.wheel.rotation.z=-rudder*4;}
  updateInstruments(s:VesselState,power=1):void {
    const lines=[[(Math.hypot(s.surge,s.sway)/KNOT).toFixed(1)+' nd','Cap '+Math.round((s.heading*180/Math.PI%360+360)%360)%360+'°'],['Barre '+Math.round(s.rudder*180/Math.PI)+'°',`B ${Math.round(s.port*100*power)} / T ${Math.round(s.starboard*100*power)} %`]];
    this.displays.forEach((d,i)=>{const text=lines[i].join('|');if(d.text===text)return;d.text=text;const ctx=d.canvas.getContext('2d')!;ctx.fillStyle='#102a2c';ctx.fillRect(0,0,256,128);ctx.fillStyle='#d5f0db';ctx.font='32px sans-serif';ctx.fillText(lines[i][0],14,47);ctx.font='24px sans-serif';ctx.fillText(lines[i][1],14,95);d.texture.needsUpdate=true;});
  }
  dispose():void {this.root.removeFromParent();this.root.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();if(o.material!==this.material&&o.material!==this.frameMaterial)o.material.dispose();}});this.material.dispose();this.frameMaterial.dispose();this.displays.forEach(d=>d.texture.dispose());}
}
