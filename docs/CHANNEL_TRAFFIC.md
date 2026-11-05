# Trafic de la Manche — phase 5

Le menu Saint-Malo–Portsmouth dispose désormais d'un trafic autonome, d'une commande de corne, d'un choix de densité et des vitesses de simulation ×1, ×2, ×4 et ×8. Le même pas simulé entraîne ferry joueur, énergie et navires IA. Les petites unités réagissent davantage à la corne ; un cargo peut maintenir sa route. Le joueur doit anticiper. Les marques orangées sur la carte et le radar de passerelle représentent les positions IA simulées.

## Architecture réutilisée
`ChannelTraffic.ts` utilise les types du trafic existant, `closestApproach`, la projection et les collisions géographiques de phase 3. `TrafficView` accepte cette flotte et conserve son comportement historique par défaut pour les missions Corsaire. Les modèles, matériaux fusionnés et voiliers existants sont réutilisés. `MaritimeAudio` conserve la synthèse de corne et ses limites, avec les volumes sauvegardés ; l'action volontaire sur la corne active le son comme le bouton Corsaire. `Berths` reste inchangé et sert aussi à isoler les réservations des postes du grand ferry. Les services, queues et accostages des taxis Corsaire ne sont pas remplacés.

## Flotte et routes
51 agents déterministes dans le scénario actuel : cargos, porte-conteneurs de 310 × 38 m, cargos de 220 m, ferries de 180 m, voiliers, plaisanciers et vedettes. Une unité reste un mètre. Les conteneurs ont des blocs de 12,2 × 2,44 m ; leurs piles et les bâtiments des navires restent simplifiés.

Deux services britanniques **fictifs** représentent le Solent et Portsmouth Harbour : ferry de 89,7 m et navette de 20 m. Le premier utilise comme ordre de grandeur la longueur officielle du [Victoria of Wight publiée par Wightlink](https://www.wightlink.co.uk/facilities/ferries/victoria-of-wight), vérifiée pendant cette phase. Il n'en reproduit ni la livrée ni un horaire ou une route réelle. La navette de Harbour est un archétype. Aucun modèle détaillé de navire réel britannique n'est revendiqué.

Les circuits régionaux sont distribués tous les 12 km environ le long de la traversée ; les cargos restent au large, les petites unités occupent aussi les côtes et l'avant-port. Chaque circuit est vérifié contre les côtes avec la longueur et la largeur de sa coque. Les phases initiales sont choisies pour éviter la superposition des navires. Aucun navire n'est repositionné pendant la navigation ; les agents éloignés continuent leur parcours. Les circuits en boucle sont une représentation de trafic ambiant, sans prétendre reproduire des itinéraires commerciaux ou un dispositif de séparation réel. Les nouveaux services britanniques circulent ; aucun service commercial d'embarquement n'est ajouté.

## Anticipation et interactions
Prévision du point de rapprochement jusqu'à 180 s pour les grands navires et 90 s pour les petites unités. Face à face, correction graduelle vers tribord ; croisement, distinction simplifiée entre celui qui manœuvre et celui qui maintient sa route. Une situation très rapprochée déclenche aussi une réaction conservatoire. Les navires interagissent entre eux et avec le joueur. Il ne s'agit pas d'un automate COLREG certifié.

Vitesse et vitesse de rotation sont bornées par catégorie, avec une montée progressive du lacet sur 12 s. Les cargos tournent au maximum à 0,003 rad/s et accélèrent à 0,025 m/s² ; les plaisanciers ont davantage de liberté. L'anticipation côtière inclut une distance de freinage. Les caps ne sont pas inversés instantanément aux extrémités : les routes sont des circuits continus.

La corne déclenche une réaction limitée dans un rayon de 1,5 km. Les plaisanciers/voiliers ralentissent et corrigent davantage leur cap, les ferries modérément ; les cargos ne font pas d'écart à la seule demande sonore. Réaction valable 12 secondes simulées et limitée à une sollicitation toutes les 6 secondes simulées. La synthèse audio garde sa limite de durée existante en temps réel.

Les contacts utilisent les rectangles orientés complets des coques, incluant les extrémités des navires de 310 m. Le joueur est arrêté avant pénétration comme dans la phase 4. Une garde contre les pénétrations côtières ou entre IA peut suspendre une progression dangereuse si la prévision échoue ; c'est une limite du modèle, pas une manœuvre normale. Le scénario prolongé testé n'a pas déclenché cette garde après correction du placement initial.

## Performance
Budget initial de 20 navires proches, abaissé à 12 pour les appareils exposant au plus quatre cœurs ; choix manuel 12/20/28. La sortie du budget s'effectue au-delà de 26 km afin d'éviter une disparition visible dans la brume. Le budget est donc souple lorsque beaucoup de navires sont proches.

Décisions proches toutes les 0,25 s, décisions lointaines toutes les 2 s ; intégration distante regroupée par 0,5 s au-delà de 8 km. Les positions sont ainsi partagées par la simulation accélérée. Au-delà de 5 km, les grands navires utilisent une coque et un bloc de superstructure simplifiés ; les détails sont retirés plus près. Limite visuelle de 24 km dans la brume. Les géométries sont préassemblées, sans téléchargement en navigation. L'origine flottante du joueur est appliquée au groupe de trafic.

## Validation et limites
Tests dédiés : diversité/dimensions et deux services britanniques, routes dégagées, rotation et accélération bornées, réactions différenciées à la corne, face à face et croisement avec maintien de route, contacts de proue et passage clair, équivalence temporelle ×1/2/4/8, réservations, séparation initiale et dix minutes de navigation sans blocage. La suite comprend aussi les missions et accostages Corsaire.

Le navigateur réel a confirmé l'ouverture du pilotage, la commande ×8, la corne et les positions radar, sans erreur dans l'interface ; les contrôles tablette/clavier et recharge des phases précédentes restent fonctionnels. Une scène de comparaison place le Saint-Malo près du porte-conteneurs, sans modifier la navigation utilisateur : [échelle des navires](images/channel-traffic-scale.jpg). Cette comparaison rendait 23 appels de dessin ; ce n'est pas un test de FPS sur iPad.

Les routes et livrées sont interprétées. Les manœuvres restent un modèle de jeu ; ni VTS, ni AIS, ni système de navigation professionnel. Aucun test sur iPad/Safari physique, et aucune garantie de débit d'images sur tous les appareils. Aucune phase suivante, fusion dans develop ou publication automatique.

Résultat final : **build réussi, 174 tests réussis, aucun échec**. Avertissement Vite sur le bundle principal > 650 kB conservé ; module Manche chargé à la demande (~47,2 kB minifiés / ~18,2 kB gzip). Aucune dépendance ajoutée. [Capture en navigation](images/channel-traffic-navigation.jpg).
