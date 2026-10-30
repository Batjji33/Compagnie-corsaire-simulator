import { BoxGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, CanvasTexture, CylinderGeometry, Group, Material, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { VesselState } from '../physics/VesselDynamics';
import { Cockpit } from './Cockpit';
import { loft } from './ShipGeometry';

/** Photo-derived 24 × 7.80 m catamaran. Bow -Z, waterline Y=0. See docs/SAINT-MALO.md. */
export class SaintMaloModel {
  readonly root=new Group();
  readonly bridge=new Group();
  readonly details=new Group();
  private helm=new Cockpit();
  readonly cockpit=this.helm.root;
  private textures:CanvasTexture[]=[];
  constructor(){
    this.root.name='Corsaire de Saint-Malo';this.root.add(this.bridge,this.details);
    const materials={
      hull:new MeshStandardMaterial({color:0x4c595a,roughness:.7}),
      white:new MeshStandardMaterial({color:0xf3f2eb,roughness:.7}),
      glass:new MeshStandardMaterial({color:0x233e48,roughness:.28,metalness:.18,transparent:true,opacity:.72,depthWrite:false,side:DoubleSide}),
      dark:new MeshStandardMaterial({color:0x1c292e,roughness:.8}),
      deck:new MeshStandardMaterial({color:0xa6aaa3,roughness:1}),
      rail:new MeshStandardMaterial({color:0xe2e4de,roughness:.5,metalness:.15}),
      blue:new MeshStandardMaterial({color:0x146481,roughness:.7}),
      wood:new MeshStandardMaterial({color:0x775039,roughness:.9}),
      seat:new MeshStandardMaterial({color:0x30445c,roughness:1}),
      orange:new MeshStandardMaterial({color:0xe0642f,roughness:.8}),
      red:new MeshStandardMaterial({color:0xb33234}),green:new MeshStandardMaterial({color:0x2d845b}),
    };
    type Surface=keyof typeof materials;
    const batches=new Map<string,{group:Group;material:Material;geometries:BufferGeometry[]}>();
    const part=(g:BufferGeometry,m:Surface,group=this.root)=>{
      const geometry=g.index?g.toNonIndexed():g.clone();g.dispose();geometry.deleteAttribute('uv');
      const key=group.uuid+m;if(!batches.has(key))batches.set(key,{group,material:materials[m],geometries:[]});batches.get(key)!.geometries.push(geometry);
    };
    const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:Surface,group=this.root)=>part(new BoxGeometry(w,h,d).translate(x,y,z),m,group);
    const tube=(a:Vector3,b:Vector3,r=.035,m:Surface='rail',group=this.details)=>{
      const mesh=new Mesh(new CylinderGeometry(r,r,a.distanceTo(b),6));mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new Vector3(0,1,0),b.clone().sub(a).normalize());mesh.updateMatrix();part(mesh.geometry.applyMatrix4(mesh.matrix),m,group);
    };
    const line=(x:number,y:number,z:number,X:number,Y:number,Z:number,r=.035,m:Surface='rail',g=this.details)=>tube(new Vector3(x,y,z),new Vector3(X,Y,Z),r,m,g);
    const panel=(vertices:number[],m:Surface,group=this.root)=>{
      const geometry=new PlaneGeometry(1,1);geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();part(geometry,m,group);
    };
    // Two completely separate hulls. The central bridge deck clears the water by 0.9 m.
    for(const side of [-1,1]){
      part(loft([{z:-12,width:.15,bottom:-.4,top:1.9},{z:-9.5,width:1.65,bottom:-1.35,top:1.85},{z:-5,width:2.2,bottom:-1.65,top:1.75},{z:8.5,width:2.2,bottom:-1.65,top:1.65},{z:12,width:1.95,bottom:-1.05,top:1.65}]).translate(side*2.8,0,0),'hull');
      // Long rubbing strakes and recessed stern engine exhausts.
      box(side*3.88,.62,2,.09,.13,19.6,'dark');box(side*3.88,.22,2,.055,.065,19.6,'blue');
      part(new CylinderGeometry(.15,.15,.2,8).rotateX(Math.PI/2).translate(side*2.8,.02,12.06),'dark',this.details);
    }
    part(loft([{z:-11.6,width:6.45,bottom:.95,top:1.65},{z:-9,width:7.8,bottom:1.05,top:1.7},{z:12,width:7.8,bottom:1.05,top:1.7}]),'hull');
    box(0,1.74,1.1,7.55,.14,21.5,'deck');
    // Broad forward bulwark, open foredeck, and stern verandah.
    part(loft([{z:-12,width:6.7,bottom:1.65,top:2.2},{z:-11.65,width:6.9,bottom:1.65,top:2.2}]),'white');
    for(const side of [-1,1]){
      box(side*3.76,2.03,1.8,.16,.55,19.9,'white');
      line(side*3.4,2.25,-11.65,side*3.76,2.25,-9.8,.05,'dark',this.root);
    }
    // The salon has real openings: lower panels, separate piers and clear glazing.
    box(0,2.16,1.2,7.15,.72,17.2,'white');box(0,4.2,1.2,7.4,.24,17.8,'white');
    box(0,4.36,3.05,7.5,.12,13.9,'deck');
    for(const side of [-1,1]){
      for(const z of [-5.8,-3.85,-1.9,1.85,3.8,5.75,7.7]){
        box(side*3.6,3.26,z,.065,1.35,1.62,'glass');
        for(const end of [-.87,.87])box(side*3.61,3.26,z+end,.1,1.55,.11,'white');
      }
      // Tall amidships boarding doors and external stair access, both sides.
      box(side*3.61,2.95,0,.09,2.22,1.1,'glass');
      for(const z of [-.65,.65])box(side*3.64,2.98,z,.16,2.45,.13,'white');
      box(side*3.66,1.78,0,.45,.1,1.25,'dark');line(side*3.72,2.85,.42,side*3.72,3.2,.42,.035,'dark');
      for(let i=0;i<11;i++)box(side*2.98,1.92+i*.235,10.9-i*.25,1.1,.1,.29,'white',this.details);
      line(side*3.55,2.85,11,side*3.55,5.35,8.4);line(side*2.41,2.85,11,side*2.41,5.35,8.4);
      // Rear supports slope outward underneath the observation deck.
      line(side*3.5,1.8,11.5,side*3.5,4.25,9.5,.095,'white',this.root);
    }
    box(0,3.1,9.72,5.8,1.9,.1,'glass');box(0,2.15,9.78,7.2,.65,.13,'white');
    for(const x of [-2.8,0,2.8])box(x,3.2,9.8,.13,1.9,.16,'white');
    // Slanted lower windscreen in five bays, distinct from the upper wheelhouse.
    panel([-3.5,4.08,-6.9,3.5,4.08,-6.9,-3.45,2.5,-8.8,3.45,2.5,-8.8],'glass');
    for(const x of [-3.5,-2.1,-.7,.7,2.1,3.5])line(x,2.47,-8.83,x,4.12,-6.91,.085,'white',this.root);
    line(-3.5,2.47,-8.84,3.5,2.47,-8.84,.1,'white',this.root);
    // Forward, nearly full-width wheelhouse. The white sloping fascia is a signature feature.
    part(loft([{z:-7.65,width:7.15,bottom:4.22,top:4.35},{z:-6.3,width:6.4,bottom:4.22,top:5.2},{z:-3.25,width:6.4,bottom:4.22,top:5.2}]),'white',this.bridge);
    panel([-3.2,6.35,-5.65,3.2,6.35,-5.65,-3.2,5.16,-6.3,3.2,5.16,-6.3],'glass',this.bridge);
    for(const x of [-3.2,-2.4,-1.6,-.8,0,.8,1.6,2.4,3.2])line(x,5.15,-6.32,x,6.36,-5.67,.055,'white',this.bridge);
    for(const side of [-1,1]){
      panel([side*3.21,6.35,-5.65,side*3.21,6.35,-3.3,side*3.21,5.15,-6.3,side*3.21,5.15,-3.3],side<0?'white':'glass',this.bridge);
      // Port side pane has reversed winding.
      if(side<0)box(-3.23,5.75,-4.45,.04,1.12,2.1,'glass',this.bridge);
      box(side*3.22,5.78,-4.3,.12,1.24,.09,'white',this.bridge);
      box(side*3.35,5.35,-5.3,.15,.14,.24,side<0?'red':'green',this.bridge);
    }
    box(0,5.7,-3.22,6.5,1.24,.14,'white',this.bridge);
    box(0,6.45,-4.5,6.85,.2,3.45,'white',this.bridge);
    // Tables and paired benches in the covered salon; central aisle stays clear.
    for(const x of [-2,2])for(let z=-4.5;z<8;z+=2.05){
      box(x,2.65,z,1.15,.08,.78,'wood',this.details);line(x,1.85,z,x,2.62,z,.065,'rail');
      for(const offset of [-.64,.64])for(const column of [-.34,.34]){
        box(x+column,2.23,z+offset,.55,.12,.4,'seat',this.details);
        box(x+column,2.55,z+offset+Math.sign(offset)*.18,.55,.55,.08,'seat',this.details);
        line(x+column,1.83,z+offset,x+column,2.2,z+offset,.04,'rail');
      }
    }
    for(const x of [-1.15,1.15])for(const z of [-2,5.5])line(x,1.85,z,x,4.08,z,.055,'white');
    box(0,2.32,2.2,1.2,.95,2.1,'seat',this.details);box(0,2.84,2.2,1.35,.09,2.2,'wood',this.details);
    // Open top deck, rows of transverse benches and four-course white guardrails.
    for(const side of [-1,1]){
      for(let z=-1.8;z<8;z+=1.3){box(side*1.75,4.78,z,2.35,.12,.45,'white',this.details);box(side*1.75,5.05,z+.23,2.35,.53,.08,'white',this.details);}
      for(let z=-3;z<=9.7;z+=1.27)line(side*3.67,4.4,z,side*3.67,5.48,z,.04);
      for(const y of [4.66,4.94,5.22,5.48])line(side*3.67,y,-3.05,side*3.67,y,9.75);
      for(const z of [-2,4.5]){
        part(new CylinderGeometry(.38,.38,1.1,10).rotateZ(Math.PI/2).translate(side*2.92,4.9,z),'white',this.details);
        for(const x of [-.3,.3])part(new TorusGeometry(.39,.025,4,10).rotateY(Math.PI/2).translate(side*2.92+x,4.9,z),'dark',this.details);
      }
      part(new TorusGeometry(.34,.085,6,16).rotateY(Math.PI/2).translate(side*3.72,4.98,7.5),'orange',this.details);
      for(const z of [-9.8,-5.7,-1.4,3.8,8.6]){
        part(new SphereGeometry(.3,8,6).scale(1,1.55,1).translate(side*(z<-9?3.5:3.98),1.25,z),'white',this.details);
        line(side*3.65,2.3,z,side*3.98,1.65,z,.022,'dark');
      }
      for(const z of [-10.4,11.3]){box(side*2.65,1.9,z,.6,.1,.25,'dark',this.details);line(side*2.45,1.88,z,side*2.45,2.1,z,.065,'dark');line(side*2.85,1.88,z,side*2.85,2.1,z,.065,'dark');}
    }
    for(const y of [4.66,4.94,5.22,5.48])line(-3.67,y,9.75,3.67,y,9.75);
    for(const x of [-3.67,-2.4,-1.2,0,1.2,2.4,3.67])line(x,4.4,9.75,x,5.48,9.75);
    // Tall open mast, ladder, radar, aerials and tricolour. No aft arch on this ship.
    line(0,6.5,-4.4,0,11.1,-3.7,.065,'white',this.root);line(-.8,6.5,-3.7,0,10.7,-3.72,.045,'white',this.root);
    line(-.35,6.5,-3.75,-.35,10.5,-3.75,.025);line(.15,6.5,-3.75,.15,10.5,-3.75,.025);
    for(let y=6.6;y<10.5;y+=.35)line(-.35,y,-3.75,.15,y,-3.75,.018);
    box(0,8.1,-4.25,1.9,.12,.22,'white',this.details);box(0,7.4,-4.4,1.2,.18,.35,'white',this.details);
    for(const x of [-2.5,-1.8,2.5])line(x,6.55,-3.65,x,8.4,-3.65,.018);
    line(0,4.4,11.7,0,6.1,11.7,.035);for(const [i,m] of (['blue','white','red'] as const).entries())box(.16+i*.24,5.78,11.7,.24,.5,.025,m,this.details);
    for(const batch of batches.values()){
      const geometry=mergeGeometries(batch.geometries,false)!;batch.geometries.forEach(g=>g.dispose());batch.group.add(new Mesh(geometry,batch.material));
    }
    // Company lettering is drawn once into a local atlas; reference photographs are not redistributed.
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#f3f2eb';ctx.fillRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle='#185e78';ctx.font='italic 88px Georgia';ctx.fillText('Corsaire',520,105);ctx.font='22px sans-serif';ctx.fillText('COMPAGNIE CORSAIRE',512,145);ctx.fillStyle='#25333a';ctx.font='35px sans-serif';ctx.fillText('CORSAIRE DE SAINT-MALO',512,215);
    ctx.fillStyle='#1a91b0';ctx.beginPath();ctx.moveTo(235,40);ctx.quadraticCurveTo(180,75,250,110);ctx.lineTo(215,85);ctx.fill();
    const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;this.textures.push(texture);
    const labelMaterial=new MeshStandardMaterial({map:texture,roughness:.8});
    for(const side of [-1,1]){const label=new Mesh(new PlaneGeometry(3.6,.9),labelMaterial);label.position.set(side*3.685,3.2,8.5);label.rotation.y=side*Math.PI/2;this.root.add(label);}
    const front=new Mesh(new PlaneGeometry(3.3,.82),labelMaterial);front.position.set(0,4.78,-7.03);front.rotation.set(.99,Math.PI,0);this.bridge.add(front);
  }
  setDetail(visible:boolean):void {this.details.visible=visible;}
  setCockpit(active:boolean):void {this.bridge.visible=!active;this.cockpit.visible=active;}
  updateWheel(rudder:number):void {this.helm.updateWheel(rudder);}
  updateInstruments(state:VesselState,power=1):void {this.helm.updateInstruments(state,power);}
  dispose():void {
    this.root.removeFromParent();const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();this.root.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);if(!Array.isArray(o.material))materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.helm.dispose();
  }
}
