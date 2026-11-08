import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrail,TRAILS,createFreeRide} from '../trails.mjs';
import {advance,jump} from '../engine.mjs';
import {coastline,groundHeight,waterDepth} from '../terrain.mjs';
import {createCentre,advanceCentre,walkCentreTo,centreBlocked,interactCentre,nearestCentreInteraction,activateCentreObject,centreLocation,BOXES} from '../centre.mjs';
import {createStable,restoreStable} from '../stable.mjs';
import {changeRideGait,setRideGait} from '../riding.mjs';
import {featureLocal,trailGroundHeight} from '../route-features.mjs';
const run=(g,t,input={})=>{for(let i=0;i<t*60;i++)advance(g,1/60,input);};
test('Les pressions choisissent pas, trot et galop ; relâcher garde l’allure, ralentir et arrêter sont explicites',()=>{
  for(const id of Object.keys(TRAILS))for(const character of ['emmy','louane']){
    const g=createTrail(id,'gallop',{character,guided:true}),start={x:g.x,z:g.z};run(g,5);assert.equal(g.autoSteer,false);assert.equal(g.speed,0);assert.equal(g.x,start.x);assert.equal(g.z,start.z);
    changeRideGait(g,1);assert.equal(g.pace,'gentle');run(g,1);assert.ok(g.traveled>0);changeRideGait(g,1);assert.equal(g.pace,'trot');changeRideGait(g,1);assert.equal(g.pace,'gallop');changeRideGait(g,1);assert.equal(g.gaitStep,3);setRideGait(g,'stop');run(g,2);assert.equal(g.speed,0);const still={x:g.x,z:g.z};run(g,3);assert.deepEqual({x:g.x,z:g.z},still);
    const h=g.heading;setRideGait(g,'gentle');run(g,1,{left:true});assert.ok(g.heading!==h);g.status='paused';const paused=structuredClone(g);run(g,2,{up:true});assert.deepEqual(g,paused);
  }
});
test('La plage descend dans l’eau ; la nage ralentit sans saut ni perte de contrôle, le retour sur le sable est possible',()=>{
  const g=createTrail('seaside','gallop');g.x=coastline(g.z)-16;assert.ok(groundHeight('beach',g.x,g.z)<-1);assert.ok(waterDepth('beach',g.x,g.z)>1);
  run(g,.1);assert.equal(g.swimming,true);assert.equal(jump(g),false);setRideGait(g,'gallop');run(g,2);assert.ok(g.speed>0&&g.speed<4);setRideGait(g,'stop');run(g,2);assert.equal(g.speed,0);setRideGait(g,'gallop');
  g.heading=-Math.PI/2;for(let i=0;i<1600&&g.x<coastline(g.z)+5;i++)advance(g,1/60,{up:true});assert.ok(g.x>coastline(g.z));assert.equal(g.swimming,false);
});
test('Les troncs sont solides sans bloquer le sentier',()=>{
  const g=createTrail('woodland'),tree=g.colliders[0];assert.ok(g.colliders.length>50);g.x=tree.x;g.z=tree.z+2;g.heading=0;setRideGait(g,'gentle');
  run(g,3);assert.ok(Math.hypot(g.x-tree.x,g.z-tree.z)>=tree.radius+.59);assert.ok(g.x>=g.bounds.minX&&g.z>=g.bounds.minZ);
});
test('Le centre permet de marcher dans chacun des six boxes puis de revenir dans la cour',()=>{
  for(const box of BOXES){const s=createCentre({age:5});walkCentreTo(s,box.x,box.z);for(let i=0;i<4000&&s.target;i++)advanceCentre(s,1/60);assert.ok(Math.hypot(s.player.x-box.x,s.player.z-box.z)<.5,box.id);assert.equal(s.doors[box.id],true);
    walkCentreTo(s,0,13);for(let i=0;i<4000&&s.target;i++)advanceCentre(s,1/60);assert.ok(Math.hypot(s.player.x,s.player.z-13)<.5,'return '+box.id);
  }
});
test('Une porte fermée bloque le passage, une porte ouverte laisse entrer ; la pause fige la promenade',()=>{
  const s=createCentre(),box=BOXES[0];assert.equal(centreBlocked(s,3.3,box.z),true);s.doors[box.id]=true;assert.equal(centreBlocked(s,3.3,box.z),false);
  s.player.x=2;s.player.z=box.z;const item=nearestCentreInteraction(s);assert.match(item.id,/door/);const events=interactCentre(s,item);assert.equal(events[0].type,'door');assert.equal(s.doors[box.id],false);
  s.status='paused';const copy=structuredClone(s);advanceCentre(s,.1,{up:true});assert.deepEqual(s,copy);assert.deepEqual(interactCentre(s,item),[]);
});
test('Les petits travaux ont une animation qui empêche le double clic et leur sauvegarde reste privée au navigateur',()=>{
  const s=createCentre(),job={id:'water:box0',distance:1,pony:'noisette'};assert.equal(interactCentre(s,job)[0].type,'job');assert.equal(s.jobs[job.id],true);assert.deepEqual(interactCentre(s,job),[]);
  const stable=createStable();stable.centre={doors:{box0:true},jobs:{'water:box0':true,'__proto__':true}};const restored=restoreStable(JSON.stringify(stable));assert.equal(restored.centre.doors.box0,true);assert.equal(restored.centre.jobs['water:box0'],true);assert.equal(Object.hasOwn(restored.centre.jobs,'__proto__'),false);
});
test('La sellerie se visite à pied depuis la cour et depuis un box, avec un retour qui contourne les murs',()=>{
  const s=createCentre();
  for(const target of [[-20,-9],[0,13],[7.6,-3.8],[-20,-9],[-7.6,-11.4],[0,13]]){
    walkCentreTo(s,...target);for(let i=0;i<8000&&s.target;i++)advanceCentre(s,1/60);
    assert.ok(Math.hypot(s.player.x-target[0],s.player.z-target[1])<.5,JSON.stringify(target));
  }
  assert.equal(s.doors.sellerie,true);
});

