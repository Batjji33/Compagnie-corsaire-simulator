import { BoxGeometry,CylinderGeometry,Group,Mesh,MeshStandardMaterial,SphereGeometry,TorusGeometry } from 'three';
import type { ChannelNavigation } from '../core/ChannelNavigation';
import type { TeamId } from '../incidents/definitions';
/** Compact symbolic crew/equipment animations, deliberately non-graphic. */
export class IncidentView {
 readonly root=new Group();private deck=new Group();private smoke=new Group();private helicopter=new Group();private rotor=new Group();private marker=new Group();private assistance=new Group();private cabin=new Group();private people=new Map<TeamId,Group>();private resources:{dispose():void}[]=[];
 constructor(){
  const geometry={box:new BoxGeometry(1,1,1),sphere:new SphereGeometry(1,8,6),cylinder:new CylinderGeometry(1,1,1,8),ring:new TorusGeometry(1,.18,6,16)};this.resources.push(...Object.values(geometry));
  const paints=Object.fromEntries(Object.entries({crew:0xe8a741,nav:0x3d78ab,light:0xf2eee6,dark:0x3a4145,smoke:0x737d83,medical:0x4586bd,orange:0xeb7b35}).map(([key,color])=>[key,new MeshStandardMaterial({color,roughness:.8})]));this.resources.push(...Object.values(paints));
  const part=(parent:Group,type:keyof typeof geometry,paint:keyof typeof paints,x:number,y:number,z:number,w:number,h:number,d:number)=>{const m=new Mesh(geometry[type],paints[paint]);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;};
  this.root.add(this.deck,this.helicopter,this.marker,this.assistance);this.deck.add(this.smoke,this.cabin);
  for(const [i,team] of (['technical','navigation','passengers'] as const).entries()){
   const person=new Group();part(person,'sphere','light',0,1.8,0,.22,.22,.22);part(person,'box',team==='navigation'?'nav':'crew',0,1.15,0,.55,.8,.35);part(person,'box','dark',-.16,.45,0,.18,.9,.2);part(person,'box','dark',.16,.45,0,.18,.9,.2);this.deck.add(person);this.people.set(team,person);person.position.x=-4+i*4;
  }
  for(let i=0;i<3;i++)part(this.smoke,'sphere','smoke',0,i*3,0,2+i,2+i,2+i);
  part(this.helicopter,'sphere','light',0,0,0,3,2,6);part(this.helicopter,'box','medical',0,0,-4,4,1.5,.2);part(this.helicopter,'box','light',0,1,7,1,1,9);part(this.helicopter,'box','medical',0,3,10,1,4,2);
  this.helicopter.add(this.rotor);part(this.rotor,'box','dark',0,2.7,0,18,.12,.25);part(this.rotor,'box','dark',0,2.7,0,.25,.12,18);
  const ring=part(this.marker,'ring','orange',0,.4,0,1.8,1.8,1.8);ring.rotation.x=Math.PI/2;part(this.marker,'cylinder','light',0,2,0,.15,4,.15);part(this.marker,'sphere','orange',0,4,0,.6,.6,.6);
  part(this.assistance,'box','medical',0,1,0,3,2,9);part(this.assistance,'box','light',0,2.5,-1,2,2,4);
  part(this.cabin,'box','medical',0,0,0,8,1,4);this.cabin.position.set(-10,27,-18);
 }
 render(n:ChannelNavigation):void{
  const s=n.state,e=n.incidents.state,time=e.time;this.deck.rotation.y=-s.heading;this.deck.position.y=0;
  for(const [team,person] of this.people){const task=n.incidents.teamStatus(team);person.visible=!!task;if(!task)continue;const a=e.active.find(a=>a.id===task.incident)!;
   const progress=Math.min(1,task.elapsed/45),target=a.kind==='fire'||a.kind==='engine'?30:a.kind==='medical'||a.kind==='helicopter'?-35:-15;
   person.position.y=27;person.position.z=-5+(target+5)*progress;person.rotation.z=Math.sin(time*4)*.04;person.position.x=team==='technical'?-6:team==='passengers'?6:0;
  }
  const fire=e.active.find(a=>a.kind==='fire');this.smoke.visible=!!fire;this.smoke.position.set(0,29,35);this.smoke.scale.setScalar(fire?(fire.stage>=2?.5:1)+Math.sin(time)*.06:1);this.smoke.rotation.y=time*.1;
  const flight=e.active.find(a=>a.kind==='helicopter'),flightTask=flight&&e.tasks.find(t=>t.incident===flight.id&&t.choice==='flight');this.helicopter.visible=!!flightTask;
  this.helicopter.position.set(25+Math.sin(time*.05)*10,55,50);this.rotor.rotation.y=time*20;
  const mob=e.active.find(a=>a.kind==='mob');this.marker.visible=!!mob;if(mob){this.marker.position.set(mob.marker.x-s.x,.2+Math.sin(time)*.2,mob.marker.z-s.z);}
  this.assistance.visible=n.incidents.modifiers.trafficAssistance||!!mob&&e.tasks.some(t=>t.incident===mob.id&&t.choice==='external');this.assistance.position.set(80+Math.sin(time*.01)*25,0,80+Math.cos(time*.01)*25);this.assistance.rotation.y=-time*.01;
  this.cabin.visible=e.active.some(a=>a.kind==='cabin'||a.kind==='medical'||a.kind==='electrical');this.cabin.scale.y=.8+Math.sin(time*2)*.15;
 }
 dispose():void{this.resources.forEach(r=>r.dispose());this.root.removeFromParent();}
}
