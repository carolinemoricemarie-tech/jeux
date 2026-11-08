import * as THREE from './vendor/three.module.min.mjs';
import {photoTexture,cutout} from './photo-assets.mjs';
import {createRail,railPoint} from './guidance.mjs';
import {TRAILS} from './trails.mjs';
import {groundHeight,coastline,forestTrees} from './terrain.mjs';
import {materialTile} from './centre-scene.mjs';
const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,9);
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.95});
function box(scene,material,x,y,z,w,h,d){const m=new THREE.Mesh(cube,material);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function map(image,repeat){const t=photoTexture(image);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=8;return t;}
function alphaEdge(){const c=document.createElement('canvas');c.width=128;c.height=4;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,128,0);g.addColorStop(0,'#000');g.addColorStop(.15,'#fff');g.addColorStop(.85,'#fff');g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,128,4);return new THREE.CanvasTexture(c);}
function pathRibbon(scene,rail,theme,texture){
  const positions=[],uv=[],indices=[],count=380;
  for(let i=0;i<=count;i++){
    const p=railPoint(rail,rail.length*i/count),width=2.4+Math.sin(i*.073)*.18,dx=Math.cos(p.heading)*width,dz=-Math.sin(p.heading)*width;
    for(const side of [-1,1])positions.push(p.x+dx*side,groundHeight(theme,p.x+dx*side,p.z+dz*side)+.032,p.z+dz*side);
    uv.push(0,i*.06,1,i*.06);if(i<count){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  texture.repeat.set(1,1);const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:texture,alphaMap:alphaEdge(),transparent:true,depthWrite:false,roughness:1,side:THREE.DoubleSide,color:'#fff8e8',bumpMap:texture,bumpScale:.035,polygonOffset:true,polygonOffsetFactor:-1}));mesh.receiveShadow=true;mesh.renderOrder=1;scene.add(mesh);
}
function billboardForest(scene,photos,trees,theme){
  const image=photos.trees,w=image.width/2,h=image.height/2,materials=[];
  for(let i=0;i<4;i++){
    const texture=cutout(image,i%2*w,Math.floor(i/2)*h,w,h),m=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.34,depthWrite:true,toneMapped:false,fog:true,side:THREE.DoubleSide});
    m.onBeforeCompile=shader=>{shader.vertexShader='varying float treeVisibility;\n'+shader.vertexShader;shader.fragmentShader='varying float treeVisibility;\n'+shader.fragmentShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 treeWorld = modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
      treeVisibility = smoothstep(9.,16.,distance(cameraPosition.xz,treeWorld.xz));
      vec4 center = modelViewMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
      vec4 mvPosition = center + vec4(position.x*length(instanceMatrix[0].xyz),position.y*length(instanceMatrix[1].xyz),0.,0.);
      gl_Position = projectionMatrix * mvPosition;`);shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a *= treeVisibility;\n#include <alphatest_fragment>');};m.customProgramCacheKey=()=> 'forest-instanced-leaf-billboard-v2';materials.push({material:m,texture});
  }
  const geo=new THREE.PlaneGeometry(1,1).translate(0,.5,0),dummy=new THREE.Object3D();
  for(let species=0;species<4;species++){
    const items=trees.filter(t=>t.species===species),{material,texture}=materials[species],inst=new THREE.InstancedMesh(geo,material,items.length);inst.frustumCulled=false;
    items.forEach((t,i)=>{const height=t.height;dummy.position.set(t.x,groundHeight(theme,t.x,t.z),t.z);dummy.scale.set(height*texture.image.width/texture.image.height,height,1);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});scene.add(inst);
  }
  const barkMap=map(photos.wood,3),bark=new THREE.MeshStandardMaterial({map:barkMap,color:'#b5ada0',roughness:1,bumpMap:barkMap,bumpScale:.08}),trunks=new THREE.InstancedMesh(cylinder,bark,trees.length*3);trunks.castShadow=true;trunks.receiveShadow=true;let index=0;
  for(const t of trees){const y=groundHeight(theme,t.x,t.z),height=t.height*.46;
    dummy.position.set(t.x,y+height/2,t.z);dummy.rotation.set(0,0,0);dummy.scale.set(t.radius*.8,height,t.radius*.8);dummy.updateMatrix();trunks.setMatrixAt(index++,dummy.matrix);
    for(const side of [-1,1]){dummy.position.set(t.x+side*.65,y+height*.84,t.z+.2);dummy.rotation.set(.1,0,-side*.55);dummy.scale.set(.1,height*.42,.1);dummy.updateMatrix();trunks.setMatrixAt(index++,dummy.matrix);}
  }scene.add(trunks);
  const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),mat('#858b78'),80);
  for(let i=0;i<80;i++){const t=trees[i%trees.length],x=t.x+Math.sin(i*4.7)*2,z=t.z+Math.cos(i*5.7)*2;dummy.position.set(x,groundHeight(theme,x,z)+.12,z);dummy.rotation.set(i*.3,i,0);dummy.scale.set(.16+i%4*.08,.12+i%3*.05,.17+i%5*.05);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;scene.add(rocks);
  const fernMat=new THREE.MeshStandardMaterial({color:'#60784d',roughness:1,side:THREE.DoubleSide}),fernGeo=new THREE.PlaneGeometry(.11,.8).translate(0,.4,0),ferns=new THREE.InstancedMesh(fernGeo,fernMat,trees.length*8);
  trees.forEach((t,i)=>{for(let n=0;n<8;n++){const a=n/8*Math.PI*2;dummy.position.set(t.x+Math.sin(i)*1.8,groundHeight(theme,t.x,t.z),t.z+Math.cos(i)*1.8);dummy.rotation.set(Math.sin(a)*.6,a,Math.cos(a)*.6);dummy.scale.set(1,.6+(i%4)*.2,1);dummy.updateMatrix();ferns.setMatrixAt(i*8+n,dummy.matrix);}});scene.add(ferns);
}
function ocean(scene,sky,photos){
  const normalCanvas=document.createElement('canvas');normalCanvas.width=normalCanvas.height=256;const c=normalCanvas.getContext('2d'),data=c.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const k=(y*256+x)*4;data.data[k]=128+Math.sin(x*.3+y*.16)*23+Math.sin(y*.7)*7;data.data[k+1]=128+Math.cos(y*.23+x*.12)*24;data.data[k+2]=245;data.data[k+3]=255;}c.putImageData(data,0,0);const normals=map(normalCanvas,28);normals.colorSpace=THREE.NoColorSpace;
  const vertices=[],uv=[],indices=[],cols=48,rows=140;
  for(let j=0;j<=rows;j++){const z=-170+j/rows*340;for(let i=0;i<=cols;i++){const x=coastline(z)+.8-i/cols*185;vertices.push(x,.12,z);uv.push(i,j/rows);if(i<cols&&j<rows){const k=j*(cols+1)+i;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const waterPhoto=photos.oceanWater?map(photos.oceanWater,32):null;
  const water=new THREE.MeshPhysicalMaterial({map:waterPhoto,color:waterPhoto?'#b9d7df':'#4b9fb8',roughness:.25,metalness:.02,normalMap:normals,normalScale:new THREE.Vector2(.4,.4),clearcoat:.7,clearcoatRoughness:.22,envMap:sky,envMapIntensity:.3,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide});const time={value:0};
  water.onBeforeCompile=shader=>{shader.uniforms.waterTime=time;shader.vertexShader='uniform float waterTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y+=sin(position.z*.23+waterTime)*.025+sin(position.x*.36+position.z*.1+waterTime*1.3)*.02;');};
  const sea=new THREE.Mesh(geometry,water);sea.renderOrder=4;scene.add(sea);
  const foamCanvas=document.createElement('canvas');foamCanvas.width=128;foamCanvas.height=256;const fc=foamCanvas.getContext('2d'),pixels=fc.createImageData(128,256);for(let y=0;y<256;y++)for(let x=0;x<128;x++){const k=(y*128+x)*4,edge=Math.sin(x/127*Math.PI);pixels.data[k]=245;pixels.data[k+1]=253;pixels.data[k+2]=251;pixels.data[k+3]=Math.max(0,edge*(130+Math.sin(y*.27+x*.2)*70+Math.cos(x*.55-y*.11)*50));}fc.putImageData(pixels,0,0);
  const foamPos=[],foamUv=[],foamIndex=[];for(let j=0;j<=200;j++){const z=-160+j*1.6,x=coastline(z),offset=Math.sin(z*.23)*.24;foamPos.push(x-1.1+offset,.18,z,x+.55+offset,.18,z);foamUv.push(0,j*.035,1,j*.035);if(j<200){const k=j*2;foamIndex.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(foamPos,3));fg.setAttribute('uv',new THREE.Float32BufferAttribute(foamUv,2));fg.setIndex(foamIndex);fg.computeVertexNormals();const foamTex=photoTexture(foamCanvas);foamTex.wrapS=foamTex.wrapT=THREE.RepeatWrapping;const foam=new THREE.Mesh(fg,new THREE.MeshBasicMaterial({map:foamTex,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));foam.renderOrder=5;scene.add(foam);
  const ripples=[];for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.88,1,64),new THREE.MeshBasicMaterial({color:'#eefcfa',transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.renderOrder=6;ring.visible=false;scene.add(ring);ripples.push(ring);}
  return{animate:t=>{time.value=t;normals.offset.set(t*.004,t*.002);if(waterPhoto)waterPhoto.offset.set(t*.0015,t*.001);foam.material.opacity=.45+Math.sin(t*.7)*.2;ripples.forEach((r,i)=>{const q=(t*.65+i/3)%1;r.scale.setScalar(.6+q*1.4);r.material.opacity=(1-q)*.25;});},updateRider:s=>ripples.forEach(r=>{r.visible=s.waterDepth>.1;r.position.set(s.x,.21,s.z);})};
}
export function createTrailScene(photos,theme,{software=false,shadowSize=1024}={}){
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(theme==='forest'?'#a9b4a3':theme==='beach'?'#c4dce0':'#d2dcc3',theme==='forest'?42:85,theme==='forest'?150:260);
  scene.add(new THREE.HemisphereLight('#e5eef5',theme==='forest'?'#686958':'#a69a79',theme==='forest'?1.7:1.9));const sun=new THREE.DirectionalLight('#ffedcc',theme==='forest'?2.1:2.4);sun.position.set(-35,55,22);sun.castShadow=true;sun.shadow.mapSize.set(Math.min(shadowSize,1024),Math.min(shadowSize,1024));Object.assign(sun.shadow.camera,{left:-80,right:80,top:80,bottom:-80,near:1,far:160});sun.shadow.normalBias=.035;scene.add(sun);
  const skyMap=photoTexture(theme==='beach'?photos.seaSky:photos.sky),skyGeo=new THREE.SphereGeometry(380,48,24),skyUV=skyGeo.attributes.uv;for(let i=0;i<skyUV.count;i++)skyUV.setY(i,.18+.82*Math.pow(Math.max(0,skyUV.getY(i)*2-1),.9));skyMap.wrapS=THREE.MirroredRepeatWrapping;skyMap.repeat.x=2;scene.add(new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({map:skyMap,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false})));
  const floorTexture=theme==='forest'?materialTile(photos,0,75):theme==='beach'?materialTile(photos,3,75):map(photos.grass,75),terrain=new THREE.PlaneGeometry(300,300,120,120);terrain.rotateX(-Math.PI/2);const p=terrain.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),height=groundHeight(theme,x,z);p.setY(i,height);const wet=theme==='beach'?Math.max(0,Math.min(1,(x-coastline(z))/5)):1;const color=new THREE.Color().lerpColors(new THREE.Color('#84998f'),new THREE.Color('#fff7e8'),wet);colors.push(color.r,color.g,color.b);}terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();const ground=new THREE.Mesh(terrain,new THREE.MeshStandardMaterial({map:floorTexture,vertexColors:true,roughness:1,bumpMap:floorTexture,bumpScale:theme==='forest'?.06:.025}));ground.receiveShadow=true;scene.add(ground);
  const config=Object.values(TRAILS).find(t=>t.theme===theme),rail=createRail(config.points);if(theme!=='beach')pathRibbon(scene,rail,theme,materialTile(photos,1,1));
  if(theme==='forest')billboardForest(scene,photos,forestTrees(rail),theme);
  if(theme==='country'){
    const trees=Array.from({length:34},(_,i)=>({x:Math.sin(i/34*Math.PI*2)*62,z:Math.cos(i/34*Math.PI*2)*62,height:10+i%5,species:i%4,radius:.4}));billboardForest(scene,photos,trees,theme);
    const wood=mat('#a89471'),white=mat('#e4ddc9'),hay=mat('#c9b76b');for(const z of [-48,51])for(let x=-45;x<57;x+=5){box(scene,wood,x,.7,z,.15,1.4,.15);for(const y of [.55,1.05])box(scene,white,x+2.5,y,z,5,.09,.09);}
    for(let i=0;i<9;i++){const bale=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,1.2,24),hay);bale.rotation.z=Math.PI/2;bale.position.set(-38+i%3*4,.95,-30+Math.floor(i/3)*5);bale.castShadow=true;scene.add(bale);}box(scene,wood,-44,3,-67,24,6,10);box(scene,mat('#73766c'),-44,6.2,-67,25,.5,12);
  }
  let sea=null;if(theme==='beach'){const reflection=photoTexture(photos.seaSky);reflection.mapping=THREE.EquirectangularReflectionMapping;sea=ocean(scene,reflection,photos);const trees=Array.from({length:12},(_,i)=>({x:48+i%2*9,z:-55+i*10,height:7+i%3,species:i%4,radius:.35}));billboardForest(scene,photos,trees,theme);}
  return{scene,animate:t=>sea?.animate(t),updateRider:s=>sea?.updateRider(s)};
}
