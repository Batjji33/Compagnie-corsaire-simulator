export type TeamId='technical'|'navigation'|'passengers';
export type IncidentKind='engine'|'electrical'|'medical'|'helicopter'|'fire'|'mob'|'storm'|'port'|'strike'|'pleasure'|'cabin'|'evacuation'|'flooding'|'steering'|'cooling'|'radar'|'cargo'|'missing'|'galley'|'pollution'|'distress'|'medicalBoat';
export interface IncidentContext {x:number;z:number;zone:'port'|'approach'|'offshore';speed:number;wind:number;waves:number;traffic:number;risk:boolean;thermalKW:number;soc:number;shore:boolean;passengers?:number;underway?:boolean;}
export type Gate='slow'|'stopped'|'flight'|'near-marker'|'rescue';
export interface Choice {id:string;label:string;team:TeamId;seconds:number;gate?:Gate;partial?:boolean;}
export interface IncidentStep {title:string;choices:readonly Choice[];}
export interface IncidentDefinition {id:IncidentKind;title:string;severity:1|2|3;group:string;weight:number;eligible:(context:IncidentContext,active:readonly IncidentKind[])=>boolean;steps:readonly IncidentStep[];}
const choice=(id:string,label:string,team:TeamId,seconds:number,gate?:Gate,partial=false):Choice=>({id,label,team,seconds,gate,partial});
const aboard=(c:IncidentContext)=>c.passengers===undefined||c.passengers>0;
const atSea=(c:IncidentContext)=>c.zone==='offshore'&&!c.shore&&c.underway!==false;
export const INCIDENT_DEFINITIONS:readonly IncidentDefinition[]=[
 {id:'engine',title:'Vibrations sur une ligne moteur',severity:2,group:'machinery',weight:3,eligible:c=>c.thermalKW>1000&&!c.shore,steps:[
  {title:'Localiser l’anomalie',choices:[choice('survey','Confier le diagnostic aux mécaniciens','technical',180)]},
  {title:'Choisir la remise en service',choices:[choice('repair','Réparer sous régime réduit','technical',600,'slow'),choice('limited','Organiser une marche limitée jusqu’à l’escale','technical',240,undefined,true)]}]},
 {id:'electrical',title:'Défaut du réseau auxiliaire',severity:2,group:'electrical',weight:2,eligible:c=>c.soc<.35||c.shore||c.thermalKW>1000,steps:[
  {title:'Contrôler le tableau de bord',choices:[choice('inspect','Déléguer la recherche du circuit affecté','technical',150)]},
  {title:'Rétablir les services',choices:[choice('restore','Tester un rétablissement progressif','technical',420),choice('reserve','Maintenir les services prioritaires','navigation',180,undefined,true)]}]},
 {id:'medical',title:'Passager souffrant · assistance simulée',severity:1,group:'medical',weight:4,eligible:c=>aboard(c)&&c.waves>.7,steps:[
  {title:'Assistance aux passagers',choices:[choice('attend','Envoyer l’équipe d’assistance','passengers',180)]},
  {title:'Organiser le suivi fictif',choices:[choice('follow','Préparer l’accueil à l’arrivée','passengers',480),choice('liaison','Demander un avis fictif au centre à terre','navigation',240)]}]},
 {id:'helicopter',title:'Transfert médical fictif par hélicoptère',severity:3,group:'medical',weight:.12,eligible:(c,a)=>aboard(c)&&c.zone==='offshore'&&c.wind<25&&!a.includes('fire')&&!a.includes('galley'),steps:[
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
 {id:'cabin',title:'Infiltration mineure dans une cabine',severity:1,group:'hotel',weight:3,eligible:aboard,steps:[
  {title:'Accueil du groupe concerné',choices:[choice('move','Réaffecter les passagers à un espace libre','passengers',240)]},
  {title:'Remise en état',choices:[choice('dry','Envoyer une équipe technique pour contrôle','technical',480),choice('close','Conserver la cabine indisponible jusqu’à l’escale','passengers',180,undefined,true)]}]},
 {id:'evacuation',title:'Évacuation générale du navire',severity:3,group:'evacuation',weight:.04,eligible:c=>atSea(c)&&aboard(c)&&(c.passengers===undefined||Number.isInteger(c.passengers)&&c.passengers<=1290),steps:[
  {title:'Alerte et demande de secours',choices:[choice('alert','Coordonner les secours maritimes et aériens simulés','navigation',180)]},
  {title:'Rassemblement des passagers',choices:[choice('muster','Accompagner les passagers aux espaces de rassemblement','passengers',300)]},
  {title:'Préparation des moyens d’évacuation',choices:[choice('secure','Préparer les canots à faible allure','technical',240,'slow'),choice('assisted','Faire préparer les moyens par le soutien extérieur','navigation',600,undefined,true)]},
  {title:'Arrivée des secours et transfert prioritaire',choices:[choice('rescue-flight','Accueillir l’hélicoptère et transférer le groupe prioritaire','navigation',420,'flight'),choice('sea-priority','Confier le groupe prioritaire aux vedettes médicalisées','navigation',480,undefined,true)]},
  {title:'Évacuation vers les vedettes médicalisées',choices:[choice('lifeboats','Transférer les passagers par canots vers les vedettes','passengers',720,'rescue'),choice('offshore-support','Attendre un dispositif maritime adapté à la météo','navigation',1200,undefined,true)]},
  {title:'Bilan de l’évacuation',choices:[choice('account','Vérifier le décompte et confier le suivi aux secours','passengers',180)]}]},
 {id:'flooding',title:'Voie d’eau dans un compartiment',severity:3,group:'machinery',weight:.12,eligible:atSea,steps:[
  {title:'Évaluer le compartiment',choices:[choice('survey','Déléguer le contrôle de l’entrée d’eau','technical',180)]},
  {title:'Stabiliser la situation simulée',choices:[choice('pump','Coordonner le pompage à faible allure','technical',600,'slow'),choice('support','Organiser un relais extérieur et une marche limitée','navigation',900,undefined,true)]},
  {title:'Contrôler les espaces voisins',choices:[choice('check','Vérifier les locaux et accompagner les passagers','passengers',240)]}]},
 {id:'steering',title:'Défaut de commande du gouvernail',severity:2,group:'steering',weight:1.2,eligible:atSea,steps:[
  {title:'Identifier le défaut de barre',choices:[choice('inspect','Faire contrôler la commande de gouverne','technical',180)]},
  {title:'Retrouver la manœuvrabilité',choices:[choice('restore','Tester la commande de secours à faible allure','technical',540,'slow'),choice('escort','Demander une escorte jusqu’à l’escale','navigation',720,undefined,true)]}]},
 {id:'cooling',title:'Surchauffe du circuit de refroidissement',severity:2,group:'machinery',weight:1.8,eligible:c=>atSea(c)&&c.thermalKW>1000,steps:[
  {title:'Contrôle du refroidissement',choices:[choice('inspect','Affecter les mécaniciens au circuit signalé','technical',180)]},
  {title:'Rétablir une température de jeu stable',choices:[choice('cool','Intervenir sous régime réduit','technical',600,'slow'),choice('limited','Isoler le circuit et conserver une puissance limitée','technical',300,undefined,true)]}]},
 {id:'radar',title:'Perte du radar de navigation',severity:2,group:'electrical',weight:1.4,eligible:atSea,steps:[
  {title:'Maintenir la veille',choices:[choice('watch','Renforcer la veille visuelle à faible allure','navigation',180,'slow'),choice('escort','Demander une veille extérieure prolongée','navigation',420,undefined,true)]},
  {title:'Contrôler le radar',choices:[choice('restart','Tester le rétablissement du radar','technical',480),choice('defer','Conserver la veille renforcée jusqu’à l’escale','navigation',600,undefined,true)]}]},
 {id:'cargo',title:'Déplacement d’un chargement au garage',severity:2,group:'cargo',weight:1,eligible:c=>atSea(c)&&c.waves>1,steps:[
  {title:'Contrôler le garage',choices:[choice('inspect','Envoyer l’équipe technique dans le secteur de jeu','technical',180)]},
  {title:'Sécuriser le chargement',choices:[choice('secure','Réorganiser les fixations simulées à faible allure','technical',600,'slow'),choice('isolate','Maintenir le secteur fermé jusqu’à l’escale','technical',360,undefined,true)]},
  {title:'Informer les voyageurs',choices:[choice('inform','Accompagner les propriétaires des véhicules concernés','passengers',180)]}]},
 {id:'missing',title:'Passager introuvable à bord',severity:2,group:'hotel',weight:1.2,eligible:c=>atSea(c)&&aboard(c),steps:[
  {title:'Recueillir le signalement',choices:[choice('report','Confier le signalement à l’assistance passagers','passengers',120)]},
  {title:'Recherche dans les espaces de jeu',choices:[choice('search','Coordonner la recherche dans les salons et cabines','passengers',480),choice('liaison','Demander un appui de coordination à terre','navigation',720,undefined,true)]},
  {title:'Clore le signalement',choices:[choice('reunite','Accompagner le passager retrouvé vers son groupe','passengers',180)]}]},
 {id:'galley',title:'Fumée signalée dans les cuisines',severity:2,group:'machinery',weight:.6,eligible:(c,a)=>atSea(c)&&aboard(c)&&!a.includes('helicopter'),steps:[
  {title:'Contrôler le secteur',choices:[choice('check','Déléguer la reconnaissance fictive des cuisines','technical',120)]},
  {title:'Réorganiser la restauration',choices:[choice('relocate','Accompagner les passagers vers un autre salon','passengers',240)]},
  {title:'Rétablir les espaces',choices:[choice('ventilate','Achever le contrôle technique à faible allure','technical',480,'slow'),choice('close','Fermer le secteur jusqu’à l’escale','passengers',300,undefined,true)]}]},
 {id:'pollution',title:'Suspicion de fuite dans les eaux de service',severity:2,group:'environment',weight:.7,eligible:atSea,steps:[
  {title:'Vérification technique',choices:[choice('inspect','Faire identifier le circuit concerné','technical',180)]},
  {title:'Limiter les conséquences simulées',choices:[choice('isolate','Isoler le circuit à faible allure','technical',540,'slow'),choice('support','Demander une unité d’assistance environnementale','navigation',900,undefined,true)]},
  {title:'Coordination avec la terre',choices:[choice('report','Transmettre le bilan fictif au port d’arrivée','navigation',180)]}]},
 {id:'distress',title:'Appel de détresse d’un navire voisin',severity:3,group:'rescue',weight:.1,eligible:atSea,steps:[
  {title:'Localiser le navire signalé',choices:[choice('locate','Affecter la navigation au point de rendez-vous fictif','navigation',180)]},
  {title:'Coordonner l’assistance',choices:[choice('assist','Rejoindre lentement le marqueur de rendez-vous','navigation',600,'near-marker'),choice('relay','Faire intervenir les secours maritimes simulés','navigation',900,undefined,true)]},
  {title:'Préparer l’accueil',choices:[choice('welcome','Mobiliser l’assistance passagers pour le suivi','passengers',240)]}]},
 {id:'medicalBoat',title:'Rendez-vous avec une vedette médicalisée',severity:3,group:'medical',weight:.15,eligible:c=>atSea(c)&&aboard(c),steps:[
  {title:'Organiser le rendez-vous médical',choices:[choice('request','Demander une vedette médicalisée simulée','navigation',240)]},
  {title:'Préparer l’accompagnement',choices:[choice('prepare','Accompagner le passager vers le rendez-vous','passengers',180)]},
  {title:'Transfert maritime simulé',choices:[choice('transfer','Coordonner le transfert à faible vitesse','navigation',480,'rescue'),choice('shelter','Attendre un soutien adapté aux conditions de mer','navigation',900,undefined,true)]}]},
];
export const TEAM_LABELS:Record<TeamId,string>={technical:'Équipe technique',navigation:'Équipe navigation',passengers:'Assistance passagers'};
export const INCIDENT_SCENARIOS={weather:['storm','engine','medical'],emergency:['helicopter','fire','mob'],terminal:['strike','cabin','electrical'],rescue:['medicalBoat','distress'],crossing:['steering','cargo','missing']} as const;
