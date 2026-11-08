# Les Crins Magiques — Mon écurie interactive 🐴

**[Télécharger la dernière édition familiale : soins vivants et grands parcours](https://raw.githubusercontent.com/carolinemoricemarie-tech/jeux/main/downloads/Mon-ecurie-soins-vivants-et-grands-parcours.zip)** — environ 40 Mo. Aucun compte GitHub nécessaire. Extraire tous les fichiers puis ouvrir **JOUER.html** dans Chrome ou Edge récent, avec le code communiqué en privé. Aucune installation.

Profils gauche/droite corrigés selon la caméra ; marche arrière et retours de soins dans le bon sens ; nourrissage avec tête, lèvres et mâchoire animées, carotte et poignée de foin ; accès permanent à la cour, même en pause et en plein écran ; trois parcours difficiles redessinés avec de grandes courbes et des portes larges. Les hauteurs et les règles adaptées à Emmy sont conservées.


Un jeu d’équitation en français, avec une écurie interactive, un enclos pour jouer et travailler en longe, et **neuf parcours de dix obstacles**. Emmy joue sans élimination et bénéficie du guidage sur les trois parcours débutants. Louane conserve la limite de trois erreurs. Trois balades à diriger soi-même complètent les activités : forêt, mer et campagne. Le centre équestre se visite à pied, avec six boxes ouvrants et une sellerie.

## Jouer sans installation

La nouvelle édition familiale est construite et vérifiée **hors connexion**. Une ancienne édition à code HTML chiffré a été signalée comme menace grave par Microsoft Defender. La détection exacte reste inconnue ; cette ancienne archive ne doit pas être autorisée dans l’antivirus. Aucune analyse Defender n’est disponible dans l’environnement Linux de création. Le nouveau format corrige le chargement en gardant le code lisible ; un nouvel essai doit se faire avec Defender activé, sans autoriser un fichier encore signalé.

Le nouveau dossier hors ligne sépare le **code JavaScript lisible** des **images familiales chiffrées**. Après extraction complète du ZIP, `JOUER.html` ouvre le jeu dans Chrome ou Edge récent ; garder tous les fichiers dans le même dossier et saisir le code communiqué séparément. Aucun installateur, programme Windows ou service distant n’est requis. Le constructeur ne déchiffre et n’exécute aucun code HTML/JavaScript : il valide uniquement des images PNG/WebP avant de les charger. La politique de sécurité bloque les connexions réseau.

Construction locale, avec un fichier de code aléatoire privé d’au moins 24 caractères :

```sh
node scripts/build-reviewable.mjs --key-file /chemin/prive/code.txt
```

Le dossier est créé dans `dist/reviewable-family`, ignoré par Git. `scripts/audit-reviewable.mjs --folder dist/reviewable-family --key-file /chemin/prive/code.txt` vérifie la liste des fichiers, la séparation code/images, l’absence de clé incluse et le contenu PNG/WebP chiffré ; cette inspection ne remplace pas une analyse antivirus. Les portraits et ressemblances sont dans `assets/private/`, également ignoré. Le code d’accès n’est jamais ajouté au dossier construit. La construction standard de démonstration reste disponible avec `npm run build` et produit un HTML autonome sans les visages familiaux.

## Le rendu visuel

Le nourrissage dispose de séquences séparées pour chaque poney et chaque enfant : approche, main plate, tête qui descend, prise de nourriture, mastication, retrait et retour. Le foin et la carotte sont des objets photographiques individuels. La marche utilise les vues avant/arrière/profils adaptées à la caméra, sans intervertir les profils. Des ombres de contact relient les pieds et sabots au sol.

Le cheval et la cavalière utilisent des séquences photoréalistes générées : huit poses de galop, huit poses de saut et des séquences de soins et d’équipement. Les arbres sont des images détourées, l’herbe et le bois ont des textures détaillées, et le ciel provient d’un panorama de campagne généré. Ces éléments sont intégrés au terrain et aux obstacles en 3D. Les personnages sont affichés sur des plans qui suivent la caméra ; le décor du centre et les terrains se parcourent en 3D. Le dossier autonome contient toutes les images, sans appel à un service d’images pendant le jeu.

## Les règles

Les trois tracés difficiles suivent de grandes boucles sans croisement. Les règles de saut et les hauteurs élevées sont conservées ; les derniers obstacles sont orientés selon leur approche réelle, et les points de guidage rejoignent la prochaine porte depuis la position du poney.

Chaque thème contient exactement **10 obstacles numérotés**, à franchir dans l’ordre et dans le sens indiqué par le tracé. Un obstacle franchi assez haut, entre ses deux montants, est réussi et rapporte trois étoiles.

- Toucher une barrière ou la franchir trop bas compte une erreur.
- Passer à côté du prochain obstacle, au-delà de sa ligne de passage, compte aussi une erreur.
- Après une ou deux erreurs, le parcours continue.
- Pour **Louane**, la troisième erreur termine le parcours avec **Partie perdue**, même au dixième obstacle.
- Pour **Emmy**, aucune élimination sur les neuf parcours : elle peut terminer les dix obstacles même après plusieurs erreurs. Sur ses trois parcours débutants, le poney suit automatiquement le tracé ; seule Emmy déclenche les sauts avec Espace ou le bouton Sauter. Les six autres parcours gardent le pilotage manuel.
- Louane gagne en terminant avec au plus deux erreurs. Emmy reçoit une arrivée encourageante à la fin du circuit, quel que soit le nombre de sauts manqués.
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

Dans les parcours de saut, le cheval avance doucement tout seul. En balade et en monte libre, il attend la première pression sur ↑. Les pressions suivantes choisissent le trot puis le galop ; ↓ fait ralentir puis arrêter. Le repère indique la direction et la distance du prochain obstacle, la carte montre le circuit et le compteur **Ratés : 0 / 3** rappelle les erreurs déjà faites.

Sur téléphone et tablette, maintenir ← et → pour tourner. En balade et en monte libre, toucher ↑ ou ↓ une fois par changement d’allure ; le bouton **Sauter** déclenche le saut. Les commandes restent disponibles en plein écran. Changer d’onglet ou de fenêtre met le parcours en pause.

### Neuf parcours et un vrai départ

| Niveau | Parcours | Hauteurs |
| --- | --- | --- |
| Débutant | La prairie fleurie | 45–60 cm |
| Débutant | Le petit verger | 60–75 cm |
| Débutant | La ronde des pâquerettes | 70–85 cm |
| Intermédiaire | Le jardin des rubans | 85–100 cm |
| Intermédiaire | Les méandres du ruisseau | 95–110 cm |
| Intermédiaire | Le tour du vieux moulin | 100–115 cm |
| Difficile | La forêt enchantée | 110–125 cm |
| Difficile | Le défi des étoiles | 115–130 cm |
| Difficile | Le grand prix arc-en-ciel | 125–140 cm |

Chaque circuit a son propre tracé. Les trois parcours difficiles ont désormais des portes de 4,6 mètres, des approches longues et des virages ouverts : leur difficulté porte sur les hauteurs, conservées entre 1,10 et 1,40 m. Les tracés débutants et intermédiaires conservent leur géométrie. Les neuf parcours peuvent être consultés avant d’équiper le poney. Le départ attend **3, 2, 1, Partez !** ; le poney reste immobile pendant le décompte et la pause conserve le temps restant.

Une arche et une ligne à damier matérialisent l’arrivée. Après le dernier saut réussi, le poney termine sa réception puis passe sous l’arche. Le feu d’artifice dessine sept bandes en arc-en-ciel ; le résultat apparaît après les premières fusées. Les applaudissements et une petite fanfare accompagnent uniquement la victoire. Avec la préférence système « réduire les animations », l’arc-en-ciel reste fixe.

### Son

Le bouton **Son activé / Son coupé** reste accessible dans la barre du jeu, y compris en plein écran. Les pas du poney, le départ, les petits souffles du cheval, les applaudissements et les feux d’artifice sont synthétisés avec Web Audio. Le premier clic active le son suivant les règles du navigateur. Aucun fichier audio ni service extérieur n’est téléchargé.

## L’enclos

Le poney y porte un licol, sans selle ni cavalière sur son dos. La cavalière se déplace avec les quatre flèches, les commandes tactiles ou un clic sur l’herbe. La marche accélère et freine progressivement ; Emmy marche un peu moins vite que Louane.

- **En liberté** : appeler le poney pour qu’il rejoigne la cavalière, lancer un ballon et le laisser le ramener. Chaque ballon rapporté augmente la complicité.
- **En longe** : rejoindre le centre, choisir le pas, le trot, le galop ou l’arrêt, puis changer de main. La longe visible relie la main de la cavalière au licol. Trois tours renforcent la complicité et consomment un peu d’énergie, une seule fois par visite.
- **Au galop** est disponible en liberté comme en longe. Le poney peut courir librement autour de l’enclos.
- **Monter · mouvement libre** ouvre l’enclos en selle : aucune trajectoire imposée, ← et → pour diriger, ↑ pour choisir pas, trot puis galop, ↓ pour ralentir. **Arrêt**, **Descendre du poney** et **Rentrer au centre** restent accessibles. Le matériel est préparé pour cette activité.
- **Sortir vers la cour**, **Portail · La cour →** et le raccourci permanent **La cour** dans la barre du jeu rejoignent le milieu de la cour. Ils restent utilisables à pied, en longe, en selle, en pause et en plein écran. Le retour annule les anciennes cibles de déplacement et permet de marcher immédiatement dans la cour.
- **Pause** ou Échap fige les déplacements. Le passage dans l’enclos retire le matériel ; il faut le reposer avant un parcours.

Le décor, le poney et les personnages utilisent des images photoréalistes. Le déplacement et la profondeur sont calculés dans `paddock.mjs` et `paddock-room.mjs`, avec seize poses du poney vues de quatre côtés et huit poses de marche et de longe pour chaque personnage.

## Un centre équestre à explorer

Après le choix d’Emmy ou Louane, la cavalière rejoint la cour du centre. Les flèches ↑ et ↓ font marcher et reculer ; ← et → tournent le personnage. Un clic sur le sol ou un lieu du petit plan fait marcher la cavalière jusqu’à ce point, en passant par les portes. Le clic droit maintenu avec glissement permet de regarder autour de soi.

- Traverser la cour puis entrer dans l’allée des écuries.
- S’approcher d’une porte et appuyer sur **E** ou sur le bouton dans le jeu pour ouvrir ou fermer le box. Les portes fermées et les murs retiennent réellement le personnage.
- Marcher à l’intérieur des six boxes ; Noisette, Nuage et Étoile occupent les trois premiers.
- Près des objets : remplir l’abreuvoir, ajouter du foin et nettoyer la paille. Le geste attend son animation avant d’accepter un deuxième clic ; les petites attentions et les portes sont sauvegardées dans le navigateur.
- Près du poney : **Prendre soin** ouvre la vue rapprochée des soins et du matériel. **Sortir du box** ramène la cavalière à pied dans le centre.
- Visiter la sellerie, la grange et l’aire de pansage, puis rejoindre l’enclos ou les départs de balade.

La cour emploie un sol de pierre photographique ; les boxes ont une litière texturée, des cloisons et des portes articulées en 3D. Les selles, les filets, les couvertures et les bottes de foin utilisent de nouveaux visuels photographiques. Les personnages restent des images animées, intégrées à ce décor 3D original.

## Une écurie entièrement interactive

Les soins et l’équipement se choisissent **directement dans l’image de l’écurie** :

- Cliquer sur la botte de foin pour nourrir le cheval.
- Cliquer sur le panier de carottes pour lui offrir une carotte.
- Cliquer sur les brosses du mur pour le brosser.
- Cliquer sur sa tête pour le caresser, ou sur le coin de paille pour le reposer.
- Cliquer sur le tapis, puis sur la selle, puis sur le filet pour les installer dans cet ordre.
- Quand les trois équipements sont posés et les besoins suffisants, cliquer sur **Monter**, dans la scène.

La cavalière est visible auprès du cheval pendant les gestes. Chaque soin et chaque équipement dispose d’une séquence photographique de quatre poses. Une barre montre l’avancement du geste ; les autres actions attendent qu’il soit terminé. Après la pose du matériel, le cheval reste équipé à l’écran et les trois repères sont cochés. « Masquer les noms » permet de voir les objets sans leurs étiquettes.

Un nouveau soin retire le matériel pour travailler sur le cheval sans selle ; il faut ensuite le rééquiper avant de repartir. Chaque poney conserve ses propres besoins et son équipement. Les actions fonctionnent également au toucher et en plein écran.

### Trois poneys distincts et le repos

Noisette est bai, Nuage est blanc et Étoile est une licorne poney blanche à crinière et queue rose pâle. Les trois poneys ont quatre poses d’équipement dans un atlas séparé des enfants. Emmy et Louane ont chacune quatre grands portraits en pied pour les gestes de soins ; ils remplacent les petits personnages inclus dans les anciens atlas combinés. Le rendu 2D de l’écurie travaille en 2400 × 1600 pixels. Nuage conserve ses propres vues montées et ses poses dans l’enclos. Aucune recoloration de peau, de vêtements ou de pelage n’est appliquée pendant le jeu. Leurs portraits, les soins, le repos, l’enclos et les scènes montées suivent le choix. Les anciennes sauvegardes de Caramel sont transférées à Étoile en conservant les besoins et l’équipement.

Un clic sur **Repos** fait avancer la cavalière de côté, puis le poney baisse la tête, plie les jambes et se couche sur la paille. Il reste couché après l’action et après rechargement. Le prochain soin ou équipement le fait se relever.

### Les balades

La forêt et la campagne comportent des troncs et un pont de bois au-dessus d’un petit ruisseau. La plage comporte aussi un tronc échoué. Un tronc touché arrête le poney sans compter de faute ; Espace permet de le sauter, et il reste possible de le contourner. La surface du pont et ses rampes sont prises en compte par le déplacement. Les ombres des arbres et le rythme des foulées lié à l’allure renforcent le relief et la continuité du mouvement.

L’onglet **Les balades** ouvre trois grandes cartes directement dans le jeu : **forêt**, **mer** et **campagne**. **Changer de balade** reste accessible pendant la promenade. Des troncs à franchir ou à contourner, et aucune élimination.

Le poney attend une commande au départ. Appuyer une fois sur **↑** choisit le pas, deux fois le trot, trois fois le galop ; l’allure reste sélectionnée après relâchement. Chaque pression sur **↓** fait descendre d’une allure jusqu’à l’arrêt. Maintenir ↑ ne répète pas le changement. **← →** dirige librement et **Arrêt** immobilise le poney. Les boutons d’allure restent utilisables à tout moment. Les parcours débutants d’Emmy conservent séparément leur aide à la direction.

La forêt comporte un terrain avec relief, un chemin de terre à bords fondus, un sous-bois de feuilles et de petites plantes, des troncs solides et une canopée photographique. La mer utilise du sable photographique, une rive courbe, des vaguelettes, de l’écume et des reflets. En quittant le sable, les sabots entrent progressivement dans l’eau ; plus loin, le poney flotte et ralentit, avec des remous autour de lui. On peut rejoindre le rivage en le dirigeant. La campagne conserve ses prés, ses clôtures et ses chemins.

Les repères et la carte indiquent une boucle facultative. La terminer augmente la complicité et son compteur, sans créer de record de saut. Les ambiances de forêt et de bord de mer sont synthétisées localement.

### Le saut

Le saut utilise huit poses spécifiques : préparation de l’impulsion, poussée des postérieurs, antérieurs repliés, passage arrondi de la barre, descente, réception des antérieurs puis des postérieurs. Le point de selle reste enregistré entre les poses ; les jambes ne sont pas redimensionnées pour suivre la hauteur du cheval. La trajectoire plus basse et plus courte, la préparation au sol et la reprise du galop sont synchronisées avec ces images. Le conseil « Saute maintenant ! » tient compte de la vitesse et du sens d’approche. La pause conserve la pose courante.

### Sauvegarde

L’effort d’un parcours terminé, perdu ou interrompu consomme des besoins. Les résultats de saut d’Emmy et de Louane sont enregistrés séparément, afin de ne pas comparer un parcours guidé avec un parcours piloté. Les balades ont leur propre compteur. Aucun besoin ne diminue pendant l’absence de l’enfant.

La sauvegarde automatique utilise `crins-magiques-ecurie-v1` dans ce navigateur. Les anciennes sauvegardes gardent leurs besoins, leurs étoiles et leur total de victoires. Les records de l’ancien catalogue sont réinitialisés pour les neuf nouveaux tracés ; les poneys non encore équipés commencent sans tapis, selle ni filet. Les équipements incohérents sont normalisés au chargement. Les données ne se synchronisent pas entre appareils. Déplacer ou renommer le fichier peut changer l’emplacement de la sauvegarde selon le navigateur. Si le stockage est bloqué, le jeu reste jouable avec un message indiquant que la sauvegarde est indisponible.

### Personnages personnalisés

La construction standard conserve la cavalière de démonstration. La construction familiale montre **dès l’ouverture** deux grandes cartes avec les portraits d’Emmy (5 ans, tenue vert d’eau) et de Louane (7 ans et demi, tenue mauve). Le jeu attend un choix. Les proportions sont adaptées aux deux âges et les visuels sont générés à partir des photos fournies. Le choix est sauvegardé et s’applique aux soins, à l’équipement, au galop, au saut et à l’enclos. « Changer de cavalière » permet de rouvrir cet écran.

Les fichiers de ressemblance restent dans `assets/private/`, ignoré par Git. La construction familiale lit son `manifest.json`, embarque ses images et produit un HTML et un ZIP distincts. Aucune photo de référence ni ressemblance familiale n’est publiée automatiquement.

```sh
npm run build:reviewable -- --key-file /chemin/prive/code.txt
```

Dans l’écurie, les soins durent entre 4,6 et 6,8 secondes. Les poses sont reliées par une interpolation douce, avec une transition de 320 ms entre les actions. Les pieds et le corps des images sont recalés avant le mélange pour limiter le glissement. La dernière pose est conservée à la fin du soin. Le mode système « réduire les animations » affiche une pose stable.

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

84 tests couvrent le pilotage, les neuf tracés et leurs trois niveaux, le décompte et sa pause, les sauts, la défaite à trois erreurs, les soins, le matériel, la continuité des poses, la sauvegarde du personnage, la marche dans l’enclos, le ballon, la longe, l’arrêt et le changement de main, les changements d’allure des trois balades, la monte libre dans l’enclos, les troncs franchissables sans élimination, le tablier du pont, la baignade, les murs, les six portes et les trajets entre les boxes, la sellerie et la cour.

Vérification navigateur : clics sur les objets photographiés de l’écurie, cavalière visible pendant le foin, la carotte et le brossage, équipement dans l’ordre, conservation du matériel après rechargement, huit poses du saut visibles, saut réussi, pause, défaite au troisième raté, gestes tactiles dans la scène, plein écran et absence de requêtes externes.

Les anciennes archives de démonstration ne contiennent pas cette mise à jour familiale. Le nouveau dossier hors ligne est construit uniquement dans `dist/`. Les images WebP conservent la résolution et les pixels visibles des PNG originaux. `node scripts/optimize-assets.mjs` permet de les réencoder si nécessaire (sharp 0.35.5, déjà fourni dans l’environnement de création). Les WebP sont fournis avec le dépôt ; cet encodage est facultatif pour construire et jouer.
