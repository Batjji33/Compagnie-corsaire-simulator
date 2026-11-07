# Incidents et équipage — phase 6

## Jouer
Dans le pilotage du Saint-Malo, ouvrir **Incidents et équipage**. Le résumé reste repliable et indique le nombre de situations actives. Les interventions disponibles portent chacune leur propre intitulé, équipe et durée. Les équipes technique, navigation et assistance passagers peuvent agir en parallèle, chacune sur une seule tâche.

Les tâches se déroulent pendant la navigation et suivent ×1/×2/×4/×8. Une pause arrête leur progression. Si une manœuvre n'est plus compatible avec la tâche, celle-ci attend. **Rappeler l'équipe** libère la ressource, conserve l'incident et ajoute 30 secondes de retard ; cela permet de choisir une solution de repli propre au scénario. Ce bouton ne résout aucun problème.

Le sous-panneau **Réglages et exercices** contient la fréquence (aucun incident spontané, rare, espacée, fréquente), la difficulté (souple, normale, exigeante) et le déclenchement explicite d'un exercice fictif. Seuls les exercices compatibles avec la situation courante sont disponibles. Désactiver la fréquence n'annule pas les interventions déjà engagées. La difficulté modifie les durées des nouvelles tâches et la probabilité d'un échec, sans modifier rétroactivement une tâche commencée.

Le retard cumulé, la tension des passagers, les suivis médicaux, les cabines indisponibles et les capacités énergétiques restent visibles. Les descriptions d'urgence sont des **mécaniques fictives de coordination**, sans procédure opérationnelle, médicale ou de sauvetage réelle.

## Catalogue
| Incident | Déclenchement contextuel | Coordination proposée |
| --- | --- | --- |
| Vibrations moteur | Thermique en charge, hors alimentation de quai | Diagnostic technique, réparation sous régime réduit ou marche limitée |
| Défaut électrique | Batterie basse, thermique en charge ou quai | Recherche technique, rétablissement progressif ou services prioritaires |
| Assistance médicale | Mer agitée | Équipe passagers puis accueil à l'arrivée ou liaison fictive avec la terre |
| Hélicoptère fictif | Au large, vent compatible, hors feu | Créneau, accompagnement, animation de transfert à faible vitesse ou relais à l'escale |
| Alerte feu scénarisée | Thermique chargé, hors quai et transfert aérien | Reconnaissance, réaffectation des passagers, contrôle technique ou soutien extérieur |
| Personne à la mer fictive | Hors port, mer compatible | Vigie, retour lent vers un marqueur ou assistance simulée, accueil |
| Grain | Au large par météo déjà dégradée | Veille adaptée à faible allure ou prolongée, assistance aux passagers |
| Poste perturbé | Port ou approche | Concertation pour un nouveau créneau ou créneau différé |
| Mouvement social fictif | Port ou approche | Liaison terminal puis accueil passagers ou escale différée |
| Plaisancier gênant | Trafic proche et risque signalé, hors pleine mer | Veille rapprochée ou assistance portuaire fictive |
| Cabine indisponible | Tous secteurs | Réaffectation puis contrôle technique ou fermeture jusqu'à l'escale |
| Évacuation générale | Au large pendant la traversée, passagers à bord, aucun autre incident actif | Alerte, rassemblement, canots, hélicoptère ou priorité maritime, transfert aux vedettes médicalisées, décompte |
| Voie d’eau | Au large pendant la traversée | Contrôle, pompage à faible allure ou soutien extérieur, vérification des espaces |
| Défaut de gouvernail | Au large pendant la traversée | Diagnostic, commande de secours à faible allure ou escorte |
| Surchauffe du refroidissement | Au large, thermique en charge | Contrôle du circuit, intervention à régime réduit ou puissance limitée |
| Perte du radar | Au large pendant la traversée | Veille visuelle ou extérieure, rétablissement technique ou veille jusqu’à l’escale |
| Chargement déplacé | Au large avec houle >1 m | Contrôle du garage, fixations simulées ou fermeture du secteur, information des voyageurs |
| Passager introuvable | Au large, passagers à bord | Signalement, recherche ou appui à terre, accompagnement du passager retrouvé |
| Fumée aux cuisines | Au large, passagers à bord, hors transfert aérien | Reconnaissance, changement de salon, contrôle technique ou fermeture du secteur |
| Suspicion de fuite des eaux de service | Au large pendant la traversée | Vérification, isolement du circuit ou assistance environnementale, liaison portuaire |
| Détresse d’un navire voisin | Au large pendant la traversée | Rendez-vous sur un marqueur ou relais par les secours, préparation de l’accueil |
| Vedette médicalisée | Au large, passagers à bord | Demande de vedette, accompagnement, transfert à faible allure ou attente de moyens adaptés |

