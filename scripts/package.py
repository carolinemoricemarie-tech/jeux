"""Create the offline game download with Python's standard library."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import sys

root = Path(__file__).resolve().parent.parent
family = '--family' in sys.argv
source = root / ('dist/les-crins-magiques-famille.html' if family else 'dist/les-crins-magiques-realiste.html')
output = root / ('downloads/Les-Crins-Magiques-Famille.zip' if family else 'downloads/Les-Crins-Magiques.zip')
notice = '''LES CRINS MAGIQUES — LE DÉFI RÉALISTE

1. Extraire le contenu de cette archive ZIP.
   Sous Windows : clic droit sur le ZIP, puis « Extraire tout ».
   Sur Mac : double-cliquer sur le ZIP.
2. Ouvrir JOUER.html avec Chrome, Edge, Firefox ou Safari récent.

Aucune installation et aucun compte. Le jeu fonctionne hors connexion.

Flèches gauche / droite : tourner.
Flèche haute : accélérer. Flèche basse : freiner.
Espace : sauter. R : se replacer. Échap : pause.
Sur écran tactile : maintenir les flèches et toucher Sauter.

Dix obstacles, dans l'ordre. Trois obstacles manqués : partie perdue.
Neuf parcours : 3 débutants (45-85 cm), 3 intermédiaires (85-115 cm),
3 difficiles (110-140 cm). Le départ attend le décompte 3, 2, 1.
Une victoire déclenche le feu d'artifice arc-en-ciel et les applaudissements.
Le bouton Son permet de tout couper. Le son démarre après un clic dans le jeu.

Dans l'écurie, cliquer directement sur la botte de foin, les carottes,
les brosses ou le cheval pour les soins. La cavalière est visible
pendant les gestes. Cliquer sur le tapis, puis la selle, puis le filet,
et enfin sur Monter. Un nouveau soin retire le matériel avant le geste.
Les noms des objets peuvent être masqués avec le bouton dans la scène.

L'enclos : flèches ou clic sur l'herbe pour déplacer la cavalière.
En liberté : Appeler le poney, Lancer le ballon et le laisser le rapporter.
En longe : choisir Arrêt, Au pas ou Au trot, et Changer de main.
Après trois tours, la complicité augmente. Le bouton Pause fige l'enclos.
La version familiale propose Emmy (5 ans) et Louane (8 ans) au démarrage.

Ne pas ouvrir le fichier dans un aperçu de messagerie : utiliser un
navigateur avec WebGL 2. Les données sont sauvegardées dans ce navigateur.
'''.encode('utf-8')
output.parent.mkdir(exist_ok=True)
html = source.read_bytes()
with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=6) as archive:
    for name, content in [('JOUER.html', html), ('LISEZ-MOI.txt', notice)]:
        info = ZipInfo(name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, content, compress_type=ZIP_DEFLATED, compresslevel=6)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert archive.read('JOUER.html') == html
print(f'Archive vérifiée : {output} ({output.stat().st_size / 1024 / 1024:.1f} Mo)')
print('SHA-256 HTML :', hashlib.sha256(html).hexdigest())
