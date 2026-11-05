# Manche — géographie et reconnaissance (phase 3)

Depuis la phase 4, cet écran démarre directement en pilotage manuel avec propulsion hybride et passerelle. Voir [le guide de pilotage actuel](FERRY_PILOTING.md). La description ci-dessous conserve les décisions et validations de la phase géographique.

## Accès
Menu principal → **Saint-Malo – Portsmouth**. Choisir le départ du Naye ou une reconnaissance de l'approche de Portsmouth **avant** de charger la vue. Démarrer le parcours guidé, mettre en pause, tourner/zoomer la caméra, afficher le radar côtier, ou prendre la barre avec moteurs et gouvernail. Fermer revient à la partie Corsaire en pause, sans modifier sa sauvegarde. La reconnaissance n'est pas sauvegardée.

Le trajet continu mesure environ **294,4 km / 159 milles de jeu**. Il passe à l'ouest de Jersey, à l'est de Guernesey/Sercq puis contourne l'île de Wight par l'est. Aucun arrêt dans les îles n'est imposé. Ce choix est un itinéraire géographique de jeu, pas une trace AIS ni une route prescrite par les autorités. L'ensemble est jouable en reconnaissance ; aucune mission commerciale, gestion de véhicules ou exploitation du ferry n'est ajoutée.

## Sources et provenance
Consultées le 1 novembre 2026 :

