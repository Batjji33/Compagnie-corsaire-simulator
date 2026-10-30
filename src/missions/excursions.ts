import type { MissionDefinition, Waypoint } from './definitions.ts';
import { COAST_ROUTES } from '../world/EmeraldCoast.ts';
import { BOAT } from '../ships/parameters.ts';
import { MISSION_SECONDS } from './timing.ts';

const CEZEMBRE_SOURCE='https://compagniecorsaire.com/destination/ile-cezembre/';
const CAP_SOURCE='https://compagniecorsaire.com/destination/croisiere-cap-frehel-fort-la-latte/';
const BOURSE={x:1222,z:400,heading:Math.PI};
const bourse={name:'Saint-Malo · Gare maritime de la Bourse',berth:BOURSE,exitDistance:90,dockId:'bourse'};
const returnBourse={name:bourse.name,berth:BOURSE,headings:[0,Math.PI],approach:{x:1222,z:550,heading:0},approachRadius:200,dockingRadius:85,dockId:'bourse'};

const point=(x:number,z:number,label:string,text?:string,source=CAP_SOURCE):Waypoint=>({
  x,z,label,radius:130,...(text?{comment:{title:label,text,source}}:{}),
});
const coast:Waypoint[]=[
  point(1100,520,'Sortie de la Bourse'),point(720,650,'Avant-port'),
  point(-200,850,'Travers de Dinard'),point(-400,600,'Chenal de sortie'),
  point(-450,250,'Vers le large'),point(-700,-100,'Dégager les roches'),
  point(-1050,-1500,'Les forts de la baie','Les remparts et les îlots fortifiés s’éloignent derrière nous. La côte occidentale s’ouvre devant le bateau : le circuit longe les stations balnéaires avant de rejoindre le château et les falaises.'),
  point(-2600,-850,'Saint-Énogat et Fort Harbour','Au large de Dinard, les pointes et les villas laissent place aux paysages de Saint-Énogat. Fort Harbour marque le passage vers la côte ouest. Nous restons en mer pour découvrir ces silhouettes.'),
  point(-4100,-650,'Saint-Lunaire · pointe du Décollé','Saint-Lunaire fait partie des étapes côtières du circuit de la Compagnie Corsaire. Les avancées rocheuses du littoral alternent avec les plages ; observez les anses au sud du bateau.'),
  point(-5650,-1500,'Saint-Briac · île Agot','Nous longeons Saint-Briac. L’île Agot se détache au large du rivage : sa silhouette rocheuse accompagne le panorama côtier. Le trajet se poursuit vers Lancieux et les Ébihens.'),
  point(-6600,-1650,'Lancieux et les Ébihens','Entre les baies de Lancieux et de l’Arguenon, les Ébihens composent un archipel bas sur l’horizon. La carte de jeu simplifie ces côtes et leurs distances.'),
  point(-7500,-1650,'Au large des Ébihens'),
  point(-8400,-1100,'Saint-Cast-le-Guildo','Saint-Cast est la dernière grande étape côtière avant la pointe de la Latte. Le château puis le Cap Fréhel se découvrent depuis la mer ; les passagers restent à bord pendant cette croisière.'),
  point(-9200,-1200,'Baie de la Fresnaye'),point(-9900,-1800,'Approche de la pointe de la Latte'),
  {...point(-9850,-3420,'Fort La Latte','Voici le château de la Roche Goyon, également appelé Fort La Latte. Ses murailles et son donjon occupent une pointe rocheuse face à la baie. Réduisez l’allure pour permettre aux passagers d’admirer la forteresse depuis la mer.','https://www.lefortlalatte.com/'),radius:170,dwellSeconds:15,maxKnots:5},
];
const cape:Waypoint[]=[point(-10300,-3800,'Contourner la pointe'),point(-10900,-4350,'Falaises du Cap Fréhel'),point(-11100,-5000,'Au nord du cap'),
  {...point(-11650,-5060,'Cap Fréhel · panorama','Les falaises du Cap Fréhel atteignent environ soixante-dix mètres. Au sommet, le phare moderne et l’ancienne tour se détachent au-dessus des landes. Les parois accueillent des oiseaux marins : prenez le temps d’observer ce paysage avant le retour.','https://www.dinan-capfrehel.com/itineraires/du-cap-frehel-au-fort-la-latte/'),radius:180,dwellSeconds:20,maxKnots:5},
  point(-11100,-5250,'Dégager le cap'),point(-10400,-4500,'Cap vers Saint-Malo')];