test('Les actions de porte identifiées entrent dans le bon box de chaque côté, puis permettent d’en sortir',()=>{
 for(const box of BOXES){const s=createCentre({age:5});activateCentreObject(s,'door:'+box.id);for(let n=0;n<6000&&s.target;n++)advanceCentre(s,1/60);assert.equal(centreLocation(s),'Box · '+box.name);assert.ok(Math.sign(s.player.x)===box.side);activateCentreObject(s,'door:'+box.id);for(let n=0;n<6000&&s.target;n++)advanceCentre(s,1/60);assert.equal(centreLocation(s),'L’allée des boxes');}
});
test('Les objets du centre déclenchent leurs propres soins et équipements après une vraie approche',()=>{
 const s=createCentre();s.pony='etoile';let events=[];activateCentreObject(s,'equip:pad');for(let n=0;n<9000&&s.target;n++)events.push(...advanceCentre(s,1/60));assert.deepEqual(events.find(e=>e.type==='equip'),{type:'equip',pony:'etoile',action:undefined,item:'pad'});assert.equal(centreLocation(s),'La sellerie');
});
test('La monte libre attend une commande et permet les trois allures, les virages et la pause sans sortie de l’enclos',()=>{
 const g=createFreeRide('emmy');run(g,3);assert.equal(g.speed,0);assert.equal(g.z,8);changeRideGait(g,1);run(g,1);assert.ok(g.speed>1);changeRideGait(g,1);run(g,1);assert.ok(g.speed>3);changeRideGait(g,1);run(g,1,{right:true});assert.ok(g.heading<-.8);assert.ok(g.speed>5);for(let n=0;n<3;n++)changeRideGait(g,-1);run(g,2);assert.equal(g.speed,0);g.status='paused';const copy=structuredClone(g);run(g,2,{right:true});assert.deepEqual(g,copy);g.status='playing';setRideGait(g,'gallop');run(g,30);assert.equal(g.status,'playing');assert.ok(g.x>=g.bounds.minX&&g.x<=g.bounds.maxX);assert.ok(g.z>=g.bounds.minZ&&g.z<=g.bounds.maxZ);
});
test('Un tronc arrête le poney au sol sans défaite et peut se franchir avec un saut commandé',()=>{
 const g=createTrail('woodland','trot'),f=g.features.find(f=>f.kind==='log');g.colliders=[];g.x=f.x+Math.sin(f.heading)*2;g.z=f.z+Math.cos(f.heading)*2;g.heading=f.heading;setRideGait(g,'trot');run(g,2);assert.ok(featureLocal(f,g.x,g.z).forward>=0);assert.equal(g.status,'playing');assert.equal(g.bumps,0);g.x=f.x+Math.sin(f.heading)*2.2;g.z=f.z+Math.cos(f.heading)*2.2;g.speed=4.2;jump(g);run(g,.75);assert.ok(featureLocal(f,g.x,g.z).forward<0);assert.equal(g.natureJumps,1);
});
test('Le tablier du pont fournit une surface continue au-dessus du ruisseau et des rampes praticables',()=>{
 const g=createTrail('woodland'),b=g.features.find(f=>f.kind==='bridge');for(const z of [-3.8,-2,0,2,3.8]){const x=b.x+Math.sin(b.heading)*z,w=b.z+Math.cos(b.heading)*z,deck=trailGroundHeight(g.theme,x,w,g.features),bed=trailGroundHeight(g.theme,x,w,g.features,{deck:false});assert.ok(deck>bed);assert.ok(Number.isFinite(deck));}
});
