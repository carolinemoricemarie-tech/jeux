import { loadPhotos, photoTexture, cutout, photoPony, mountedTextures } from './photo-assets.mjs';
import * as THREE from './vendor/three.module.min.mjs';
import { BOUNDS, createGame, jumpFrame, JUMP_DURATION } from './engine.mjs';
import { rearChaseCamera } from './course-camera.mjs';
import { cyclePose,jumpPose,damp,clamp,advanceLanding,detailPose } from './animation.mjs';
import {createTrailScene} from './trail-scene.mjs';
import {CentreScene} from './centre-scene.mjs';
import {groundHeight} from './terrain.mjs';
import {trailGroundHeight} from './route-features.mjs';
import {strideMotion,STRIDE_LENGTHS} from './riding.mjs';

const sphereGeometry=new THREE.SphereGeometry(1,24,16);
const boxGeometry=new THREE.BoxGeometry(1,1,1);
const cylinderGeometry=new THREE.CylinderGeometry(1,1,1,12);
const UP=new THREE.Vector3(0,1,0);
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
function material(color,roughness=.8){return new THREE.MeshStandardMaterial({color,roughness});}
function mesh(parent,geometry,mat,pos,scale,shadow=true){
  const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;
}
const orb=(p,m,pos,scale,shadow=true)=>mesh(p,sphereGeometry,m,pos,scale,shadow);
const box=(p,m,pos,scale,shadow=true)=>mesh(p,boxGeometry,m,pos,scale,shadow);
function rod(parent,mat,a,b,radius=.04){
  const delta=b.clone().sub(a),m=mesh(parent,cylinderGeometry,mat,a.clone().add(b).multiplyScalar(.5).toArray(),[radius,delta.length(),radius]);
  m.quaternion.setFromUnitVectors(UP,delta.normalize());return m;
}
function curve(parent,mat,points,radius){
  const c=new THREE.CatmullRomCurve3(points.map(p=>v(...p)));
  const m=new THREE.Mesh(new THREE.TubeGeometry(c,20,radius,7,false),mat);m.castShadow=true;parent.add(m);return m;
}
function random(seed){let s=seed;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function surface(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d'),r=random(27);
  c.fillStyle=kind==='wood'?'#bc9469':kind==='sand'?'#c6af85':'#738658';c.fillRect(0,0,512,512);
  if(kind==='wood'){
    for(let i=0;i<700;i++){c.strokeStyle=`rgba(${r()>.5?'74,46,26':'238,212,164'},${r()*.13})`;c.lineWidth=r()*2+1;c.beginPath();const y=r()*512;c.moveTo(0,y);c.bezierCurveTo(130,y+r()*8,380,y-r()*8,512,y);c.stroke();}
    for(let y=0;y<512;y+=64){c.fillStyle='#59432c44';c.fillRect(0,y,512,2);}
  }else{
    for(let i=0;i<26000;i++){const b=r()>.5?'255,245,213':'67,62,40';c.fillStyle=`rgba(${b},${r()*.17})`;c.fillRect(r()*512,r()*512,r()*3+1,r()*2+1);}
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(kind==='wood'?2:25,kind==='wood'?2:25);tex.anisotropy=4;return tex;
}
function labelTexture(text,color='#395547'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d');c.fillStyle='#fff9e8';c.beginPath();c.arc(64,64,58,0,Math.PI*2);c.fill();
  c.strokeStyle='#ddbd78';c.lineWidth=5;c.stroke();c.font='bold 66px Trebuchet MS';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(text,64,68);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function shadowTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');
  const g=c.createRadialGradient(32,32,3,32,32,32);g.addColorStop(0,'#231b1677');g.addColorStop(1,'#231b1600');c.fillStyle=g;c.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);
}
export async function createPhotoWorld(canvas,options={}){
  const photos=await loadPhotos();return new PonyWorld(canvas,{...options,photos});
}

export class PonyWorld {
  constructor(canvas,{reducedMotion=false,onLost=()=>{},photos}={}){
    this.canvas=canvas;this.reducedMotion=reducedMotion;this.photos=photos;
    const probe=document.createElement('canvas'),probeGL=probe.getContext('webgl2',{antialias:false}),probeInfo=probeGL?.getExtension('WEBGL_debug_renderer_info');
    const softwareProbe=probeInfo&&/swiftshader|llvmpipe|software/i.test(probeGL.getParameter(probeInfo.UNMASKED_RENDERER_WEBGL));probeGL?.getExtension('WEBGL_lose_context')?.loseContext();
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:!softwareProbe,alpha:false,powerPreference:'high-performance'});
    const gl=this.renderer.getContext(),info=gl.getExtension('WEBGL_debug_renderer_info');
    const software=info&&/swiftshader|llvmpipe|software/i.test(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    this.software=!!software;this.lastRenderAt=-1000;
    this.shadowSize=software?512:matchMedia('(max-width:700px)').matches?1024:2048;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,software?1:this.shadowSize<2048?1.25:1.75));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.02;
    this.renderer.setClearColor('#bdcbb8');
    this.camera=new THREE.PerspectiveCamera(52,1,.1,450);this.lookAt=v(0,1.8,0);
    this.arena=new THREE.Scene();this.arena.fog=new THREE.FogExp2('#ccd6d9',.0025);
    this.barn=new THREE.Scene();this.barn.background=new THREE.Color('#d3c5a9');this.barn.fog=new THREE.Fog('#d3c5a9',22,65);
    this.pony=photoPony(photos);this.barn.add(this.pony.root);
    this.characterTextures=new Map();
    this.trailScenes=new Map();this.ponyKind='bay';
    if(photos.jump.characterId)this.characterTextures.set(photos.jump.characterId+':bay',{stride:this.pony.stride,jumping:this.pony.jumping});
    this.shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,4),new THREE.MeshBasicMaterial({map:shadowTexture(),transparent:true,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.018;this.barn.add(this.shadow);
    this.sceneName='stable';this.setupLights(this.arena,true);this.setupLights(this.barn,false);
    this.setupArena();this.setupBarn();this.buildCourse('prairie');
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();onLost();});
    this.resize();
  }
  resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  setupLights(scene,outdoor){
    scene.add(new THREE.HemisphereLight(outdoor?'#e3eff7':'#fff0d6',outdoor?'#6a7044':'#8a6342',outdoor?1.7:2.2));
    const sun=new THREE.DirectionalLight(outdoor?'#ffdfaf':'#ffe7bb',outdoor?2.4:2.6);sun.position.set(outdoor?-38:-6,outdoor?60:9,outdoor?25:-4);sun.castShadow=true;
    const size=outdoor?this.shadowSize:Math.min(this.shadowSize,1024);sun.shadow.mapSize.set(size,size);const span=outdoor?65:10;
    Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:.5,far:outdoor?160:40});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=3;scene.add(sun);
    const fill=new THREE.DirectionalLight('#d6e3f2',.7);fill.position.set(12,7,-18);scene.add(fill);
  }
  setupArena(){
    const scene=this.arena;
    const skyGeometry=new THREE.SphereGeometry(380,64,32);
    const uv=skyGeometry.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,.18+.82*Math.pow(Math.max(0,uv.getY(i)*2-1),.9));
    const skyMap=photoTexture(this.photos.sky);skyMap.wrapS=THREE.MirroredRepeatWrapping;skyMap.repeat.x=2;
    const sky=new THREE.Mesh(skyGeometry,new THREE.MeshBasicMaterial({map:skyMap,side:THREE.BackSide,depthWrite:false,toneMapped:false,fog:false}));scene.add(sky);
    const grassMap=photoTexture(this.photos.grass);grassMap.wrapS=grassMap.wrapT=THREE.RepeatWrapping;grassMap.repeat.set(175,175);
    const grass=new THREE.MeshStandardMaterial({map:grassMap,color:'#b2b9a6',roughness:.97});
    const ground=mesh(scene,new THREE.PlaneGeometry(700,700),grass,[0,-.015,0],[1,1,1],false);ground.rotation.x=-Math.PI/2;
    this.setupGrass(scene);
    const white=material('#e6e2d0'),darkWood=material('#94846b'),r=random(43),foliage=[material('#647e4e'),material('#7d9157'),material('#94a364')],bark=material('#756348');
    // Paddock fencing, posts and rails.
    for(const z of [-52,57])for(let x=-48;x<=60;x+=4){box(scene,white,[x,.8,z],[.17,1.65,.17]);if(x<60)for(const y of [.65,1.22])box(scene,white,[x+2,y,z],[4,.12,.12]);}
    for(const x of [-48,60])for(let z=-52;z<=56;z+=4){box(scene,white,[x,.8,z],[.17,1.65,.17]);for(const y of [.65,1.22])box(scene,white,[x,y,z+2],[.12,.12,4]);}
    const treeTextures=Array.from({length:4},(_,i)=>cutout(this.photos.trees,i%2*this.photos.trees.width/2,Math.floor(i/2)*this.photos.trees.height/2,this.photos.trees.width/2,this.photos.trees.height/2));
    this.shrubTexture=treeTextures[0];
    const treeMats=treeTextures.map(map=>new THREE.SpriteMaterial({map,transparent:true,alphaTest:.19,depthWrite:true,toneMapped:false,fog:true}));
    const treeCount=this.software?40:76;
    for(let i=0;i<treeCount;i++){
      const angle=i/treeCount*Math.PI*2+(r()-.5)*.03,rad=80+r()*54,x=Math.cos(angle)*rad,z=Math.sin(angle)*rad;
      const index=i%4,height=10+r()*9,texture=treeTextures[index];
      const sprite=new THREE.Sprite(treeMats[index]);sprite.center.set(.5,0);sprite.position.set(x,0,z);sprite.scale.set(height*texture.image.width/texture.image.height,height,1);scene.add(sprite);
    }
    // A small equestrian estate in the background.
    const outerWood=photoTexture(this.photos.wood);outerWood.wrapS=outerWood.wrapT=THREE.RepeatWrapping;outerWood.repeat.set(16,2);
    const barnWood=new THREE.MeshStandardMaterial({map:outerWood,color:'#c5c2b7',roughness:1}),roof=new THREE.MeshStandardMaterial({map:outerWood,color:'#69655d',roughness:.95});
    box(scene,barnWood,[-28,3,-73],[33,6,10]);
    const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([-45,6,-79,-11,6,-79,-11,8.4,-73,-45,8.4,-73,-45,8.4,-73,-11,8.4,-73,-11,6,-67,-45,6,-67],3));roofGeo.setIndex([0,2,1,0,3,2,4,6,5,4,7,6]);roofGeo.computeVertexNormals();roof.side=THREE.DoubleSide;const roofMesh=new THREE.Mesh(roofGeo,roof);roofMesh.castShadow=true;scene.add(roofMesh);
    for(let x=-40;x<=-16;x+=6){box(scene,darkWood,[x,2,-67.94],[3.8,4,.12]);box(scene,white,[x,4.3,-67.8],[4,.15,.15]);}
    // Flowers planted at the edges, away from the riding line.
    for(let i=0;i<16;i++){
      const x=i%2?-42:54,z=-43+Math.floor(i/2)*13;
      box(scene,darkWood,[x,.23,z],[1.3,.5,2.1]);
      for(let j=0;j<5;j++){const shrub=new THREE.Sprite(treeMats[(i+j)%4]);shrub.position.set(x+(r()-.5),.65,z+(r()-.5)*1.6);shrub.scale.set(.7,.9,1);scene.add(shrub);}
    }
    this.batchScenery(scene);
    this.gateGroup=new THREE.Group();scene.add(this.gateGroup);
    this.guideGroup=new THREE.Group();scene.add(this.guideGroup);
    this.guideDots=Array.from({length:30},()=>{const dot=orb(this.guideGroup,new THREE.MeshBasicMaterial({color:'#ffe0a1',transparent:true,opacity:.7,depthWrite:false}),[0,.02,0],[.13,.025,.13],false);return dot;});
    const dustPositions=new Float32Array(45*3);this.dustGeo=new THREE.BufferGeometry();this.dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
    this.dust=new THREE.Points(this.dustGeo,new THREE.PointsMaterial({color:'#d4bc95',size:.15,transparent:true,opacity:.28,depthWrite:false}));scene.add(this.dust);
  }
  setupGrass(scene){
    const geometry=new THREE.PlaneGeometry(1,1,1,2),positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++){const height=positions.getY(i)+.5;positions.setXYZ(i,positions.getX(i)*(1-height*.85),height,0);}
    geometry.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({color:'#d2d9b8',roughness:1,side:THREE.DoubleSide});
    this.grassWind={value:0};
    mat.onBeforeCompile=shader=>{shader.uniforms.grassWind=this.grassWind;shader.vertexShader='uniform float grassWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      transformed.x+=sin(grassWind*1.4+instanceMatrix[3].x*.7+instanceMatrix[3].z*.5)*.2*position.y*position.y;
      #endif
    `);};
    mat.customProgramCacheKey=()=> 'meadow-grass-wind';
    const field=new THREE.InstancedMesh(geometry,mat,this.software?4000:26000),dummy=new THREE.Object3D(),r=random(912);
    for(let i=0;i<field.count;i++){
      dummy.position.set(-48+r()*108,0,-52+r()*109);dummy.rotation.y=r()*Math.PI*2;dummy.scale.set(.04+r()*.03,.045+r()*.075,1);dummy.updateMatrix();field.setMatrixAt(i,dummy.matrix);
      field.setColorAt(i,new THREE.Color().setHSL(.23+r()*.055,.3+r()*.15,.24+r()*.14));
    }
    field.receiveShadow=true;scene.add(field);
  }
  batchScenery(scene){
    scene.updateMatrixWorld(true);const batches=new Map();
    scene.traverse(o=>{
      if(!o.isMesh||o.isInstancedMesh||!o.material||o.material.transparent||o.material.isShaderMaterial)return;
      const key=o.geometry.uuid+o.material.uuid+o.castShadow;
      if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
    });
    for(const meshes of batches.values()){
      if(meshes.length<3)continue;
      const first=meshes[0],instance=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
      instance.castShadow=first.castShadow;instance.receiveShadow=true;
      meshes.forEach((m,i)=>{instance.setMatrixAt(i,m.matrixWorld);m.removeFromParent();});scene.add(instance);
    }
  }
  setupBarn(){
    const woodMap=photoTexture(this.photos.wood);woodMap.wrapS=woodMap.wrapT=THREE.RepeatWrapping;woodMap.repeat.set(8,2);
    const s=this.barn,wood=new THREE.MeshStandardMaterial({map:woodMap,color:'#d8d3c4',roughness:.9}),beam=material('#896e4e'),straw=material('#d7bd82'),metal=material('#5a6e63',.45),ivory=material('#efe7d4');
    const floor=mesh(s,new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({map:surface('sand'),color:'#cfb88b'}),[0,0,0],[1,1,1],false);floor.rotation.x=-Math.PI/2;
    box(s,wood,[0,2.1,3.5],[14,4.2,.25]);box(s,wood,[-5,2,0],[.25,4,8]);
    for(const x of [-5,-1.8,2.2,5]){box(s,beam,[x,2,3.2],[.2,4.2,.25]);box(s,beam,[x,4.1,.1],[.2,.25,6.5]);}
    box(s,beam,[0,4.1,3.1],[11,.25,.3]);
    // Bright window with fields beyond it.
    box(s,ivory,[1.8,2.65,3.3],[2.55,1.9,.18]);box(s,new THREE.MeshBasicMaterial({map:photoTexture(this.photos.sky),toneMapped:false}),[1.8,2.65,3.18],[2.3,1.65,.08]);
    box(s,beam,[1.8,2.65,3.05],[.08,1.8,.12]);box(s,beam,[1.8,2.65,3.05],[2.45,.08,.12]);box(s,beam,[1.8,1.72,3.03],[2.7,.16,.25]);
    // Stall wall and bars, with a rounded hay bale and water bucket.
    box(s,wood,[-3, .64,1.3],[3.2,1.25,.18]);
    for(let x=-4.5;x<-1.5;x+=.26)box(s,metal,[x,1.85,1.3],[.035,1.1,.035]);
    box(s,beam,[-3,2.45,1.3],[3.25,.1,.14]);
    const bale=mesh(s,cylinderGeometry,straw,[-2.8,.45,-.5],[.65,.8,.65]);bale.rotation.z=Math.PI/2;
    for(let i=0;i<2;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.025,6,24),beam);ring.rotation.y=Math.PI/2;ring.position.set(-3+i*.4,.45,-.5);s.add(ring);}
    const bucket=mesh(s,new THREE.CylinderGeometry(.42,.32,.62,24),material('#789d95',.5),[2.2,.31,.7],[1,1,1]);
    const water=mesh(s,new THREE.CircleGeometry(.38,24),material('#b1d7d0',.2),[2.2,.58,.7],[1,1,1],false);water.rotation.x=-Math.PI/2;
    const r=random(11);for(let i=0;i<140;i++){const a=r()*Math.PI;const m=box(s,straw,[(r()-.5)*6,.018,r()*4-1.5],[.02,.015,.12+r()*.2],false);m.rotation.y=a;}
    this.careProps=new THREE.Group();s.add(this.careProps);
    this.carrot=new THREE.Group();this.careProps.add(this.carrot);
    const orange=material('#d79347');mesh(this.carrot,new THREE.ConeGeometry(.13,.6,12),orange,[0,0,0],[1,1,1]);
    for(let i=0;i<4;i++)rod(this.carrot,material('#72894b'),v(0,.28,0),v((i-1.5)*.09,.62,-.05),.025);
    this.haySnack=orb(this.careProps,straw,[.35,2.4,-2.1],[.3,.2,.23]);
    this.brush=box(this.careProps,material('#b98178'),[0,0,0],[.26,.1,.4]);
    this.heart=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture('♥','#af6373'),transparent:true,depthTest:false}));this.heart.scale.set(.6,.6,1);s.add(this.heart);
  }
  buildCourse(id){
    if(this.course===id)return;this.course=id;this.preview=createGame('gentle',id);
    this.renderer.shadowMap.needsUpdate=true;
    const materials=new Set(),geometries=new Set();
    this.gateGroup.traverse(o=>{if(o.userData.ownTexture)o.material.map?.dispose();if(o.material)materials.add(o.material);if(!o.isSprite&&o.geometry&&![sphereGeometry,boxGeometry,cylinderGeometry].includes(o.geometry))geometries.add(o.geometry);});
    materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
    this.gateGroup.clear();this.gates=[];
    const white=material('#f3eee0'),wood=material('#9e8770'),colors=['#8ca6a3','#bb8891','#99a875'];
    const course=createGame('gentle',id);
    for(const [i,gate] of course.obstacles.entries()){
      const group=new THREE.Group();group.position.set(gate.x,0,gate.z);group.rotation.y=gate.yaw;this.gateGroup.add(group);
      const accent=material(colors[(i+(id==='garden'?1:0))%3]);
      const standardHeight=Math.max(1.25,gate.height+.4);
      for(const side of [-1,1]){
        box(group,white,[side*gate.width/2,standardHeight/2,0],[.18,standardHeight,.24]);box(group,wood,[side*gate.width/2,.07,0],[.7,.14,.7]);
        for(let h=0;h<4;h++)box(group,accent,[side*gate.width/2,.3+h*(standardHeight-.45)/4,0],[.19,.1,.25]);
        const cap=orb(group,white,[side*gate.width/2,standardHeight+.04,0],[.15,.08,.15]);
        box(group,wood,[side*(gate.width/2+1),.2,.1],[1,.4,1]);
        const shrub=new THREE.Sprite(new THREE.SpriteMaterial({map:this.shrubTexture,transparent:true,alphaTest:.19,toneMapped:false}));shrub.position.set(side*(gate.width/2+1),.8,.1);shrub.scale.set(1.1,1.2,1);group.add(shrub);
      }
      const beams=[];
      for(const y of [gate.height*.5,gate.height]){
        const bar=new THREE.Group();bar.position.y=y;group.add(bar);
        const beam=mesh(bar,cylinderGeometry,white,[0,0,0],[.065,gate.width,.065]);beam.rotation.z=Math.PI/2;
        for(let j=0;j<7;j++){const stripe=mesh(bar,cylinderGeometry,accent,[(j-3)*gate.width/7,0,0],[.069,.4,.069]);stripe.rotation.z=Math.PI/2;}
        beams.push(bar);
      }
      const flagMat=material('#bb6c6e');for(const side of [-1,1]){const flag=mesh(group,new THREE.PlaneGeometry(.28,.2),side===1?flagMat:white,[side*gate.width/2+.14,standardHeight-.12,0],[1,1,1]);flag.material.side=THREE.DoubleSide;}
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(String(i+1)),transparent:true}));sprite.userData.ownTexture=true;sprite.position.set(gate.width/2+.65,.43,.35);sprite.scale.set(.62,.62,1);group.add(sprite);
      box(group,white,[gate.width/2+.65,.2,.35],[.045,.4,.045]);
      const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,48),new THREE.MeshBasicMaterial({color:'#edc570',side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.scale.set(4.3,1.5,1);ring.position.y=.025;group.add(ring);
      this.gates.push({group,beams,sprite,ring});
    }
    const last=course.obstacles.at(-1),finish=new THREE.Group();finish.position.set(last.x,0,last.z);finish.rotation.y=last.yaw;this.gateGroup.add(finish);
    for(const side of [-1,1])box(finish,white,[side*(last.width/2+1),2.2,-3.7],[.22,4.4,.22]);
    box(finish,white,[0,4.4,-3.7],[last.width+2.2,.3,.25]);
    const sign=document.createElement('canvas');sign.width=512;sign.height=96;const sc=sign.getContext('2d');sc.fillStyle='#fff8df';sc.fillRect(0,0,512,96);sc.fillStyle='#3d674e';sc.font='bold 53px Trebuchet MS';sc.textAlign='center';sc.fillText('ARRIVÉE',256,67);
    const banner=mesh(finish,new THREE.PlaneGeometry(last.width*.8,1),new THREE.MeshBasicMaterial({map:photoTexture(sign),side:THREE.DoubleSide,toneMapped:false}),[0,4.4,-3.53],[1,1,1],false);banner.userData.ownTexture=true;
    const checked=document.createElement('canvas');checked.width=256;checked.height=32;const cc=checked.getContext('2d');for(let x=0;x<16;x++)for(let y=0;y<2;y++){cc.fillStyle=(x+y)%2?'#faf6df':'#435646';cc.fillRect(x*16,y*16,16,16);}
    const line=mesh(finish,new THREE.PlaneGeometry(last.width+1,.8),new THREE.MeshBasicMaterial({map:photoTexture(checked),side:THREE.DoubleSide,toneMapped:false}),[0,.032,-3.7],[1,1,1],false);line.rotation.x=-Math.PI/2;line.userData.ownTexture=true;
  }
  setCharacter(id,kind=this.ponyKind){
    const images=this.photos.characters[id];if(!images)return;
    this.characterId=id;this.ponyKind=kind;
    this.characterTextures ||= new Map();
    const key=id+':'+kind;
    if(!this.characterTextures.has(key)){
      this.characterTextures.set(key,mountedTextures(kind==='unicorn'?{...images,courseRear:images.unicornRear}:kind==='white'?{...images,courseRear:images.whiteRear}:images));
    }
    const textures=this.characterTextures.get(key);this.pony.stride=textures.stride;this.pony.jumping=textures.jumping;
    this.pony.mounted.material.map=textures.stride;this.pony.mounted.material.needsUpdate=true;
    this.canvas.dataset.rider=id;
  }
  updatePony(p,needs,time,game,effect,dt){
    const pony=this.pony,stable=this.sceneName==='stable';
    pony.mounted.visible=!stable;pony.standing.visible=stable;
    const apply=(texture,pose)=>{
      pose=game?.jumpActive?detailPose(pose):{...pose,mix:pose.mix*pose.mix*(3-2*pose.mix)};
      if(pony.mounted.material.map!==texture){pony.mounted.material.map=texture;pony.mounted.material.needsUpdate=true;}
      texture.offset.x=pose.from/8;pony.mounted.material.userData.poseMix.value=this.reducedMotion?0:pose.mix;
      pony.mounted.material.userData.poseDelta.value=(pose.to-pose.from)/8;
    };
    if(this.motionGame!==game){this.motionGame=game;this.gaitDistance=0;this.strideLength=null;this.previousTravel=game?.traveled||0;this.previousHeading=game?.heading||0;this.wasJumping=false;this.terminalLanding=null;}
    if(game?.status==='playing'){
      const jumping=game.jumpActive;
      const texture=jumping?pony.jumping:pony.stride;
      const traveled=Math.max(0,game.traveled-this.previousTravel);this.previousTravel=game.traveled;
      const gait=['trail','paddock'].includes(game.activity)?game.pace:'gallop';
      this.strideLength=damp(this.strideLength||STRIDE_LENGTHS[gait],STRIDE_LENGTHS[gait],5,dt);
      if(!jumping)this.gaitDistance+=traveled/this.strideLength;
      if(this.wasJumping&&!jumping)this.gaitDistance=0;this.wasJumping=jumping;
      const motion=strideMotion(this.gaitDistance,game.speed,gait),pose=jumping?jumpPose(game.jumpTime):game.speed>.05?cyclePose(motion.phase):{from:0,to:0,mix:0};
      apply(texture,pose);this.canvas.dataset.jumpPhase=jumping?String(jumpFrame(game)):'ground';this.canvas.dataset.poseBlend=String(pose.mix);
      pony.body.position.y=jumping?game.height:damp(pony.body.position.y,this.reducedMotion?0:motion.lift,18,dt);pony.body.rotation.x=damp(pony.body.rotation.x,jumping||this.reducedMotion?0:motion.pitch,10,dt);
      const angle=Math.atan2(Math.sin(game.heading-this.previousHeading),Math.cos(game.heading-this.previousHeading));this.previousHeading=game.heading;
      const bank=this.reducedMotion?0:clamp(angle/Math.max(.001,dt)*.025,-.035,.035);
      pony.body.rotation.z=damp(pony.body.rotation.z,bank,8,dt);
    }else if(game&&['finished','lost'].includes(game.status)){
      this.terminalLanding ||= {height:game.height,velocity:game.velocity,time:game.jumpActive?game.jumpTime:JUMP_DURATION};
      const landing=advanceLanding(this.terminalLanding,dt);pony.body.position.y=landing.height;
      const jumping=landing.time<JUMP_DURATION||landing.height>0;
      apply(jumping?pony.jumping:pony.stride,jumping?jumpPose(landing.time):{from:0,to:0,mix:0});
      pony.body.rotation.z=damp(pony.body.rotation.z,0,8,dt);
    }else if(!game||['countdown','preview'].includes(game.status)){
      pony.body.position.y=0;pony.body.rotation.z=0;apply(pony.stride,{from:0,to:0,mix:0});
    }
    if(game?.status!=='paused')pony.body.scale.y=this.reducedMotion?1:1+Math.sin(time*1.8)*.0015;
    if(stable){
      const action=effect?.action;
      this.carrot.visible=action==='carrot';this.haySnack.visible=action==='hay';
      this.carrot.position.set(.35,2.4,-1.6);this.carrot.rotation.z=Math.PI/2;
      this.brush.visible=action==='brush';this.brush.position.set(.58,1.5,Math.sin(time*6)*.65);
      this.heart.visible=action==='pet';this.heart.position.set(.1,3.25+Math.sin(time*2)*.15,-.5);
    }
  }
  render(view,game,p,needs,effect,time,dt,course){
    if(view==='stable'){this.sceneName='stable';this.lastCourseView=false;return;}
    const now=performance.now();if(this.software&&now-this.lastRenderAt<1000/30-1)return;
    dt=this.lastRenderAt<0?dt:Math.min(.1,(now-this.lastRenderAt)/1000);this.lastRenderAt=now;
    const switching=this.sceneName!==view;
    let scenery=null;
    if(view==='trail'){
      if(!this.trailScenes.has(game.theme)){
        const trailScene=createTrailScene(this.photos,game.theme,{software:this.software,shadowSize:this.shadowSize});
        this.batchScenery(trailScene.scene);this.trailScenes.set(game.theme,trailScene);
      }
      scenery=this.trailScenes.get(game.theme);scenery.animate(time);
    }
    const activeScene=scenery?.scene||this.arena;
    if(switching||this.pony.root.parent!==activeScene){this.sceneName=view;activeScene.add(this.pony.root,this.shadow);this.renderer.shadowMap.needsUpdate=true;this.resize();}
    this.updatePony(p,needs,time,game,effect,dt);
    if(this.grassWind)this.grassWind.value=this.reducedMotion?0:time;
    if(view==='stable'){
      this.pony.root.position.set(0,0,0);this.pony.root.rotation.set(0,0,0);this.shadow.position.set(0,.018,0);
      if(this.camera.fov!==40){this.camera.fov=40;this.camera.updateProjectionMatrix();}
      this.camera.position.set(4.8,3.0,-5.7);this.camera.lookAt(0,1.6,.1);this.renderer.render(this.barn,this.camera);return;
    }
    if(this.camera.fov!==52){this.camera.fov=52;this.camera.updateProjectionMatrix();}
    if(view!=='trail')this.buildCourse(course);
    let state=game||this.preview;
    if(game?.status==='finished'&&view!=='trail'){
      if(this.finishedGame!==game){this.finishedGame=game;this.finishTravel=0;}
      this.finishTravel=Math.min(5.7,this.finishTravel+Math.max(dt,.001)*3);
      state={...game,x:game.x-Math.sin(game.heading)*this.finishTravel,z:game.z-Math.cos(game.heading)*this.finishTravel,speed:this.finishTravel<5.7?3:0};
      if(this.pony.mounted.material.map===this.pony.stride){
        const pose=state.speed?detailPose(cyclePose(this.finishTravel/5.2*8)):{from:0,to:0,mix:0};
        this.pony.stride.offset.x=pose.from/8;this.pony.mounted.material.userData.poseMix.value=this.reducedMotion?0:pose.mix;this.pony.mounted.material.userData.poseDelta.value=(pose.to-pose.from)/8;
      }
    }else{this.finishedGame=null;this.finishTravel=0;}
    this.pony.mounted.visible=true;this.pony.standing.visible=false;
    const terrainY=view==='trail'?trailGroundHeight(game.theme,state.x,state.z,game.features):0,floorY=game?.swimming?Math.max(-.68,terrainY):terrainY;
    const floating=game?.swimming?Math.sin(time*3.8)*.035:0;
    this.pony.root.position.set(state.x,floorY+floating,state.z);this.pony.root.rotation.set(0,state.heading,0);
    this.shadow.position.set(state.x,floorY+.018,state.z);this.shadow.rotation.z=state.heading;this.shadow.visible=!game?.swimming;
    const visualHeight=this.pony.body.position.y+floorY+floating;
    this.shadow.material.opacity=1-visualHeight*.2;
    const sin=Math.sin(state.heading),cos=Math.cos(state.heading);
    const desired=v(state.x+sin*7.4+cos*3.0,4.3+visualHeight*.25,state.z+cos*7.4-sin*3.0);
    const look=v(state.x-sin*2.5,1.7+visualHeight*.45,state.z-cos*2.5);
    const smooth=1-Math.exp(-Math.max(dt,.001)*5);
    if(this.pony.rear){
      const rear=rearChaseCamera(state,visualHeight);
      this.camera.position.set(rear.position.x,rear.position.y,rear.position.z);this.lookAt.set(rear.target.x,rear.target.y,rear.target.z);
    }else if(switching||!this.lastCourseView){this.camera.position.copy(desired);this.lookAt.copy(look);}else{this.camera.position.lerp(desired,smooth);this.lookAt.lerp(look,smooth);}
    this.lastCourseView=true;this.camera.lookAt(this.lookAt);
    this.canvas.dataset.facing=this.pony.rear?'rear':'profile';this.canvas.dataset.heading=String(state.heading);
    this.canvas.dataset.cameraX=String(this.camera.position.x);this.canvas.dataset.cameraZ=String(this.camera.position.z);
    this.canvas.dataset.horseX=String(state.x);this.canvas.dataset.horseZ=String(state.z);
    this.canvas.dataset.ponyKind=p.kind||'bay';
    this.canvas.dataset.activity=game?.activity||'jump';this.canvas.dataset.gaitStep=String(game?.gaitStep||0);this.canvas.dataset.speed=String(state.speed);
    if(view==='trail'){this.canvas.dataset.theme=game.theme;this.canvas.dataset.swimming=!!game.swimming;this.canvas.dataset.waterDepth=String(game.waterDepth||0);scenery.updateRider?.(state);this.renderer.render(activeScene,this.camera);return;}
    const gate=state.obstacles[state.next];
    for(const [i,g] of this.gates.entries()){
      g.ring.visible=i===state.next;g.sprite.visible=i>=state.next;g.sprite.material.opacity=1;
      g.sprite.scale.setScalar(i===state.next?.78:.62);
      const hit=state.obstacles[i]?.touched;
      if(g.lastHit!==hit){g.lastHit=hit;this.renderer.shadowMap.needsUpdate=true;}
      for(const [j,beam] of g.beams.entries()){beam.rotation.z=hit?(j%2?.12:-.1):0;beam.position.y=hit ? .15+j*.13 : state.obstacles[i].height*(j?1:.5);}
    }
    this.guideGroup.visible=!!gate;
    if(gate){
      const before=state.obstacles[state.next-1]||{x:0,z:40};
      this.guideDots.forEach((dot,i)=>{const t=(i+1)/31;dot.position.set(before.x+(gate.x-before.x)*t,.03,before.z+(gate.z-before.z)*t);});
    }
    const a=this.dustGeo.attributes.position;
    for(let i=0;i<a.count;i++){
      const t=(time*.8+i*.073)%1;
      a.setXYZ(i,state.x+sin*(1+t*2)+Math.sin(i*8)*.5,visualHeight||state.speed<2?-5:.1+t*.55,state.z+cos*(1+t*2)+Math.cos(i*7)*.5);
    }
    a.needsUpdate=true;this.renderer.render(this.arena,this.camera);
  }
  renderCentre(state,character,dt){
    const now=performance.now();if(this.software&&now-this.lastRenderAt<1000/30-1)return null;this.lastRenderAt=now;
    if(!this.centreScene)this.centreScene=new CentreScene(this.photos,{shadowSize:this.shadowSize});
    if(this.sceneName!=='centre'){this.sceneName='centre';this.centreScene.cameraReady=false;this.resize();this.renderer.shadowMap.needsUpdate=true;}
    this.camera.fov=58;this.camera.updateProjectionMatrix();const location=this.centreScene.renderState(state,character,this.camera,dt);this.renderer.render(this.centreScene.scene,this.camera);this.canvas.dataset.centreX=state.player.x.toFixed(2);this.canvas.dataset.centreZ=state.player.z.toFixed(2);this.canvas.dataset.centreHeading=String(state.player.heading);return location;
  }
  centreGroundPoint(x,y){return this.centreScene?.groundPoint(x,y,this.canvas.getBoundingClientRect(),this.camera);}
  centrePickObject(x,y){return this.centreScene?.pickObject(x,y,this.canvas.getBoundingClientRect(),this.camera);}
  centreHotspots(state){return this.centreScene?.hotspots(state,this.camera)||[];}
}
