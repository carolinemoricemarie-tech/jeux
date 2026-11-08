import * as THREE from './vendor/three.module.min.mjs';
import {BOXES,centreLocation} from './centre.mjs';
import {photoTexture,cutout,horseMaterial} from './photo-assets.mjs';
import {cyclePose,detailPose} from './animation.mjs';
import {actorAtlas} from './actor-atlas.mjs';
const unit=new THREE.BoxGeometry(1,1,1),post=new THREE.CylinderGeometry(1,1,1,8);
function block(parent,mat,x,y,z,w,h,d){const m=new THREE.Mesh(unit,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function tile(image,repeat=1){const t=photoTexture(image);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);return t;}
function cropTexture(image,x,y,w,h,repeat=1){const c=document.createElement('canvas');c.width=512;c.height=256;c.getContext('2d').drawImage(image,image.width*x,image.height*y,image.width*w,image.height*h,0,0,512,256);return tile(c,repeat);}
export function materialTile(photos,index,repeat=1){
  if(!photos.worldTextures)return tile(photos.grass,repeat);
  const image=photos.worldTextures,c=document.createElement('canvas');c.width=Math.floor(image.width/2);c.height=Math.floor(image.height/2);c.getContext('2d').drawImage(image,index%2*image.width/2,Math.floor(index/2)*image.height/2,image.width/2,image.height/2,0,0,c.width,c.height);return tile(c,repeat);
}
function sign(text){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#e8ddbe';x.fillRect(0,0,512,128);x.strokeStyle='#92774e';x.lineWidth=7;x.strokeRect(3,3,506,122);x.fillStyle='#4d4e38';x.font='bold 44px Georgia';x.textAlign='center';x.fillText(text,256,80);return photoTexture(c);}
function actorTexture(image,columns=4,rows=4){
  const a=actorAtlas(image,columns,rows),c=document.createElement('canvas');c.width=256*a.frames.length;c.height=256;const x=c.getContext('2d');
  a.frames.forEach((frame,i)=>x.drawImage(frame,0,0,a.width,512,i*256+(256-a.width/2)/2,0,a.width/2,256));
  const t=photoTexture(c);t.repeat.set(1/a.frames.length,1);return{texture:t,count:a.frames.length};
}
function figure(map,height,width=height){const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height).translate(0,height/2,0),new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.18,toneMapped:false,fog:true,side:THREE.DoubleSide}));m.renderOrder=2;return m;}
function batch(root){root.updateMatrixWorld(true);const groups=new Map();root.traverse(m=>{if(m.isMesh&&!m.isInstancedMesh&&m.geometry===unit){const k=m.material.uuid;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);}});for(const entries of groups.values()){if(entries.length<3)continue;const m=new THREE.InstancedMesh(unit,entries[0].material,entries.length);m.castShadow=true;m.receiveShadow=true;entries.forEach((e,i)=>{m.setMatrixAt(i,e.matrixWorld);e.removeFromParent();});root.add(m);}}
export class CentreScene{
  constructor(photos,{shadowSize=1024}={}){
    this.photos=photos;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c3d5d8');this.scene.fog=new THREE.Fog('#c3d5d8',65,145);this.static=new THREE.Group();this.scene.add(this.static);this.doors=new Map();this.jobs=new Map();this.horses=[];this.props=[];this.people=new Map();
    this.scene.add(new THREE.HemisphereLight('#edf4fa','#96866a',2));const sun=new THREE.DirectionalLight('#ffe6b9',2.4);sun.position.set(-25,40,28);sun.castShadow=true;sun.shadow.mapSize.set(Math.min(1024,shadowSize),Math.min(1024,shadowSize));Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:110});sun.shadow.normalBias=.035;this.scene.add(sun);
    const strawMap=cropTexture(photos.room,.31,.86,.36,.13,5),stoneMap=materialTile(photos,2,8);
    const wood=new THREE.MeshStandardMaterial({map:tile(photos.wood,3),color:'#e0ceb0',roughness:.9}),oak=new THREE.MeshStandardMaterial({map:tile(photos.wood,1),color:'#a18b6d',roughness:.9}),stone=new THREE.MeshStandardMaterial({map:stoneMap,color:'#dbd2bb',roughness:1,bumpMap:stoneMap,bumpScale:.04}),metal=new THREE.MeshStandardMaterial({color:'#535f5c',metalness:.5,roughness:.45}),roof=new THREE.MeshStandardMaterial({color:'#6d7771',roughness:.85}),straw=new THREE.MeshStandardMaterial({map:strawMap,color:'#e3d5b2',roughness:1,bumpMap:strawMap,bumpScale:.035});
    const skyGeo=new THREE.SphereGeometry(180,40,20),skyUV=skyGeo.attributes.uv;for(let i=0;i<skyUV.count;i++)skyUV.setY(i,.18+.82*Math.pow(Math.max(0,skyUV.getY(i)*2-1),.9));this.scene.add(new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({map:photoTexture(photos.sky),side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false})));
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({map:tile(photos.grass,45),color:'#bbc5a8',roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.static.add(floor);
    const yard=new THREE.Mesh(new THREE.PlaneGeometry(59,58),new THREE.MeshStandardMaterial({map:materialTile(photos,2,12),color:'#d5cbb7',roughness:1,bumpMap:materialTile(photos,2,12),bumpScale:.045}));yard.rotation.x=-Math.PI/2;yard.position.set(0,.018,1);yard.receiveShadow=true;this.static.add(yard);
    block(this.static,stone,0,.04,-11,24,.08,28);block(this.static,stone,-12.5,2.9,-11,.38,5.8,28);block(this.static,stone,12.5,2.9,-11,.38,5.8,28);block(this.static,stone,0,2.9,-25.5,25.3,5.8,.4);
    for(const x of [-8.3,8.3])block(this.static,stone,x,2.7,3.1,8.2,5.4,.4);
    for(const x of [-12.25,-3.3,3.3,12.25])for(const z of [3,-7.6,-15.2,-25.2])block(this.static,oak,x,2.8,z,.28,5.6,.28);
    for(const z of [3,-7.6,-15.2,-25.2]){block(this.static,oak,0,5.6,z,25.4,.3,.3);for(const side of [-1,1]){const r=block(this.static,oak,side*6.2,6.2,z,13,.2,.2);r.rotation.z=side*-.095;}}
    this.roof=new THREE.Group();this.scene.add(this.roof);for(const side of [-1,1]){const panel=block(this.roof,roof,side*6.5,6.4,-11.1,13.4,.2,30.2);panel.rotation.z=side*-.11;}
    for(const z of [-7.6,-15.2])for(const x of [-7.8,7.8])block(this.static,wood,x,1.25,z,8.8,2.5,.18);
    const rest=photos.ponyRest,cw=rest.width/4,ch=rest.height/3;
    for(const [i,b] of BOXES.entries()){
      const f=block(this.static,straw,b.x,.11,b.z,8.3,.14,7.1);f.receiveShadow=true;
      for(const end of [-1,1])block(this.static,wood,b.side*3.3,.75,b.z+end*2.5,.16,1.5,2.45);
      for(const end of [-1,1]){const bars=new THREE.InstancedMesh(post,metal,9),dummy=new THREE.Object3D();for(let n=0;n<9;n++){dummy.position.set(b.side*3.3,2.15,b.z+end*(1.38+n*.26));dummy.scale.set(.018,1.25,.018);dummy.updateMatrix();bars.setMatrixAt(n,dummy.matrix);}this.static.add(bars);}
      const door=new THREE.Group();door.position.set(b.side*3.3,0,b.z-1.2);this.scene.add(door);block(door,wood,0,.72,1.2,.14,1.44,2.3);block(door,oak,0,1.48,1.2,.18,.12,2.35);
      const bars=new THREE.InstancedMesh(post,metal,9),dummy=new THREE.Object3D();for(let n=0;n<9;n++){dummy.position.set(0,2.12,.16+n*.26);dummy.scale.set(.022,1.2,.022);dummy.updateMatrix();bars.setMatrixAt(n,dummy.matrix);}door.add(bars);this.doors.set(b.id,door);
      const board=new THREE.Mesh(new THREE.PlaneGeometry(1.95,.49),new THREE.MeshBasicMaterial({map:sign(b.name),side:THREE.DoubleSide,toneMapped:false}));board.position.set(b.side*3.16,1.1,b.z+2.1);board.rotation.y=-b.side*Math.PI/2;this.static.add(board);
      if(b.pony){const row={noisette:0,nuage:1,etoile:2}[b.pony],pony=figure(cutout(rest,0,row*ch,cw,ch),1.95,2.85);pony.position.set(b.x,.18,b.z);this.scene.add(pony);this.horses.push({mesh:pony,box:b,phase:i});
        const bucket=new THREE.Mesh(new THREE.CylinderGeometry(.36,.28,.43,16),metal);bucket.position.set(b.side*10.8,.46,b.z+2);this.static.add(bucket);const water=new THREE.Mesh(new THREE.CircleGeometry(.31,24),new THREE.MeshStandardMaterial({color:'#91b2ba',metalness:.3,roughness:.2}));water.rotation.x=-Math.PI/2;water.position.set(b.side*10.8,.67,b.z+2);this.scene.add(water);this.jobs.set('water:'+b.id,water);
        if(!photos.stableProps){const hay=block(this.static,straw,b.side*10.8,.47,b.z-2,1.1,.9,1.1);hay.rotation.y=.18;}
        const dirt=new THREE.Group();for(let n=0;n<7;n++){const pile=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),new THREE.MeshStandardMaterial({color:'#64513a',roughness:1}));pile.position.set(b.x+(n%3-.7)*.2,.17,b.z+2+Math.floor(n/3)*.15);dirt.add(pile);}this.scene.add(dirt);this.jobs.set('clean:'+b.id,dirt);
      }
    }
    // Open courtyard: hay shelter, outdoor washing/pansage, a real gate to paddock.
    block(this.static,wood,-20,.03,-11,8,.06,14);block(this.static,stone,-24,1.8,-11,.3,3.6,14);for(const z of [-18,-4])block(this.static,stone,-20,1.8,z,8,3.6,.3);for(const part of [{z:-14.2,d:7.6},{z:-5.7,d:3.4}])block(this.static,stone,-16,1.8,part.z,.3,3.6,part.d);
    this.tackRoof=block(this.scene,roof,-20,3.7,-11,8.5,.2,14.7);const td=new THREE.Group();td.position.set(-16,0,-10.2);block(td,oak,0,1.35,1.2,.12,2.7,2.3);this.scene.add(td);this.doors.set('sellerie',td);
    const seller=new THREE.Mesh(new THREE.PlaneGeometry(3,.7),new THREE.MeshBasicMaterial({map:sign('SELLERIE'),toneMapped:false}));seller.position.set(-15.8,3,-9);seller.rotation.y=Math.PI/2;this.static.add(seller);
    for(const z of [-16,-12,-8]){block(this.static,oak,-23,.65,z,1.2,.12,2.1);for(const y of [.95,1.95])block(this.static,wood,-23.3,y,z,.8,.1,2.1);}
    const title=new THREE.Mesh(new THREE.PlaneGeometry(6,.9),new THREE.MeshBasicMaterial({map:sign('LE DOMAINE DES CRINS'),toneMapped:false}));title.position.set(0,4.8,3.36);this.static.add(title);
    const windowMap=photoTexture(photos.sky);for(const side of [-1,1])for(const z of [-3.8,-11.4,-19]){const pane=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.6),new THREE.MeshBasicMaterial({map:windowMap,color:'#dce9e8',toneMapped:false,side:THREE.DoubleSide}));pane.position.set(side*12.18,3.8,z);pane.rotation.y=-side*Math.PI/2;this.static.add(pane);block(this.static,oak,side*12.1,3.8,z,.09,1.7,.07);block(this.static,oak,side*12.1,3.8,z,.09,.07,2.7);}
    for(const x of [-23,-16])for(const z of [10,20])block(this.static,oak,x,1.8,z,.2,3.6,.2);block(this.static,roof,-19.5,3.6,15,8,.18,11);
    for(let i=0;i<8;i++){const bale=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,1.1,18),straw);bale.rotation.z=Math.PI/2;bale.position.set(-22+i%3*1.4,.8+Math.floor(i/6)*1.2,12+Math.floor(i/3)%2*1.6);bale.castShadow=true;this.static.add(bale);}
    if(photos.stableProps){const im=photos.stableProps,w=im.width/4,h=im.height/2;const addProp=(index,x,z,height,y=0)=>{const mesh=figure(cutout(im,index%4*w,Math.floor(index/4)*h,w,h),height,height*1.15);mesh.position.set(x,y,z);this.scene.add(mesh);this.props.push(mesh);return mesh;};for(let n=0;n<3;n++){addProp(1,-22.8,-16+n*4,.85,1.05);addProp(2,-23.4,-15+n*4,1.1,1.55);addProp(6,-22.9,-16+n*4,.4,.7);}for(const b of BOXES.filter(b=>b.pony))addProp(0,b.side*10.8,b.z-2,.85,.17);addProp(7,-17,13,1.25);addProp(4,18,8,.5);addProp(0,-18,17,.9);}
    block(this.static,stone,20,.05,8,8,.1,7);for(const x of [16.5,23.5]){block(this.static,metal,x,1.1,8,.08,2.2,.08);block(this.static,oak,x,1.3,8.7,.12,.12,2);}
    for(const z of [4,25])for(let x=15;x<=27;x+=3){block(this.static,oak,x,.85,z,.12,1.7,.12);for(const y of [.55,1.15])block(this.static,wood,x+1.5,y,z,3,.1,.1);}
    const gate=block(this.static,wood,23,.8,15,3,1.4,.14);gate.rotation.y=Math.PI/2;
    for(let i=0;i<24;i++){const angle=i/24*Math.PI*2,tree=new THREE.Sprite(new THREE.SpriteMaterial({map:cutout(photos.trees,0,0,photos.trees.width/2,photos.trees.height/2),transparent:true,alphaTest:.3,toneMapped:false}));tree.center.set(.5,0);tree.position.set(Math.sin(angle)*65,0,Math.cos(angle)*65);tree.scale.set(14,16,1);this.scene.add(tree);}
    batch(this.static);this.ray=new THREE.Raycaster();this.groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.cameraTarget=new THREE.Vector3();
  }
  setCharacter(id){if(this.character===id)return;this.character=id;if(this.person)this.person.removeFromParent();const p=this.photos.characters[id],motion=p?.walkDirections||p?.paddockMotion||this.photos.demoPaddock,walk=actorTexture(motion);this.walk=walk;this.person=figure(walk.texture,id==='emmy'?1.12:1.32);this.person.material.dispose();this.person.material=horseMaterial(walk.texture,{rear:true});this.person.material.side=THREE.DoubleSide;this.scene.add(this.person);}
  renderState(state,character,camera,dt){
    this.setCharacter(character);const p=state.player,yaw=p.heading;
    const floor=p.z<3&&Math.abs(p.x)<12?(Math.abs(p.x)>3.7?.18:.08):p.x<-16&&p.z<-4&&p.z>-18?.06:.018;
    this.person.position.set(p.x,floor,p.z);
    const cameraYaw=yaw+(state.cameraYaw||0),desired=new THREE.Vector3(p.x+Math.sin(cameraYaw)*4.1,state.cameraHeight||2.2,p.z+Math.cos(cameraYaw)*4.1);
    if(p.z<2.8&&Math.abs(p.x)<12){desired.x=Math.max(-11.7,Math.min(11.7,desired.x));desired.z=Math.max(-24.8,Math.min(2.8,desired.z));}
    if(p.x<-16&&p.z<-4&&p.z>-18){desired.x=Math.max(-23.6,Math.min(-16.4,desired.x));desired.z=Math.max(-17.6,Math.min(-4.4,desired.z));}
    if(!this.cameraReady){camera.position.copy(desired);this.cameraReady=true;}else camera.position.lerp(desired,1-Math.exp(-Math.max(dt,.001)*7));
    this.cameraTarget.set(p.x,1.3,p.z);camera.lookAt(this.cameraTarget);this.person.rotation.y=Math.atan2(camera.position.x-p.x,camera.position.z-p.z);
    const relative=Math.atan2(Math.sin(yaw-this.person.rotation.y),Math.cos(yaw-this.person.rotation.y)),sector=Math.round(relative/(Math.PI/2));
    const row=sector===0?1:Math.abs(sector)===2?0:sector===1?3:2,walking=p.speed>.06,pose=walking?detailPose(cyclePose(p.travel/.55,4,row*4)):{from:row*4,to:row*4,mix:0},texture=this.walk;
    this.person.material.map=texture.texture;texture.texture.offset.x=pose.from/texture.count;this.person.material.userData.poseMix.value=pose.mix;this.person.material.userData.poseDelta.value=(pose.to-pose.from)/texture.count;
    this.person.scale.x=character==='emmy'&&row===2?-1:1;
    this.person.scale.y=1+Math.sin(state.time*2)*.002;
    for(const [id,door]of this.doors){const target=state.doors[id]?1.42:0;door.rotation.y+=(target-door.rotation.y)*(1-Math.exp(-dt*8));}
    for(const [key,m]of this.jobs){if(key.startsWith('clean:'))m.visible=!state.jobs[key];else m.scale.setScalar(state.jobs[key]?1:.82);}
    for(const h of this.horses){h.mesh.rotation.y=Math.atan2(camera.position.x-h.mesh.position.x,camera.position.z-h.mesh.position.z);h.mesh.scale.y=1+Math.sin(state.time*1.6+h.phase)*.003;}
    for(const prop of this.props)prop.rotation.y=Math.atan2(camera.position.x-prop.position.x,camera.position.z-prop.position.z);
    this.roof.visible=!(p.z<4&&Math.abs(p.x)<13);this.tackRoof.visible=!(p.x<-15.8&&p.z<-3.5&&p.z>-18.5);return centreLocation(state);
  }
  groundPoint(clientX,clientY,rect,camera){this.ray.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),camera);const v=new THREE.Vector3();return this.ray.ray.intersectPlane(this.groundPlane,v)?{x:v.x,z:v.z}:null;}
}
