# Les Crins Magiques — Le défi réaliste 🐴

Un jeu d’équitation en français, avec l’écurie, les soins, les flèches pour diriger et un parcours de **10 obstacles**. **La troisième erreur fait perdre immédiatement la partie.**

## Jouer sans installation

[Télécharger le jeu en ZIP depuis GitHub](https://raw.githubusercontent.com/carolinemoricemarie-tech/jeux/main/downloads/Les-Crins-Magiques.zip), extraire l’archive puis ouvrir **JOUER.html** dans un navigateur récent. Cette adresse permet de récupérer le jeu indépendamment des liens de fichiers de la conversation.

Télécharger puis ouvrir **`dist/les-crins-magiques-realiste.html`** dans un navigateur récent avec WebGL 2 (Chrome, Edge, Firefox ou Safari). Le fichier contient le jeu, son moteur et toutes ses images. Il fonctionne hors connexion, sans compte ni installation. Il peut être volumineux parce qu’il embarque les images en haute définition.

L’ouverture doit se faire dans un navigateur, plutôt que dans un lecteur de documents. Si un navigateur administré interdit les fichiers locaux, utiliser un navigateur qui autorise leur ouverture ou servir le fichier par HTTP.

## Le rendu visuel

Le cheval et la cavalière utilisent une série de huit poses photoréalistes générées pour ce jeu. Les arbres sont des images détourées, l’herbe et le bois ont des textures détaillées, et le ciel provient d’un panorama de campagne généré. Ces éléments sont intégrés au terrain et aux obstacles en 3D. Les personnages sont affichés sur des plans qui suivent la caméra ; ce choix permet de conserver le jeu complet dans un seul fichier. Le fichier contient toutes les images, sans appel à un service d’images pendant le jeu.

## Les règles

Chaque thème contient exactement **10 obstacles numérotés**, à franchir dans l’ordre et dans le sens indiqué par le tracé. Un obstacle franchi assez haut, entre ses deux montants, est réussi et rapporte trois étoiles.

- Toucher une barrière ou la franchir trop bas compte une erreur.
- Passer à côté du prochain obstacle, au-delà de sa ligne de passage, compte aussi une erreur.
- Après une ou deux erreurs, le parcours continue.
- À la troisième erreur, le parcours s’arrête avec **Partie perdue**. Cette règle s’applique aussi au dixième obstacle.
- Atteindre la fin des dix obstacles avec zéro, une ou deux erreurs donne **Parcours réussi**.
- Un autre obstacle passé hors de l’ordre ne valide pas le prochain saut.

Il n’y a pas de chronomètre. On peut se replacer avant un saut et recommencer après une défaite. Le cheval ne se blesse pas.

## Les commandes

| Commande | Action |
| --- | --- |
| ← / → | Tourner à gauche / à droite |
| ↑ | Accélérer |
| ↓ | Freiner jusqu’à l’arrêt |
| Espace | Sauter |
| R / Me replacer | Revenir face au prochain obstacle |
| Échap / Pause | Mettre en pause et reprendre |
| ⛶ | Passer en plein écran |

Le cheval avance doucement tout seul. Le repère indique la direction et la distance du prochain obstacle, la carte montre le circuit et le compteur **Ratés : 0 / 3** rappelle les erreurs déjà faites.

Sur téléphone et tablette, maintenir les flèches tactiles, puis toucher **Sauter**. Les commandes restent disponibles en plein écran. Changer d’onglet ou de fenêtre met le parcours en pause.

Trois décors sont disponibles : **Prairie fleurie**, **Jardin des rubans**, **Forêt enchantée**. Tous ont dix obstacles ; leur hauteur varie selon le thème.

## Au box et sauvegarde

Noisette, Nuage et Caramel ont chacun leurs jauges de nourriture, propreté, énergie et complicité. Donner du foin ou une carotte, brosser le cheval, le câliner et le reposer. Les soins changent son humeur. Un message indique le soin nécessaire si le cheval n’est pas prêt à partir.

L’effort d’un parcours terminé, perdu ou interrompu consomme des besoins. Seuls les parcours réussis ajoutent une victoire, des étoiles et un meilleur résultat. Aucun besoin ne diminue pendant l’absence de l’enfant.

La sauvegarde automatique utilise `crins-magiques-ecurie-v1` dans ce navigateur. Le nouveau défi conserve les besoins et les totaux existants, et démarre des records distincts des anciennes règles. Les données ne se synchronisent pas entre appareils. Déplacer ou renommer le fichier peut changer l’emplacement de la sauvegarde selon le navigateur. Si le stockage est bloqué, le jeu reste jouable avec un message indiquant que la sauvegarde est indisponible.

## Développement

Node.js 18 ou plus pour construire le fichier autonome :

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run package
npm test
```

Pour les sources en développement :

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Ouvrir `http://localhost:8000`. Le constructeur intègre les WebP sans perte de `assets/` dans le fichier final. Les sources utilisent des modules JavaScript et nécessitent le serveur ; le fichier autonome s’ouvre directement.

Les versions de Three.js et d’esbuild sont verrouillées. La licence MIT de Three.js accompagne `vendor/three.module.min.mjs` et est incluse dans le fichier autonome. Les visuels générés sont documentés dans `assets/README.md`.

## Validation

23 tests couvrent le pilotage, le freinage, les sauts, les erreurs de passage, la défaite exacte à trois ratés, sa priorité au dernier obstacle, une victoire avec deux erreurs, les trois circuits, les soins et la sauvegarde.

Vérification navigateur : rendu des images, trois erreurs consécutives puis défaite, remise à zéro au redémarrage, dix sauts réussis puis victoire, pause, soins, rechargement du record, commandes tactiles et absence de requêtes externes du fichier autonome.

Le paquet `downloads/Les-Crins-Magiques.zip` contient le fichier HTML autonome sous le nom `JOUER.html` et une notice. Les images WebP conservent la résolution et les pixels visibles des PNG originaux. `node scripts/optimize-assets.mjs` permet de les réencoder si nécessaire (sharp 0.35.5, déjà fourni dans l’environnement de création). Les WebP sont fournis avec le dépôt ; cet encodage est facultatif pour construire et jouer.
