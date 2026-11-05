# Saint-Malo — pilotage, hybride et passerelle (phase 4)

## Utilisation
Menu → **Saint-Malo – Portsmouth** → choisir le départ du Naye ou l'approche de Portsmouth. Le ferry démarre arrêté en pilotage manuel. Appuyer sur **Continuer**, puis régler séparément les moteurs bâbord/tribord, le gouvernail et les propulseurs d'étrave. Les commandes au neutre coupent la demande ; elles n'arrêtent pas instantanément le navire.

Le sélecteur **Poste** donne accès à l'extérieur, au poste central et aux deux ailerons. Les commandes restent communes et le changement de poste ne met pas la navigation en pause. Les curseurs natifs sont utilisables à la souris, au toucher et au clavier ; sur le canevas 3D, Espace bascule la pause et N remet les commandes au neutre. Le radar côtier et la carte restent accessibles dans le panneau latéral. Les conditions simulées proposent calme, brise et mer formée.

Dans **Propulsion hybride et énergie**, choisir électrique, thermique GNL ou combinée. Le panneau affiche batterie en % et kWh, réserve de GNL en tonnes, consommation en kg/h, puissances fournies et disponibles en MW, répartition thermique/batterie, nombre de moteurs actifs et recharge.

**Recharge au port :** à moins de 100 m d'un poste de jeu, cap aligné à moins de 15°, vitesse inférieure à 0,15 m/s, rotation inférieure à 0,001 rad/s, commandes et moteurs revenus au neutre. Appuyer sur **Brancher au quai**, puis laisser la simulation tourner. La liaison maintient le navire à son poste et verrouille les commandes. **Débrancher le quai** les libère. Le raccordement et sa puissance sont des conditions de scénario ; ils ne garantissent pas la disponibilité réelle d'une infrastructure portuaire.

## Caractéristiques vérifiées et références
Sources consultées pendant la phase, les 2–5 novembre 2026 :

