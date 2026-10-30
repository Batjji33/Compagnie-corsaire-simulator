import { BAY } from '../world/geography.ts';
export interface TourComment {id:string;title:string;text:string;x:number;z:number;radius:number;source:string}
const MALO='https://www.saint-malo-tourisme.com/nos-tresors-preserves/saint-malo-le-bijou-corsaire/faire-le-tour-des-remparts-de-saint-malo/';
const FORTS='https://www.saint-malo-tourisme.com/vivre-comme-chez-nous/a-voir-a-faire/culture-patrimoine/acces-aux-forts-et-aux-ilots/';
const DINARD='https://www.dinardemeraudetourisme.com/les-incontournables/promenade-du-clair-de-lune/';
export const DEFAULT_COMMENTS:TourComment[]=[
  {id:'remparts',title:'Les remparts de Saint-Malo',x:850,z:150,radius:480,source:MALO,text:'Bienvenue à bord. Les murailles de granit dessinent la silhouette de Saint-Malo. Leur chemin de ronde permet de découvrir la ville, les plages et les îlots depuis plusieurs points de vue. Depuis la mer, observez les façades regroupées derrière les fortifications.'},
  {id:'mole',title:'Le Môle des Noires',x:380,z:40,radius:430,source:MALO,text:'La longue jetée devant les remparts est le Môle des Noires. Elle protège l’avant-port. Regardez comme les ouvrages de pierre organisent le passage entre le port et la baie : ils font partie du paysage maritime de Saint-Malo.'},
  {id:'grand-be',title:'Le Grand Bé',x:350,z:-950,radius:570,source:FORTS,text:'Au large des remparts se trouve le Grand Bé. Cet îlot abrite la tombe de l’écrivain François-René de Chateaubriand, tournée vers la mer. Dans la réalité, son accès à pied dépend de la marée ; notre baie en propose une représentation simplifiée.'},
  {id:'fort-national',title:'Le Fort National',x:1140,z:-1140,radius:560,source:'https://www.saint-malo-tourisme.com/offres/fort-national-saint-malo-fr-3646418/',text:'Voici le Fort National, un ouvrage défensif construit en 1689 par Garangeau selon les plans de Vauban. Posé sur un îlot face à Saint-Malo, il rappelle l’importance des fortifications maritimes dans la protection de la cité.'},
  {id:'moulinet',title:'La pointe du Moulinet',x:-1100,z:600,radius:460,source:'https://www.ille-et-vilaine-tourisme.bzh/partez-a-la-decouverte-de-lille-et-vilaine/sites-remarquables/dinard/',text:'À l’approche de Dinard, la pointe du Moulinet offre un regard ouvert sur la baie de Saint-Malo. Le rivage change de caractère : les villas et les jardins accompagnent les falaises de cette station balnéaire.'},
  {id:'villas',title:'Dinard et ses villas',x:-570,z:980,radius:260,source:DINARD,text:'Les villas du front de mer évoquent le développement balnéaire de Dinard au dix-neuvième siècle. Leurs silhouettes variées composent un panorama reconnaissable depuis la baie. Prenez le temps d’observer les toitures et les jardins qui descendent vers le rivage.'},
  {id:'clair-lune',title:'La promenade du Clair de Lune',x:-945,z:1120,radius:190,source:DINARD,text:'Nous voici près du Clair de Lune. La promenade longe la mer entre la pointe du Moulinet et la plage du Prieuré, au pied des villas et des jardins. C’est une autre manière de prolonger la découverte de Dinard après la traversée.'},
];
export function validateComment(value:unknown):TourComment|null {
  if(!value||typeof value!=='object')return null;const v=value as Record<string,unknown>;
  if(typeof v.id!=='string'||!v.id||v.id.length>100||typeof v.title!=='string'||!v.title.trim()||v.title.length>100||typeof v.text!=='string'||!v.text.trim()||v.text.length>1500)return null;
  for(const k of ['x','z','radius'])if(typeof v[k]!=='number'||!Number.isFinite(v[k]))return null;
  if((v.x as number)<BAY.minX||(v.x as number)>BAY.maxX||(v.z as number)<BAY.minZ||(v.z as number)>BAY.maxZ||(v.radius as number)<30||(v.radius as number)>1500)return null;
  return {id:v.id,title:v.title.trim(),text:v.text.trim(),x:v.x as number,z:v.z as number,radius:v.radius as number,source:typeof v.source==='string'&&v.source.startsWith('https://')?v.source:''};
}
export class TourGuide {
  comments:TourComment[]=structuredClone(DEFAULT_COMMENTS);selected:TourComment|undefined;
  visited=new Set<string>();automatic=true;manual=true;muted=false;private cooldown=0;
  private selectedSeconds=0;private acknowledged=false;
  destination:'malo'|'dinard'|undefined;
  private contextual(comment:TourComment):TourComment {
    // Leave custom and edited comments intact; only adapt the authored directional introductions.
    if(this.destination!=='malo'||!DEFAULT_COMMENTS.some(c=>c.id===comment.id&&c.text===comment.text))return comment;
    const text=comment.text.replace('Bienvenue à bord.','Nous approchons de Saint-Malo.')
      .replace('À l’approche de Dinard,','En quittant Dinard,').replace('Nous voici près du Clair de Lune.','Nous quittons le Clair de Lune en direction de Saint-Malo.');
    return {...comment,text};
  }
  update(dt:number,x:number,z:number):TourComment|undefined {
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.selected){this.selectedSeconds+=dt;if((!this.manual||this.acknowledged)&&this.selectedSeconds>Math.max(20,this.selected.text.length/10))this.dismiss();}
    if(!this.automatic||this.muted||this.cooldown>0||this.selected)return;
    const next=this.comments.filter(c=>!this.visited.has(c.id)&&Math.hypot(c.x-x,c.z-z)<=c.radius).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
    if(next){this.selected=this.contextual(next);this.visited.add(next.id);this.cooldown=30;this.selectedSeconds=0;this.acknowledged=false;return this.selected;}
  }
  choose(id:string):TourComment|undefined {const c=this.comments.find(c=>c.id===id);if(c){this.selected=this.contextual(c);this.visited.add(c.id);this.acknowledged=true;this.selectedSeconds=0;return this.selected;}}
  offer(comment:TourComment):boolean {
    if(this.visited.has(comment.id)||this.muted||!this.automatic)return false;
    if(!this.comments.some(c=>c.id===comment.id))this.comments.push(comment);
    this.selected=comment;this.visited.add(comment.id);this.selectedSeconds=0;this.acknowledged=false;
    return true;
  }
  dismiss():void {this.selected=undefined;this.selectedSeconds=0;}
  reset():void {this.visited.clear();this.selected=undefined;this.cooldown=0;}
}
