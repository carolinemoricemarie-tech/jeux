# Visuels du défi réaliste

Images générées pour ce projet avec l’outil de génération d’images OpenAI :

- `horse-stride.png` : huit phases du galop avec cheval et cavalière, en grille 4 × 2, fond transparent.
- `horse-stable.png` : cheval au box, fond transparent.
- `real-trees.png` : quatre arbres feuillus détourés, en grille 2 × 2.
- `meadow-grass.png` : texture d’herbe en vue du dessus.
- `countryside.png` : panorama de ciel et campagne.
- `stable-wood.png` : texture de bois patiné.

Ce sont des visuels photoréalistes générés, intégrés au décor 3D ; le cheval et la cavalière ne sont pas des modèles anatomiques 3D complets. `photo-assets.mjs` prépare les découpes et les huit poses à l’exécution. Le constructeur embarque les images en données dans le fichier HTML ; aucune génération ni récupération d’images n’est nécessaire pendant le jeu.

Les images originales générées ont été conservées dans `/workspace/generated_images` dans l’instance de création. Les PNG de ce dossier sont les copies nécessaires pour reconstruire le jeu.

Les copies `.webp` sont encodées sans perte, à résolution inchangée et avec transparence préservée. Elles sont utilisées par `assets.mjs` pour réduire le poids du téléchargement. Les PNG sources restent conservés. Les dimensions et tailles sont consignées dans `encoding-report.json`.

## Enclos

- `paddock-background` : décor photographique d’un enclos avec herbe, arbres et clôtures en bois.
- `pony-free` : seize poses du poney au pas, sans selle ni cavalière, en grille 4 × 4. Chaque rangée correspond à un côté : droite, dos, gauche et face.
- `demo-paddock` : huit poses de la cavalière de démonstration, marche et longe, en grille 4 × 2.
- `play-ball` : ballon en caoutchouc photographique détouré, avec coutures et texture réelle.

La construction familiale utilise à la place les atlas `emmy-paddock` et `louane-paddock` depuis `assets/private/`. Les fichiers originaux générés sont conservés. La longe et les feux d’artifice sont dessinés à l’exécution ; le son est synthétisé localement.

## Écurie interactive et saut

Nouveaux visuels générés à partir du même cheval et de la même cavalière :

- `horse-jump` : huit phases spécifiques d’un saut d’obstacle, en grille 4 × 2, avec transparence corrigée.
- `stable-room` : écurie photographique avec foin, panier de carottes, brosses, tapis, selle, filet et coin de paille aux emplacements interactifs.
- `stable-care-brush`, `stable-care-hay`, `stable-care-carrot`, `stable-care-pet` : quatre poses par soin, en grille 2 × 2.
- `stable-equip-pad`, `stable-equip-saddle`, `stable-equip-bridle` : quatre poses par étape, le dernier état conserve l’équipement posé.

`stable-room.mjs` affiche le décor, les poses des gestes et l’état final du matériel. `photo-assets.mjs` enregistre le point de selle de la nouvelle séquence de saut pour conserver l’échelle du cheval quand ses jambes se replient. Les sources PNG restent conservées ; seules les copies WebP sans perte sont embarquées dans le téléchargement. Les visages sont ceux d’un personnage de démonstration généré.

## Extension familiale : repos, licorne et promenades

Nouveaux visuels photoréalistes générés, sans visage familial dans ce dossier public :

- `pony-rest.webp` : grille 4 × 3, une rangée par poney (bai, blanc, licorne rose et blanche), quatre positions de la station debout au repos couché.
- `pony-gallop.webp` : quatre phases de galop dans quatre directions.
- `unicorn-free.webp` : licorne poney rose et blanche, quatre directions et quatre phases.
- `stable-yard.webp` et `stable-corridor.webp` : cour et allée des boxes, avec des zones de marche et des portes interactives.
- `sea-sky.webp` : panorama marin utilisé dans la balade sur la plage.

Les deux atlas montés de la licorne restent dans `assets/private/`. Les vues montées habituelles et les séquences de soins sont recolorées à l’exécution pour Nuage et Étoile ; les masques préservent les personnages. La licorne emploie des visuels spécifiques dans l’enclos, au repos et en selle. Les décors de balade combinent textures photographiques, arbres détourés, chemin 3D et mer animée. Ces éléments restent des images animées sur des plans, et non des personnages articulés en 3D.

Les masques de protection des personnages sont calculés localement avec DeepLabV3 MobileNetV3 (classe personne VOC), à partir des images générées. Ils restent privés et sont embarqués avec les images chiffrées. Le modèle, ses dépendances et ses poids ne sont pas distribués avec le jeu ; aucune segmentation ni requête distante ne s’exécute pendant la partie. `scripts/prepare-family-masks.py` permet de reconstruire ces masques.