- [Brittany Ferries — dossier officiel du 31 janvier 2025](https://corporate.brittany-ferries.com/iso_album/dossier_de_presse_navire_saint-malo.pdf), p. 1–2 : dimensions 194,70 × 27,80 m, tirant d'eau 6,60 m ; deux Wärtsilä 12V46 DF de **13 740 kW chacun**, deux moteurs électriques de **4 800 kW chacun**, batterie **11,2 MWh** ; trois groupes GNL de 1 680 kW ; trois propulseurs d'étrave, deux de 2 400 kW et un de 600 kW. Le dossier décrit aussi l'entraînement des deux hélices avec un seul moteur thermique à charge réduite.
- [Brittany Ferries — dossier du 8 février 2025](https://brittanyferriesnewsroom.com/wp-content/uploads/2025/02/08-02-25-Saint-Malo-Press-Pack-EN.pdf) et [présentation de l'hybride](https://www.brittany-ferries.co.uk/ships/hybrid/what-is-hybrid-lng) : contrôle croisé des valeurs et de l'emploi des batteries en manœuvre, avec recharge quand le courant de quai est disponible.
- [Mer et Marine — découverte du Saint-Malo](https://www.meretmarine.com/fr/construction-navale/brittany-ferries-a-la-decouverte-du-saint-malo), photographie de passerelle `20250131_1646280.jpg` : inspiration pour la console sombre et inclinée, les deux sièges, le vitrage panoramique et l'organisation des écrans. La photographie n'est pas redistribuée. La géométrie des ailerons et les dimensions de l'intérieur sont interprétées, faute de plans.

## Modèle physique
`FerryDynamics` spécialise le moteur `VesselDynamics` existant, avec ses propres paramètres. Les constantes Corsaire et leur intégration sont inchangées. Masse estimée à 24 000 tonnes et inertie de lacet de 85 milliards kg·m² ; il s'agit d'un déplacement de calibration, **pas de la jauge brute convertie en masse**.

La poussée des deux lignes d'arbre est indépendante. La réponse moteur est filtrée sur 8 s ; une inversion passe par le ralenti et un délai au neutre de 4 s. Le gouvernail est limité à 35° avec une vitesse de 3°/s. Traînées longitudinale, latérale et de lacet, couplage entre les vitesses, poussée différentielle et bras de levier du gouvernail donnent une réponse propre à un grand navire. Les propulseurs d'étrave montent progressivement en 3 s et perdent de l'efficacité avec l'erre ; ils ne permettent pas un déplacement latéral instantané.

Vent relatif sur les surfaces frontale et latérale, moment de vent, courant uniforme de scénario, faible moment de houle et flottabilité sur les cinq points du `WaveField` sont reliés à la simulation. Le roulis et le tangage visuels sont amortis pour ce grand navire ; la passerelle garde un horizon stable, suit le pilonnement et le cap. La vitesse fond inclut le courant ; la vitesse dans l'eau reste distincte. Les contacts utilisent l'empreinte complète du ferry et l'arrêt avant obstacle de la phase 3.

Le mode manuel est en temps réel et utilise des sous-pas de 100 ms maximum. Le navigateur masqué met la simulation en pause. L'ancien parcours guidé reste dans le contrôleur pour les tests géographiques de phase 3, mais l'interface de phase 4 commence directement au pilotage manuel.

## Bilan énergétique
`HybridPlant` compte les kWh et les kilogrammes par pas physique ; ses limites alimentent réellement `powerFactor` et donc les forces de propulsion. En électrique, la batterie alimente la propulsion et les auxiliaires ; en GNL, le thermique fournit la demande ; en combiné, la batterie remplace une part du thermique et peut suppléer une puissance thermique momentanément indisponible. La réserve basse réduit l'assistance habituelle. L'épuisement des sources réduit la poussée jusqu'à zéro, sans annuler l'inertie. Le budget combiné est plafonné et les modes ne créent pas une puissance illimitée.

**Estimations de simulation explicites :** réserve initiale 200 t de GNL, batterie à 80 %, rendement batterie 94 %, consommation thermique 0,16 kg/kWh, services de bord 800 kW, alimentation de quai 6 MW dont 5,2 MW avant pertes pour charger la batterie. Le partage combiné de 35 % et le seuil de 15 % ne proviennent pas d'un automate réel du navire. La disponibilité thermique suit une transition de 20 s entre modes ; le scénario commence avec les moteurs disponibles. Ces valeurs servent à un bilan énergétique cohérent, pas à prédire une consommation commerciale.

Le circuit des trois groupes GNL, les convertisseurs, les embrayages et l'échange d'énergie entre les deux arbres sont agrégés dans le répartiteur de puissance. La sélection d'un seul moteur actif à faible demande représente ce principe ; le simulateur ne reproduit pas le schéma électrique complet ou le système constructeur de gestion énergétique. La recharge thermique en mer n'est pas modélisée. Le gaz pilote, les pertes thermiques détaillées, les limites de température et le vieillissement batterie ne le sont pas non plus.

## Passerelle et instruments
`FerryBridge` produit un intérieur large, trois postes, sièges, montants vitrés, consoles et six écrans, avec géométries regroupées et textures locales. Les écrans sont actualisés à 5 Hz : radar côtier et carte de phase 3, GPS, cap, vitesse fond, barre réelle, vitesse de rotation, sondeur de jeu, garde sous quille calculée et données énergétiques/moteurs. Les commandes physiques de console sont représentées visuellement ; les commandes interactives sont les contrôles tactiles/clavier de l'interface.

`BridgeStation`, `BRIDGE_STATIONS` et `DockingCameraMount` préparent les repères des futures caméras. **Aucune caméra d'accostage, vue vidéo ou fonction de phase suivante n'est développée.**

## Validation et limites
- Accélération, maintien d'erre, inversion/freinage, giration, propulseurs à basse et haute vitesse, dérive au courant et au vent.
- Conservation des unités énergétiques, sources épuisées, plafond de puissance, consommation comparative GNL/combiné, changement de mode en marche et absence de saut de vitesse ou position.
- Conditions de recharge, verrouillage des commandes, batterie pleine et connexion refusée hors poste ou mal orientée.
- Toute la route et ses approches restent contrôlées par les tests de phase 3 ; les tests Corsaire restent inclus.
- Mesures du scénario calme : environ **22,47 nd après 600 s**, rayon estimé **492 m** après établissement du virage (vitesse longitudinale / taux de lacet). Après une inversion complète depuis la croisière, le navire est passé en marche arrière lente à 240 s. Ces mesures sont celles du modèle, sans comparaison possible à des essais de giration constructeur non disponibles.

Les coefficients de manœuvrabilité, force de propulseur, surfaces au vent et mouvements de houle restent des approximations. Pas de validation hydrodynamique constructeur, de banc d'essai réel ou d'essai sur iPad/Safari physique. Les cartes et profondeurs demeurent des données de jeu impropres à la navigation réelle. Les courants sont uniformes, sans champ de marée local ; les collisions arrêtent le déplacement plutôt que de simuler les déformations de coque.

Captures du simulateur : [poste central](images/saint-malo-bridge-central.jpg), [aileron bâbord](images/saint-malo-bridge-port.jpg), [format tablette](images/saint-malo-bridge-tablet.jpg).

Contrôles navigateur : trois postes, charge effective et verrouillages, changement de poste en marche, curseur tactile et flèche clavier, retour au menu et captures desktop/tablette/mobile. La revue automatique de lancement a été indisponible en fin de session précédente ; ces vérifications ont été reprises le 5 novembre.

Validation finale : **build réussi, 165 tests réussis, 0 échec**. Compatibilité de compilation Safari 15 vérifiée ; usage iPad physique non testé. Le module de pilotage est chargé à la demande (~40 kB minifiés / ~15,5 kB gzip) ; l'avertissement de taille du bundle principal reste non bloquant.

## Service jouable et finition de phase 7

Les deux entrées du menu démarrent désormais à leur poste de départ, amarres en place. Dans le panneau Traversée : embarquer, démarrer le temps, attendre la fermeture des rampes, débrancher le quai puis larguer les amarres. Le manifeste de jeu est de 420 passagers et 80 véhicules ; il ne prétend pas représenter la capacité commerciale réelle. Les transferts prennent 320/240 secondes simulées, après 30 secondes d'ouverture de rampe ; la fermeture dure encore 30 secondes. Une perturbation du terminal suspend les transferts et le départ. La pause suspend également ces opérations.

`ChannelFerryService` est indépendant du DOM et réutilise `Passengers`. `ChannelNavigation` coordonne amarrage, énergie, équipage, trafic, horloge et sillage dans les mêmes sous-pas de 0,1 s. Un navire amarré ne dérive pas, consomme son énergie hôtelière et peut charger. Les commandes de propulsion sont verrouillées pendant l'amarrage ou le raccordement électrique. La reconnaissance guidée historique reste réservée aux tests ; elle n'est pas le pilotage proposé au joueur.

À destination : distance au poste <35 m, cap à ±10°, vitesse fond <0,2 m/s, vitesse dans l'eau <0,7 m/s, faible rotation et commandes neutres. Le poste doit être libre et accessible. L'assistance d'amarrage immobilise la position courante, sans la recaler ni téléporter le navire. Débarquer, attendre la fermeture, puis préparer le retour conserve position, énergie, horloge et conséquences des incidents. La distance restante est projetée sur la route dans le sens courant ; elle ne mesure pas la distance minimale réelle si le joueur s'en écarte.

`FerryLoadingView` utilise des instances à l'échelle métrique : voitures de 4,5 × 1,8 m et silhouettes de 1,7 m, représentatives du manifeste. Les flux en boucle, les raccordements de quai et les garages sont schématiques. Ils ne constituent pas un système individuel de circulation routière ni une reconstitution des dispositifs Ro-Ro réels.

La sauvegarde v1 ajoute un bloc de service optionnel validé, l'heure, le temps simulé, le confort passagers, l'état effectif du propulseur et le temps de physique. Les sauvegardes antérieures restent en pilotage libre ; lancer une nouvelle traversée active le service. Les deux emplacements correspondent aux entrées du menu, y compris lorsqu'une session a ensuite préparé un retour. La reprise se fait en pause et débranchée du quai.

`ChannelQuality` commence en qualité légère sur les appareils déclarant au plus quatre cœurs, équilibrée autrement. Le mode automatique peut réduire la qualité si les images effectivement rendues restent sous 26 FPS, avec hystérésis de dix secondes. Il ne remonte pas automatiquement la qualité. Le joueur peut choisir léger/équilibré/élevé. Le DPR est plafonné à 1/1,25/1,5 ; le maillage d'eau et les détails de baie suivent le réglage. Le rendu vise 30 images/s et les instruments 5 Hz. Aucun objectif iPad n'est certifié.

`RendererLifetime` traite une rétention constatée sur Three r186 : la texture globale DFG LUT gardait les contextes des dialogues fermés. Le hook public `onBeforeCompile` capture son uniforme ; la fermeture libère cette texture et ses écouteurs par contexte. Le rendu Corsaire la recharge ensuite à sa prochaine image. Aucun fichier de dépendance n'est modifié. Ce contournement et les réouvertures devront être revérifiés à chaque mise à niveau de Three.

Résultats et limites actuels : [audit final de phase 7](BRITTANY_FERRIES_FINAL_AUDIT.md). Les résultats historiques de phase 4 ci-dessus restent des mesures de cette phase.