const home:Waypoint[]=[
  point(-9300,-3900,'Retour par le large','Nous reprenons la direction de Saint-Malo par le large. Le paysage change de perspective : les caps s’éloignent et les îles de la baie se rapprochent. Aucun débarquement n’a lieu au fort ni au cap.'),
  point(-7500,-3200,'Au large de Saint-Cast'),point(-4500,-2800,'Traversée de la baie'),point(-2000,-2800,'Cézembre à bâbord'),
  point(-1050,-1500,'Retour vers les forts'),point(-700,-100,'Entrée de la baie'),point(-450,250,'Chenal de retour'),
  point(-400,600,'Approche de Dinard'),point(-200,850,'Vers Saint-Malo'),point(720,650,'Entrée de l’avant-port'),
  point(1100,520,'Gare maritime de la Bourse · retour'),
];

function cruise(id:string,title:string,route:Waypoint[],targetSeconds:number):MissionDefinition {
  return {id,title,description:'Embarquez à la Bourse, longez la Côte d’Émeraude, observez les paysages en mer puis ramenez vos passagers à Saint-Malo.',
    origin:bourse,destination:returnBourse,route,excursion:{source:CAP_SOURCE,reference:'Circuit côtier de la Compagnie Corsaire · retour par le large, sans escale'},
    passengers:180,boardingSeconds:18,unloadingSeconds:12,departureHour:14,sea:'belle',windDirection:250,
    targetSeconds,cruiseKnots:17,
    rules:{departureKnots:4,approachKnots:5,maxGroundedSeconds:20,maxDamage:.85},
    comments:{preparation:'Préparez la croisière et consultez les étapes dans leur ordre de passage.',boarding:'Embarquement à la Bourse. Gardez les amarres jusqu’à la fin du transfert.',
      departure:'Passagers à bord. Larguez les amarres et quittez le quai sous 4 nd.',crossing:'Suivez les points de passage dans l’ordre. Aux panoramas, restez dans le cercle à moins de 5 nd pendant le temps indiqué.',
      approach:'Croisière effectuée. Retour à la Bourse : réduisez l’allure et préparez l’accostage.',docking:'Rejoignez le cercle ocre à moins de 2 nd, puis amarrez pour débarquer les passagers.',
      unloading:'Retour à Saint-Malo. Les passagers débarquent à la Bourse.',complete:'Croisière terminée : tous les passagers sont revenus à Saint-Malo.',failed:'Croisière interrompue. Reprenez au dernier point sûr.'}};
}

