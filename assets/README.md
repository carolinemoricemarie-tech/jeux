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

## Écurie interactive et saut

Nouveaux visuels générés à partir du même cheval et de la même cavalière :

- `horse-jump` : huit phases spécifiques d’un saut d’obstacle, en grille 4 × 2, avec transparence corrigée.
- `stable-room` : écurie photographique avec foin, panier de carottes, brosses, tapis, selle, filet et coin de paille aux emplacements interactifs.
- `stable-care-brush`, `stable-care-hay`, `stable-care-carrot`, `stable-care-pet` : quatre poses par soin, en grille 2 × 2.
- `stable-equip-pad`, `stable-equip-saddle`, `stable-equip-bridle` : quatre poses par étape, le dernier état conserve l’équipement posé.

`stable-room.mjs` affiche le décor, les poses des gestes et l’état final du matériel. `photo-assets.mjs` enregistre le point de selle de la nouvelle séquence de saut pour conserver l’échelle du cheval quand ses jambes se replient. Les sources PNG restent conservées ; seules les copies WebP sans perte sont embarquées dans le téléchargement. Les visages sont ceux d’un personnage de démonstration généré.
