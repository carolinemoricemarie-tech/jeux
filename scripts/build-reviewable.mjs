// Build a local, reviewable family edition: readable code, encrypted images only.
import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {randomBytes,pbkdf2Sync,createCipheriv,createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PHOTO_URLS} from '../assets.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const argument=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const keyFile=argument('--key-file');
if(!keyFile)throw Error('Provide --key-file with a local private code file. The code is never included in the archive.');
const code=(await readFile(path.resolve(keyFile),'utf8')).trim();
if(code.length<24)throw Error('A random access code of at least 24 characters is required.');
const output=path.resolve(argument('--output')||path.join(root,'dist/reviewable-family'));
const release=process.argv.includes('--release');
await mkdir(output,{recursive:true});
let imageCache={};
try{imageCache=JSON.parse(await readFile(path.join(root,'assets/private/download-image-cache.json'),'utf8'));}catch{}
const embed=async file=>{
  const data=await readFile(path.join(root,file)),mime=file.endsWith('.webp')?'webp':'png';
  const url='data:image/'+mime+';base64,'+data.toString('base64');return imageCache[url]||url;
};
const manifest=JSON.parse(await readFile(path.join(root,'assets/private/manifest.json'),'utf8'));
const images={photos:{},characters:{}};
const replaced=new Set(['horse','jump','careBrush','careHay','careCarrot','carePet','equipPad','equipSaddle','equipBridle']);
for(const [name,file] of Object.entries(PHOTO_URLS))if(!replaced.has(name))images.photos[name]=await embed(file);
images.photos.characterPortraits=await embed(manifest.portraits);
for(const [id,group] of Object.entries(manifest.characters)){
  images.characters[id]={};for(const [name,file] of Object.entries(group))if(!name.endsWith('Mask'))images.characters[id][name]=await embed(file);
}
if(Object.keys(images.characters).join(',')!=='emmy,louane')throw Error('Both family characters are required.');
for(const [id,group] of Object.entries(images.characters))for(const clip of ['careHay','careCarrot','careBrush','carePet','equipPad','equipSaddle','equipBridle','careIdle']){
  if(!group[clip])throw Error('Missing character image: '+id+'/'+clip);
}
for(const [id,group] of Object.entries(images.characters))for(const name of ['whiteCare','unicornCare','whiteRear','walkDirections','stableActions','feedActions'])if(!group[name])throw Error('Native image missing: '+id+'/'+name);
const json=JSON.stringify(images),salt=randomBytes(16),iv=randomBytes(12);
const cipher=createCipheriv('aes-256-gcm',pbkdf2Sync(code,salt,600000,32,'sha256'),iv);
const encrypted=Buffer.concat([cipher.update(gzipSync(json)),cipher.final(),cipher.getAuthTag()]);
const payload={format:'images-only-v1',salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:encrypted.toString('base64')};
const bundled=await build({entryPoints:[path.join(root,'game.mjs')],bundle:true,write:false,format:'iife',target:'es2020',minify:false,legalComments:'inline',
  plugins:[{name:'read-validated-images',setup(b){b.onLoad({filter:/[/\\]assets\.mjs$/},()=>({contents:'export const PHOTO_URLS=globalThis.familyImageAssets.photos; export const CHARACTER_URLS=globalThis.familyImageAssets.characters;',loader:'js'}));}}]});