Le catalogue comprend **22 incidents, contre 11 précédemment**. Les incidents légers et intermédiaires ont un poids bien supérieur à celui des scénarios graves. Aucun feu réel ou personnage blessé n'est représenté. Les scénarios reproductibles du code sont `weather`, `emergency`, `terminal`, `rescue` et `crossing` ; ils utilisent des contextes fixés par les tests. Ils ne forcent pas un événement incompatible dans une partie normale.

## Évacuation générale
Au large, ouvrir **Instruments et équipage → Incidents et équipage → Réglages et exercices** puis choisir **Évacuation générale du navire**. Le navire doit avoir quitté le quai avec des passagers. L’exercice reste soumis aux incompatibilités ; terminer les autres incidents avant de le lancer. Il peut aussi apparaître spontanément, avec un poids très faible. Il occupe seul la coordination et empêche de nouveaux incidents pendant l’opération.

L’évacuation comprend six étapes. Après l’alerte, deux vedettes médicalisées et un canot orange approchent du ferry. Les silhouettes sur le pont représentent le rassemblement. L’hélicoptère animé arrive pendant la tâche aérienne et transfère progressivement jusqu’à 12 passagers prioritaires ; le reste est transféré par mer. Le panneau affiche le total évacué, les personnes encore à bord et la répartition air/mer. Les silhouettes sont symboliques et ne représentent pas chaque passager individuellement.

Le transfert aérien exige une vitesse <3 m/s, un vent <25 nd et une houle <3 m. Le transfert par canots exige une vitesse <1,5 m/s et une houle <4 m. Les seuils sont des règles de jeu. Une dégradation des conditions suspend la tâche et son décompte. Le rappel permet de choisir le relais maritime ou un dispositif extérieur adapté à la météo, avec du retard et une issue au mieux partielle. Un rappel conserve les passagers déjà transférés. La pause et les accélérations ×1/2/4/8 s’appliquent à toute l’opération.

Les personnes transférées quittent réellement le manifeste. Les véhicules restent à bord. Le service est signalé comme interrompu ; après le bilan, le joueur peut piloter le ferry jusqu’au port, s’amarrer et décharger les véhicules. Les passagers évacués ne réapparaissent pas au débarquement. Préparer le retour remet le manifeste du nouveau service à zéro, en conservant les conséquences et le cumul d’évacuations au journal de traversée. Après deux heures sans résolution, les secours extérieurs prennent en charge les personnes restantes, libèrent les équipes et conservent les pénalités.

## Moteur et équipage
- `incidents/definitions.ts` : catalogue, conditions, incompatibilités, étapes, choix, équipes, durées et conditions de manœuvre. Ajouter un scénario consiste à étendre l'identifiant et son entrée de catalogue ; les effets ou animations particuliers s'ajoutent dans leurs modules dédiés.
- `IncidentEngine.ts` : générateur pseudo-aléatoire déterministe, horloge simulée, sélection pondérée, trois incidents maximum, une tâche par équipe et par incident, journal et conséquences. Pas d'accès DOM, réseau ou horloge système.
- Les contrôles d'apparition dépendent de la zone, du vent, de la houle, de la vitesse, du trafic proche, du risque, de la puissance thermique, de la batterie et du raccordement à quai. Les groupes empêchent notamment deux avaries de même secteur ou deux cas médicaux concurrents. Feu et transfert aérien s'excluent. Un grain augmente la probabilité de difficultés mécaniques et médicales ; les conditions météo dégradées augmentent aussi leur éligibilité.
- Dix minutes initiales de calme, puis au moins 4/15/30 minutes selon la fréquence choisie, avec un contrôle toutes les 30 secondes. Un même type spontané ne revient pas avant 90 minutes. Les exercices volontaires peuvent contourner ce délai de répétition mais respectent le contexte et les incompatibilités.
- Les délais normaux s'étendent de 90 secondes à 20 minutes par étape, cumulables sur plusieurs étapes. Durées multipliées par 0,75 / 1 / 1,4 selon la difficulté. Les issues sont achevée, partielle ou échouée ; le tirage final est reproductible et conservé dans l'état du générateur.
- Après deux heures sans clôture, le soutien extérieur termine le scénario avec des pénalités persistantes et libère les équipes. Les réductions permanentes de capacité sont plafonnées pour conserver une propulsion utilisable. Cette protection n'annule pas une panne sèche provoquée par l'épuisement normal du carburant.

