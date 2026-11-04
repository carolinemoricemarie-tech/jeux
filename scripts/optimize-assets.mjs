import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
let sharp;
try {({default:sharp}=await import('sharp'));}
catch {({default:sharp}=await import('/opt/codex/cua_node/lib/node_modules/sharp/dist/index.mjs'));}
const root=fileURLToPath(new URL('../',import.meta.url));
const files=['horse-stride','horse-stable','real-trees','meadow-grass','countryside','stable-wood'];
const report=[];
for(const name of files){
  const input=path.join(root,'assets',name+'.png'),output=path.join(root,'assets',name+'.webp');
  const before=await sharp(input).metadata();
  const info=await sharp(input).webp({lossless:true,alphaQuality:100,effort:6}).toFile(output);
  const after=await sharp(output).metadata();
  if(before.width!==after.width||before.height!==after.height||before.hasAlpha!==after.hasAlpha)throw new Error('Dimensions ou transparence altérées : '+name);
  const bytes=(await readFile(input)).length;
  report.push({file:name,dimensions:[after.width,after.height],png_bytes:bytes,webp_bytes:info.size});
}
await writeFile(path.join(root,'assets','encoding-report.json'),JSON.stringify({encoder:'sharp '+sharp.versions.sharp,mode:'WebP sans perte',images:report},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
