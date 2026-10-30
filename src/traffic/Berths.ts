import { MALO_DINARD } from '../missions/definitions.ts';
import type { VesselState } from '../physics/VesselDynamics.ts';

export type PortId='malo'|'dinard';
export const TAXI_PORTS={
  malo:{name:'Saint-Malo',berth:{...MALO_DINARD.origin.berth},approach:{x:780,z:370},hold:{x:770,z:650}},
  dinard:{name:'Dinard',berth:{...MALO_DINARD.destination.berth},approach:{x:-945,z:1240},hold:{x:-700,z:1390}},
} as const;
export interface Berth {owner:string|null;reserved:string|null;queue:string[];playerPresent:boolean}
/** One berth per port, FIFO reservations, and physical occupancy until the stern clears. */
export class Berths {
  readonly ports:Record<PortId,Berth>={malo:{owner:null,reserved:null,queue:[],playerPresent:false},dinard:{owner:null,reserved:null,queue:[],playerPresent:false}};
  request(port:PortId,id:string):boolean {
    const b=this.ports[port];
    if(b.owner!==id&&b.reserved!==id&&!b.queue.includes(id))b.queue.push(id);
    this.promote(port);return b.owner===id||b.reserved===id;
  }
  private promote(port:PortId):void {
    const b=this.ports[port];
    if(!b.owner&&!b.reserved&&!b.playerPresent)b.reserved=b.queue.shift()??null;
  }
  occupy(port:PortId,id:string):boolean {
    const b=this.ports[port];
    if(b.owner===id)return true;
    if(b.reserved!==id||b.playerPresent&&id!=='player')return false;
    b.owner=id;b.reserved=null;return true;
  }
  release(port:PortId,id:string):void {
    const b=this.ports[port];
    if(b.owner===id)b.owner=null;if(b.reserved===id)b.reserved=null;
    b.queue=b.queue.filter(other=>other!==id);this.promote(port);
  }
  updatePlayer(player:Pick<VesselState,'x'|'z'>,request?:PortId):void {
    for(const port of ['malo','dinard'] as const){
      const b=this.ports[port],p=TAXI_PORTS[port].berth,distance=Math.hypot(player.x-p.x,player.z-p.z);
      b.playerPresent=distance<(b.playerPresent?65:45);
      if(b.playerPresent&&!b.owner)b.owner='player';
      if(!b.playerPresent&&b.owner==='player')this.release(port,'player');
      if(request!==port&&b.owner!=='player')this.release(port,'player');
      if(request===port)this.request(port,'player');
      this.promote(port);
    }
  }
  availableToPlayer(port:PortId):boolean {
    const b=this.ports[port];return (!b.owner||b.owner==='player')&&(!b.reserved||b.reserved==='player');
  }
  reset():void {for(const port of ['malo','dinard'] as const)Object.assign(this.ports[port],{owner:null,reserved:null,queue:[],playerPresent:false});}
}
