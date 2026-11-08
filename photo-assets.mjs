import * as THREE from './vendor/three.module.min.mjs';
import { PHOTO_URLS, CHARACTER_URLS } from './assets.mjs';

export async function loadPhotos(){
  const load=async urls=>Object.fromEntries(await Promise.all(Object.entries(urls).map(([key,url])=>new Promise((resolve,reject)=>{
    const image=new Image();image.decoding='async';image.onload=()=>resolve([key,image]);
    image.onerror=()=>reject(new Error('Image indisponible : '+key));image.src=url;
  }))));
  const [photos,characters]=await Promise.all([load(PHOTO_URLS),Promise.all(Object.entries(CHARACTER_URLS).map(async([id,urls])=>[id,await load(urls)]))]);
  photos.characters=Object.fromEntries(characters);
  for(const [id,images] of characters)for(const image of Object.values(images))image.characterId=id;
  if(characters.length)Object.assign(photos,photos.characters[characters[0][0]]);
  return photos;
}
export function photoTexture(image){
  const tex=new THREE.Texture(image);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;tex.anisotropy=8;return tex;
}
function alphaBounds(image,x,y,width,height){
  // Atlases can have odd dimensions; pixel indexing must use integer row strides.
  width=Math.floor(width);height=Math.floor(height);
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
  const maxHeight=Math.max(...bounds.map(b=>b.height)),maxWidth=Math.max(...bounds.map(b=>b.width));
  const scale=Math.min(560/maxHeight,620/maxWidth);
  const canvas=document.createElement('canvas');canvas.width=640*8;canvas.height=640;
  const c=canvas.getContext('2d');
  bounds.forEach((b,i)=>{
    const width=b.width*scale,height=b.height*scale;
    c.drawImage(image,i%4*w+b.x,Math.floor(i/4)*h+b.y,b.width,b.height,i*640+(640-width)/2,620-height,width,height);
  });
  const tex=photoTexture(canvas);tex.repeat.set(1/8,1);tex.userData.sourceScale=scale;return tex;
}
export function jumpTexture(image,{sourceScale}={}){
  const w=image.width/4,h=image.height/2;
  // Register the saddle point, not the changing hoof height, throughout the jump.
  const registered={
    emmy:[[183,193],[178,182],[181,169],[181,148],[178,154],[189,162],[200,170],[198,186]],
    louane:[[196,226],[161,214],[156,188],[162,162],[178,169],[184,189],[199,201],[199,214]]
  };
  const child=registered[image.characterId];
  const anchors=child||[[204,214],[219,224],[219,221],[216,209],[204,212],[215,235],[215,231],[219,224]];
  const canvas=document.createElement('canvas');canvas.width=5120;canvas.height=640;
  const c=canvas.getContext('2d'),scale=child?(sourceScale||1.25):1.25;
  const b=alphaBounds(image,0,0,w,h),targetY=child?620-(b.y+b.height-anchors[0][1])*scale:300;
  anchors.forEach(([x,y],i)=>{
    c.save();c.beginPath();c.rect(i*640,0,640,640);c.clip();
    c.drawImage(image,i%4*w,Math.floor(i/4)*h,w,h,i*640+320-x*scale,targetY-y*scale,w*scale,h*scale);c.restore();
  });
  const tex=photoTexture(canvas);tex.repeat.set(1/8,1);return tex;
}
export function mountedTextures(photos){
  if(!photos.courseRear){const stride=strideTexture(photos.horse);return {stride,jumping:jumpTexture(photos.jump,stride.userData)};}
  // The complete rear sequence keeps one camera angle and one registration.
  // Flight height comes from the physics; the atlas only changes leg/rider pose.
  const image=photos.courseRear,w=image.width/4,h=image.height/4;
  const textures=[0,8].map(start=>{
    const canvas=document.createElement('canvas');canvas.width=640*8;canvas.height=640;
    const c=canvas.getContext('2d');
    for(let i=0;i<8;i++){const frame=start+i;c.drawImage(image,frame%4*w,Math.floor(frame/4)*h,w,h,i*640+16,16,608,608);}
    const texture=photoTexture(canvas);texture.repeat.set(1/8,1);return texture;
  });
  return {stride:textures[0],jumping:textures[1]};
}
export function horseMaterial(map,{rear=false}={}){
  const Material=rear?THREE.MeshBasicMaterial:THREE.SpriteMaterial;
  const m=new Material({map,transparent:true,alphaTest:.12,depthWrite:true,toneMapped:false,fog:true});
  m.userData.poseMix={value:0};m.userData.poseDelta={value:0};
  m.onBeforeCompile=shader=>{
    shader.uniforms.poseMix=m.userData.poseMix;shader.uniforms.poseDelta=m.userData.poseDelta;
    shader.fragmentShader='uniform float poseMix;\nuniform float poseDelta;\n'+shader.fragmentShader;
    const sample=THREE.ShaderChunk.map_fragment.replace('vec4 sampledDiffuseColor = texture2D( map, vMapUv );',`vec4 firstPose=texture2D(map,vMapUv);
      vec4 secondPose=texture2D(map,vMapUv+vec2(poseDelta,0.));
      float poseAlpha=mix(firstPose.a,secondPose.a,poseMix);
      vec4 sampledDiffuseColor=vec4(mix(firstPose.rgb*firstPose.a,secondPose.rgb*secondPose.a,poseMix)/max(poseAlpha,.0001),poseAlpha);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',sample);
  };
  m.customProgramCacheKey=()=> 'native-photo-pose-v4-'+rear;return m;
}
export function photoPony(photos){
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const {stride,jumping}=mountedTextures(photos),standing=cutout(photos.stable),rear=!!photos.courseRear;
  const mounted=rear?new THREE.Mesh(new THREE.PlaneGeometry(2.9,2.9).translate(0,1.45-.075,0),horseMaterial(stride,{rear:true})):new THREE.Sprite(horseMaterial(stride));
  if(!rear){mounted.center.set(.5,0);mounted.scale.set(3.9,3.9,1);mounted.position.y=-.122;}
  body.add(mounted);
  const stable=new THREE.Sprite(horseMaterial(standing));stable.center.set(.5,0);stable.scale.set(2.8*standing.image.width/standing.image.height,2.8,1);body.add(stable);
  return {root,body,mounted,standing:stable,stride,jumping,rear};
}
