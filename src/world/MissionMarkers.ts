import { Group, Mesh, MeshBasicMaterial, RingGeometry, CylinderGeometry } from 'three';
import type { MissionDefinition } from '../missions/definitions';
import { dockingRules } from '../missions/docking.ts';

/** A few reusable meshes; no labels, textures or per-frame geometry allocations. */
export class MissionMarkers {
  readonly root=new Group();
  private material=new MeshBasicMaterial({color:0xedc076,transparent:true,opacity:.8,depthWrite:false});
  private ringGeometry=new RingGeometry(10,12,40);
  private poleGeometry=new CylinderGeometry(1,1,22,8);
  private berth=new Mesh(this.ringGeometry,this.material);
  private pole=new Mesh(this.poleGeometry,this.material);
  private suggestion=new Mesh(this.ringGeometry,new MeshBasicMaterial({color:0x83c6b7,transparent:true,opacity:.65,depthWrite:false}));
  constructor(){this.berth.rotation.x=this.suggestion.rotation.x=-Math.PI/2;this.suggestion.scale.setScalar(3);this.root.add(this.berth,this.pole,this.suggestion);this.root.visible=false;}
  setMission(def:MissionDefinition|null):void {
    this.root.visible=!!def;if(!def)return;
    this.berth.position.set(def.destination.berth.x,.6,def.destination.berth.z);
    this.berth.scale.setScalar(dockingRules(def).distance/this.ringGeometry.parameters.outerRadius);
    // Pole stands beside the berth so the boat can occupy the ring without intersecting it.
    this.pole.position.set(def.destination.berth.x-dockingRules(def).distance-2,11,def.destination.berth.z);
  }
  update(tide:number,target:{x:number;z:number;radius?:number}|undefined):void {
    this.root.position.y=tide;this.suggestion.visible=!!target;
    if(target){this.suggestion.position.set(target.x,.7,target.z);this.suggestion.scale.setScalar((target.radius??36)/this.ringGeometry.parameters.outerRadius);}
  }
  dispose():void {this.root.removeFromParent();this.ringGeometry.dispose();this.poleGeometry.dispose();this.material.dispose();(this.suggestion.material as MeshBasicMaterial).dispose();}
}
