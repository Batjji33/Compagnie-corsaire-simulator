import { Group, Mesh, MeshStandardMaterial, BoxGeometry, CylinderGeometry, ConeGeometry, BufferGeometry, Float32BufferAttribute, DoubleSide, Color, CanvasTexture, PlaneGeometry, SRGBColorSpace } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loft } from '../ships/ShipGeometry';
import type { Traffic, TrafficAgent } from '../traffic/Traffic';
import type { WaveField } from '../weather/Waves';
import { CorsaireModel } from '../ships/CorsaireModel';
import { TAXI_LIVERIES } from '../traffic/WaterTaxis';

export class TrafficView {
  readonly root=new Group();
  private boats:{root:Group;details:Group;agent:TrafficAgent}[]=[];
  private geometries=new Set<BufferGeometry>();
  private material=new MeshStandardMaterial({vertexColors:true,roughness:.8,side:DoubleSide});
  private flotation={heave:0,pitch:0,roll:0};
  private taxiResources:{dispose():void}[]=[];
  constructor(traffic:Traffic){
    const colors=[0xe9e6da,0x588d8b,0x2d4856,0xe4a16b];
    const template=new CorsaireModel({exteriorOnly:true});template.root.updateMatrixWorld(true);
    for(const [i,a] of traffic.agents.entries()){
      const root=new Group(),details=new Group(),l=a.route.length,b=a.route.beam,cargo=a.route.kind==='cargo';
      const parts:BufferGeometry[]=[],fine:BufferGeometry[]=[];
      const add=(geometry:BufferGeometry,color:number,target=parts)=>{
        const normalized=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();normalized.deleteAttribute('uv');
        const tint=new Color(color),values=new Float32Array(normalized.getAttribute('position').count*3);
        for(let j=0;j<values.length;j+=3){values[j]=tint.r;values[j+1]=tint.g;values[j+2]=tint.b;}
        normalized.setAttribute('color',new Float32BufferAttribute(values,3));target.push(normalized);
      };
      const box=(x:number,y:number,z:number,w:number,h:number,d:number,color=colors[0],target=parts)=>add(new BoxGeometry(w,h,d).translate(x,y,z),color,target);
      if(a.taxi){
        const variant=traffic.taxis.agents.indexOf(a),livery=TAXI_LIVERIES[variant];
        template.root.traverse(object=>{
          if(!(object instanceof Mesh)||!(object.material instanceof MeshStandardMaterial))return;
          const original=object.material.color.getHex();
          const tint=original===0x637d80?livery.hull:original===0xf1f0e7?livery.cabin:original;
          add(object.geometry.clone().applyMatrix4(object.matrixWorld),tint);
        });
        // Shared Corsaire hull, with distinct canopy, funnel and roof fittings.
        if(variant===0)box(0,7.15,2.5,6.4,.22,6,livery.accent);
        if(variant===1){box(-2.3,7.1,5.5,1.2,2,1.5,livery.hull);box(2.3,7.1,5.5,1.2,2,1.5,livery.hull);}
        if(variant===2)box(0,6.8,2,4.5,1,4,livery.cabin);
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
        const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f1f0e7';ctx.font='600 30px sans-serif';ctx.textAlign='center';ctx.fillText(a.route.name,256,44);
        const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
        const nameMaterial=new MeshStandardMaterial({map:texture,transparent:true,depthWrite:false}),nameGeometry=new PlaneGeometry(7,.9);
        this.taxiResources.push(texture,nameMaterial,nameGeometry);
        for(const side of [-1,1]){const name=new Mesh(nameGeometry,nameMaterial);name.position.set(side*3.84,1.3,0);name.rotation.y=side*Math.PI/2;details.add(name);}
      }else{
      add(loft([{z:-l/2,width:.15,bottom:cargo?-3:-.7,top:cargo?5:.8},{z:-l*.3,width:b,bottom:cargo?-4.8:-1,top:cargo?5.8:1},{z:l/2,width:b*.85,bottom:cargo?-3:-.7,top:cargo?5:.8}]),cargo?0x344f61:colors[i%4]);
      box(0,cargo?5.8:1.1,0,b*(cargo?.91:.8),cargo?.6:.3,l*(cargo?.9:.7));
      if(a.route.kind==='sail'){
        add(new CylinderGeometry(.07,.07,l*.95,6).translate(0,l*.48+1,0),colors[2]);
        const sail=new BufferGeometry();sail.setAttribute('position',new Float32BufferAttribute([0,1,0,0,l*.9,0,0,1,l*.42],3));sail.computeVertexNormals();add(sail,colors[0]);
        box(0,1.4,l*.18,b*.6,.6,l*.28);
      }else if(cargo){
        // Aft bridge, funnel and broad rows of containers distinguish a 108–130 m freighter.
        box(0,10.8,l*.33,b*.8,10,l*.13);
        box(0,16.5,l*.32,b*.95,2,l*.16);
        box(b*.23,13,l*.44,b*.2,8,l*.06,colors[3]);
        box(0,16.5,l*.32-.081*l,b*.85,1.1,.2,colors[2],fine);
        for(let row=0;row<3;row++)for(let column=0;column<5;column++){
          const height=4.8+(column%2)*2.4;
          box((row-1)*b*.27,6.1+height/2,-l*.33+column*l*.115,b*.24,height,l*.105,colors[(row+column+1)%4]);
        }
        add(new CylinderGeometry(.18,.18,5,5).translate(0,20,l*.33),colors[2],fine);
      }else{
        const ferry=a.route.kind==='ferry';box(0,ferry?2.2:1.7,-l*.05,b*.72,ferry?2:.9,l*.45);
        box(0,ferry?3.6:2.3,-l*.12,b*.62,.3,l*.5);
        if(ferry)box(0,4.3,-l*.23,b*.5,1.2,l*.2);
        box(0,ferry?2.6:1.9,-l*.1,b*.74,.45,l*.28,colors[2],fine);
      }
      if(a.route.kind==='launch')add(new ConeGeometry(.25,1,6).translate(0,3,0),colors[3],fine);
      }
      // One draw call for the complete silhouette at every distance, one optional detail mesh.
      const merge=(geometries:BufferGeometry[],parent:Group)=>{
        if(!geometries.length)return;
        const merged=mergeGeometries(geometries)!;geometries.forEach(g=>g.dispose());this.geometries.add(merged);parent.add(new Mesh(merged,this.material));
      };
      merge(parts,root);merge(fine,details);
      root.add(details);root.name=a.route.name;this.root.add(root);this.boats.push({root,details,agent:a});
    }
    template.dispose();
  }
  render(tide:number,_time:number,camera:{x:number;z:number},water:WaveField,offset:number):void {
    for(const b of this.boats){const a=b.agent,cargo=a.route.kind==='cargo',distance=Math.hypot(a.x-camera.x,a.z-camera.z);
      b.root.visible=a.active&&distance<(cargo||a.taxi?6000:3000);if(!b.root.visible)continue;
      if(distance<1500){water.hull(a.x,a.z,a.heading,a.route.length,a.route.beam,offset,this.flotation);b.root.position.set(a.x,tide+this.flotation.heave,a.z);b.root.rotation.set(this.flotation.pitch,-a.heading,this.flotation.roll,'YXZ');}
      else {b.root.position.set(a.x,tide+water.height(a.x,a.z,offset),a.z);b.root.rotation.set(0,-a.heading,0);}
      b.details.visible=distance<(cargo?1800:900);
    }
  }
  dispose():void {this.root.removeFromParent();this.geometries.forEach(g=>g.dispose());this.taxiResources.forEach(r=>r.dispose());this.material.dispose();}
}
