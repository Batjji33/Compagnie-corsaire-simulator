import { BOAT } from '../ships/parameters.ts';
import { ROUTE } from '../world/geography.ts';
import type { SeaState } from '../weather/Marine.ts';
import type { DockingRules } from './docking.ts';
import { EXCURSIONS } from './excursions.ts';
import { MISSION_SECONDS } from './timing.ts';

export interface Pose { x:number; z:number; heading:number }
export interface Waypoint extends Omit<Pose,'heading'> {
  label:string; radius?:number; dwellSeconds?:number; maxKnots?:number;
  comment?:{title:string;text:string;source:string};
}
export interface MissionDefinition {
  id:string; title:string; description:string;
  origin:{name:string; berth:Pose; exitDistance:number; dockId?:string};
  destination:{name:string; berth:Pose; headings:number[]; approach:Pose; approachRadius:number; dockingRadius:number; dockId?:string};
  route:Waypoint[];
  excursion?:{source:string;reference:string;adaptation?:string};
  passengers:number; boardingSeconds:number; unloadingSeconds:number;
  departureHour:number; sea:SeaState; windDirection:number;
  targetSeconds:number; cruiseKnots:number;
  rules:{departureKnots:number;approachKnots:number;maxGroundedSeconds:number;maxDamage:number};
  docking?:DockingRules;
  comments:Record<MissionPhase,string>;
}
export type MissionPhase='preparation'|'boarding'|'departure'|'crossing'|'approach'|'docking'|'unloading'|'complete'|'failed';
export const MALO_DINARD:MissionDefinition={
  id:'malo-dinard',title:'Saint-Malo → Dinard',description:'180 passagers, de la cale de Dinan au ponton du Clair de Lune.',
  origin:{name:'Saint-Malo · Cale de Dinan',berth:{...BOAT.spawn},exitDistance:80},
  destination:{name:'Dinard · Clair de Lune',berth:{x:-945,z:1120,heading:0},headings:[0,Math.PI],
    approach:{x:-945,z:1240,heading:0},approachRadius:220,dockingRadius:95},
  route:ROUTE.slice(1).map((p,i)=>({x:p[0],z:p[1],label:['Sortie du port','Milieu de baie','Cap sur Dinard','Réduire la vitesse','Clair de Lune'][i]})),
  passengers:180,boardingSeconds:18,unloadingSeconds:12,departureHour:14,sea:'belle',windDirection:250,
  targetSeconds:MISSION_SECONDS.dinard,cruiseKnots:17,
  rules:{departureKnots:4,approachKnots:5,maxGroundedSeconds:15,maxDamage:.85},
  comments:{
    preparation:'Consultez le trajet et les conditions avant de commencer l’embarquement.',
    boarding:'Amarres en place. Embarquement en cours, moteurs au neutre.',
    departure:'Passagers à bord. Larguez les amarres, puis quittez doucement la cale. Restez sous 4 nd près du quai.',
    crossing:'Cap sur Dinard. Croisière conseillée : 17 nd. Les points de passage sont facultatifs.',
    approach:'Ponton du Clair de Lune : côté est du quai, repère ocre. Réduisez sous 5 nd ; préparez la marche arrière pour freiner.',
    docking:'Rejoignez la zone ocre à faible vitesse, puis utilisez « Amarrer et débarquer ». Les boudins protègent les appuis latéraux au quai.',
    unloading:'Amarres en place. Débarquement des passagers en cours.',
    complete:'Traversée terminée. Les passagers ont rejoint Dinard.',failed:'Mission interrompue. Reprenez au dernier point sûr ou recommencez.',
  },
};
export const MISSIONS=[MALO_DINARD,...EXCURSIONS];
