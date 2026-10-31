# Accélération pendant les missions

Le bouton « Temps ×1 » du HUD fait défiler ×1, ×2, ×4 et ×8. Le joueur garde
les commandes des deux moteurs et de la barre. La vitesse en nœuds représente
toujours la vitesse physique. Les préférences de vitesse ne sont pas sauvegardées :
pause, reprise, changement de mission et récupération repartent à ×1.

`SimulationLoop.acceleration` possède l'unique multiplicateur. `FixedStep` accumule
des secondes réelles et consomme 1/60 / multiplicateur par sous-étape, tout en
transmettant toujours 1/60 s à la simulation entière. Bateau, contacts, trafic,
horaires, retards, escales, passagers, météo, eau et événements avancent ensemble.
Les caméras et le rafraîchissement HTML gardent leur cadence réelle. Une réduction
de vitesse ou une pause pendant une sous-étape agit aussi sur le reste de l'image.

Le budget maximal est de 64 sous-étapes par image (16 à ×8 pour 30 images/s).
Une interruption prolongée abandonne le rattrapage excédentaire sans augmenter
le pas physique ni téléporter les navires. Le poste de conduite reste à 10 Hz et
les instruments à 5 Hz réels pour limiter les mutations du DOM à ×8.

`navigationSafety.ts` vérifie à chaque demande et tous les 0,1 s simulés :

- Trajectoires relatives et point de rapprochement maximal à 30 s, y compris
  la trajectoire courbe du joueur et les navires en manœuvre.
- Ports, quais, côtes, rochers et passages étroits, avec les obstacles physiques
  de `ShoreContact`, leurs polygones et les dimensions du navire sélectionné.
- Profondeur sous la coque sur les trajectoires prédites, avec marge d'un mètre
  et anticipation de la marée descendante.
- Zone d'approche du port de destination et prochaine étape obligatoire, en
  reprenant les rayons de la définition de mission.
- Manœuvre au port et annonce touristique attendant une action. Lire l'annonce
  dans le volet ou lancer sa lecture dans le menu l'acquitte.

Les changements de phase, validations d'étape et nouveaux événements manuels
interrompent aussi immédiatement l'accélération. Le motif reste affiché cinq
secondes réelles. La disparition du danger ne réactive jamais l'accélération.
Les gardes sont conservateurs et ne pilotent ni ne freinent le navire à la place
du joueur. Ils utilisent la géographie et la bathymétrie fictives du simulateur.
La navigation libre reste à ×1 ; les rotations illimitées et le saut d'attente
au quai continuent à utiliser leur logique existante.

Les tests automatisés couvrent les rapports temporels sur 30 minutes simulées à
30/60/144 FPS, les deux navires, le trafic dense, les horaires, les contacts au
quai à chaque vitesse, les prévisions de danger et les panoramas obligatoires.
La validation des 30 FPS sur Safari exige un iPad physique.

Validation du 31 octobre 2026 : `npm test` réussit (143 tests, dont 30 sur
l'accélération) et `npm run build` réussit. Vite signale le poids du bundle
principal (848 ko, 232 ko gzip ; seuil de 650 ko).

Le contrôle Edge headless mesure environ ×1,00 / ×2,00 / ×4,00 / ×8,02. Il
valide le refus au quai, la désactivation pour trafic et approche du port,
l'acquittement d'une annonce, le pilotage à ×8, la pause à ×1 et l'absence de
réactivation automatique. Le bouton de 44 px reste accessible sans débordement
aux formats 1440×900, 1024×768, 768×1024, 844×390 et 390×844. Aucun incident
JavaScript n'est relevé. Scripts, mesures et captures : `.qa/time-check.mjs`
et `.qa/time/` (ignorés par Git).
