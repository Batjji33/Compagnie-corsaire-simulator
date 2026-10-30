import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EXCURSIONS, CEZEMBRE, CAP_FREHEL, FORT_LA_LATTE} from '../src/missions/excursions.ts';
import {Mission} from '../src/missions/Mission.ts';
import type {Telemetry} from '../src/missions/Mission.ts';
import {Passengers} from '../src/passengers/Passengers.ts';
import {ShoreContact} from '../src/physics/ShoreContact.ts';
import {VesselDynamics} from '../src/physics/VesselDynamics.ts';
import {depthAt} from '../src/weather/Marine.ts';
import {TourGuide} from '../src/excursions/comments.ts';
import {freshData, recordResult, validRun, defaultMarine} from '../src/saves/GameStore.ts';

const telemetry=(x:number,z:number,speed=0):Telemetry=>({x,z,speed,heading:0,yawRate:0,port:0,starboard:0,commandPort:0,commandStarboard:0,damage:0,contact:'',clearance:5});
const depart=(m:Mission)=>{
  const d=m.definition;m.board();m.update(d.boardingSeconds,telemetry(d.origin.berth.x,d.origin.berth.z));
  m.release();m.update(1,telemetry(d.route[0].x,d.route[0].z));assert.equal(m.phase,'crossing');
};

test('three excursions have ordered coastal waypoints, documented circuits and docked endpoints',()=>{
  assert.equal(EXCURSIONS.length,3);
  assert.equal(new Set(EXCURSIONS.map(d=>d.id)).size,3);
  assert.ok(CAP_FREHEL.route.some(p=>p.label==='Fort La Latte'));
  assert.ok(CAP_FREHEL.route.some(p=>p.label.startsWith('Cap Fréhel')));
  assert.ok(FORT_LA_LATTE.excursion?.adaptation);
  for(const d of EXCURSIONS){
    assert.ok(d.origin.dockId&&d.destination.dockId);assert.ok(d.excursion?.source.startsWith('https://compagniecorsaire.com/'));
    assert.ok(d.route.filter(p=>p.comment).length>=2);assert.ok(d.passengers>0&&d.passengers<=270);
  }
});

test('every excursion segment and berth is clear for a full hull, including at simulated low tide',()=>{
  const v=new VesselDynamics(),shore=new ShoreContact();
  for(const d of EXCURSIONS){
    const points=[d.origin.berth,...d.route,d.destination.berth];
    for(let j=1;j<points.length;j++){
      const a=points[j-1],b=points[j],distance=Math.hypot(b.x-a.x,b.z-a.z);
      for(let i=0;i<=Math.ceil(distance/5);i++){
        const t=i/Math.max(1,Math.ceil(distance/5));const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
        v.reset({x,z,heading:Math.atan2(b.x-a.x,a.z-b.z)});const f=shore.evaluate(v.state);
        assert.equal(Math.hypot(f.x,f.z),0,`${d.id} segment ${j} at ${x},${z}: ${shore.label}`);
        assert.ok(depthAt(x,z,-2.4)>2.9,`${d.id}: low tide clearance at ${x},${z}`);
      }
    }
  }
});

test('round trips cannot finish at departure or skip sightseeing points, even beyond the old boundary',()=>{
  const m=new Mission(CAP_FREHEL);depart(m);
  const end=CAP_FREHEL.destination.berth;m.update(1,telemetry(end.x,end.z));assert.equal(m.phase,'crossing');assert.equal(m.dock(telemetry(end.x,end.z)),false);
  const fort=CAP_FREHEL.route.find(p=>p.label==='Fort La Latte')!;
  m.update(30,telemetry(fort.x,fort.z));assert.equal(m.phase,'crossing');assert.equal(m.state.visited.length,0);
  const first=CAP_FREHEL.route[0];m.update(.1,telemetry(first.x,first.z));assert.deepEqual(m.state.visited,[0]);
});

