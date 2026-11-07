// Only image data is decrypted. All game code is in the readable game.js file.
'use strict';
let releaseImages;
globalThis.familyAssetsReady = new Promise(resolve => { releaseImages = resolve; });
const unlockForm = document.getElementById('family-unlock-form');
unlockForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = unlockForm.querySelector('button');
  const status = document.getElementById('family-unlock-status');
  const input = document.getElementById('family-code');
  button.disabled = true;
  status.textContent = 'Ouverture des images de la famille…';
  try {
    if (!globalThis.crypto?.subtle || !globalThis.DecompressionStream) {
      throw new Error('browser');
    }
    const bytes = base64 => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const payload = JSON.parse(document.getElementById('family-image-data').textContent);
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(input.value.trim()), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(payload.salt),iterations:600000,hash:'SHA-256'}, material, {name:'AES-GCM',length:256}, false, ['decrypt']);
    const packed = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(payload.iv)}, key, bytes(payload.ciphertext));
    const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const images = JSON.parse(await new Response(stream).text());
    if (!images.photos || !images.characters || Object.keys(images.characters).join(',') !== 'emmy,louane') throw new Error('images');
    const validate = group => {
      for (const [name, value] of Object.entries(group)) {
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name) || typeof value !== 'string' || !/^data:image\/(webp|png);base64,[A-Za-z0-9+/=]+$/.test(value)) throw new Error('images');
      }
    };
    validate(images.photos);
    for (const group of Object.values(images.characters)) validate(group);
    globalThis.familyImageAssets = images;
    document.getElementById('family-image-data').remove();
    input.value = '';
    document.getElementById('family-lock').remove();
    document.getElementById('entry-screen').hidden = false;
    document.querySelector('.page').inert = false;
    releaseImages();
  } catch (error) {
    status.textContent = error.message === 'browser'
      ? 'Ouvre JOUER.html dans une version récente de Chrome ou Edge.'
      : error.message === 'images'
        ? 'Les images sont incomplètes. Extrais à nouveau tout le dossier du ZIP.'
        : 'Le code ne correspond pas. Vérifie les lettres et les tirets.';
    input.focus();
  } finally {
    button.disabled = false;
  }
});
