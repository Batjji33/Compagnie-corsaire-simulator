import { BoxGeometry, BufferGeometry, ExtrudeGeometry, Shape, Path, CanvasTexture, CircleGeometry, Float32BufferAttribute, Group, Material, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry, SRGBColorSpace } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loft } from './ShipGeometry';
import { BRITTANY_SAINT_MALO as dimensions } from './companies';

/** Metres, waterline y=0, bow -Z. Photo-derived heights are estimates, not yard plans. */
export class BrittanySaintMaloModel {
  readonly root = new Group();
  readonly exterior = new Group();
  readonly interior = new Group();
  readonly ramps = new Group();
  private nightLights=new Group();
  private nightMaterials:MeshStandardMaterial[]=[];
  private textures: CanvasTexture[] = [];
  constructor() {
    this.root.name = 'Brittany Ferries · Saint-Malo';
    this.root.add(this.exterior, this.interior, this.ramps,this.nightLights);this.interior.visible=false;this.nightLights.visible=false;
    this.exterior.name = 'Enveloppe extérieure'; this.interior.name = 'Volumes intérieurs approximatifs';
    const palette = { white: 0xf2f3ef, navy: 0x171e53, red: 0x8f302a, glass: 0x263d49, deck: 0x939e9c, orange: 0xd64321, rail: 0xd8dfdf, floor: 0x69797d };
    type Paint = keyof typeof palette;
    const materials = Object.fromEntries(Object.entries(palette).map(([key,color]) => [key,new MeshStandardMaterial({color,roughness:key==='glass'?.3:.72})])) as Record<Paint,MeshStandardMaterial>;
    materials.glass.emissive.setHex(0xffd99a);materials.glass.emissiveIntensity=0;this.nightMaterials.push(materials.glass);
    // Symbolic navigation lights, with estimated mount positions rather than certified sectors.
    for(const [x,y,z,color] of [[-13.7,26,-69,0xff2318],[13.7,26,-69,0x24ed6f],[0,12.4,97.1,0xfff0cf]]){
      const light=new Mesh(new SphereGeometry(.2,8,6),new MeshStandardMaterial({color,emissive:color,emissiveIntensity:2}));light.position.set(x,y,z);this.nightLights.add(light);
    }
    const batches = new Map<string,{geometries:BufferGeometry[];parent:Group;paint:Paint}>();
    const add = (geometry:BufferGeometry,paint:Paint,parent=this.exterior) => {
      // Consistent attributes allow boxes, circles, spheres and custom lofts to share one draw call.
      geometry.deleteAttribute('uv'); const g=geometry.index?geometry.toNonIndexed():geometry;
      if(g!==geometry)geometry.dispose();
      const key=parent.uuid+paint;
      if(!batches.has(key))batches.set(key,{geometries:[],parent,paint});
      batches.get(key)!.geometries.push(g);
    };
    const box=(x:number,y:number,z:number,w:number,h:number,d:number,p:Paint,parent=this.exterior)=>add(new BoxGeometry(w,h,d).translate(x,y,z),p,parent);
    const volume=(stations:{z:number;width:number;bottom:number;top:number}[],p:Paint,parent=this.exterior)=>{
      const geometry=loft(stations),positions=geometry.getAttribute('position');
      stations.forEach((station,i)=>{positions.setX(i*4,-station.width/2);positions.setX(i*4+1,station.width/2);});
      geometry.computeVertexNormals();add(geometry,p,parent);
    };
    // Rounded bilges and flared bow through 18 longitudinal stations and 12 points per section.
    const stations=[[-97.35,.12],[-94,2.2],[-90,5.8],[-85,10.3],[-78,17],[-70,22],[-60,25.8],[-48,27.8],[-30,27.8],[-10,27.8],[10,27.8],[30,27.8],[50,27.8],[65,27.8],[78,27.4],[88,26.8],[94,26.2],[97.35,25.8]];
    const shell=(bottom:number,top:number,p:Paint)=>{
      const positions:number[]=[],indices:number[]=[];
      for(const [z,width] of stations){
        const bow=Math.max(0,(-z-68)/29.35),depth=dimensions.draft*(1-.92*bow);
        const ring=[[-.5,1],[-.5,.45],[-.48,0],[-.39,-.62],[-.24,-.94],[0,-1],[.24,-.94],[.39,-.62],[.48,0],[.5,.45],[.5,1],[0,1]];
        for(const [x,y] of ring){
          const height=bottom<0?(y<0?y*depth:y*top):bottom+Math.max(0,y)*(top-bottom);
          positions.push(x*width,height,z + (z < -78 ? Math.max(0, 1-height/11.7)*7*Math.max(0,(-z-78)/19.35) : 0));
        }
      }
      for(let s=0;s<stations.length-1;s++)for(let j=0;j<12;j++){
        const a=s*12+j,b=s*12+(j+1)%12,c=a+12,d=b+12;indices.push(a,b,c,b,d,c);
      }
      for(const end of [0,stations.length-1])for(let j=1;j<11;j++){
        if(end===stations.length-1&&p==='white')continue;
        const a=end*12;indices.push(...(end===0?[a,a+j+1,a+j]:[a,a+j,a+j+1]));
      }
      const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();add(g,p);
    };
    shell(-6.6,.25,'red');shell(.25,1.8,'navy');shell(1.8,11.7,'white');
    // Stern apertures align with the two independent Ro-Ro doors.
    for(const [x,w] of [[-11.45,2.9],[-1,4],[11.45,2.9]])box(x,6.75,97.27,w,9.9,.16,'white');
    box(0,2.4,97.27,25.8,1.2,.16,'white');box(0,11.05,97.27,25.8,1.3,.16,'white');
    for(const [x,w] of [[-6.5,7],[5.5,9]])box(x,2.95,9.85,w,.1,175,'deck');
    // Bulb stays within the published overall length.
    add(new SphereGeometry(1,16,10).scale(1.7,1.6,5.2).translate(0,-2,-92.1),'red');
    volume([{z:-97.35,width:.12,bottom:11.65,top:11.8},{z:-85,width:10.3,bottom:11.65,top:11.8},{z:-70,width:22,bottom:11.65,top:11.8},{z:-48,width:27.8,bottom:11.65,top:11.8},{z:97.35,width:25.8,bottom:11.65,top:11.8}],'deck');
    // Long accommodation block with swept front and a stepped, sloping aft termination.
    const outline=new Shape();
    const profile=[[-76,11.7],[-70,21],[-66,26.2],[70,26.2],[74,19],[90,13],[97,11.7]];
    profile.forEach(([z,y],i)=>i?outline.lineTo(z,y):outline.moveTo(z,y));outline.closePath();
    const recess=new Path();recess.moveTo(-18,16);recess.lineTo(22,16);recess.lineTo(22,22.5);recess.lineTo(-18,22.5);recess.closePath();outline.holes.push(recess);
    const accommodation=new ExtrudeGeometry(outline,{depth:27.6,bevelEnabled:false,steps:1});
    accommodation.rotateY(-Math.PI/2);accommodation.translate(13.8,0,0);add(accommodation,'white');
    for(const side of [-1,1]){
      // Recessed boat deck and dark forward promenade belt.
      box(side*13.83,17.8,-41,.06,2.1,46,'navy');
      box(side*9.8,19.2,2,.12,6.4,40,'deck');
      box(side*13.83,17.8,34,.06,2.1,15,'navy');
      for(const y of [14.2,24.5])for(let z=-63;z<70;z+=2.65)box(side*13.84,y,z,.08,.8,.62,'glass');
      for(const y of [18,21.3])for(let z=-63;z<70;z+=2.8){
        if(z>-18&&z<23)continue;
        const circle=new CircleGeometry(y===21.3&&z>22?.49:.72,12);circle.rotateY(side*Math.PI/2);circle.translate(side*13.86,y,z);add(circle,'glass');
      }
      for(let z=43;z<70;z+=2.7)box(side*13.84,18,z,.08,.65,.65,'glass');
      // Two enclosed survival craft per side, supported by davits.
      for(const z of [-7,10]){
        add(loft([{z:z-5.3,width:.3,bottom:18,top:18.6},{z:z-3.8,width:3.1,bottom:17.6,top:19.3},{z:z+3.8,width:3.1,bottom:17.6,top:19.3},{z:z+5.3,width:.3,bottom:18,top:18.6}]).translate(side*12.2,0,0),'white');
        const boat=new SphereGeometry(1,12,8).scale(1.45,1.05,5.1).translate(side*12.2,19.4,z);add(boat,'orange');
        box(side*12.2,19.5,z,2.92,.45,7.4,'glass');
        for(const dz of [-4,4]){box(side*11.9,20,z+dz,.25,3.2,.3,'rail');box(side*12.1,21.5,z+dz,3.1,.25,.3,'rail');}
      }
      // Rails: thin rails and repeated posts, merged with the same material.
      for(const y of [26.5,27.1])box(side*13.5,y,3,.07,.07,133,'rail');
      for(let z=-63;z<=69;z+=2)box(side*13.5,26.7,z,.07,1,.07,'rail');
      for(let z=-89;z<-72;z+=2){const x=(97.35+z)*.37;box(side*x,12.25,z,.08,1,.08,'rail');}
      for(let z=27;z<43;z+=2.1)add(new SphereGeometry(1,8,6).scale(.65,.55,.95).translate(side*12,18.4,z),'white');
    }
    for(const y of [18,21.2])for(let x=-10;x<=10;x+=2){
      const z=y<=21?-76+(y-11.7)*6/9.3:-70+(y-21)*4/5.2;
      add(new PlaneGeometry(1.4,1).rotateY(Math.PI).rotateX(.57).translate(x,y,z-.08),'glass');
    }
    // Forward panoramic bridge, projecting wings within the vessel's maximum beam.
    volume([{z:-73,width:23,bottom:24.2,top:26.5},{z:-70,width:27.8,bottom:24.2,top:27},{z:-64,width:25.5,bottom:24.2,top:27}],'white');
    for(let x=-10.5;x<=10.5;x+=2.1)box(x,25.55,-73.05,1.7,1.4,.09,'glass');
    for(const side of [-1,1])for(let z=-71;z<-65;z+=1.6)box(side*13.6,25.8,z,.08,1.3,1.25,'glass');
    volume([{z:-61,width:12,bottom:26.2,top:30},{z:-57,width:15,bottom:26.2,top:30},{z:-49,width:15,bottom:26.2,top:30}],'white');
    // Distinctive broad aft funnel with raked leading edge and blue cap.
    volume([{z:27,width:12,bottom:26.2,top:27},{z:35,width:12,bottom:26.2,top:33},{z:54,width:12,bottom:26.2,top:33},{z:56,width:12,bottom:26.2,top:27}],'white');
    box(0,33.1,44.5,13,.45,21,'navy');
    for(const z of [35,50])for(const x of [-3,-1,1,3])box(x,34,z,.5,1.7,.8,'glass');
    for(const [z,y,h] of [[-58,34,8],[29,34,12]] as const){box(0,y,z,.8,h,.8,'white');box(0,y+2,z,6,.25,.4,'white');}
    for(const z of [-45,-34,-20,60]){box(0,27,z,9,1.5,7,'white');add(new SphereGeometry(1,12,8).scale(1,1.4,1).translate(5,28.4,z),'white');}
    // Visible top deck glasshouse aft of centre.
    box(0,27.3,18,12,2,13,'glass');
    for(let z=12;z<25;z+=2)box(0,28.35,z,12,.12,.12,'rail');
    // Approximate structural reservations, deliberately inspectable without pretending to be deck plans.
    for(const [name,y] of [['Garage inférieur',3],['Garage supérieur',8],['Espaces passagers',14],['Cabines',21]] as const){
      const floor=new Group();floor.name=name;this.interior.add(floor);
      box(0,y,5,24,.24,169,'floor',floor);
      for(const x of [-7,7])box(x,y+1.7,5,.2,3.4,150,'white',floor);
      for(const z of [-50,30,65])box(0,y+1.7,z,3,3.4,4,'deck',floor);
    }
    // Separate stern pivots support inspection and the service's progressive ramp animation.
    for(const [x,w] of [[-6.5,7],[5.5,9]]){
      const pivot=new Group();pivot.name='Rampe arrière · charnière';pivot.position.set(x,3,97.35);this.ramps.add(pivot);
      box(0,3.7,-.25,w,7.4,.4,'deck',pivot);
      for(let y=.3;y<7.4;y+=.45)box(0,y,-.49,w,.08,.08,'rail',pivot);
    }
    for(const batch of batches.values()){
      const geometry=mergeGeometries(batch.geometries,false)!;batch.geometries.forEach(g=>g.dispose());
      batch.parent.add(new Mesh(geometry,materials[batch.paint]));
    }
    // Locally drawn livery, no remote texture dependency or redistribution of reference photos.
    const label=(text:string,w:number,h:number,x:number,y:number,z:number,side:number,logo=false)=>{
      const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
      const c=canvas.getContext('2d')!;c.fillStyle='#f2f3ef';c.fillRect(0,0,1024,128);
      if(logo){for(const [i,color] of ['#18378c','#63b537','#f3cb21','#eb4930'].entries()){
        c.fillStyle=color;c.beginPath();c.moveTo(10+i*24,77);c.bezierCurveTo(65+i*24,100,80+i*24,6,132+i*24,35);c.bezierCurveTo(85+i*24,17,80+i*24,132,10+i*24,77);c.fill();}}
      c.fillStyle='#171e53';c.font=`italic bold ${logo?91:80}px Arial`;c.textBaseline='middle';c.textAlign=logo?'left':'center';c.fillText(text,logo?220:512,68,logo?795:1000);
      const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=2;this.textures.push(texture);
      const mesh=new Mesh(new PlaneGeometry(w,h),new MeshStandardMaterial({map:texture,roughness:.8}));mesh.position.set(x,y,z);mesh.rotation.y=side*Math.PI/2;this.exterior.add(mesh);
    };
    for(const side of [-1,1]){
      label('Brittany Ferries',77,8,side*13.91,7.8,3,side,true);
      label('LNG HYBRID',20,2.4,side*13.91,6.8,59,side);
      label('SAINT-MALO',12,1.5,side*11.1,8.5,-70,side);
      label('',10,4,side*6.02,30,44,side,true);
    }
  }
  setNight(value:number):void {for(const material of this.nightMaterials)material.emissiveIntensity=Math.max(0,Math.min(1,value))*.65;this.nightLights.visible=value>.3;}
  setCutaway(value:boolean):void {this.exterior.visible=!value;this.interior.visible=value;}
  setRampProgress(value:number):void {for(const ramp of this.ramps.children)ramp.rotation.x=Math.max(0,Math.min(1,value))*Math.PI/2;}
  setRamps(open:boolean):void {this.setRampProgress(open?1:0);}
  dispose():void {
    const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
    this.root.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.root.removeFromParent();
  }
}
