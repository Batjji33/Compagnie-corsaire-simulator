import { Group, InstancedMesh, MeshStandardMaterial, SphereGeometry, Object3D, Color, Mesh, BoxGeometry, Vector3 } from 'three';
import type { TrafficAgent } from '../traffic/Traffic';
import { TAXI_UNLOADING_SECONDS, TAXI_BOARDING_SECONDS } from '../traffic/WaterTaxis';
import { DOCKS } from './geography';
import { passengerBodyGeometry } from './PassengerView';

const MAX_PEOPLE=40;
/** Deck silhouettes and a small quay stream, using the taxi's actual passenger count. */
export class TaxiPassengerView {
  readonly quay=new Group();
  readonly deck=new Group();
  private bodyGeometry=passengerBodyGeometry();
  private headGeometry=new SphereGeometry(.17,6,4).translate(0,1.28,0);
  private bodyMaterial=new MeshStandardMaterial({color:0xffffff,roughness:1});
  private headMaterial=new MeshStandardMaterial({color:0xd4ae8e,roughness:1});
  private deckBodies=new InstancedMesh(this.bodyGeometry,this.bodyMaterial,MAX_PEOPLE);
  private deckHeads=new InstancedMesh(this.headGeometry,this.headMaterial,MAX_PEOPLE);
  private quayBodies=new InstancedMesh(this.bodyGeometry,this.bodyMaterial,3);
  private quayHeads=new InstancedMesh(this.headGeometry,this.headMaterial,3);
  private gangway=new Mesh(new BoxGeometry(1,.12,1),new MeshStandardMaterial({color:0xb6b3a5,roughness:1}));
  private object=new Object3D();
  private entry=new Vector3();private landing=new Vector3();private direction=new Vector3();private axis=new Vector3(0,0,1);
  private lastUpdate=-Infinity;
  constructor(private agent:TrafficAgent,private boat:Group){
    const palette=[0x547d85,0xddd7c7,0xb37f5c,0x314c64,0x869578];
    for(const mesh of [this.deckBodies,this.deckHeads,this.quayBodies,this.quayHeads]){
      mesh.frustumCulled=false;mesh.count=0;
      for(let i=0;i<mesh.instanceMatrix.count;i++)mesh.setColorAt(i,new Color(palette[i%palette.length]));
    }
    this.deck.add(this.deckBodies,this.deckHeads);this.quay.add(this.quayBodies,this.quayHeads,this.gangway);
  }
  render(time:number,visible:boolean):void {
    const s=this.agent.taxi!,unloading=s.elapsed<TAXI_UNLOADING_SECONDS;
    const moving=s.phase==='stopover'&&s.elapsed<TAXI_UNLOADING_SECONDS+TAXI_BOARDING_SECONDS;
    this.deck.visible=visible;this.quay.visible=visible&&moving;
    if(!visible||time>=this.lastUpdate&&time-this.lastUpdate<.2)return;
    this.lastUpdate=time;
    const aboard=Math.min(MAX_PEOPLE,Math.ceil(s.passengers/5));
    this.deckBodies.count=this.deckHeads.count=aboard;
    for(let i=0;i<aboard;i++){
      const column=i%6;
      this.object.position.set([-2.6,-1.75,-.9,.9,1.75,2.6][column],4.72,.2+Math.floor(i/6)*1.25);
      this.object.rotation.set(0,column<3?Math.PI/2:-Math.PI/2,0);this.object.scale.setScalar(i%4===0?.85:1);this.object.updateMatrix();
      this.deckBodies.setMatrixAt(i,this.object.matrix);this.deckHeads.setMatrixAt(i,this.object.matrix);
    }
    if(moving){
      const dock=DOCKS.find(d=>d.id===s.destination)!,a=this.agent,sin=Math.sin(a.heading),cos=Math.cos(a.heading);
      const side=Math.sign((dock.point[0]-a.x)*cos+(dock.point[1]-a.z)*sin)||1;
      this.boat.updateMatrixWorld(true);
      this.entry.set(side*(a.route.beam/2-.25),2,3);this.boat.localToWorld(this.entry);
      this.landing.set(dock.point[0],5.05,dock.point[1]);this.direction.subVectors(this.landing,this.entry);
      this.gangway.position.copy(this.entry).add(this.landing).multiplyScalar(.5);this.gangway.scale.set(1.15,1,this.direction.length());
      this.gangway.quaternion.setFromUnitVectors(this.axis,this.direction.normalize());
      for(let i=0;i<3;i++){
        const travel=(s.elapsed*.35+i/3)%1;
        this.object.position.copy(this.entry).lerp(this.landing,unloading?travel:1-travel);
        this.object.rotation.set(0,unloading?Math.PI/2:-Math.PI/2,0);this.object.scale.setScalar(1);this.object.updateMatrix();
        this.quayBodies.setMatrixAt(i,this.object.matrix);this.quayHeads.setMatrixAt(i,this.object.matrix);
      }
      this.quayBodies.count=this.quayHeads.count=3;
    }
    for(const mesh of [this.deckBodies,this.deckHeads,this.quayBodies,this.quayHeads])mesh.instanceMatrix.needsUpdate=true;
  }
  dispose():void {
    this.deck.removeFromParent();this.quay.removeFromParent();
    for(const mesh of [this.deckBodies,this.deckHeads,this.quayBodies,this.quayHeads])mesh.dispose();
    this.bodyGeometry.dispose();this.headGeometry.dispose();this.bodyMaterial.dispose();this.headMaterial.dispose();this.gangway.geometry.dispose();this.gangway.material.dispose();
  }
}