- [Natural Earth — Land, 1:10 millions](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/) : contours régionaux des îles, du Cotentin et du sud de l'Angleterre. **10m signifie 10 millions, pas une précision de 10 mètres**. Données dans le [domaine public](https://www.naturalearthdata.com/about/terms-of-use/).
- [GeoJSON source](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson), SHA256 du fichier utilisé : `1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416`. Extraction locale reproductible par `scripts/extract-channel-coast.mjs` après téléchargement dans `.qa/ne-land.geojson`. Le résultat embarqué contient 13 contours / 511 sommets, arrondis à cinq décimales. Aucun téléchargement de carte à l'exécution.
- [Ports de Saint-Malo et Cancale — infrastructures](https://www.saintmalo-cancale.port.bzh/page/infrastructures-outillages) : terminal du Naye, deux rampes de l'avant-port et position relative de la gare de la Bourse. Le ferry ne traverse pas l'écluse du Naye. Terminal, terre-plein et quais sont adaptés au plan Corsaire existant.
- [Portsmouth International Port — limites officielles](https://assets.publishing.service.gov.uk/media/691f353cf8eba3d0e866f112/The_Portsmouth_International_Port_and_Camber_Harbour_Revision_Order_2025_Portsmouth_International_Port_Limits_Plan_signed.pdf) : organisation des quais et de l'enceinte portuaire. Interprétation simplifiée des emprises, sans reproduction d'un levé hydrographique.
- [King's Harbour Master — entrée et chenaux de Portsmouth](https://www.royalnavy.mod.uk/khm/portsmouth/local-notices/general-directions/2023/2302-pmouth-hbr-ent-app-channel-sb-channel-swashway-and-inner-swashway) : distinction entre chenal principal et chenal des petites unités. La route de jeu emprunte l'entrée principale. Les balises de jeu ne reproduisent pas les positions réglementaires.
- [Portsmouth International Port — accès](https://portsmouth-port.co.uk/at-the-port/find-us/) : implantation du terminal international au nord de la base navale.

Une tentative d'accès au trait de côte détaillé via Overpass a retourné HTTP 406. **Aucune donnée Overpass n'a été incorporée**. Les polygones de Portsmouth sont des approximations géographiques rédigées pour le jeu ; bâtiments, quais et relief ne constituent pas un relevé précis. Les sources officielles servent à identifier l'organisation et les fonctions, pas à garantir les dimensions de chaque bâtiment.

## Architecture et préservation de Corsaire
- `ChannelGeography.ts` : projection régionale, côtes, route, réservations d'accostage, zones, collisions et profondeurs fictives.
- `ChannelEnvironment.ts` : réutilise `BayEnvironment`, `Batch` et `Materials`. Le terminal du Naye est une surcouche de cette reconnaissance. Les données Corsaire, leurs missions, leurs ports, leurs terrains et leurs limites ne changent pas.
- `ChannelNavigation.ts` : suivi de route continu et mode manuel utilisant **VesselDynamics existant**. Ses coefficients de ferry sont une calibration provisoire de reconnaissance, non une simulation hydrodynamique validée.
- `ChannelVoyage.ts` : vue chargée à la demande, réutilisant le modèle Saint-Malo de phase 2 et `Ocean`/`WaveField`. Le rendu de la baie principale est suspendu pendant cette vue.
- `ChannelChart.ts` : carte régionale et radar côtier nord en haut, utilisant les mêmes polygones que les collisions. Ce radar affiche la côte, pas du trafic AIS. GPS décimal et fond fictif suivent la position géographique courante.

### Coordonnées
Projection équirectangulaire, rayon terrestre moyen 6 371 008,8 m, parallèle de référence 49,7° N. X vers l'est, Z vers le sud, une unité = un mètre. Ancrage approximatif de la carte Corsaire : 48,645° N / 2,025° O à (920,245). Distorsion est-ouest d'environ ±2,3 % sur cette région. La baie historique est **déjà interprétée et comprimée**, particulièrement vers le Cap Fréhel : elle est conservée telle quelle, et ses coordonnées GPS affichées ne sont pas un géoréférencement précis.

Le relief régional est une silhouette uniforme de 35 m, non un modèle numérique de terrain. Portsmouth distingue Portsea, Gosport/Haslar, l'entrée, le bassin intérieur, les quais ferry, le terminal, les entrepôts et grues de la base/zone portuaire, Round Tower et une silhouette de Spinnaker Tower. Les logements sont procéduraux. À Saint-Malo, remparts, digue, entrée, bâtiments et zones Corsaire restent ceux du projet ; le Naye reçoit terre-plein, terminal, deux rampes et balisage d'approche supplémentaire.

### Continuité, chargement et performance
État géographique en nombres JavaScript double précision ; origine visuelle recentrée continuellement sur le ferry. Géométries des zones exprimées localement. `Ocean.update` accepte une origine facultative (zéro par défaut pour Corsaire) et un diamètre optionnel : 70 km pour la Manche, 28 km historique inchangé. Les phases de vagues sont compensées par `relativeWavePhases`, sans modifier le champ physique. L'atlas d'écume côtier historique est décalé correctement ; il ne fournit pas de mousse littorale détaillée pour les côtes nouvelles.

Préchargement à 42 km, déchargement à 52 km, brume complète à 24 km. Une géométrie de terrain créée par image, ressources supprimées au déchargement. Baie Corsaire chargée à moins de 30 km puis déchargée au-delà de 40 km. Les bâtiments portuaires instanciés restent en mémoire (budget modeste), mais sont éliminés du rendu hors champ/brume. Maillage marin léger, 30 images/s visées, DPR maximum 1,25, sans ombres ni post-traitement. Pause quand la page est masquée, libération des ressources à la fermeture, message explicite si contexte WebGL perdu.

Temps ×1/4/16/128 demandé, limité automatiquement à ×4 dans les 6 km des ports et ×16 dans les 18 km. Le mode manuel reste ×1. Sous-pas maximum 0,1 s : pas de saut de plusieurs kilomètres, y compris en accéléré. Contrôle de l'enveloppe de 194,7 × 27,8 m et arrêt avant obstacle. Le parcours guidé lisse le cap autour des sommets ; ce n'est pas un pilote automatique réaliste.

### Approches et réservations
Deux emplacements sont réservés, chacun de 240 × 45 m, profondeur de jeu 9 ou 10 m. Ils sont distincts des cales Corsaire. Le fond général de la reconnaissance vaut 12 m près des ports et 60 m au large, 0 sur terre : il ne provient d'aucune bathymétrie. Il n'y a pas de marée opérationnelle, courant de Solent, trafic marchand, autorisation d'entrée, météo évolutive ou amarrage automatisé dans cette phase.

## Vérifications
- Projection aller-retour et ordre de grandeur des distances.
- Toute la route échantillonnée tous les 20 m avec empreinte complète du ferry et cap lissé ; accès des deux postes dégagés.
- Raccords de segments continus, Jersey/Guernesey/Sercq/Wight solides, limite d'accélération près des ports.
- Conduite manuelle arrêtée avant contact, sans traverser un quai.
- Traversée guidée complète jusqu'à Portsmouth, sans collision, arrivée à vitesse nulle.
- Compensation des phases de vagues testée près de zéro, au large et à Portsmouth ; champ d'origine inchangé.
- Parcours navigateur de chargement : 122 positions aller/retour, aucune zone absente dans la portée de brume, maximum 10 groupes de terrain résidents.
- Navigateur réel : ouverture, navigation/pause, radar/carte, choix de l'approche nord, retour au menu. Captures 1440/768/390 px examinées. Vue isolée du port nord : 32 appels de dessin, environ 28 939 triangles (hors mer/ferry). Ce relevé n'est pas une mesure de FPS sur iPad.

**Limites :** pas de test sur Safari/iPad physique, ni de données SHOM/UKHO intégrées. Toute représentation de carte, balisage et profondeur est explicitement marquée comme impropre à la navigation réelle dans l'interface. Le port est reconnaissable par son organisation et ses repères ; la fidélité métrique de ses quais et bâtiments reste limitée.

Captures de validation : [Saint-Malo](images/channel-saint-malo.jpg), [Portsmouth](images/channel-portsmouth.jpg), [format mobile](images/channel-mobile.jpg).

Résultat final : **build réussi, 156 tests réussis, aucun échec**. Avertissement Vite sur le bundle principal > 650 kB non bloquant ; nouveau module de reconnaissance chargé à la demande (~28 kB minifiés, ~11,4 kB gzip). Aucun ajout de dépendance.