## Conséquences dans le simulateur
Les avaries moteur/feu réduisent la capacité thermique ; les problèmes électriques réduisent la capacité électrique dans `HybridPlant`. Les valeurs actives et résiduelles se combinent, avec un plancher. La puissance disponible, la consommation et le comportement du ferry en découlent ; les vitesses ne sont pas changées instantanément.

La voie d’eau et la surchauffe réduisent aussi la capacité thermique. Le défaut de gouvernail réduit l’efficacité hydrodynamique de la barre, sans modifier instantanément le cap ni les commandes. Les rétablissements partiels peuvent laisser une limitation de puissance ou de gouverne. Une panne radar retire l’affichage radar et invite à coordonner la veille ; la carte géographique reste disponible. Les nouveaux incidents conservent les conséquences propres à leur scénario : retards, suivis médicaux et espaces indisponibles.

Le grain fait monter le vent et la houle progressivement sur une constante de temps de deux minutes, puis les laisse revenir aux conditions choisies après résolution. Une perturbation de terminal empêche le raccordement à quai et interrompt une liaison active. L'assistance portuaire sollicite progressivement le comportement existant des petites unités gênantes. Le retard et la tension sont des indicateurs persistants de traversée ; aucune nouvelle mission commerciale ou notation d'arrivée n'est ajoutée dans cette phase.

Le journal, les suivis médicaux et les cabines indisponibles restent présents après la résolution. Ils ne constituent pas une prise en charge médicale réelle. Les réactions d'équipage sont simulées, sans fatigue ou organisation complète des quarts.

## Animations et HUD
`IncidentView` réutilise l'origine locale de la scène et quelques géométries partagées : équipes en déplacement sur le pont, signalisation des espaces concernés, fumée grise symbolique, hélicoptère avec rotor, marqueur flottant et petite assistance. L'hélicoptère n'apparaît que pendant sa tâche aérienne. Le marqueur de secours reste fixé dans le monde pendant le déplacement du ferry. La progression utilise le temps simulé. Ces animations représentent les interventions ; ce ne sont pas des reconstitutions de gestes ou de procédures.

`IncidentPanel` conserve les commandes de pilotage accessibles et regroupe les réglages secondaires. Les choix indisponibles indiquent la ressource occupée ou les conditions à attendre. Le rafraîchissement conserve autant que possible le focus des boutons et les annonces se limitent aux nouveaux signalements. Le panneau a été examiné aux formats desktop, tablette et mobile.

## Reprise et persistance
`ChannelVoyageSave.ts` conserve automatiquement, toutes les dix secondes réelles, à la fermeture et au masquage de la page : position et commandes du ferry, météo, énergie, état complet du moteur d'incidents, tâches, historique, conséquences et positions du trafic. Un emplacement local est réservé à chacun des deux points de départ. L'ouverture reprend en pause ; le câble de quai est toujours débranché et sa connexion doit être redemandée.

Le bouton **Nouvelle traversée · effacer cette reprise**, dans les réglages, efface uniquement cet emplacement et ouvre une nouvelle session. Les sauvegardes Corsaire sont inchangées. Les données sont validées avant application ; un état incompatible ou corrompu est ignoré. Le stockage est local au navigateur et peut être indisponible ou supprimé ; un message le signale et la session reste jouable. Les choix d'incidents ne sont pas téléversés. Les transitions internes de température moteur et les temporisations fines du trafic ne sont pas restaurées : il s'agit d'une reprise de jeu, pas d'une sauvegarde de banc d'essai au bit près.

