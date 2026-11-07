import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
let sharp;
try { ({default:sharp}=await import('sharp')); }
catch { ({default:sharp}=await import('/opt/codex/cua_node/lib/node_modules/sharp/dist/index.mjs')); }
sharp.concurrency(1);
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(path.join(root,'assets/private/manifest.json'),'utf8'));
const selected=process.argv.slice(2);
const files=[manifest.portraits,...Object.values(manifest.characters).flatMap(images=>Object.values(images))].filter(file=>!selected.length||selected.includes(path.basename(file,'.webp')));
let next=0;const report=[];
async function worker(){
  while(next<files.length){
    const file=files[next++],png=path.join(root,file.replace(/\.webp$/,'.png')),webp=path.join(root,file);
    const before=await sharp(png).metadata();
    const info=await sharp(png).webp({lossless:true,alphaQuality:100,effort:4}).toFile(webp);
    const after=await sharp(webp).metadata();
    if(before.width!==after.width||before.height!==after.height||before.hasAlpha!==after.hasAlpha)throw new Error('Image altérée : '+file);
    report.push({file,width:after.width,height:after.height,bytes:info.size,lossless:true});
    console.log(file+' : '+Math.round(info.size/1024)+' Ko, sans perte');
  }
}
await Promise.all(Array.from({length:3},worker));
let previous=[];try{previous=JSON.parse(await readFile(path.join(root,'assets/private/encoding-report.json'),'utf8'));}catch{}
const merged=[...previous.filter(item=>!files.includes(item.file)),...report];
await writeFile(path.join(root,'assets/private/encoding-report.json'),JSON.stringify(merged,null,2)+'\n');
