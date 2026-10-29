import { BoxGeometry, BufferGeometry, CanvasTexture, CylinderGeometry, Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, Material, PlaneGeometry, SRGBColorSpace, TorusGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BOAT, KNOT } from './parameters';
import type { VesselState } from '../physics/VesselDynamics';
import { loft } from './ShipGeometry';

/** Original model derived from exterior photos, not an exact naval/CAD reproduction. Bow is -Z. */
export class CorsaireModel {
  readonly root=new Group();
  readonly bridge=new Group();
  readonly cockpit=new Group();
  private materials={
    hull:new MeshStandardMaterial({color:0x637d80,roughness:.55,metalness:.12}),
    white:new MeshStandardMaterial({color:0xf1f0e7,roughness:.65}),
    glass:new MeshStandardMaterial({color:0x18303c,roughness:.2,metalness:.3}),
    deck:new MeshStandardMaterial({color:0x999991,roughness:.95}),
    dark:new MeshStandardMaterial({color:0x202d35,roughness:.7}),
    rail:new MeshStandardMaterial({color:0xbac4c4,roughness:.4,metalness:.45}),
    orange:new MeshStandardMaterial({color:0xe88434,roughness:.7}),
    red:new MeshStandardMaterial({color:0xc24736}),
    green:new MeshStandardMaterial({color:0x329463}),
  };
  private textures:CanvasTexture[]=[];
  private wheel:Mesh;
  private displays:{canvas:HTMLCanvasElement;texture:CanvasTexture;text:string}[]=[];
  constructor() {
    this.root.name='Corsaire d’Émeraude';
    const batches=new Map<string,{group:Group;material:MeshStandardMaterial;geometries:BufferGeometry[]}>();
    const part=(geometry:BufferGeometry,material:keyof typeof this.materials,group=this.root)=> {
      // Normalize attributes before merging dissimilar primitives.
      const normalized=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();normalized.deleteAttribute('uv');
      const key=`${group.uuid}:${material}`;
      if(!batches.has(key))batches.set(key,{group,material:this.materials[material],geometries:[]});batches.get(key)!.geometries.push(normalized);
    };
    const box=(x:number,y:number,z:number,w:number,h:number,d:number,material:keyof typeof this.materials,group=this.root)=>part(new BoxGeometry(w,h,d).translate(x,y,z),material,group);
    const cylinder=(x:number,y:number,z:number,r:number,h:number,material:keyof typeof this.materials,group=this.root)=>part(new CylinderGeometry(r,r,h,10).translate(x,y,z),material,group);
    const rail=(a:Vector3,b:Vector3,r=.035,material:keyof typeof this.materials='rail',group=this.root)=> {
      const mesh=new Mesh(new CylinderGeometry(r,r,a.distanceTo(b),6));mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new Vector3(0,1,0),b.clone().sub(a).normalize());mesh.updateMatrix();part(mesh.geometry.applyMatrix4(mesh.matrix),material,group);
    };
    part(loft([{z:-BOAT.length/2,width:.18,bottom:-.65,top:2.4},{z:-10,width:4.9,bottom:-1.6,top:2.1},{z:-5,width:BOAT.beam,bottom:-BOAT.draft,top:1.8},{z:8,width:7.3,bottom:-1.8,top:1.65},{z:BOAT.length/2,width:6.6,bottom:-.8,top:1.5}]),'hull');
    // Main glazed saloon and its tapered forward end.
    part(loft([{z:-8,width:4.5,bottom:1.8,top:4.2},{z:-5,width:6.6,bottom:1.8,top:4.35},{z:9.7,width:6.6,bottom:1.8,top:4.35}]),'white');
    for(const side of [-1,1]) {
      box(side*3.32,3.18,-2.2,.045,1.7,5.2,'glass');box(side*3.32,3.18,5.6,.045,1.7,6.6,'glass');
      box(side*3.34,2.9,1.55,.05,2.2,1.0,'glass');box(side*3.38,2.9,1.55,.06,2.25,.06,'white');
      for(const z of [-4.7,-2.4,0,2.4,4.8,7.2,9])box(side*3.36,3.2,z,.06,1.7,.07,'rail');
      box(side*3.67,.55,3,.14,.16,19.8,'dark');box(side*3.69,.26,3,.11,.09,19.8,'white');
      for(const z of [-7,-2,4,10]) {cylinder(side*3.82,1.4,z,.25,1.3,'dark');rail(new Vector3(side*3.6,2,z),new Vector3(side*3.83,1.8,z),.035,'dark');}
      for(let z=-10;z<12;z+=1.5) {
        const x=side*(z<-6?2.25:3.25);rail(new Vector3(x,1.9,z),new Vector3(x,2.8,z));
      }
      rail(new Vector3(side*3.25,2.8,-5),new Vector3(side*3.25,2.8,12));
    }
    box(0,4.48,2.2,7,.26,16.8,'white');box(0,4.64,4.3,6.5,.08,11.8,'deck');
    // Raised forward wheelhouse, dark wraparound windows, swept visor.
    part(loft([{z:-7.3,width:4.1,bottom:4.4,top:5.1},{z:-5.6,width:5.8,bottom:4.4,top:5.1},{z:-2,width:5.8,bottom:4.4,top:5.1}]),'white',this.bridge);
    box(0,5.75,-2.1,5.8,1.4,.2,'white',this.bridge);
    for(const side of [-1,1]) {
      box(side*2.84,5.8,-4.2,.08,1.3,3.7,'glass',this.bridge);
      rail(new Vector3(side*2.8,5.1,-6),new Vector3(side*2.8,6.4,-6),.08,'white',this.bridge);
    }
    box(0,5.8,-6.05,5.6,1.3,.08,'glass',this.bridge);
    for(const x of [-1.85,0,1.85])box(x,5.8,-6.12,.08,1.4,.12,'white',this.bridge);
    part(loft([{z:-7.1,width:4.7,bottom:6.42,top:6.62},{z:-5.7,width:6.6,bottom:6.42,top:6.62},{z:-1.8,width:6.3,bottom:6.42,top:6.62}]),'white',this.bridge);
    this.root.add(this.bridge);
    // Open upper passenger deck: benches, rails, aft arch and life-saving equipment.
    for(const side of [-1,1]) {
      for(let z=-.5;z<10;z+=1.4)rail(new Vector3(side*3.35,4.6,z),new Vector3(side*3.35,5.65,z));
      for(const y of [5.1,5.65])rail(new Vector3(side*3.35,y,-1),new Vector3(side*3.35,y,10));
      rail(new Vector3(side*3.1,4.6,8.5),new Vector3(side*2.7,7.3,6),.15,'white');
      for(let z=0;z<8;z+=1.7) {box(side*1.7,4.95,z,2.25,.18,.65,'white');box(side*1.7,5.25,z+.35,2.25,.65,.12,'white');}
      cylinder(side*2.7,5,9,.4,1.4,'white');
      const lifering=new TorusGeometry(.38,.1,6,16);lifering.rotateY(Math.PI/2);lifering.translate(side*3.42,5.25,1);part(lifering,'orange');
      box(side*2.98,6,-4,.15,.15,.22,side<0?'red':'green',this.bridge);
    }
    rail(new Vector3(-2.7,7.3,6),new Vector3(2.7,7.3,6),.14,'white');
    rail(new Vector3(-3.35,5.65,10),new Vector3(3.35,5.65,10));
    // Stair steps at the aft quarter.
    for(let i=0;i<10;i++)box(2.3,1.7+i*.29,12.4-i*.25,1.2,.15,.35,'white');
    cylinder(0,8,-3.5,.09,3.3,'white');box(0,7.15,-3.5,2,.18,.45,'white');cylinder(.9,7,-2.7,.25,.5,'white');
    rail(new Vector3(-.7,6.6,-4),new Vector3(-.7,9.8,-4),.025,'rail');
    // Interpretation of the cockpit, attached to the stable camera instead of the rolling shell.
    box(0,-1.05,-1.5,3.8,.65,.8,'dark',this.cockpit);
    for(const x of [-.8,.8]) {
      box(x,-.68,-1.55,.75,.08,.45,'dark',this.cockpit);
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
      const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;this.textures.push(texture);this.displays.push({canvas,texture,text:''});
      const screen=new Mesh(new PlaneGeometry(.65,.3),new MeshBasicMaterial({map:texture}));
      screen.position.set(x,-.54,-1.5);screen.rotation.x=-.6;this.cockpit.add(screen);
    }
    for(const x of [-1.8,1.8])rail(new Vector3(x,-1,-2),new Vector3(x,1.3,-2),.045,'white',this.cockpit);
    this.wheel=new Mesh(new TorusGeometry(.26,.025,6,20),this.materials.dark);this.wheel.position.set(0,-.65,-1);this.cockpit.add(this.wheel);
    for(const batch of batches.values()) {const merged=mergeGeometries(batch.geometries,false)!;batch.geometries.forEach(g=>g.dispose());batch.group.add(new Mesh(merged,batch.material));}
    this.addName();
  }
  private addName():void {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#e9ece7';ctx.font='500 32px Georgia';ctx.textAlign='center';ctx.fillText('Corsaire d’Émeraude',256,43);
    const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;this.textures.push(texture);
    const material=new MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.8});
    for(const side of [-1,1]) {const name=new Mesh(new PlaneGeometry(5,.65),material);name.position.set(side*3.12,1.45,-7.3);name.rotation.y=side*Math.PI/2;this.root.add(name);}
  }
  setCockpit(active:boolean):void {this.bridge.visible=!active;this.cockpit.visible=active;}
  updateWheel(rudder:number):void {this.wheel.rotation.z=-rudder*4;}
  updateInstruments(state:VesselState):void {
    const lines=[
      [`${(state.surge/KNOT).toFixed(1)} nd`,`Cap ${Math.round((state.heading*180/Math.PI%360+360)%360)%360}°`],
      [`Barre ${Math.round(state.rudder*180/Math.PI)}°`,`B ${Math.round(state.port*100)} / T ${Math.round(state.starboard*100)} %`],
    ];
    this.displays.forEach((display,index)=>{
      const text=lines[index].join('|');if(display.text===text)return;display.text=text;
      const ctx=display.canvas.getContext('2d')!;ctx.fillStyle='#102a2c';ctx.fillRect(0,0,256,128);
      ctx.fillStyle='#d5f0db';ctx.font='32px sans-serif';ctx.fillText(lines[index][0],14,47);ctx.font='24px sans-serif';ctx.fillText(lines[index][1],14,95);display.texture.needsUpdate=true;
    });
  }
  dispose():void {
    const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
    for(const group of [this.root,this.cockpit])group.traverse(object=>{if(object instanceof Mesh){geometries.add(object.geometry);if(!Array.isArray(object.material))materials.add(object.material);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());
  }
}