## Vérifications
Tests de toutes les catégories, contexte/incompatibilités, trois équipes simultanées, conditions changeantes, rappel et repli, soutien après dépassement de délai, résultats reproductibles complets/partiels/échoués, périodes calmes, fréquence désactivée, génération spontanée déterministe et capacité maximale. Équivalence de l'horloge ×1/2/4/8 et pause, restauration des tâches/énergie/position et rejet atomique d'une sauvegarde invalide. Des tests vérifient aussi les effets réels sur les puissances, la météo et le port.

Le navigateur a vérifié un exercice cabine, son affectation à l'assistance, la progression en ×8, la reprise en pause après fermeture et la création d'une nouvelle traversée sans incident hérité. Les captures finales sont disponibles : [desktop](images/incidents-desktop.jpg), [mobile](images/incidents-mobile.jpg). Safari sur iPad physique n'est pas disponible pour validation. Les performances et le rendu n'y sont donc pas certifiés.

Aucune phase suivante, fusion dans develop ou publication automatique.

Chaque nouvelle traversée reçoit une graine locale différente, conservée dans la sauvegarde. Les tests fournissent explicitement leurs graines pour rejouer les scénarios à l'identique ; la reprise d'une traversée conserve également son générateur.

L’extension CON-28 conserve aussi le décompte d’évacuation, la répartition air/mer, le point de départ de chaque transfert et le manifeste restant. Les sauvegardes antérieures reçoivent des valeurs par défaut. Une incohérence entre les personnes transférées et le manifeste est rejetée avant application.

Vérification CON-28 : 13 nouveaux tests couvrent le catalogue doublé, les replis en météo dégradée, la priorité exclusive, les transferts progressifs, les petits groupes, le rappel et la reprise sans doublon, le dépassement de délai, la pause et les quatre accélérations, le déchargement des véhicules, les effets physiques et les animations. Des essais Edge headless à 1440 × 900, 768 × 1024 et 390 × 844 vérifient les 22 choix d’exercice, le déclenchement manuel, l’affectation/rappel et l’accord entre le panneau et le manifeste, sans débordement horizontal ni erreur JavaScript. Une panne radar et le repli vers la carte sont aussi vérifiés dans le navigateur. Ces essais utilisent une position de test au large ; ils ne constituent pas une traversée complète pilotée. Captures : [ordinateur](images/crossing-evacuation-desktop.jpg), [tablette](images/crossing-evacuation-tablet.jpg), [mobile](images/crossing-evacuation-mobile.jpg), [secours autour du ferry](images/crossing-rescue-scene.jpg).

Le panneau conserve la direction Data terminal existante (seed 1752588026), la police système et les couleurs du HUD. Son nouvel élément est le décompte d’évacuation air/mer, issu du manifeste. L’inspection finale du skill `design-taste-frontend` passe aux trois largeurs avec deux exceptions documentées : le recouvrement volontaire des instruments par le panneau ouvert et la détection du texte d’Aide lorsque son disclosure est fermé. L’avertissement sur les bordures du HUD transparent est conservé après examen visuel. Aucun contenu fictif d’entreprise ou média externe n’a été ajouté ; les positions de test sont réservées aux vérifications locales.

Résultat final : **build réussi, 185 tests réussis, aucun échec**. L'avertissement Vite du bundle principal > 650 kB reste non bloquant. Le module Manche est chargé à la demande (~73 kB minifiés / ~26,7 kB gzip). Aucune dépendance ajoutée.

Résultat de l’extension CON-28 : **209 tests réussis, aucun échec**, TypeScript strict validé et build de production réussi. Dans l’environnement Windows restreint, le chargeur natif contourne l’erreur `spawn EPERM` du chargeur de configuration Vite par défaut : `node node_modules/vite/bin/vite.js build --configLoader native`. Le module Manche est maintenant d’environ 109 kB minifiés / 37 kB gzip ; l’avertissement sur le bundle principal reste non bloquant. Aucune dépendance ajoutée.