await writeFile(path.join(output,'game.js'),'// Readable game code. The promise waits only for private images.\nglobalThis.familyAssetsReady.then(() => {\n'+bundled.outputFiles[0].text+'\n});\n');
await copyFile(path.join(root,'scripts/offline-unlock.js'),path.join(output,'unlock.js'));
let html=await readFile(path.join(root,'index.html'),'utf8');
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src data: blob:; connect-src \'none\'; media-src blob:; base-uri \'none\'; form-action \'none\'">');
html=html.replace('<section id="entry-screen"','<section id="entry-screen" hidden');
html=html.replace('<div class="page">','<div class="page" inert>');
html=html.replace('<body>','<body>\n<section id="family-lock" class="entry-screen" role="dialog" aria-modal="true" aria-labelledby="family-title"><div class="entry-card"><span class="eyebrow">VERSION FAMILIALE PRIVÉE</span><h1 id="family-title">Bienvenue au domaine</h1><p>Édition Soins vivants et grands parcours</p><p>Le code ouvre les images privées d’Emmy et de Louane.</p><form id="family-unlock-form"><label for="family-code">Code d’accès</label><input id="family-code" type="password" autocomplete="off" required autofocus spellcheck="false"><button type="submit" class="primary">Ouvrir mon écurie</button></form><p id="family-unlock-status" role="status">Garde tous les fichiers dans le même dossier.</p></div></section>');
html=html.replace('<script type="module" src="game.mjs"></script>','<script type="application/json" id="family-image-data">'+JSON.stringify(payload)+'</script>\n<script src="unlock.js"></script>\n<script src="game.js"></script>');
await writeFile(path.join(output,'JOUER.html'),html);
await writeFile(path.join(output,'style.css'),await readFile(path.join(root,'style.css'),'utf8')+'\n#family-unlock-form{display:grid;gap:12px;margin:24px auto;max-width:430px}#family-unlock-form label{text-align:left;font-size:14px}#family-code{font:17px monospace;width:100%;padding:14px;border:1px solid #9fae98;border-radius:10px;background:#fffef8}\n');
await copyFile(path.join(root,'vendor/THREE-LICENSE.txt'),path.join(output,'LICENCE-THREE.txt'));
await writeFile(path.join(output,'LIRE-MOI.txt'),'LES CRINS MAGIQUES — VERSION FAMILIALE\n\nExtraire tout le ZIP dans un dossier, puis ouvrir JOUER.html dans Chrome ou Edge récent. Aucune installation ni connexion nécessaire. Garder les fichiers ensemble.\n\nÉDITION SOINS VIVANTS ET GRANDS PARCOURS : profils et pas corrigés ; poney qui baisse la tête et mâche ; gestes de nourrissage synchronisés ; vraie carotte et petite poignée de foin ; raccourci La cour toujours accessible dans le jeu, même en pause et en plein écran ; trois parcours difficiles avec de grandes courbes et des portes plus larges. Les hauteurs et les règles adaptées à Emmy sont conservées.\n\nCOMMANDES : flèches pour marcher au centre ; clic sur le sol pour se déplacer ; E pour une action proche ; clic droit et glisser pour regarder. En balade et en monte libre : première pression sur la flèche haut = pas, deuxième = trot, troisième = galop. La flèche bas fait ralentir d’une allure à chaque pression jusqu’à l’arrêt ; gauche/droite pour tourner ; Espace pour sauter. Maintenir haut ne répète pas le changement. Boutons Arrêt, Descendre du poney, Changer de balade et Rentrer au centre suivant l’activité. Le bouton La cour dans la barre du jeu reste disponible, y compris pendant un soin ou en plein écran ; le portail vert de l’enclos rejoint le même lieu.\n\nLe code d’accès est communiqué séparément. Les images privées sont chiffrées ; le code du jeu est lisible dans game.js et unlock.js. Aucun programme Windows, installateur ou téléchargement externe.\n\nUne précédente édition a été signalée par Microsoft Defender. Le nouveau format conserve le code lisible et ne chiffre que les images. Cette édition n’a pas été analysée par Microsoft Defender. Garder l’antivirus activé et ne pas ignorer une alerte : conserver le nom exact de la détection pour analyse.\n');
const audit={format:'readable-code-encrypted-images-only',created:new Date().toISOString(),images:Object.values(images.characters).reduce((n,v)=>n+Object.keys(v).length,0)+Object.keys(images.photos).length,imagePayloadSha256:createHash('sha256').update(json).digest('hex'),gameSha256:createHash('sha256').update(bundled.outputFiles[0].text).digest('hex'),privateCodeIncluded:false,externalRequestsRequired:false,antivirusScan:'not available; previous Microsoft Defender severe detection unresolved',publication:release?'encrypted-images delivery':'local only'};
await writeFile(path.join(output,'verification.json'),JSON.stringify(audit,null,2));
console.log(JSON.stringify({output,images:audit.images,payloadBytes:encrypted.length,codeBytes:bundled.outputFiles[0].contents.length,publication:audit.publication}));
