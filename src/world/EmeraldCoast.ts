import type { Land, Point } from './geography';

/** Authored silhouettes: local metres, westward distances compressed ~2:1.
 * See docs/emerald-coast.md for references and the deliberately non-chart scale. */
export const EMERALD_LANDS: readonly Land[] = [
  {id:'cezembre',name:'Cézembre',zone:'cezembre',height:38,surface:'grass',outline:[[-2400,-4160],[-2520,-4400],[-2390,-4610],[-2160,-4680],[-1950,-4570],[-1720,-4610],[-1510,-4410],[-1470,-4200],[-1660,-4110],[-1880,-4190],[-2110,-4080]]},
  {id:'cezembre-beach',name:'Cézembre · plage sud',zone:'cezembre',height:2.8,surface:'sand',outline:[[-2390,-4150],[-2110,-4080],[-1880,-4190],[-1660,-4110],[-1580,-4010],[-1840,-4020],[-2090,-3920],[-2320,-4000]]},
  {id:'conchee',name:'Fort de la Conchée',zone:'conchee',height:8,surface:'town',outline:[[50,-4450],[10,-4540],[55,-4620],[145,-4640],[200,-4570],[180,-4470]]},
  {id:'harbour-fort',name:'Fort Harbour',zone:'harbour-fort',height:8,surface:'grass',outline:[[-2790,-240],[-2830,-330],[-2780,-410],[-2660,-390],[-2620,-300],[-2680,-230]]},
  {id:'agot',name:'Île Agot',zone:'agot',height:19,surface:'grass',outline:[[-5320,-720],[-5500,-870],[-5460,-1060],[-5210,-1110],[-5040,-990],[-5030,-810]]},
  {id:'ebihens',name:'Les Ébihens',zone:'ebihens',height:28,surface:'grass',outline:[[-7110,-250],[-7240,-540],[-7190,-850],[-7280,-1050],[-7180,-1290],[-7040,-1370],[-6880,-1220],[-6930,-990],[-6810,-760],[-6860,-510],[-6990,-300]]},
  {id:'emerald-shore',name:'Saint-Lunaire · Saint-Briac · Saint-Cast',zone:'emerald-shore',height:27,surface:'grass',outline:[[-4600,600],[-4000,550],[-4120,300],[-4400,150],[-4570,-100],[-4740,10],[-4710,340],[-5000,540],[-5400,370],[-5640,100],[-5810,200],[-5900,610],[-6270,880],[-6600,600],[-6740,190],[-6910,120],[-7050,620],[-7480,1150],[-7930,890],[-8110,500],[-8030,50],[-8240,-220],[-8490,-300],[-8590,-70],[-8500,300],[-8670,850],[-9050,1300],[-9410,1100],[-9600,500],[-9760,-200],[-10100,-530],[-10500,-300],[-11100,500],[-11100,4600],[-4600,4600]]},
  {id:'frehel',name:'Cap Fréhel · landes et falaises',zone:'frehel',height:70,surface:'grass',cliff:true,outline:[[-11100,700],[-10600,-500],[-10850,-1300],[-10760,-2080],[-10420,-2630],[-10470,-2920],[-10600,-3060],[-10900,-2900],[-11140,-3260],[-11300,-3550],[-11400,-3920],[-11500,-4140],[-11460,-4450],[-11640,-4680],[-11830,-4600],[-11900,-4300],[-12080,-4020],[-12110,-3590],[-12340,-3000],[-12300,-2100],[-12700,-1200],[-13200,-600],[-13900,200],[-13900,4600],[-11100,4600]]},
  {id:'latte',name:'Pointe de la Latte',zone:'latte',height:36,surface:'grass',cliff:true,outline:[[-10820,-2410],[-10640,-2760],[-10470,-2920],[-10420,-3150],[-10270,-3260],[-10130,-3140],[-10220,-2900],[-10420,-2630],[-10620,-2310]]},
];

/** Arrival poses are in water; the cap/fort are observation stops, not invented ports. */
export const COAST_DESTINATIONS = [
  {id:'malo',name:'Saint-Malo',x:920,z:285,heading:Math.PI,kind:'port'},
  {id:'dinard',name:'Dinard',x:-945,z:1240,heading:0,kind:'port'},
  {id:'cezembre',name:'Cézembre · débarcadère',x:-2020,z:-3800,heading:0,kind:'dock'},
  {id:'latte',name:'Fort La Latte · observation',x:-9850,z:-3420,heading:-Math.PI/2,kind:'view'},
  {id:'frehel',name:'Cap Fréhel · observation',x:-11650,z:-5060,heading:-Math.PI/2,kind:'view'},
] as const;

/** Optional sightseeing legs, not real navigation instructions. Shared by map and tests. */
export const COAST_ROUTES: readonly {name:string;points:readonly Point[]}[] = [
  {name:'Saint-Malo → Cézembre',points:[[920,285],[720,440],[300,650],[-200,850],[-400,600],[-450,250],[-700,-100],[-1050,-1500],[-1100,-3200],[-2020,-3800]]},
  {name:'Dinard → Cézembre',points:[[-945,1240],[-850,1120],[-600,1000],[-400,600],[-450,250],[-700,-100],[-1050,-1500],[-1100,-3200],[-2020,-3800]]},
  {name:'Cézembre → Fort La Latte',points:[[-2020,-3800],[-2020,-3660],[-3300,-3600],[-5900,-2700],[-7900,-2200],[-9300,-2400],[-9850,-3420]]},
  {name:'Fort La Latte → Cap Fréhel',points:[[-9850,-3420],[-10300,-3800],[-10900,-4350],[-11100,-5000],[-11650,-5060]]},
];
