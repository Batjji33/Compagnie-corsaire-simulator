import { BoxGeometry,CylinderGeometry,Group,Mesh,MeshStandardMaterial,SphereGeometry,TorusGeometry } from 'three';
import type { ChannelNavigation } from '../core/ChannelNavigation';
import type { TeamId } from '../incidents/definitions';
/** Compact symbolic crew/equipment animations, deliberately non-graphic. */
export class IncidentView {
 readonly root=new Group();private deck=new Group();private smoke=new Group();private helicopter=new Group();private rotor=new Group();private marker=new Group();private assistance=new Group();private cabin=new Group();private rescueFleet=new Group();private evacuees=new Group();private cable=new Group();private people=new Map<TeamId,Group>();private resources:{dispose():void}[]=[];
 constructor(){
  const geometry={box:new BoxGeometry(1,1,1),sphere:new SphereGeometry(1,8,6),cylinder:new CylinderGeometry(1,1,1,8),ring:new TorusGeometry(1,.18,6,16)};this.resources.push(...Object.values(geometry));
  const paints=Object.fromEntries(Object.entries({crew:0xe8a741,nav:0x3d78ab,light:0xf2eee6,dark:0x3a4145,smoke:0x737d83,medical:0x4586bd,orange:0xeb7b35}).map(([key,color])=>[key,new MeshStandardMaterial({color,roughness:.8})]));this.resources.push(...Object.values(paints));
  const part=(parent:Group,type:keyof typeof geometry,paint:keyof typeof paints,x:number,y:number,z:number,w:number,h:number,d:number)=>{const m=new Mesh(geometry[type],paints[paint]);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;};
  this.root.add(this.deck,this.helicopter,this.marker,this.assistance,this.rescueFleet);this.deck.add(this.smoke,this.cabin,this.evacuees);
  this.helicopter.name='rescue-helicopter';this.rescueFleet.name='medical-rescue-fleet';this.evacuees.name='assembly-passengers';this.marker.name='rescue-marker';
  for(const [i,team] of (['technical','navigation','passengers'] as const).entries()){
   const person=new Group();part(person,'sphere','light',0,1.8,0,.22,.22,.22);part(person,'box',team==='navigation'?'nav':'crew',0,1.15,0,.55,.8,.35);part(person,'box','dark',-.16,.45,0,.18,.9,.2);part(person,'box','dark',.16,.45,0,.18,.9,.2);this.deck.add(person);this.people.set(team,person);person.position.x=-4+i*4;
  }
  for(let i=0;i<3;i++)part(this.smoke,'sphere','smoke',0,i*3,0,2+i,2+i,2+i);
  part(this.helicopter,'sphere','light',0,0,0,3,2,6);part(this.helicopter,'box','medical',0,0,-4,4,1.5,.2);part(this.helicopter,'box','light',0,1,7,1,1,9);part(this.helicopter,'box','medical',0,3,10,1,4,2);
  this.helicopter.add(this.rotor);part(this.rotor,'box','dark',0,2.7,0,18,.12,.25);part(this.rotor,'box','dark',0,2.7,0,.25,.12,18);
  this.helicopter.add(this.cable);part(this.cable,'cylinder','dark',0,-8,0,.06,16,.06);part(this.cable,'box','orange',0,-16,0,1.5,.5,2.5);
  const ring=part(this.marker,'ring','orange',0,.4,0,1.8,1.8,1.8);ring.rotation.x=Math.PI/2;part(this.marker,'cylinder','light',0,2,0,.15,4,.15);part(this.marker,'sphere','orange',0,4,0,.6,.6,.6);
  part(this.assistance,'box','medical',0,1,0,3,2,9);part(this.assistance,'box','light',0,2.5,-1,2,2,4);
  for(let i=0;i<3;i++){
   const boat=new Group();boat.name=i<2?'medical-boat-'+i:'evacuation-lifeboat';this.rescueFleet.add(boat);
   part(boat,'box',i<2?'light':'orange',0,1.5,0,i<2?7:5,3,i<2?20:12);
   part(boat,'sphere',i<2?'light':'orange',0,1.5,-(i<2?9:5),i<2?3.5:2.5,1.5,3);
   part(boat,'box',i<2?'medical':'light',0,4,-1,i<2?5:3,3,7);
   part(boat,'box','dark',0,4.5,-4.6,4,1.2,.15);
   if(i<2){part(boat,'box','light',0,5.6,-1,3,.2,.7);part(boat,'box','light',0,5.6,-1,.7,.2,3);part(boat,'sphere','medical',0,6.2,-1,.5,.5,.5);}
  }
  for(let i=0;i<12;i++){
   const person=new Group();part(person,'sphere','light',0,1.8,0,.3,.3,.3);part(person,'box','orange',0,1,0,.7,1.2,.5);this.evacuees.add(person);person.position.set(-8+(i%4)*5,27,-25+Math.floor(i/4)*5);
  }
  part(this.cabin,'box','medical',0,0,0,8,1,4);this.cabin.position.set(-10,27,-18);
 }
 render(n:ChannelNavigation):void{
  const s=n.state,e=n.incidents.state,time=e.time;this.deck.rotation.y=-s.heading;this.deck.position.y=0;
  for(const [team,person] of this.people){const task=n.incidents.teamStatus(team);person.visible=!!task;if(!task)continue;const a=e.active.find(a=>a.id===task.incident)!;
   const progress=Math.min(1,task.elapsed/45),target=a.kind==='fire'||a.kind==='engine'?30:a.kind==='medical'||a.kind==='helicopter'?-35:-15;
   person.position.y=27;person.position.z=-5+(target+5)*progress;person.rotation.z=Math.sin(time*4)*.04;person.position.x=team==='technical'?-6:team==='passengers'?6:0;
  }
  const fire=e.active.find(a=>a.kind==='fire'||a.kind==='galley');this.smoke.visible=!!fire;this.smoke.position.set(0,29,35);this.smoke.scale.setScalar(fire?(fire.stage>=2?.5:1)+Math.sin(time)*.06:1);this.smoke.rotation.y=time*.1;
  const evacuation=e.active.find(a=>a.kind==='evacuation'),medicalBoat=e.active.find(a=>a.kind==='medicalBoat');
  const flight=e.active.find(a=>a.kind==='helicopter'||a.kind==='evacuation'),flightTask=flight&&e.tasks.find(t=>t.incident===flight.id&&(t.choice==='flight'||t.choice==='rescue-flight'));
  const canFly=n.incidentContext.wind<25&&n.incidentContext.waves<3;
  this.helicopter.visible=!!flightTask&&canFly;this.cable.visible=!!flightTask&&n.incidents.gate(n.incidents.choices(flight!).find(c=>c.id===flightTask.choice)!,flight!,n.incidentContext);
  const arrival=flightTask?Math.min(1,flightTask.elapsed/90):0;
  this.helicopter.position.set(35+(1-arrival)*260+Math.sin(time*.05)*3,55+(1-arrival)*50,50);this.rotor.rotation.y=time*20;
  const mob=e.active.find(a=>a.kind==='mob'||a.kind==='distress');this.marker.visible=!!mob;if(mob){this.marker.position.set(mob.marker.x-s.x,.2+Math.sin(time)*.2,mob.marker.z-s.z);}
  this.assistance.visible=n.incidents.modifiers.trafficAssistance||!!mob&&e.tasks.some(t=>t.incident===mob.id&&t.choice==='external');this.assistance.position.set(80+Math.sin(time*.01)*25,0,80+Math.cos(time*.01)*25);this.assistance.rotation.y=-time*.01;
  this.cabin.visible=e.active.some(a=>a.kind==='cabin'||a.kind==='medical'||a.kind==='electrical');this.cabin.scale.y=.8+Math.sin(time*2)*.15;
  const rescue=evacuation??medicalBoat;this.rescueFleet.visible=!!rescue&&rescue.stage>=1;this.rescueFleet.rotation.y=-s.heading;
  if(rescue){
   const approach=Math.max(0,1-(time-rescue.started-180)/180);
   this.rescueFleet.children.forEach((boat,i)=>{
    boat.visible=!!evacuation||i===0;
    boat.position.set((i===1?-1:1)*(65+i*18+approach*350),1+Math.sin(time*.6+i)*.35,-60+i*60+approach*150);
    boat.rotation.y=i===1?Math.PI:0;
   });
  }
  this.evacuees.visible=!!evacuation&&evacuation.stage>=1;
  const remaining=evacuation?.evacuation?1-evacuation.evacuation.transferred/evacuation.evacuation.total:0;
  this.evacuees.children.forEach((person,i)=>person.visible=i<Math.ceil(remaining*12));
 }
 dispose():void{this.resources.forEach(r=>r.dispose());this.root.removeFromParent();}
}
