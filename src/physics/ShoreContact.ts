import { DOCKS, LANDS, ROCKS, inside } from '../world/geography.ts';
import type { Point } from '../world/geography.ts';
import { BOAT } from '../ships/parameters.ts';
import type { ExternalForce, VesselState } from './VesselDynamics.ts';

interface Obstacle {name:string;kind:'shore'|'quay';polygon:readonly Point[];bounds?:{minX:number;maxX:number;minZ:number;maxZ:number}}
/** Hull contacts shared by physics and radar; damage is handled by Marine. */
export class ShoreContact {
  readonly obstacles:Obstacle[]=[];
  private result:ExternalForce={x:0,z:0,yaw:0};
  label='';
  impactSpeed=0;
  constructor() {
    for(const land of LANDS) {
      const center=land.outline.reduce((sum,p)=>[sum[0]+p[0]/land.outline.length,sum[1]+p[1]/land.outline.length],[0,0]);
      this.obstacles.push({name:land.name,kind:'shore',polygon:land.outline.map(p=>[center[0]+(p[0]-center[0])*(land.cliff?1.005:1.02),center[1]+(p[1]-center[1])*(land.cliff?1.005:1.02)])});
    }
    for(const [i,dock] of DOCKS.entries()) {
      const [x,z]=dock.point,w=i===0?65:22,d=i===0?22:65;
      this.rectangle(dock.name,x,z,w,d);
      const [lx,lz]=dock.land;
      const length=Math.hypot(x-lx,z-lz),nx=(z-lz)/length*9,nz=-(x-lx)/length*9;
      this.obstacles.push({name:dock.name,kind:'quay',polygon:[[lx+nx,lz+nz],[x+nx,z+nz],[x-nx,z-nz],[lx-nx,lz-nz]]});
    }
    for(const [a,b,width] of [ [[1370,220],[1580,430],25],[[1580,430],[1580,810],25],[[1100,1100],[990,850],25],[[-1040,825],[-880,860],22] ] as const) {
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=(b[1]-a[1])/length*width/2,nz=-(b[0]-a[0])/length*width/2;
      this.obstacles.push({name:'Quai',kind:'quay',polygon:[[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]]});
    }
  }
  private rectangle(name:string,x:number,z:number,w:number,d:number) {this.obstacles.push({name,kind:'quay',polygon:[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]]});}
  private reportContact(name:string,vx:number,vz:number,nx:number,nz:number):void {
    this.label=name;this.impactSpeed=Math.max(this.impactSpeed,-(vx*nx+vz*nz));
  }
  evaluate(s:VesselState):ExternalForce {
    this.result.x=this.result.z=this.result.yaw=0;this.label='';this.impactSpeed=0;
    const sin=Math.sin(s.heading),cos=Math.cos(s.heading),radius=BOAT.beam/2;
    for(const forward of [-9,0,9]) {
      const x=s.x+sin*forward,z=s.z-cos*forward;
      const vx=sin*s.surge+cos*(s.sway+s.yawRate*forward),vz=-cos*s.surge+sin*(s.sway+s.yawRate*forward);
      let penetration=0,nx=0,nz=0;
      for(const obstacle of this.obstacles) {
        const b=obstacle.bounds??= {minX:Math.min(...obstacle.polygon.map(p=>p[0])),maxX:Math.max(...obstacle.polygon.map(p=>p[0])),minZ:Math.min(...obstacle.polygon.map(p=>p[1])),maxZ:Math.max(...obstacle.polygon.map(p=>p[1]))};
        if(x+radius<b.minX||x-radius>b.maxX||z+radius<b.minZ||z-radius>b.maxZ)continue;
        let distance=Infinity,px=0,pz=0;
        for(let i=0;i<obstacle.polygon.length;i++) {
          const a=obstacle.polygon[i],b=obstacle.polygon[(i+1)%obstacle.polygon.length],dx=b[0]-a[0],dz=b[1]-a[1];
          const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
          const qx=a[0]+dx*t,qz=a[1]+dz*t,d=Math.hypot(x-qx,z-qz);
          if(d<distance){distance=d;px=qx;pz=qz;}
        }
        const within=inside(x,z,obstacle.polygon),depth=radius+(within?distance:-distance);
        if(depth>0&&distance>1e-6) {
          const sign=within?-1:1,hitX=(x-px)/distance*sign,hitZ=(z-pz)/distance*sign;
          if(depth>penetration){penetration=depth;nx=hitX;nz=hitZ;}
          // Fendered sides still repel the quay, including the sides of the end circles.
          // Only a normal facing the bow/stern cap counts as a quay incident.
          const endContact=forward!==0&&Math.sign(forward)*(sin*hitX-cos*hitZ)<-.5;
          if(obstacle.kind!=='quay'||endContact)this.reportContact(obstacle.name,vx,vz,hitX,hitZ);
        }
      }
      for(const rock of ROCKS) {
        const dx=x-rock.x,dz=z-rock.z,distance=Math.hypot(dx,dz),depth=radius+rock.radius*.7-distance;
        if(depth>0&&distance>1e-6){
          const hitX=dx/distance,hitZ=dz/distance;
          if(depth>penetration){penetration=depth;nx=hitX;nz=hitZ;}
          this.reportContact('Rochers',vx,vz,hitX,hitZ);
        }
      }
      if(penetration>0) {
        const normalVelocity=vx*nx+vz*nz;
        const force=Math.max(0,BOAT.contact.stiffness*penetration-BOAT.contact.damping*normalVelocity);
        const fx=nx*force-(vx-nx*normalVelocity)*BOAT.contact.friction,fz=nz*force-(vz-nz*normalVelocity)*BOAT.contact.friction;
        this.result.x+=fx;this.result.z+=fz;this.result.yaw+=forward*(cos*fx+sin*fz);
      }
    }
    return this.result;
  }
}
