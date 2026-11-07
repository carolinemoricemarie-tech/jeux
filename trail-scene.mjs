import * as THREE from './vendor/three.module.min.mjs';
import {photoTexture,cutout} from './photo-assets.mjs';
import {createRail,railPoint} from './guidance.mjs';
import {TRAILS} from './trails.mjs';
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.95});
const unitBox=new THREE.BoxGeometry(1,1,1);
function box(scene,material,x,y,z,w,h,d){const m=new THREE.Mesh(unitBox,material);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function sand(){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#d7c49e';x.fillRect(0,0,256,256);let seed=812;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<16000;i++){x.fillStyle=rand()>.5?'#806c4433':'#fff6dc33';x.fillRect(rand()*256,rand()*256,1,1);}
  const texture=photoTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture;
}
function ribbon(scene,rail,map,theme){
  const positions=[],uv=[],indices=[],count=300;
  for(let i=0;i<=count;i++){
    const p=railPoint(rail,rail.length*i/count),dx=Math.cos(p.heading)*1.85,dz=-Math.sin(p.heading)*1.85;
    positions.push(p.x-dx,.026,p.z-dz,p.x+dx,.026,p.z+dz);uv.push(0,i*.18,1,i*.18);
    if(i<count){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map,color:theme==='forest'?'#9e8968':theme==='beach'?'#e4d5b5':'#c0ac84',roughness:1,side:THREE.DoubleSide}));m.receiveShadow=true;scene.add(m);
}
export function createTrailScene(photos,theme,{software=false,shadowSize=1024}={}){
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(theme==='forest'?'#a8b899':theme==='beach'?'#d1e2e5':'#d2dcc3',theme==='forest'?.009:.003);
  scene.add(new THREE.HemisphereLight('#e4f0f8',theme==='forest'?'#536146':'#92916d',theme==='forest'?1.25:1.8));
  const sun=new THREE.DirectionalLight('#fff0ca',theme==='forest'?1.5:2.1);sun.position.set(-38,60,25);sun.castShadow=true;sun.shadow.mapSize.set(Math.min(shadowSize,1024),Math.min(shadowSize,1024));Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:160});sun.shadow.normalBias=.035;scene.add(sun);
  const skyGeometry=new THREE.SphereGeometry(380,48,24),uv=skyGeometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setY(i,.18+.82*Math.pow(Math.max(0,uv.getY(i)*2-1),.9));
  const skyMap=photoTexture(theme==='beach'?photos.seaSky:photos.sky);skyMap.wrapS=THREE.MirroredRepeatWrapping;skyMap.repeat.x=2;
  scene.add(new THREE.Mesh(skyGeometry,new THREE.MeshBasicMaterial({map:skyMap,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false})));
  const surface=theme==='beach'?sand():photoTexture(photos.grass);surface.wrapS=surface.wrapT=THREE.RepeatWrapping;surface.repeat.set(theme==='beach'?120:150,theme==='beach'?120:150);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(700,700),new THREE.MeshStandardMaterial({map:surface,color:theme==='forest'?'#83916d':theme==='beach'?'#f7e6c2':'#b4bf9d',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.015;ground.receiveShadow=true;scene.add(ground);
  const route=Object.values(TRAILS).find(t=>t.theme===theme),rail=createRail(route.points),pathMap=sand();ribbon(scene,rail,pathMap,theme);
  const maps=Array.from({length:4},(_,i)=>cutout(photos.trees,i%2*photos.trees.width/2,Math.floor(i/2)*photos.trees.height/2,photos.trees.width/2,photos.trees.height/2));
  const treeMats=maps.map(map=>new THREE.SpriteMaterial({map,transparent:true,alphaTest:.25,toneMapped:false,fog:true}));
  let serial=0;
  const tree=(x,z,height)=>{const map=maps[serial%4],sprite=new THREE.Sprite(treeMats[serial++%4]);sprite.center.set(.5,0);sprite.position.set(x,0,z);sprite.scale.set(height*map.image.width/map.image.height,height,1);scene.add(sprite);};
  const animations=[];
  if(theme==='forest'){
    for(let d=0;d<rail.length;d+=software?9:6){const p=railPoint(rail,d);for(const side of [-1,1]){
      const offset=5.5+(Math.sin(d*2.3)+1)*1.4,x=p.x+Math.cos(p.heading)*offset*side,z=p.z-Math.sin(p.heading)*offset*side;
      let clear=true;for(let q=0;q<rail.length;q+=4){const a=railPoint(rail,q);if(Math.hypot(a.x-x,a.z-z)<4.1){clear=false;break;}}
      if(clear)tree(x,z,9+(Math.sin(d*.8)+1)*2.5);
    }}
    for(let i=0;i<32;i++){const a=i/32*Math.PI*2;tree(Math.sin(a)*70,Math.cos(a)*70,13+(i%4));}
  }else if(theme==='country'){
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2;tree(Math.sin(a)*64,Math.cos(a)*64,9+i%5);}
    const wood=mat('#ad9775'),white=mat('#e4ddc9'),hay=mat('#c9b76b');
    for(const z of [-48,49])for(let x=-42;x<52;x+=5){box(scene,wood,x,.7,z,.16,1.4,.16);for(const y of [.55,1.05])box(scene,white,x+2.5,y,z,5,.1,.1);}
    for(let i=0;i<9;i++){const bale=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,1.2,24),hay);bale.rotation.z=Math.PI/2;bale.position.set(-38+i%3*4,.95,-30+Math.floor(i/3)*5);bale.castShadow=true;scene.add(bale);}
    box(scene,wood,-42,3,-68,28,6,10);const roof=box(scene,mat('#6f6d60'),-42,6.2,-68,29,.5,12);roof.rotation.z=.04;
  }else{
    const waterMaterial=new THREE.MeshStandardMaterial({color:'#549fb4',roughness:.25,metalness:.12});const time={value:0};
    waterMaterial.onBeforeCompile=shader=>{shader.uniforms.waveTime=time;shader.vertexShader='uniform float waveTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z+=sin(position.x*.3+waveTime*1.3)*.02+sin(position.y*.12+waveTime*.7)*.035;');};
    // Every wave stays above the sand plane: no flickering sand/water patches.
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(160,700,32,100),waterMaterial);sea.rotation.x=-Math.PI/2;sea.position.set(-86,.15,0);scene.add(sea);animations.push(t=>time.value=t);
    const foamCanvas=document.createElement('canvas');foamCanvas.width=256;foamCanvas.height=16;const fc=foamCanvas.getContext('2d'),gradient=fc.createLinearGradient(0,0,256,0);gradient.addColorStop(0,'#ffffff00');gradient.addColorStop(.45,'#f9ffffb0');gradient.addColorStop(1,'#ffffff00');fc.fillStyle=gradient;fc.fillRect(0,0,256,16);
    for(let i=0;i<3;i++){const foam=new THREE.Mesh(new THREE.PlaneGeometry(2,700),new THREE.MeshBasicMaterial({map:photoTexture(foamCanvas),transparent:true,opacity:.65,depthWrite:false}));foam.rotation.x=-Math.PI/2;foam.position.set(-6-i*3,.22+i*.002,0);scene.add(foam);animations.push(t=>{foam.position.x=-6-i*3+Math.sin(t*.55+i)*.9;foam.material.opacity=.4+Math.sin(t*.55+i)*.16;});}
    for(let i=0;i<10;i++)tree(60+i%2*10,-45+i*10,7+i%3);
  }
  return{scene,animate:time=>animations.forEach(f=>f(time))};
}
