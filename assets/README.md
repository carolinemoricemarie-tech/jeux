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

Les atlas montés de la licorne et de Nuage restent dans `assets/private/`. Les nouveaux atlas `whiteCare` et `unicornCare` contiennent chacun seize poses dédiées aux soins et à l’équipement, pour chaque cavalière. Nuage a son propre atlas `whiteRear` et les deux enfants ont des atlas `walkDirections` avec des vues avant, arrière et de profil. Les recolorations et les masques de peau de l’ancienne édition ne sont plus utilisés ni distribués.

## Centre et balades libres

- `white-free.webp` : seize poses photographiques originales de Nuage blanc, quatre directions.
- `stable-props.webp` : huit objets détourés, grille 4 × 2 : foin, selle, filet, brosse, carottes, seau, tapis et brouette.
- `world-textures.webp` : quatre textures de sol, grille 2 × 2 : sous-bois, chemin de terre, pierre et sable.
- `ocean-water.webp` : texture photographique de vaguelettes, animée avec la géométrie et les normales de la mer.

Le centre utilise des murs, cloisons, portes de boxes articulées, fenêtres, planchers, toitures et étagères en 3D. Les canopées photographiques et les troncs sont affichés par groupes pour garder la fluidité. Les personnages et poneys restent des images animées sur des plans, et non des modèles anatomiques entièrement articulés en 3D.

Les PNG sources générés restent dans l’espace de création. Les nouvelles copies WebP sources sont sans perte. Pour le ZIP familial, les copies optimisées conservent les dimensions, la transparence à l’identique et une qualité WebP de 96 ; le jeu n’applique aucun filtre de couleur aux poneys. Aucun calcul de segmentation, génération d’image ou service distant n’est nécessaire pendant le jeu.

## Édition liberté et aventures

`pony-care-tack.webp` contient douze vues natives : trois poneys, chacun sans équipement, avec tapis, avec tapis/selle, puis avec le filet. Aucun enfant n’apparaît dans cette image publique. Les fichiers privés `stableActions` contiennent quatre grandes vues de chaque enfant, séparées du poney pour éviter l’agrandissement de petits visages dans les atlas combinés. Ces images sont uniquement distribuées dans le contenu chiffré du ZIP. Le canevas de soins est rendu à 2400 × 1600 ; les textures du personnage dans le centre conservent 512 pixels par pose. Les arbres photographiques projettent des ombres. Les troncs et ponts sont des géométries texturées, reliées à la physique des balades. Le jeu conserve des personnages photographiques sur plans ; il ne possède pas de personnages articulés en 3D.

Les arbres de la dernière édition ont une découpe alpha renouvelée, sans le halo gris des anciens feuillages. Leur propre tronc photographique est conservé ; les cylindres et branches dupliqués ont été supprimés. La couronne s’efface près de la caméra pour préserver la vue ; un tronc immédiatement contre la caméra s’efface aussi. Les troncs devant le poney restent visibles, avec leurs collisions.
