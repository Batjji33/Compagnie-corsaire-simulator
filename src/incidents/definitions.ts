export type TeamId='technical'|'navigation'|'passengers';
export type IncidentKind='engine'|'electrical'|'medical'|'helicopter'|'fire'|'mob'|'storm'|'port'|'strike'|'pleasure'|'cabin';
export interface IncidentContext {x:number;z:number;zone:'port'|'approach'|'offshore';speed:number;wind:number;waves:number;traffic:number;risk:boolean;thermalKW:number;soc:number;shore:boolean;}
export type Gate='slow'|'stopped'|'flight'|'near-marker';
export interface Choice {id:string;label:string;team:TeamId;seconds:number;gate?:Gate;partial?:boolean;}
export interface IncidentStep {title:string;choices:readonly Choice[];}
export interface IncidentDefinition {id:IncidentKind;title:string;severity:1|2|3;group:string;weight:number;eligible:(context:IncidentContext,active:readonly IncidentKind[])=>boolean;steps:readonly IncidentStep[];}
const choice=(id:string,label:string,team:TeamId,seconds:number,gate?:Gate,partial=false):Choice=>({id,label,team,seconds,gate,partial});
export const INCIDENT_DEFINITIONS:readonly IncidentDefinition[]=[
 {id:'engine',title:'Vibrations sur une ligne moteur',severity:2,group:'machinery',weight:3,eligible:c=>c.thermalKW>1000&&!c.shore,steps:[
  {title:'Localiser l’anomalie',choices:[choice('survey','Confier le diagnostic aux mécaniciens','technical',180)]},
  {title:'Choisir la remise en service',choices:[choice('repair','Réparer sous régime réduit','technical',600,'slow'),choice('limited','Organiser une marche limitée jusqu’à l’escale','technical',240,undefined,true)]}]},
 {id:'electrical',title:'Défaut du réseau auxiliaire',severity:2,group:'electrical',weight:2,eligible:c=>c.soc<.35||c.shore||c.thermalKW>1000,steps:[
  {title:'Contrôler le tableau de bord',choices:[choice('inspect','Déléguer la recherche du circuit affecté','technical',150)]},
  {title:'Rétablir les services',choices:[choice('restore','Tester un rétablissement progressif','technical',420),choice('reserve','Maintenir les services prioritaires','navigation',180,undefined,true)]}]},
 {id:'medical',title:'Passager souffrant · assistance simulée',severity:1,group:'medical',weight:4,eligible:c=>c.waves>.7,steps:[
  {title:'Assistance aux passagers',choices:[choice('attend','Envoyer l’équipe d’assistance','passengers',180)]},
  {title:'Organiser le suivi fictif',choices:[choice('follow','Préparer l’accueil à l’arrivée','passengers',480),choice('liaison','Demander un avis fictif au centre à terre','navigation',240)]}]},
 {id:'helicopter',title:'Transfert médical fictif par hélicoptère',severity:3,group:'medical',weight:.12,eligible:(c,a)=>c.zone==='offshore'&&c.wind<25&&!a.includes('fire'),steps:[
  {title:'Coordination avec le soutien',choices:[choice('request','Demander le créneau de transfert fictif','navigation',300)]},
  {title:'Préparation du transfert',choices:[choice('prepare','Accompagner le passager vers le point de rendez-vous','passengers',240)]},
  {title:'Rendez-vous simulé',choices:[choice('flight','Coordonner l’animation aérienne à faible vitesse','navigation',420,'flight'),choice('shore','Organiser un relais médical à l’escale','passengers',900,undefined,true)]}]},
 {id:'fire',title:'Alerte feu · exercice scénarisé',severity:3,group:'machinery',weight:.08,eligible:(c,a)=>c.thermalKW>2000&&!c.shore&&!a.includes('helicopter'),steps:[
  {title:'Reconnaissance fictive',choices:[choice('check','Envoyer l’équipe technique au secteur signalé','technical',120)]},
  {title:'Coordination à bord',choices:[choice('relocate','Accompagner les passagers hors du secteur de jeu','passengers',240)]},
  {title:'Contrôle du secteur',choices:[choice('contain','Achever l’intervention scénarisée à faible vitesse','technical',600,'slow'),choice('support','Faire relayer l’intervention par le soutien extérieur','navigation',900,undefined,true)]}]},
 {id:'mob',title:'Personne à la mer · scénario fictif',severity:3,group:'rescue',weight:.08,eligible:c=>c.zone!=='port'&&c.waves<4,steps:[
  {title:'Repérage',choices:[choice('mark','Affecter une vigie au marqueur fictif','navigation',90)]},
  {title:'Coordination du secours',choices:[choice('recover','Rejoindre lentement le marqueur et coordonner le secours','navigation',480,'near-marker'),choice('external','Confier le secteur à une assistance simulée','navigation',900,undefined,true)]},
  {title:'Accueil et suivi',choices:[choice('welcome','Préparer l’accueil fictif à bord','passengers',180)]}]},
 {id:'storm',title:'Grain sur la traversée',severity:2,group:'weather',weight:2,eligible:c=>c.zone==='offshore'&&c.waves>=1.5,steps:[
  {title:'Adapter la traversée',choices:[choice('watch','Renforcer la veille et établir un trajet de confort','navigation',600,'slow'),choice('ride','Organiser une veille prolongée sur la route actuelle','navigation',1200,undefined,true)]},
  {title:'Rassurer les passagers',choices:[choice('comfort','Déployer l’assistance dans les salons','passengers',360)]}]},
 {id:'port',title:'Perturbation du poste d’accostage',severity:1,group:'port',weight:2,eligible:c=>c.zone!=='offshore',steps:[
  {title:'Concertation portuaire',choices:[choice('slot','Négocier un nouveau créneau fictif','navigation',600),choice('wait','Accepter un créneau plus tardif','navigation',300,undefined,true)]}]},
 {id:'strike',title:'Mouvement social au terminal · scénario',severity:2,group:'port',weight:.4,eligible:c=>c.zone!=='offshore',steps:[
  {title:'Évaluer le retard',choices:[choice('contact','Confier la liaison avec le terminal à la navigation','navigation',300)]},
  {title:'Adapter l’accueil',choices:[choice('inform','Organiser l’information et l’accueil des passagers','passengers',900),choice('reslot','Accepter une escale différée','navigation',600,undefined,true)]}]},
 {id:'pleasure',title:'Plaisancier gênant l’approche',severity:1,group:'traffic',weight:2,eligible:c=>c.zone!=='offshore'&&c.traffic>0&&c.risk,steps:[
  {title:'Anticipation du croisement',choices:[choice('monitor','Déléguer une veille rapprochée','navigation',180,'slow'),choice('harbour','Solliciter une assistance portuaire fictive','navigation',480,undefined,true)]}]},
 {id:'cabin',title:'Infiltration mineure dans une cabine',severity:1,group:'hotel',weight:3,eligible:()=>true,steps:[
  {title:'Accueil du groupe concerné',choices:[choice('move','Réaffecter les passagers à un espace libre','passengers',240)]},
  {title:'Remise en état',choices:[choice('dry','Envoyer une équipe technique pour contrôle','technical',480),choice('close','Conserver la cabine indisponible jusqu’à l’escale','passengers',180,undefined,true)]}]},
];
export const TEAM_LABELS:Record<TeamId,string>={technical:'Équipe technique',navigation:'Équipe navigation',passengers:'Assistance passagers'};
export const INCIDENT_SCENARIOS={weather:['storm','engine','medical'],emergency:['helicopter','fire','mob'],terminal:['strike','cabin','electrical']} as const;