const cezembreRoute=COAST_ROUTES[0].points.slice(1,-1).map(([x,z],i)=>point(x,z,[
  'Sortie de la cale de Dinan','Avant-port de Saint-Malo','Travers de Dinard','Chenal de sortie','Vers les îlots','Dégager les roches','Les Bé et le large','Cap sur Cézembre',
][i]??'Vers Cézembre',undefined,CEZEMBRE_SOURCE));
cezembreRoute.unshift({...point(800,285,'Dégager la cale de Dinan',undefined,CEZEMBRE_SOURCE),radius:45});
cezembreRoute[0].comment={title:'Départ vers Cézembre',text:'Nous quittons la cale de Dinan pour Cézembre, une île au nord de la baie de Saint-Malo. Les passagers débarqueront à la cale, face à la plage sud. Le trajet réel annoncé par la compagnie dure environ vingt minutes ; les distances sont adaptées dans le jeu.',source:CEZEMBRE_SOURCE};
cezembreRoute[cezembreRoute.length-1].comment={title:'Cézembre · nature et mémoire',text:'Cézembre est un espace naturel protégé et un refuge pour les oiseaux marins. L’île conserve aussi des vestiges de la Seconde Guerre mondiale. Sa plage exposée au sud apparaît devant nous ; préparez une arrivée lente au débarcadère.',source:CEZEMBRE_SOURCE};
cezembreRoute.push(point(-2020,-3660,'Cézembre · approche du débarcadère',undefined,CEZEMBRE_SOURCE));
export const CEZEMBRE:MissionDefinition={
  id:'malo-cezembre',title:'Saint-Malo → Cézembre',description:'120 passagers, de la cale de Dinan à la plage sud de Cézembre. Traversée avec débarquement sur l’île.',
  origin:{name:'Saint-Malo · Cale de Dinan',berth:{...BOAT.spawn},exitDistance:80,dockId:'malo'},
  destination:{name:'Cézembre · débarcadère',berth:{x:-2020,z:-3800,heading:0},headings:[0,Math.PI],approach:{x:-2020,z:-3660,heading:0},approachRadius:210,dockingRadius:85,dockId:'cezembre'},
  route:cezembreRoute,excursion:{source:CEZEMBRE_SOURCE,reference:'Traversée réelle vers Cézembre · débarquement sur l’île'},
  passengers:120,boardingSeconds:18,unloadingSeconds:14,departureHour:12+40/60,sea:'belle',windDirection:250,
  targetSeconds:MISSION_SECONDS.cezembre,cruiseKnots:17,rules:{departureKnots:4,approachKnots:5,maxGroundedSeconds:20,maxDamage:.85},
  comments:{preparation:'Vérifiez le trajet et préparez l’embarquement vers Cézembre.',boarding:'Embarquement des passagers à la cale de Dinan.',departure:'Larguez les amarres après l’embarquement. Restez sous 4 nd à proximité du quai.',
    crossing:'Suivez les repères vers Cézembre dans l’ordre. Les passagers restent à bord jusqu’au débarcadère.',approach:'Approchez Cézembre par le sud-est du ponton à moins de 5 nd.',
    docking:'Accostez du côté est du ponton, à moins de 2 nd, puis amarrez pour débarquer.',unloading:'Les passagers rejoignent la cale et la plage de Cézembre.',complete:'Traversée terminée. Les passagers ont débarqué à Cézembre.',failed:'Traversée interrompue. Reprenez au dernier point sûr.'},
};
export const CEZEMBRE_RETURN:MissionDefinition={
  ...CEZEMBRE,id:'cezembre-malo',title:'Cézembre → Saint-Malo',
  description:'120 passagers, du débarcadère de Cézembre à la cale de Dinan.',
  origin:{name:CEZEMBRE.destination.name,berth:{...CEZEMBRE.destination.berth,heading:Math.PI},exitDistance:80,dockId:'cezembre'},
  destination:{name:CEZEMBRE.origin.name,berth:{...BOAT.spawn},headings:[Math.PI/2,-Math.PI/2],approach:{x:780,z:370,heading:-Math.PI/2},approachRadius:220,dockingRadius:95,dockId:'malo'},
  route:cezembreRoute.slice().reverse().map((p,i)=>({...p,label:[
    'Quitter le débarcadère de Cézembre','Cap sur la baie','Les Bé et Saint-Malo','Dégager les roches','Vers le chenal',
    'Chenal de retour','Travers de Dinard','Avant-port de Saint-Malo','Approche de la cale de Dinan','Cale de Dinan',
  ][i],
    comment:p.comment?{title:'Retour vers Saint-Malo',text:i===cezembreRoute.length-1?'Les remparts de Saint-Malo se rapprochent. Rejoignez la cale de Dinan à faible allure pour débarquer les passagers.':'Nous laissons Cézembre derrière nous. Les îlots et les forts de la baie jalonnent le retour vers Saint-Malo.',source:CEZEMBRE_SOURCE}:undefined})),
  excursion:{source:CEZEMBRE_SOURCE,reference:'Traversée de Cézembre vers Saint-Malo · débarquement à la cale de Dinan'},
  comments:{...CEZEMBRE.comments,preparation:'Préparez le retour de Cézembre vers Saint-Malo.',boarding:'Embarquement au débarcadère de Cézembre.',
    crossing:'Suivez les repères de retour vers Saint-Malo dans l’ordre.',approach:'Rejoignez la cale de Dinan à moins de 5 nd.',
    docking:'Rejoignez le cercle ocre de la cale de Dinan à moins de 2 nd, puis amarrez.',unloading:'Les passagers débarquent à Saint-Malo.',complete:'Traversée terminée. Les passagers ont rejoint Saint-Malo.'},
};
export const CAP_FREHEL=cruise('cap-frehel','Cap Fréhel – Fort La Latte',[...coast,...cape,...home],MISSION_SECONDS.capFrehel);

