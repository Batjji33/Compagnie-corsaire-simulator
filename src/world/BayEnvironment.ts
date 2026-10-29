import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, Mesh, Shape, ShapeGeometry, Vector3 } from 'three';
import { BAY, BUOYS, DOCKS, LANDS, ROCKS, inside, random } from './geography';
import type { Land, Point } from './geography';
import type { Quality } from '../config';
import { createMaterials } from './Materials';
import { Batch } from './Batch';

interface Zone { root: Group; detail: Group; center: Vector3 }
export class BayEnvironment {
  readonly root = new Group();
  private palette = createMaterials();
  private zones: Zone[] = [];
  private quality: Quality;
  private buoyGroups: Group[] = [];
  constructor(quality: Quality) {
    this.quality = quality;
    for (const land of LANDS) this.root.add(this.terrain(land));
    this.buildMalo(); this.buildDinard(); this.buildIslands(); this.buildSeamarks(); this.buildHinterland();
  }
  private terrain(land: Land): Group {
    const group = new Group(); group.name = land.name;
    const center = land.outline.reduce((p,v) => [p[0]+v[0]/land.outline.length,p[1]+v[1]/land.outline.length], [0,0]);
    const rings = [{ scale:1.05,y:-12 },{ scale:1.02,y:0.7 },{ scale:1,y:2 },{ scale:.96,y:land.height }];
    const at = (p: Point, scale: number) => [center[0]+(p[0]-center[0])*scale, center[1]+(p[1]-center[1])*scale];
    for(let r=0;r<rings.length-1;r++) {
      const vertices:number[]=[], uv:number[]=[];
      for(let i=0;i<land.outline.length;i++) {
        const a=at(land.outline[i],rings[r].scale), b=at(land.outline[(i+1)%land.outline.length],rings[r].scale);
        const c=at(land.outline[i],rings[r+1].scale), d=at(land.outline[(i+1)%land.outline.length],rings[r+1].scale);
        const quad=[[a[0],rings[r].y,a[1]],[c[0],rings[r+1].y,c[1]],[b[0],rings[r].y,b[1]],[b[0],rings[r].y,b[1]],[c[0],rings[r+1].y,c[1]],[d[0],rings[r+1].y,d[1]]];
        // Both sides remain visible for authored coastlines of either winding.
        for(const v of quad) { vertices.push(...v); uv.push(v[0]/32,v[2]/32); }
        for(const v of [...quad].reverse()) { vertices.push(...v); uv.push(v[0]/32,v[2]/32); }
      }
      const geometry = new BufferGeometry(); geometry.setAttribute('position',new Float32BufferAttribute(vertices,3)); geometry.setAttribute('uv',new Float32BufferAttribute(uv,2)); geometry.computeVertexNormals();
      group.add(new Mesh(geometry,this.palette.materials[r===1?'sand':'rock']));
    }
    const shape = new Shape();
    land.outline.forEach((p,i) => { const [x,z]=at(p,.96); if(i===0) shape.moveTo(x,-z); else shape.lineTo(x,-z); }); shape.closePath();
    const geometry = new ShapeGeometry(shape); geometry.rotateX(-Math.PI/2); geometry.translate(0,land.height,0);
    const positions=geometry.getAttribute('position'), uvs=geometry.getAttribute('uv');
    for(let i=0;i<positions.count;i++) uvs.setXY(i,positions.getX(i)/180,positions.getZ(i)/180);
    group.add(new Mesh(geometry,this.palette.materials[land.surface]));
    return group;
  }
  private zone(name: string, base: Batch, detail: Batch, x: number, z: number) {
    const root=base.build(this.palette.materials), near=detail.build(this.palette.materials);
    root.name=name; root.add(near); this.root.add(root); this.zones.push({root,detail:near,center:new Vector3(x,0,z)});
  }
  private house(base: Batch, detail: Batch, x: number, z: number, y: number, w: number, h: number, d: number, angle: number, tint: number, villa=false) {
    base.add('box','facade',x,y+h/2,z,w,h,d,angle,tint);
    base.add('roof','roof',x,y+h,z,w+3,h*.38,d+3,angle);
    detail.add('box','stone',x,y+h+4,z,w*.12,8,d*.15,angle);
    detail.add('box','white',x,y+h*.55,z,w+1,1.3,d+1,angle);
    if(villa) {
      const tx=x+w*.45, tz=z+d*.3;
      base.add('cylinder','facade',tx,y+h*.63,tz,w*.34,h*1.26,w*.34);
      base.add('cone','roof',tx,y+h*1.45,tz,w*.43,h*.5,w*.43);
      base.add('box','facade',x-w*.45,y+h*.32,z+d*.22,w*.6,h*.64,d*.7,angle,0xf3e9d5);
      base.add('roof','roof',x-w*.45,y+h*.64,z+d*.22,w*.65,h*.25,d*.75,angle);
      detail.add('box','white',x,y+4,z+d*.56,w*.75,2,d*.22,angle);
      for(let i=-1;i<=1;i++) detail.add('box','white',x+i*w*.25,y+8,z+d*.6,1.1,8,1.1);
    } else {
      detail.add('box','facade',x,y+h+2,z+d*.4,5,5,4,angle);
      detail.add('roof','roof',x,y+h+4.5,z+d*.4,6,3,5,angle);
    }
  }
  private wall(batch: Batch, a: Point, b: Point, floor: number, height: number, width: number) {
    const dx=b[0]-a[0], dz=b[1]-a[1];
    batch.add('box','stone',(a[0]+b[0])/2,floor+height/2,(a[1]+b[1])/2,width,height,Math.hypot(dx,dz),Math.atan2(dx,dz));
    batch.add('box','town',(a[0]+b[0])/2,floor+height,(a[1]+b[1])/2,width+2,1.5,Math.hypot(dx,dz),Math.atan2(dx,dz));
  }
  private buildMalo() {
    const base=new Batch(), detail=new Batch(), rng=random(1904), polygon=LANDS[0].outline;
    // Dense street blocks, varied ridgelines, taller perimeter houses and a cathedral spire.
    for(let z=-580;z<=60;z+=62) for(let x=690;x<=1260;x+=56) {
      if(!inside(x,z,polygon)||!inside(x-24,z-24,polygon)||!inside(x+24,z+24,polygon)) continue;
      if(Math.abs(x-970)<50 && Math.abs(z+290)<90) continue;
      const width=28+rng()*15, height=22+rng()*19;
      this.house(base,detail,x+(rng()-.5)*9,z+(rng()-.5)*8,9,width,height,32+rng()*13,(rng()-.5)*.16,[0xddd5bc,0xc2bba9,0xeee5d2,0xb7b3a8][Math.floor(rng()*4)]);
    }
    for(let i=0;i<polygon.length;i++) {
      const a=polygon[i],b=polygon[(i+1)%polygon.length]; this.wall(base,a,b,3,17,12);
      base.add('cylinder','stone',a[0],13,a[1],30,25,30);
      detail.add('cylinder','town',a[0],26,a[1],32,2,32);
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      for(let j=0;j<length;j+=16) detail.add('box','stone',a[0]+(b[0]-a[0])*j/length,22,a[1]+(b[1]-a[1])*j/length,7,3,7);
    }
    // Saint-Vincent: nave, transept, square bell tower and slender slate spire.
    base.add('box','stone',980,26,-300,38,34,108); base.add('roof','roof',980,43,-300,42,22,114);
    base.add('box','stone',980,25,-295,90,32,30); base.add('roof','roof',980,41,-295,34,19,94,Math.PI/2);
    base.add('box','stone',980,57,-300,24,52,24); base.add('cone','roof',980,110,-300,26,62,26,Math.PI/4);
    // Château: recognisable mass and four round towers on the north-east corner.
    base.add('box','stone',1230,29,-490,85,38,70);
    for(const x of [1190,1270]) for(const z of [-525,-455]) { base.add('cylinder','stone',x,31,z,29,48,29); base.add('cone','roof',x,61,z,34,18,34); }
    // Harbour warehouses, basins and two open-ended jetties (water remains continuous).
    for(let i=0;i<7;i++) this.house(base,detail,1550+i*70,560,12,52,16,80,0,0xc6c3b8);
    this.wall(base,[1370,220],[1580,430],-3,9,25);
    this.wall(base,[1580,430],[1580,810],-3,9,25);
    this.wall(base,[1100,1100],[990,850],-3,9,25);
    base.add('cylinder','white',180,15,-160,10,24,10); base.add('cylinder','dark',180,28,-160,12,4,12);
    this.dock(base,detail,0);
    this.zone('Saint-Malo · remparts et port',base,detail,1050,-150);
  }
  private buildDinard() {
    const base=new Batch(), detail=new Batch(), rng=random(1880);
    const villas: Point[]=[[-2160,420],[-2270,580],[-2020,530],[-1930,920],[-1820,1040],[-1490,1030],[-1300,820],[-1260,510],[-1140,450],[-1080,620],[-1210,980],[-1280,1290],[-1370,1570]];
    for(let i=0;i<villas.length;i++) {
      const [x,z]=villas[i]; this.house(base,detail,x,z,24,37+rng()*18,26+rng()*18,30+rng()*20,(rng()-.5)*.5,i===0?0xcb947b:0xf2e5ce,true);
      base.add('box','stone',x,11,z,63,26,57);
      // Low garden enclosure, terraces and cypress-like trees.
      this.wall(detail,[x-40,z+32],[x+40,z+32],24,3,2);
      for(let j=0;j<5;j++) { const tx=x-35+rng()*70,tz=z+40+rng()*35; base.add('cylinder','wood',tx,30,tz,2,12,2); base.add('rock','foliage',tx,40,tz,14+rng()*8,22,14); }
    }
    // Grand Hôtel overlooking Clair de Lune; long pale facade, end pavilions, mansard-like roof.
    this.house(base,detail,-1235,1130,24,130,36,44,Math.PI/2,0xf4e8cd);
    for(const z of [1078,1182]) this.house(base,detail,-1235,z,24,52,43,32,0,0xf4e8cd);
    const shore: Point[]=[[-1030,740],[-1100,890],[-1140,1100],[-1220,1430],[-1305,1700]];
    for(let i=0;i<shore.length-1;i++) this.wall(base,shore[i],shore[i+1],0,7,13);
    // Écluse: broad sandy crescent in the recess between both headlands.
    for(let i=0;i<26;i++) { const x=-1840+i*16, z=865-Math.abs(x+1640)*.35; detail.add('box','white',x,5,z,8,6,8); detail.add('roof','roof',x,8,z,9,3,9); }
    // Casino along the back of the beach.
    this.house(base,detail,-1660,1010,24,160,19,44,0,0xeadbc0);
    for(let z=1100;z<2400;z+=140) for(let x=-2300;x<-1450;x+=140) {
      this.house(base,detail,x+rng()*35,z+rng()*25,24,28+rng()*16,17+rng()*16,30,0,0xdfd7c1,rng()>.65);
    }
    // Bec de la Vallée secondary quay, kept distinct from the selected crossing dock.
    this.wall(base,[-1040,825],[-880,860],-4,9,22);
    this.dock(base,detail,1);
    this.zone('Dinard · villas et Clair de Lune',base,detail,-1500,1000);
  }
  private dock(base: Batch, detail: Batch, index: number) {
    const dock=DOCKS[index], [x,z]=dock.point, [lx,lz]=dock.land;
    this.wall(base,[lx,lz],[x,z],-5,9,18);
    base.add('box','wood',x,3.5,z,index===0?65:22,3,index===0?22:65);
    for(let i=-1;i<=1;i++) {
      const px=x+(index===0?i*23:13), pz=z+(index===0?13:i*23);
      base.add('cylinder','dark',px,2,pz,2.5,13,2.5);
      detail.add('cylinder','white',px,8.7,pz,3,1,3);
      detail.add('box','dark',px,2,pz,3,4,3);
    }
    base.add('box','white',lx,9,lz,16,9,12); base.add('roof','roof',lx,13.5,lz,18,5,14);
    for(let i=0;i<(index===0?4:9);i++) {
      const top=4+i*(index===0?1.5:2.6);
      base.add('box','stone',lx-(index===1?i*9:0),top/2,lz-(index===0?i*8:0),index===0?14:10,top,index===0?10:14);
    }
  }
  private buildIslands() {
    const base=new Batch(), detail=new Batch(), rng=random(1707);
    for(const [x,z,w,d] of [[-40,-1200,100,85],[1150,-1130,130,105]]) {
      const corners: Point[]=[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
      for(let i=0;i<4;i++) { this.wall(base,corners[i],corners[(i+1)%4],7,15,12); base.add('cylinder','stone',corners[i][0],17,corners[i][1],20,22,20); }
      this.house(base,detail,x,z,7,w*.55,15,d*.45,0,0xc5b99e);
      base.add('cylinder','dark',x,37,z,1,23,1); detail.add('box','white',x+4,46,z,8,5,.2);
    }
    for(const land of LANDS.filter(l=>l.zone==='islands')) {
      for(let i=0;i<land.outline.length;i++) { const [x,z]=land.outline[i]; base.add('rock','rock',x,1,z,25+rng()*30,10+rng()*14,30+rng()*20,rng()*6); }
    }
    // Quiet tomb marker on the northern tip of Grand Bé.
    base.add('box','stone',390,22,-1120,6,4,12); detail.add('box','stone',390,26,-1127,1,10,1); detail.add('box','stone',390,28,-1127,6,1,1);
    for(const rock of ROCKS) for(let i=0;i<7;i++) {
      const a=rng()*Math.PI*2,r=rng()*rock.radius*.55;
      base.add('rock','rock',rock.x+Math.cos(a)*r,2+rng()*3,rock.z+Math.sin(a)*r,rock.radius*.8,10+rng()*15,rock.radius*.6,rng()*6);
    }
    this.zone('Îlots et forts',base,detail,450,-900);
  }
  private buildSeamarks() {
    for(const buoy of BUOYS) {
      const batch=new Batch(), color=buoy.red?'red':'green';
      batch.add('cylinder',color,0,1,0,6,3,6); batch.add('cylinder',color,0,5,0,1.2,7,1.2);
      batch.add(buoy.red?'cylinder':'cone',color,0,10,0,3,3,3);
      const group=batch.build(this.palette.materials); group.position.set(buoy.x,0,buoy.z); group.name='Balisage fictif'; this.root.add(group); this.buoyGroups.push(group);
    }
  }
  private buildHinterland() {
    for(const id of ['dinard','sillon']) {
      const land=LANDS.find(l=>l.id===id)!, base=new Batch(), detail=new Batch(), rng=random(id==='dinard'?361:550);
      const minX=id==='dinard'?-3500:1600, maxX=id==='dinard'?-1400:3600;
      // Irregular inland clusters break up the skyline; each remains one instanced batch.
      for(let i=0;i<180;i++) {
        const x=minX+rng()*(maxX-minX),z=id==='dinard'?1000+rng()*2300:-850+rng()*3300;
        if(!inside(x-70,z-70,land.outline)||!inside(x+70,z+70,land.outline))continue;
        this.house(base,detail,x,z,land.height,20+rng()*24,12+rng()*22,22+rng()*20,rng()*Math.PI,0xd5cdbb);
      }
      for(let i=0;i<650;i++) {
        const x=minX+rng()*(maxX-minX),z=id==='dinard'?500+rng()*3000:-1000+rng()*4000;
        if(!inside(x-40,z-40,land.outline)||!inside(x+40,z+40,land.outline))continue;
        const h=12+rng()*16;
        base.add('rock','foliage',x,land.height+h*.65,z,14+rng()*18,h,14+rng()*18,rng()*6,[0x9baf7b,0xb8c392,0x78926d][i%3]);
        detail.add('cylinder','wood',x,land.height+4,z,2,8,2);
      }
      this.zone(id==='dinard'?'Arrière-pays dinardais':'Saint-Servan et arrière-port',base,detail,(minX+maxX)/2,1300);
    }
    const coastline=new Batch(),rng=random(558);
    for(const id of ['dinard','sillon']) {
      const land=LANDS.find(l=>l.id===id)!;
      for(let i=0;i<land.outline.length-1;i++) {
        const a=land.outline[i],b=land.outline[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
        if(length>1000)continue;
        for(let d=0;d<length;d+=35) {
          const x=a[0]+(b[0]-a[0])*d/length,z=a[1]+(b[1]-a[1])*d/length;
          if(id==='dinard'&&x>-1900&&x<-1400&&z<950)continue;
          coastline.add('rock','rock',x,1,z,20+rng()*20,9+rng()*12,16+rng()*15,rng()*6);
        }
      }
    }
    this.root.add(coastline.build(this.palette.materials));
  }
  setQuality(quality: Quality) { this.quality=quality; }
  update(camera: Vector3, time: number) {
    for(const zone of this.zones) {
      const distance=camera.distanceTo(zone.center);
      zone.detail.visible=distance<BAY.detailDistance[this.quality];
      // Coastal silhouettes and terrain stay present; only small architectural details are culled.
    }
    this.buoyGroups.forEach((group,i)=> { group.position.y=Math.sin(time*1.2+i)*.23; group.rotation.z=Math.sin(time*.8+i)*.025; });
  }
  dispose() {
    const geometries=new Set<BufferGeometry>();
    this.root.traverse(object=> { if(object instanceof Mesh) { geometries.add(object.geometry); if(object instanceof InstancedMesh) object.dispose(); } });
    geometries.forEach(geometry=>geometry.dispose()); this.palette.dispose();
  }
}
