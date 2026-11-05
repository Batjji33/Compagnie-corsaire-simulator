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

Les incidents légers et intermédiaires ont un poids bien supérieur à celui des scénarios graves. Aucun feu réel ou personnage blessé n'est représenté. Les trois scénarios reproductibles du code sont `weather`, `emergency` et `terminal` ; ils utilisent des contextes fixés par les tests. Ils ne forcent pas un événement incompatible dans une partie normale.

## Moteur et équipage
- `incidents/definitions.ts` : catalogue, conditions, incompatibilités, étapes, choix, équipes, durées et conditions de manœuvre. Ajouter un scénario consiste à étendre l'identifiant et son entrée de catalogue ; les effets ou animations particuliers s'ajoutent dans leurs modules dédiés.
- `IncidentEngine.ts` : générateur pseudo-aléatoire déterministe, horloge simulée, sélection pondérée, trois incidents maximum, une tâche par équipe et par incident, journal et conséquences. Pas d'accès DOM, réseau ou horloge système.
- Les contrôles d'apparition dépendent de la zone, du vent, de la houle, de la vitesse, du trafic proche, du risque, de la puissance thermique, de la batterie et du raccordement à quai. Les groupes empêchent notamment deux avaries de même secteur ou deux cas médicaux concurrents. Feu et transfert aérien s'excluent. Un grain augmente la probabilité de difficultés mécaniques et médicales ; les conditions météo dégradées augmentent aussi leur éligibilité.
- Dix minutes initiales de calme, puis au moins 4/15/30 minutes selon la fréquence choisie, avec un contrôle toutes les 30 secondes. Un même type spontané ne revient pas avant 90 minutes. Les exercices volontaires peuvent contourner ce délai de répétition mais respectent le contexte et les incompatibilités.
- Les délais normaux s'étendent de 90 secondes à 20 minutes par étape, cumulables sur plusieurs étapes. Durées multipliées par 0,75 / 1 / 1,4 selon la difficulté. Les issues sont achevée, partielle ou échouée ; le tirage final est reproductible et conservé dans l'état du générateur.
- Après deux heures sans clôture, le soutien extérieur termine le scénario avec des pénalités persistantes et libère les équipes. Les réductions permanentes de capacité sont plafonnées pour conserver une propulsion utilisable. Cette protection n'annule pas une panne sèche provoquée par l'épuisement normal du carburant.

## Conséquences dans le simulateur
Les avaries moteur/feu réduisent la capacité thermique ; les problèmes électriques réduisent la capacité électrique dans `HybridPlant`. Les valeurs actives et résiduelles se combinent, avec un plancher. La puissance disponible, la consommation et le comportement du ferry en découlent ; les vitesses ne sont pas changées instantanément.

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

Résultat final : **build réussi, 185 tests réussis, aucun échec**. L'avertissement Vite du bundle principal > 650 kB reste non bloquant. Le module Manche est chargé à la demande (~73 kB minifiés / ~26,7 kB gzip). Aucune dépendance ajoutée.
