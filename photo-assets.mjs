import * as THREE from './vendor/three.module.min.mjs';
import { PHOTO_URLS } from './assets.mjs';

export async function loadPhotos(){
  const entries=await Promise.all(Object.entries(PHOTO_URLS).map(([key,url])=>new Promise((resolve,reject)=>{
    const image=new Image();image.decoding='async';image.onload=()=>resolve([key,image]);
    image.onerror=()=>reject(new Error('Image indisponible : '+key));image.src=url;
  })));
  return Object.fromEntries(entries);
}
export function photoTexture(image){
  const tex=new THREE.Texture(image);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;tex.anisotropy=8;return tex;
}
function alphaBounds(image,x,y,width,height){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,x,y,width,height,0,0,width,height);
  const data=c.getImageData(0,0,width,height).data;let minX=width,maxX=0,minY=height,maxY=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>55){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  if(maxX<=minX||maxY<=minY)return{x:0,y:0,width,height};
  return{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};
}
export function cutout(image,x=0,y=0,width=image.width,height=image.height){
  const b=alphaBounds(image,x,y,width,height),canvas=document.createElement('canvas');canvas.width=b.width+4;canvas.height=b.height+4;
  canvas.getContext('2d').drawImage(image,x+b.x,y+b.y,b.width,b.height,2,2,b.width,b.height);
  return photoTexture(canvas);
}
export function strideTexture(image){
  const w=image.width/4,h=image.height/2;
  const bounds=Array.from({length:8},(_,i)=>alphaBounds(image,i%4*w,Math.floor(i/4)*h,w,h));
  const maxHeight=Math.max(...bounds.map(b=>b.height)),scale=560/maxHeight;
  const canvas=document.createElement('canvas');canvas.width=512*8;canvas.height=640;
  const c=canvas.getContext('2d');
  bounds.forEach((b,i)=>{
    const width=b.width*scale,height=b.height*scale;
    c.drawImage(image,i%4*w+b.x,Math.floor(i/4)*h+b.y,b.width,b.height,i*512+(512-width)/2,620-height,width,height);
  });
  const tex=photoTexture(canvas);tex.repeat.set(1/8,1);return tex;
}
export function horseMaterial(map){
  const m=new THREE.SpriteMaterial({map,transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false,fog:true});
  m.userData.coat={value:0};
  m.onBeforeCompile=shader=>{
    shader.uniforms.coatKind=m.userData.coat;
    shader.fragmentShader='uniform float coatKind;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec3 c=diffuseColor.rgb;
      float mask=smoothstep(.04,.12,c.r)*smoothstep(1.04,1.35,c.r/max(.003,c.b))*(1.-smoothstep(.4,.62,c.r));
      float lum=dot(c,vec3(.299,.587,.114));
      vec3 replacement=coatKind<1.5?vec3(.32+lum*.95):vec3(lum*1.85,lum*1.12,lum*.55);
      if(coatKind>.5)diffuseColor.rgb=mix(c,replacement,mask*.85);
    `);
  };
  m.customProgramCacheKey=()=> 'realistic-horse-coat-v1';return m;
}
export function photoPony(photos){
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const stride=strideTexture(photos.horse),standing=cutout(photos.stable);
  const mounted=new THREE.Sprite(horseMaterial(stride));mounted.center.set(.5,0);mounted.scale.set(3.12,3.9,1);mounted.position.y=-.122;body.add(mounted);
  const stable=new THREE.Sprite(horseMaterial(standing));stable.center.set(.5,0);stable.scale.set(2.8*standing.image.width/standing.image.height,2.8,1);body.add(stable);
  return {root,body,mounted,standing:stable,stride};
}
