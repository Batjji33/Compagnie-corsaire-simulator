import { Group, InstancedMesh, MeshStandardMaterial, CylinderGeometry, SphereGeometry, BoxGeometry, Object3D, Color, Mesh, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DOCKS } from './geography';
import type { Passengers } from '../passengers/Passengers';
import type { Vessel } from '../ships/Vessel';

const MAX_PEOPLE=40;
function bodyGeometry(){
  const parts=[new CylinderGeometry(.2,.23,.75,5).translate(0,.73,0),...[-1,1].flatMap(side=>[new BoxGeometry(.14,.4,.18).translate(side*.1,.2,0),new BoxGeometry(.12,.6,.14).translate(side*.28,.7,0)])];
  const normalized=parts.map(p=>{const n=p.toNonIndexed();p.dispose();return n;});const merged=mergeGeometries(normalized)!;normalized.forEach(g=>g.dispose());return merged;
}
/** One body and one head draw call per crowd, never one object/animation per passenger. */
export class PassengerView {
  readonly quay=new Group();
  private deck=new Group();
  private bodyGeometry=bodyGeometry();
  private headGeometry=new SphereGeometry(.17,6,4).translate(0,1.28,0);
  private bodyMaterial=new MeshStandardMaterial({color:0xffffff,roughness:1});
  private headMaterial=new MeshStandardMaterial({color:0xd4ae8e,roughness:1});
  private deckBodies=new InstancedMesh(this.bodyGeometry,this.bodyMaterial,MAX_PEOPLE);
  private deckHeads=new InstancedMesh(this.headGeometry,this.headMaterial,MAX_PEOPLE);
  private quayBodies=new InstancedMesh(this.bodyGeometry,this.bodyMaterial,MAX_PEOPLE);
  private quayHeads=new InstancedMesh(this.headGeometry,this.headMaterial,MAX_PEOPLE);
  private object=new Object3D();
  private gangway=new Mesh(new BoxGeometry(1,.12,1),new MeshStandardMaterial({color:0xb6b3a5,roughness:1}));
  private entry=new Vector3();private landing=new Vector3();private direction=new Vector3();private axis=new Vector3(0,0,1);
  private elapsed=1;
  constructor(private vessel:Vessel,private people:Passengers){
    const palette=[0x547d85,0xddd7c7,0xb37f5c,0x314c64,0x869578];
    for(const mesh of [this.deckBodies,this.deckHeads,this.quayBodies,this.quayHeads]){mesh.frustumCulled=false;mesh.count=0;}
    for(let i=0;i<MAX_PEOPLE;i++)for(const mesh of [this.deckBodies,this.quayBodies])mesh.setColorAt(i,new Color(palette[i%palette.length]));
    this.deck.add(this.deckBodies,this.deckHeads);this.vessel.model.root.add(this.deck);this.quay.add(this.quayBodies,this.quayHeads,this.gangway);
  }
  render(dt:number,time:number):void {
    this.elapsed+=dt;if(this.elapsed<.2)return;this.elapsed=0;
    const p=this.people,aboard=Math.min(MAX_PEOPLE,Math.ceil(p.count/5)),moving=p.phase==='boarding'||p.phase==='unloading';
    this.deckBodies.count=this.deckHeads.count=aboard;
    for(let i=0;i<aboard;i++){
      const row=Math.floor(i/6),column=i%6;
      const x=[-2.6,-1.75,-.9,.9,1.75,2.6][column],z=.2+row*1.25;
      this.object.position.set(x,4.72,z);this.object.rotation.set(0,column<3?Math.PI/2:-Math.PI/2,0);
      // Static seated/standing silhouettes, shared boat motion handles the sea.
      this.object.scale.setScalar(i%4===0?.85:1);this.object.updateMatrix();
      this.deckBodies.setMatrixAt(i,this.object.matrix);this.deckHeads.setMatrixAt(i,this.object.matrix);
    }
    const count=moving?Math.min(MAX_PEOPLE,Math.ceil((p.total-p.count)/5)):p.phase==='complete'?Math.min(MAX_PEOPLE,Math.ceil(p.total/5)):0;
    this.quayBodies.count=this.quayHeads.count=count;
    const s=this.vessel.dynamics.state,dock=DOCKS.reduce((a,b)=>Math.hypot(s.x-a.point[0],s.z-a.point[1])<Math.hypot(s.x-b.point[0],s.z-b.point[1])?a:b);
    const sin=Math.sin(s.heading),cos=Math.cos(s.heading),side=Math.sign((dock.point[0]-s.x)*cos+(dock.point[1]-s.z)*sin)||1;
    this.entry.set(s.x+cos*side*3.5-sin*3,this.vessel.root.position.y+2,s.z+sin*side*3.5+cos*3);
    this.landing.set(dock.point[0],5.05,dock.point[1]);this.direction.subVectors(this.landing,this.entry);
    this.gangway.visible=moving;this.gangway.position.copy(this.entry).add(this.landing).multiplyScalar(.5);this.gangway.scale.set(1.15,1,this.direction.length());this.gangway.quaternion.setFromUnitVectors(this.axis,this.direction.normalize());
    for(let i=0;i<count;i++){
      // Boarding and landing streams run between the side of the ship and the quay.
      const stream=moving&&i<3,travel=(time*.35+i/3)%1,progress=p.phase==='boarding'?1-travel:travel;
      if(stream)this.object.position.copy(this.entry).lerp(this.landing,progress);
      else this.object.position.set(dock.point[0]+(i%5-2)*.8,5.05,dock.point[1]+(Math.floor(i/5)-3)*.8);
      this.object.scale.setScalar(1);this.object.rotation.set(0,p.phase==='boarding'?-Math.PI/2:Math.PI/2,0);this.object.updateMatrix();
      this.quayBodies.setMatrixAt(i,this.object.matrix);this.quayHeads.setMatrixAt(i,this.object.matrix);
    }
    for(const mesh of [this.deckBodies,this.deckHeads,this.quayBodies,this.quayHeads])mesh.instanceMatrix.needsUpdate=true;
  }
  dispose():void {this.deck.removeFromParent();this.quay.removeFromParent();for(const m of [this.deckBodies,this.deckHeads,this.quayBodies,this.quayHeads])m.dispose();this.bodyGeometry.dispose();this.headGeometry.dispose();this.bodyMaterial.dispose();this.headMaterial.dispose();this.gangway.geometry.dispose();this.gangway.material.dispose();}
}
