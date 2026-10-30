import { Group, Mesh, MeshStandardMaterial, BoxGeometry, CylinderGeometry, ConeGeometry, BufferGeometry, Float32BufferAttribute, DoubleSide } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loft } from '../ships/ShipGeometry';
import type { Traffic, TrafficAgent } from '../traffic/Traffic';

export class TrafficView {
  readonly root=new Group();
  private boats:{root:Group;details:Group;agent:TrafficAgent}[]=[];
  private geometries=new Set<BufferGeometry>();
  private materials:MeshStandardMaterial[]=[];
  constructor(traffic:Traffic){
    const colors=[0xe9e6da,0x588d8b,0x2d4856,0xe4a16b];
    this.materials=colors.map(color=>new MeshStandardMaterial({color,roughness:.8,side:DoubleSide}));
    for(const [i,a] of traffic.agents.entries()){
      const root=new Group(),details=new Group(),l=a.route.length,b=a.route.beam;
      const hull=loft([{z:-l/2,width:.15,bottom:-.7,top:.8},{z:-l*.3,width:b,bottom:-1,top:1},{z:l/2,width:b*.85,bottom:-.7,top:.8}]);
      this.geometries.add(hull);root.add(new Mesh(hull,this.materials[i%4]));
      const parts:BufferGeometry[]=[];
      const box=(x:number,y:number,z:number,w:number,h:number,d:number)=>parts.push(new BoxGeometry(w,h,d).translate(x,y,z));
      box(0,1.1,0,b*.8,.3,l*.7);
      if(a.route.kind==='sail'){
        parts.push(new CylinderGeometry(.07,.07,l*.95,6).translate(0,l*.48+1,0));
        const sail=new BufferGeometry();sail.setAttribute('position',new Float32BufferAttribute([0,1,0,0,l*.9,0,0,1,l*.42],3));sail.computeVertexNormals();parts.push(sail);
        box(0,1.4,l*.18,b*.6,.6,l*.28);
      }else{
        const ferry=a.route.kind==='ferry';box(0,ferry?2.2:1.7,-l*.05,b*.72,ferry?2:.9,l*.45);
        box(0,ferry?3.6:2.3,-l*.12,b*.62,.3,l*.5);
        if(ferry)box(0,4.3,-l*.23,b*.5,1.2,l*.2);
      }
      // All superstructure is one mesh; only hull remains on distant vessels.
      const normalized=parts.map(p=>{const n=p.index?p.toNonIndexed():p.clone();p.dispose();n.deleteAttribute('uv');return n;});
      const merged=mergeGeometries(normalized)!;normalized.forEach(g=>g.dispose());this.geometries.add(merged);
      details.add(new Mesh(merged,this.materials[0]));
      const cabin=new BoxGeometry(b*.74,.45,l*.28).translate(0,a.route.kind==='ferry'?2.6:1.9,-l*.1);this.geometries.add(cabin);
      if(a.route.kind!=='sail')details.add(new Mesh(cabin,this.materials[2]));
      if(a.route.kind==='launch'){const cap=new ConeGeometry(.25,1,6).translate(0,3,0);this.geometries.add(cap);details.add(new Mesh(cap,this.materials[3]));}
      root.add(details);root.name=a.route.name;this.root.add(root);this.boats.push({root,details,agent:a});
    }
  }
  render(tide:number,time:number,camera:{x:number;z:number}):void {
    for(const b of this.boats){const a=b.agent;b.root.visible=a.active;if(!a.active)continue;
      b.root.position.set(a.x,tide+Math.sin(time*.8+a.x*.02)*.06,a.z);b.root.rotation.y=-a.heading;
      b.details.visible=Math.hypot(a.x-camera.x,a.z-camera.z)<1100;
    }
  }
  dispose():void {this.root.removeFromParent();this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());}
}
