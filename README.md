# Les Crins Magiques 🐴

Un petit jeu d’équitation et de vie à l’écurie, en français, pour une enfant de 8 ans. Trois compagnons, des soins animés et des parcours de saut avec une cavalière en selle. Sans publicité, compte, service distant ni ressource externe.

## Jouer en local

Depuis le dossier du projet, avec Python 3 :

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Ouvrir `http://localhost:8000` dans un navigateur moderne. Le jeu fonctionne sur ordinateur, tablette et téléphone. Un serveur HTTP est nécessaire pour charger les modules JavaScript.

## Une journée avec mon poney

1. Choisir **Noisette**, **Nuage** ou **Caramel**. Chaque poney a ses propres besoins.
2. Au box, donner du **foin**, une **carotte**, le **brosser**, le **câliner** ou le laisser **se reposer**. Les jauges et l’humeur réagissent aux soins. On peut aussi toucher le poney pour le câliner.
3. Choisir **Mettre la selle et monter**, un parcours et une allure. Si le poney a trop faim, est trop fatigué ou trop sale, un message indique le soin nécessaire avant de partir.
4. Pendant le parcours, appuyer sur **Espace**, **↑**, toucher la scène ou utiliser **Sauter**. Le poney avance tout seul. Une barrière touchée ne fait pas perdre.
5. Rentrer au box pour soigner son compagnon après l’effort. Chaque trajet utilise un peu d’énergie et de nourriture, et salit le pelage. Un retour anticipé ne coûte que l’effort déjà accompli.

**Pause** ou **Échap** met le parcours en pause. Il se met aussi en pause quand on change d’onglet. On peut rentrer à l’écurie à tout moment avec l’onglet **Mon écurie** ou depuis la pause.

### Les parcours

| Parcours | Obstacles | Durée tranquille / au trot |
| --- | --- | --- |
| Prairie fleurie | 8 petites barrières | 34 / 27 secondes |
| Jardin des rubans | 10 barrières colorées | 38 / 30 secondes |
| Forêt enchantée | 13 obstacles plus hauts | 50 / 39 secondes |

Les obstacles réussis et les étoiles sont comptés. Le meilleur résultat de chaque parcours est conservé dans l’écurie, ainsi que le total de parcours terminés et d’étoiles.

## Sauvegarde

La sauvegarde est automatique dans le stockage local du navigateur, sous la clé `crins-magiques-ecurie-v1`. Elle contient le compagnon sélectionné, les besoins des trois poneys, les totaux et les meilleurs résultats. Aucun besoin ne diminue pendant l’absence de l’enfant. Fermer un parcours en cours conserve l’effort accompli, sans attribuer de résultat de fin.

La sauvegarde est propre à ce navigateur et à cette adresse de site : elle ne se synchronise pas entre appareils. Effacer les données du site efface l’écurie. Si le stockage est bloqué, le jeu reste jouable et affiche que la sauvegarde est indisponible.

## Vérifier le jeu

Node.js 18 ou plus, sans dépendance à installer :

```sh
node --test tests/*.test.mjs
```

Les 13 tests couvrent la physique, les collisions, la collecte, la fin des trois parcours, les soins, l’humeur, les besoins avant de monter, les retours anticipés, les records et la restauration des sauvegardes.

Vérification manuelle : nourrir et brosser un poney, observer ses jauges et son humeur, changer de compagnon puis revenir, recharger la page, monter pour un parcours, sauter, mettre en pause, terminer et revenir au box. Vérifier aussi les boutons tactiles sur téléphone.

Site statique en HTML, CSS et JavaScript natif avec Canvas. Aucune compilation ni clé secrète. `stable.mjs` gère les besoins et la sauvegarde, `engine.mjs` la physique et les parcours, et `game.mjs` l’affichage et les interactions.
