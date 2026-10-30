# Audio maritime

`MaritimeAudio.ts` synthétise moteurs, vagues, vent, port, oiseaux et avertissements
avec Web Audio. Le contexte est créé après une interaction quand le son est activé,
suspendu en pause ou en arrière-plan et fermé à la destruction du jeu.

Les volumes sont indépendants et enregistrés dans le profil IndexedDB existant.
Les paramètres moteurs et météo viennent de la physique, sans animation sonore
indépendante du navire. Une seule instance gère aussi les alertes du radar et des
hauts-fonds ; l'ancien générateur d'alertes du panneau maritime a été regroupé ici.

Les annonces utilisent une voix française du navigateur, avec priorité aux voix
locales. Sans voix française ou si le navigateur refuse de lire, le texte et les
commandes de lecture restent disponibles. Les alertes interrompent la narration.

Aucun fichier audio tiers, abonnement ni téléchargement automatique n'est utilisé.
Voir [les crédits](../../public/assets/AUDIO-CREDITS.md) et
[le guide d'immersion](../../docs/IMMERSION.md).
