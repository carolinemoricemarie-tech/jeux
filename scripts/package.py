"""Create the offline game download with Python's standard library."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parent.parent
source = root / 'dist/les-crins-magiques-realiste.html'
output = root / 'downloads/Les-Crins-Magiques.zip'
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
Les soins et l'écurie sont accessibles avant et après le parcours.

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
