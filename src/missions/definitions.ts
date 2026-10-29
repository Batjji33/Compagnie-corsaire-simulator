import { BOAT } from '../ships/parameters.ts';
import { ROUTE } from '../world/geography.ts';
import type { SeaState } from '../weather/Marine.ts';

export interface Pose { x:number; z:number; heading:number }
export interface MissionDefinition {
  id:string; title:string; description:string;
  origin:{name:string; berth:Pose; exitDistance:number};
  destination:{name:string; berth:Pose; headings:number[]; approach:Pose; approachRadius:number; dockingRadius:number};
  route:{x:number;z:number;label:string}[];
  passengers:number; boardingSeconds:number; unloadingSeconds:number;
  departureHour:number; sea:SeaState; windDirection:number;
  targetSeconds:number; maxSeconds:number; cruiseKnots:number;
  rules:{departureKnots:number;approachKnots:number;maxGroundedSeconds:number;maxDamage:number};
  docking:{distance:number; speedKnots:number; angleDegrees:number; holdSeconds:number};
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
  targetSeconds:360,maxSeconds:1200,cruiseKnots:17,
  rules:{departureKnots:4,approachKnots:5,maxGroundedSeconds:15,maxDamage:.85},
  docking:{distance:12,speedKnots:.7,angleDegrees:20,holdSeconds:4},
  comments:{
    preparation:'Consultez le trajet et les conditions avant de commencer l’embarquement.',
    boarding:'Amarres en place. Embarquement en cours, moteurs au neutre.',
    departure:'Passagers à bord. Larguez les amarres, puis quittez doucement la cale. Restez sous 4 nd près du quai.',
    crossing:'Cap sur Dinard. Croisière conseillée : 17 nd. Les points de passage sont facultatifs.',
    approach:'Ponton du Clair de Lune : côté est du quai, repère ocre. Réduisez sous 5 nd ; préparez la marche arrière pour freiner.',
    docking:'Alignez le navire nord–sud dans la zone ocre. Moins de 0,7 nd, moteurs au neutre pendant 4 s, puis amarrez.',
    unloading:'Amarres en place. Débarquement des passagers en cours.',
    complete:'Traversée terminée. Les passagers ont rejoint Dinard.',failed:'Mission interrompue. Reprenez au dernier point sûr ou recommencez.',
  },
};
export const MISSIONS=[MALO_DINARD];
