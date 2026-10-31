# Missions configurables

`definitions.ts` contient les ports, positions d'amarrage, points suggérés, passagers,
horaires, durées, météo, seuils de sécurité, critères d'accostage et commentaires.
Ajouter une définition dans `MISSIONS` la rend disponible dans le catalogue du menu.

Le joueur choisit l’état de la mer dans le briefing de chaque mission, y compris
le service Saint-Malo–Dinard, puis peut le modifier en navigation dans
Réglages → Mer et navigation. Le dernier choix est conservé pour les prochains
départs et dans la sauvegarde de la mission active. Le moteur météo garde ses
transitions progressives de vent, vagues et visibilité ; les horaires de mission
continuent d’utiliser leur horloge habituelle.

## Excursions de la Côte d’Émeraude

`timing.ts` centralise les objectifs : Dinard 6 min par traversée, Cézembre 10 min
dans chaque sens, Cap Fréhel – Fort La Latte 30 min, Baie du Corsaire 15 min.
Ces cibles servent aux affichages et à la ponctualité ; aucun retard ne termine
la mission, ne téléporte le navire ou ne change sa vitesse.
La géométrie actuelle représente environ 34 km pour le circuit du cap et 11 km
pour la baie : à 17 nd, la navigation seule peut donc dépasser les cibles
(environ 65 et 22 min). Les objectifs ne sont pas des durées garanties ;
les distances et la physique restent inchangées.