const BAY_SOURCE='https://www.saint-malo-tourisme.com/';
const bayPoint=(x:number,z:number,label:string,text?:string):Waypoint=>point(x,z,label,text,BAY_SOURCE);
const bayRoute:Waypoint[]=[
  bayPoint(1100,520,'Départ de la Bourse','Les remparts de Saint-Malo dominent le port. Notre circuit revient à ce même embarcadère après la découverte de la baie.'),
  bayPoint(720,650,'Le Môle des Noires','La jetée protège l’avant-port. Suivez le chenal pour gagner la baie en gardant les ouvrages de pierre à distance.'),
  bayPoint(-200,850,'Dinard et la pointe du Moulinet','À l’ouest, les villas de Dinard accompagnent la pointe du Moulinet. Le panorama s’ouvre sur les deux rives de la baie.'),
  bayPoint(-400,600,'Chenal de la baie'),bayPoint(-450,250,'Vers les îlots'),bayPoint(-700,-100,'Dégager les roches'),
  bayPoint(-650,-1450,'Le Petit Bé','Le Petit Bé se détache à tribord. Ce fort insulaire appartient au paysage défensif de Saint-Malo ; nous l’observons depuis la mer.'),
  bayPoint(350,-1500,'Le Grand Bé','Le Grand Bé se présente devant les remparts. Sa silhouette rocheuse change avec la lumière et la marée.'),
  {...bayPoint(1100,-1550,'Fort National','Face au rivage malouin, le Fort National complète ce panorama des fortifications. Prenez le temps d’observer l’îlot avant de reprendre le chemin du port.'),dwellSeconds:20,maxKnots:5},
  bayPoint(350,-1500,'Retour au large des Bé'),bayPoint(-650,-1450,'Retour vers le chenal'),
  bayPoint(-700,-100,'Entrée de la baie'),bayPoint(-450,250,'Chenal de retour'),bayPoint(-400,600,'Travers de Dinard'),
  bayPoint(-200,850,'Cap sur Saint-Malo'),bayPoint(720,650,'Avant-port · retour'),
  bayPoint(1100,520,'La Bourse · retour','Le circuit de la Baie du Corsaire s’achève. Réduisez l’allure et préparez l’accostage à la Bourse pour le débarquement.'),
];
export const BAIE_CORSAIRE:MissionDefinition={
  ...cruise('baie-corsaire','Baie du Corsaire',bayRoute,MISSION_SECONDS.baieCorsaire),
  description:'Circuit touristique dans la baie de Saint-Malo : remparts, Môle des Noires, Dinard, les Bé et Fort National. Départ et retour à la Bourse.',
  excursion:{source:BAY_SOURCE,reference:'Circuit touristique de jeu dans la baie de Saint-Malo · départ et retour à la Bourse'},
};
/** Four menu entries; the Cézembre direction is selected within its entry. */
export const EXCURSIONS=[CEZEMBRE,CAP_FREHEL,BAIE_CORSAIRE];