test('panoramas require slow continuous observation and progress survives save and resume',()=>{
  const d=FORT_LA_LATTE,m=new Mission(d);depart(m);
  const index=d.route.findIndex(p=>p.dwellSeconds);m.state.visited=Array.from({length:index},(_,i)=>i);
  const p=d.route[index];m.update(20,telemetry(p.x,p.z,3));assert.equal(m.state.hold,0);
  m.update(8,telemetry(p.x,p.z,0));assert.equal(m.state.hold,8);
  const v=new VesselDynamics();v.reset({x:p.x,z:p.z,heading:0});
  const saved={missionId:d.id,mission:structuredClone(m.state),vessel:{...v.state},command:{...v.command},marine:defaultMarine(),damage:0};
  assert.ok(validRun(saved));const restored=new Mission(d,saved.mission);
  restored.update(1,telemetry(p.x+300,p.z));assert.equal(restored.state.hold,0);
  restored.update(p.dwellSeconds!,telemetry(p.x,p.z));assert.ok(restored.state.visited.includes(index));
});

test('all excursions board real passenger counts, visit the route, dock and only then unload and record results',()=>{
  for(const d of EXCURSIONS){
    const m=new Mission(d),people=new Passengers();m.board();
    m.update(d.boardingSeconds/2,telemetry(d.origin.berth.x,d.origin.berth.z));
    people.update(0,m.phase,m.state.phaseTime,d.passengers,d.boardingSeconds,d.unloadingSeconds,0,0,0);
    assert.equal(people.count,Math.floor(d.passengers/2));assert.equal(m.moored,true);
    m.update(d.boardingSeconds/2,telemetry(d.origin.berth.x,d.origin.berth.z));m.release();m.update(.1,telemetry(d.route[0].x,d.route[0].z));
    for(const p of d.route){
      m.update(p.dwellSeconds??.1,telemetry(p.x,p.z));
      people.update(0,m.phase,m.state.phaseTime,d.passengers,d.boardingSeconds,d.unloadingSeconds,0,0,0);
      assert.equal(people.count,d.passengers,'no disembarkation at observation points');
    }
    assert.equal(m.state.visited.length,d.route.length);
    const end=d.destination.berth;
    m.update(.1,telemetry(end.x,end.z));m.update(.1,telemetry(end.x,end.z));assert.equal(m.phase,'docking');
    assert.ok(m.dock(telemetry(end.x,end.z)));assert.equal(m.result,undefined);assert.ok(m.moored);
    m.update(d.unloadingSeconds,telemetry(end.x,end.z));assert.equal(m.phase,'complete');
    people.update(0,m.phase,m.state.phaseTime,d.passengers,d.boardingSeconds,d.unloadingSeconds,0,0,0);assert.equal(people.count,0);
    const data=freshData();assert.ok(recordResult(data,m.result!));assert.equal(data.stats.passengers,d.passengers);
  }
});

test('authored itinerary comments are shown once and respect muted/manual preferences',()=>{
  const guide=new TourGuide(),text=CEZEMBRE.route.find(p=>p.comment)!.comment!;
  const comment={id:'excursion-test',x:0,z:0,radius:100,...text};
  assert.ok(guide.offer(comment));assert.equal(guide.selected?.text,text.text);assert.equal(guide.offer(comment),false);
  guide.choose(comment.id);guide.update(60,9000,0);assert.equal(guide.selected,undefined);
  const next={...comment,id:'next'};guide.muted=true;assert.equal(guide.offer(next),false);
  guide.muted=false;assert.ok(guide.offer(next));guide.update(60,9000,0);assert.ok(guide.selected,'manual narration is waiting for user');
  assert.ok(guide.offer({...comment,id:'current-landmark'}));assert.equal(guide.selected?.id,'current-landmark','a new landmark replaces a stale manual caption');
  guide.automatic=false;assert.equal(guide.offer({...comment,id:'disabled'}),false);
});
