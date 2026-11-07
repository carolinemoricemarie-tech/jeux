// Structural inspection only. This is not an antivirus scanner.
import {readFile,readdir} from 'node:fs/promises';
import {pbkdf2Sync,createDecipheriv,createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import path from 'node:path';
const argument=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const folder=argument('--folder'),keyFile=argument('--key-file');
if(!folder||!keyFile)throw Error('Provide --folder and --key-file. No code or image is printed.');
const files=(await readdir(folder)).sort();
assert.deepEqual(files,['JOUER.html','LICENCE-THREE.txt','LIRE-MOI.txt','game.js','style.css','unlock.js','verification.json'].sort());
const code=(await readFile(keyFile,'utf8')).trim(),html=await readFile(path.join(folder,'JOUER.html'),'utf8');
assert.ok(html.includes("connect-src 'none'"));
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,3);
const payloadScript=scripts.find(s=>s[1].includes('type="application/json"'));
assert.ok(payloadScript?.[1].includes('id="family-image-data"'));
assert.deepEqual(scripts.filter(s=>!s[1].includes('application/json')).map(s=>s[1].trim()).sort(),['src="game.js"','src="unlock.js"']);
for(const file of files){
  const text=await readFile(path.join(folder,file),'utf8');assert.ok(!text.includes(code),'Access code must remain separate');
  if(!file.endsWith('.js'))continue;
  for(const pattern of [/\beval\s*\(/,/new\s+Function\b/,/document\.write/,/\bfetch\s*\(/,/XMLHttpRequest/])assert.ok(!pattern.test(text),'Unexpected execution or network API: '+file);
}
const payload=JSON.parse(payloadScript[2]);assert.equal(payload.format,'images-only-v1');
const ciphertext=Buffer.from(payload.ciphertext,'base64');
const key=pbkdf2Sync(code,Buffer.from(payload.salt,'base64'),600000,32,'sha256');
const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(payload.iv,'base64'));
decipher.setAuthTag(ciphertext.subarray(-16));
const plain=gunzipSync(Buffer.concat([decipher.update(ciphertext.subarray(0,-16)),decipher.final()]));
const images=JSON.parse(plain);assert.deepEqual(Object.keys(images),['photos','characters']);assert.deepEqual(Object.keys(images.characters),['emmy','louane']);
let imageCount=0;
for(const group of [images.photos,...Object.values(images.characters)])for(const [name,url] of Object.entries(group)){
  assert.match(name,/^[A-Za-z][A-Za-z0-9]*$/);assert.match(url,/^data:image\/(webp|png);base64,[A-Za-z0-9+/=]+$/);
  const bytes=Buffer.from(url.slice(url.indexOf(',')+1),'base64');
  assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP');imageCount++;
}
const hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await readFile(path.join(folder,file))).digest('hex');
const verification=JSON.parse(await readFile(path.join(folder,'verification.json'),'utf8'));assert.equal(createHash('sha256').update(plain).digest('hex'),verification.imagePayloadSha256);
console.log(JSON.stringify({files,imageCount,privateCodeIncluded:false,encryptedContent:'PNG/WebP images only',gameCode:'plaintext, no eval/Function/document.write/fetch/XMLHttpRequest',networkPolicy:'CSP connect-src none',hashes,antivirusScan:'not performed; Microsoft Defender severe detection on previous edition remains unresolved',publication:verification.publication},null,2));
