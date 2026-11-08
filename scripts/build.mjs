import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const family=process.argv.includes('--family');
const embed=async file=>{
  const bytes=await readFile(path.join(root,file));
  const mime=path.extname(file)==='.webp'?'image/webp':'image/png';
  return 'data:'+mime+';base64,'+bytes.toString('base64');
};
const result=await build({
  entryPoints:[path.join(root,'game.mjs')],bundle:true,write:false,format:'iife',target:'es2020',minify:true,legalComments:'inline',
  plugins:[{name:'embed-photographic-assets',setup(b){
    b.onLoad({filter:/[/\\]assets\.mjs$/},async()=>{
      const {PHOTO_URLS}=await import(new URL('../assets.mjs',import.meta.url));
      const urls={},characters={};
      const replaced=new Set(['horse','jump','careBrush','careHay','careCarrot','carePet','equipPad','equipSaddle','equipBridle']);
      for(const [key,file] of Object.entries(PHOTO_URLS)){
        if(family&&(replaced.has(key)))continue;
        urls[key]=await embed(file);
      }
      if(family){
        const manifest=JSON.parse(await readFile(path.join(root,'assets/private/manifest.json'),'utf8'));
        for(const [id,images] of Object.entries(manifest.characters)){
          characters[id]={};
          for(const [key,file] of Object.entries(images))if(!key.endsWith('Mask'))characters[id][key]=await embed(file);
        }
        urls.characterPortraits=await embed(manifest.portraits);
        if(Object.keys(characters).join(',')!=='emmy,louane')throw new Error('Les deux cavalières sont requises.');
        const expected=[...replaced,'paddock','courseRear','paddockMotion','careIdle','unicornRear','whiteCare','unicornCare','whiteRear','walkDirections','stableActions','feedActions'];
        for(const [id,images] of Object.entries(characters))for(const key of expected)if(!images[key])throw new Error('Visuel manquant : '+id+'/'+key);
      }
      return {contents:'export const PHOTO_URLS='+JSON.stringify(urls)+'; export const CHARACTER_URLS='+JSON.stringify(characters)+';',loader:'js'};
    });
  }}]
});
let html=await readFile(path.join(root,'index.html'),'utf8');
const css=await readFile(path.join(root,'style.css'),'utf8');
const license=await readFile(path.join(root,'vendor/THREE-LICENSE.txt'),'utf8');
const script=result.outputFiles[0].text.replaceAll('</script','<\\/script');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>\n'+css+'\n</style>');
html=html.replace('<script type="module" src="game.mjs"></script>',()=>'<script>\n'+script+'\n</script>');
html=html.replace('</html>','<!-- Three.js 0.170.0 — '+license.replaceAll('--','—')+' -->\n</html>');
await mkdir(path.join(root,'dist'),{recursive:true});
const dest=path.join(root,'dist',family?'les-crins-magiques-famille.html':'les-crins-magiques-realiste.html');
await writeFile(dest,html);
console.log('Jeu autonome créé : '+dest+' ('+Math.round(Buffer.byteLength(html)/1024)+' Ko). Aucune requête externe nécessaire.');
