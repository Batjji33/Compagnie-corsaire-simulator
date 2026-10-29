import { DOCKS, LANDS, ROCKS, inside } from '../world/geography.ts';
import type { Point } from '../world/geography.ts';
import { BOAT } from '../ships/parameters.ts';
import type { ExternalForce, VesselState } from './VesselDynamics.ts';

interface Obstacle {name:string;polygon:readonly Point[]}
/** Soft hull contacts, no damage/scoring/mooring. Shapes match visible coast and quays. */
export class ShoreContact {
  private obstacles:Obstacle[]=[];
  private result:ExternalForce={x:0,z:0,yaw:0};
  label='';
  constructor() {
    for(const land of LANDS) {
      const center=land.outline.reduce((sum,p)=>[sum[0]+p[0]/land.outline.length,sum[1]+p[1]/land.outline.length],[0,0]);
      this.obstacles.push({name:land.name,polygon:land.outline.map(p=>[center[0]+(p[0]-center[0])*1.02,center[1]+(p[1]-center[1])*1.02])});
    }
    for(const [i,dock] of DOCKS.entries()) {
      const [x,z]=dock.point,w=i===0?65:22,d=i===0?22:65;
      this.rectangle(dock.name,x,z,w,d);
      const [lx,lz]=dock.land;
      this.rectangle(dock.name,(x+lx)/2,(z+lz)/2,i===0?18:Math.abs(x-lx),i===0?Math.abs(z-lz):18);
    }
    for(const [a,b,width] of [ [[1370,220],[1580,430],25],[[1580,430],[1580,810],25],[[1100,1100],[990,850],25],[[-1040,825],[-880,860],22] ] as const) {
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=(b[1]-a[1])/length*width/2,nz=-(b[0]-a[0])/length*width/2;
      this.obstacles.push({name:'Quai',polygon:[[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]]});
    }
  }
  private rectangle(name:string,x:number,z:number,w:number,d:number) {this.obstacles.push({name,polygon:[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]]});}
  evaluate(s:VesselState):ExternalForce {
    this.result.x=this.result.z=this.result.yaw=0;this.label='';
    const sin=Math.sin(s.heading),cos=Math.cos(s.heading),radius=BOAT.beam/2;
    for(const forward of [-9,0,9]) {
      const x=s.x+sin*forward,z=s.z-cos*forward;
      let penetration=0,nx=0,nz=0,label='';
      for(const obstacle of this.obstacles) {
        let distance=Infinity,px=0,pz=0;
        for(let i=0;i<obstacle.polygon.length;i++) {
          const a=obstacle.polygon[i],b=obstacle.polygon[(i+1)%obstacle.polygon.length],dx=b[0]-a[0],dz=b[1]-a[1];
          const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
          const qx=a[0]+dx*t,qz=a[1]+dz*t,d=Math.hypot(x-qx,z-qz);
          if(d<distance){distance=d;px=qx;pz=qz;}
        }
        const within=inside(x,z,obstacle.polygon),depth=radius+(within?distance:-distance);
        if(depth>penetration&&distance>1e-6) {penetration=depth;const sign=within?-1:1;nx=(x-px)/distance*sign;nz=(z-pz)/distance*sign;label=obstacle.name;}
      }
      for(const rock of ROCKS) {
        const dx=x-rock.x,dz=z-rock.z,distance=Math.hypot(dx,dz),depth=radius+rock.radius*.7-distance;
        if(depth>penetration&&distance>1e-6){penetration=depth;nx=dx/distance;nz=dz/distance;label='Rochers';}
      }
      if(penetration>0) {
        const vx=sin*s.surge+cos*(s.sway+s.yawRate*forward),vz=-cos*s.surge+sin*(s.sway+s.yawRate*forward);
        const normalVelocity=vx*nx+vz*nz;
        const force=Math.max(0,BOAT.contact.stiffness*penetration-BOAT.contact.damping*normalVelocity);
        const fx=nx*force-(vx-nx*normalVelocity)*BOAT.contact.friction,fz=nz*force-(vz-nz*normalVelocity)*BOAT.contact.friction;
        this.result.x+=fx;this.result.z+=fz;this.result.yaw+=forward*(cos*fx+sin*fz);this.label=label;
      }
    }
    return this.result;
  }
}