`excursions.ts` définit trois entrées en complément du service Dinard :
Saint-Malo ↔ Cézembre (sens choisi au lancement), Cap Fréhel – Fort La Latte
et Baie du Corsaire. Les références sont les pages officielles de la
[traversée vers Cézembre](https://compagniecorsaire.com/destination/ile-cezembre/),
du [circuit côtier](https://compagniecorsaire.com/destination/croisiere-cap-frehel-fort-la-latte/)
et des [embarcadères malouins](https://compagniecorsaire.com/ports-de-depart/acces-saint-malo-croisiere-bateau/),
consultées le 30 octobre 2026.

Cézembre relie la cale de Dinan au débarcadère de l’île dans les deux sens.
Le retour possède son identifiant de sauvegarde `cezembre-malo` et ses indications
de navigation et commentaires vers Saint-Malo. Les deux croisières partent de la
Bourse et y reviennent. Le circuit côtier longe Saint-Énogat, Saint-Lunaire,
Saint-Briac, Lancieux/Ébihens et Saint-Cast, puis Fort La Latte et Fréhel, avant
le retour par le large. La variante courte Fort La Latte est retirée du catalogue
et des définitions. Ni le fort ni le cap ne deviennent un quai.
La Baie du Corsaire visite le Môle, le panorama de Dinard, les Bé et Fort National,
avec des commentaires aux étapes et une observation lente devant Fort National.

`MissionDefinition.excursion` active la validation ordonnée des `Waypoint`.
`radius` définit la zone ; `dwellSeconds` et `maxKnots` imposent les panoramas
(15 s au fort, 20 s au cap, strictement moins de 5 nd). Sortir du cercle ou
dépasser la vitesse remet le temps d’observation à zéro. Une croisière en boucle
ne passe en approche qu’après toutes ses étapes, même si le navire est près du
quai de départ. La ligne historique conserve ses points facultatifs.

Les commentaires sont originaux, localisés aux étapes et proposés à l’arrivée
dans leur zone, avec lecture selon les réglages existants. La nouvelle étape
remplace un ancien commentaire resté ouvert. Les identifiants déjà proposés
sont sauvegardés pour éviter leur répétition après reprise. La voix de synthèse
reste soumise aux capacités du navigateur et aux préférences audio de l’utilisateur.

`dockId` rattache chaque transfert de passagers à son quai ; la Bourse et Cézembre
ne réservent pas la cale des bateaux-taxis. La reprise au point sûr conserve
les étapes validées et replace le navire au dernier repère atteint. Les états
existants restent compatibles : aucun nouveau champ de sauvegarde n’est requis.

Les distances, effectifs (120/180) et durées sont des paramètres de jeu, sans
calendrier ni horaire commercial garanti. Tests : parcours échantillonnés tous
les 5 m avec contrôle de la coque et de la profondeur simulée à basse mer,
embarquement, visite complète, observation, sauvegarde/reprise, retour au quai,
débarquement et enregistrement du résultat. Contrôle UI local : parcours
scénarisés à pas fixe, captures dans `.qa/excursions/` (non versionnées).

Les règles d'amarrage communes sont dans `docking.ts` : rayon de 30 m, vitesse
strictement inférieure à 2 nd, validation immédiate sans contrainte de cap, de neutre
ou de stabilité. Omettre `docking` dans une nouvelle définition pour hériter de ces
règles ; un remplacement explicite `{distance, speedKnots}` reste possible pour une
mission particulière. Utiliser `dockingRules(definition)` pour le gameplay et tout
affichage associé : le cercle 3D, le briefing et le HUD partagent ainsi les seuils.
Les sauvegardes existantes, y compris leur ancien compteur `hold`, restent lisibles.

La protection des boudins est commune à toutes les missions et à la navigation libre :
`physics/ShoreContact.ts` distingue les quais des côtes et garde leurs forces physiques.
Seuls les appuis latéraux aux quais sont exclus des incidents, dégâts et pénalités.
Les contacts par les extrémités et les collisions avec les autres obstacles restent actifs.

`Mission.ts` est indépendant du DOM et de Three.js. Il reçoit une télémétrie issue
du navire à chaque pas physique, gère les objectifs, échecs et métriques, puis produit
un résultat. Il ne modifie jamais la position du navire.

`ui/Game.ts` coordonne menu, contrôle du navire, amarres, reprises et sauvegardes.
`world/MissionMarkers.ts` réutilise trois petits repères 3D.
`saves/GameStore.ts` stocke le profil et la mission courante dans IndexedDB.

## Service continu Saint-Malo ↔ Dinard

`FerryService.ts` compose les trajets `Mission` existants. Au terme de l’escale,
il enregistre le trajet, inverse la route et prépare le départ manuel. Il ne
possède ni ne modifie la position du bateau. Seule la ligne `malo-dinard` utilise ce
mode dans `Game` ; les autres définitions gardent leur mission finie classique.

Les effectifs varient de façon déterministe entre 140 et 260 voyageurs, plafonnés
par la capacité du navire. Les transferts durent 12 s de débarquement puis 18 s
d’embarquement, à l’intérieur d’une escale de 120 s minimum. Le mode continu désactive les échecs automatiques et
la pénalité de ponctualité ; les contacts, dégâts et effets de mer restent simulés.

`ServiceSnapshot` contient les compteurs cumulés et la qualité de l’approche en
cours ; l’état `MissionSnapshot` contient le trajet actuel. La direction dépend du
nombre de trajets terminés. Les anciennes parties actives sont reprises dans le
premier trajet du service sans modifier la position, le cap ou les passagers.
Le nombre de traversées et les passagers livrés sont comptés en fin d’escale ; une
fin manuelle pendant l’escale crédite aussi les voyageurs déjà débarqués.
Les historiques sont bornés à 100 entrées. Les trajets et le bilan de fin
ont des identifiants distincts et une comptabilité séparée pour éviter les doublons.

La satisfaction moyenne est pondérée par les voyageurs débarqués. La qualité des
accostages vaut 100 moins jusqu’à 20 points selon la vitesse au moment d’amarrer
et 20 points par contact d’approche ; les appuis latéraux protégés n’enlèvent rien.
Une absence de traversée terminée produit des moyennes absentes, pas une note fictive.

### Horaires de simulation

`ServiceSnapshot.elapsed` est la source de temps unique, avancée par le pas physique
fixe existant. L’horloge de bord et celle de `Marine` valent `14 h + elapsed / 3600`,
avec retour à minuit. La pause suspend ce temps. `core/time.ts` fournit le format HH:mm.
Les autres modes conservent leur cycle temporel existant.

`timing` sauvegarde le départ prévu, l’arrivée prévue (départ + 360 s), l’accostage
réel et le prochain départ autorisé : `max(arrivée prévue, accostage) + 120 s`.
Le premier départ est prévu après les 18 s d’embarquement initial. Chaque nouveau
trajet reçoit 360 s à partir de son départ autorisé ; un largage volontairement
retardé consomme donc ce créneau. Le retard cumulé est la somme des retards aux
accostages, avec le retard en cours ajouté à l’affichage pendant la navigation.
Les retards d’arrivée décalent le départ suivant ; ils restent acquis au cumul.

Le compteur de créneau reboucle toutes les 360 s, indépendamment de la mission.
L’expiration ne modifie ni route ni navire. Une arrivée anticipée conserve le temps
restant avant les 120 s d’escale ; une arrivée tardive impose 120 s dès l’accostage.
`Mission.unloadingAllowed` garde le trajet actif jusqu’au terme de l’escale et
`departureAllowed` empêche le largage prématuré, sans changer les missions classiques.
`transfer` expose séparément les opérations passagers au port d’arrivée.

`skipWait` exige un accostage valide et les 30 s de transferts terminées. Il avance
uniquement le temps restant, rend le résultat du trajet pour sa comptabilité et
laisse le retour amarré. `Game` synchronise l’heure maritime, la marée, les passagers,
le HUD et la sauvegarde ; aucun pas de navigation ou changement de position n’est
exécuté. Les secondes passées font partie du temps simulé de service, des escales
et des statistiques de mission ; elles sont aussi isolées dans `skippedSeconds`.
Navigation, escale et retard restent des compteurs distincts.

Les anciennes sauvegardes sans `timing` migrent en conservant leur temps et leur
trajet. Leur répartition historique navigation/escale est estimée à partir de la
phase restaurée, faute d’informations antérieures ; les nouveaux trajets sont exacts.

Voir [le guide de jeu](../../docs/GAMEPLAY.md) pour les commandes et les règles.
