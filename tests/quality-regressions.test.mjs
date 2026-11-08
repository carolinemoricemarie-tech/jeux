import test from 'node:test';
import assert from 'node:assert/strict';
import {characterView,flatCharacterView} from '../character-view.mjs';
import {feedingAnimation} from '../care-animation.mjs';
import {createCentre,placeInCourtyard,centreLocation,advanceCentre,walkCentreTo} from '../centre.mjs';
import {createGame,COURSES,advance,jump,timeToTarget,localToGate,JUMP_PREPARATION,JUMP_FLIGHT,BOUNDS} from '../engine.mjs';
test('Les deux profils suivent le déplacement vu par la caméra, y compris après rotation complète',()=>{
  for(const child of ['emmy','louane'])for(const camera of [0,.7,Math.PI/2,Math.PI,Math.PI*4+.3]){
    const left=characterView(camera+Math.PI/2,camera,child),right=characterView(camera-Math.PI/2,camera,child);
    assert.equal(left.direction,'left');assert.equal(left.row,2);assert.equal(left.flip,child==='emmy');assert.equal(right.direction,'right');assert.equal(right.row,3);assert.equal(right.flip,false);
    assert.equal(characterView(camera,camera,child).direction,'back');assert.equal(characterView(camera+Math.PI,camera,child).direction,'front');
  }
});
test('Les diagonales proches d’une limite ne font pas clignoter le profil',()=>{
  for(const angle of [Math.PI/4-.03,Math.PI/4+.03])assert.equal(characterView(angle,0,'louane','back').direction,'back');
  assert.equal(characterView(Math.PI/4+.2,0,'louane','back').direction,'left');
});
test('En liberté, les quatre sens et les arrêts gardent la bonne vue de la cavalière',()=>{
  for(const child of ['emmy','louane'])for(const [vx,vz,expected] of [[1,0,'right'],[-1,0,'left'],[0,1,'front'],[0,-1,'back']]){
    const v=flatCharacterView(vx,vz,child);assert.equal(v.direction,expected);assert.equal(flatCharacterView(0,0,child,v.direction).direction,expected);
  }
  assert.notEqual(flatCharacterView(1,1,'emmy','back').direction,'back');
});
test('Revenir à la cour annule les cibles et la pause et place réellement au milieu de la cour',()=>{
  const s=createCentre();s.status='paused';s.player.x=23;s.player.z=15;s.player.speed=6;s.target={x:-10,z:-8};s.path=[{x:5,z:5}];s.pending={id:'door:box0'};s.actionUntil=100;s.cameraYaw=9;
  placeInCourtyard(s);assert.equal(s.status,'playing');assert.equal(s.target,null);assert.deepEqual(s.path,[]);assert.equal(s.pending,null);assert.equal(s.player.speed,0);assert.equal(s.cameraYaw,0);assert.equal(centreLocation(s),'La cour du centre équestre');
  const old=s.player.z;advanceCentre(s,.1,{up:true});assert.ok(s.player.z<old);
});
test('La marche arrière inverse les pas sans inverser le visage ou tourner la cavalière',()=>{
  const s=createCentre();advanceCentre(s,.1,{up:true});const phase=s.player.gaitTravel;for(let i=0;i<15;i++)advanceCentre(s,.1,{down:true});assert.ok(s.player.gaitTravel<phase);assert.equal(s.player.heading,0);
});
test('Les points intermédiaires d’un trajet n’imposent pas un arrêt artificiel',()=>{
  const s=createCentre();s.player.x=0;s.player.z=10;s.player.speed=s.walkSpeed;s.target={x:0,z:9.95};s.path=[{x:0,z:3}];advanceCentre(s,.05);assert.ok(s.player.speed>s.walkSpeed*.98);assert.equal(s.target.z,3);
});
test('Le nourrissage garde une main stable puis retire la nourriture avant le départ',()=>{
  const mid=feedingAnimation(.5,6);assert.equal(mid.stage,'chew');assert.deepEqual(mid.childPose,feedingAnimation(.55,6.6).childPose);assert.equal(mid.walking,false);assert.ok(mid.food>0&&mid.food<1);assert.equal(feedingAnimation(.75,9).food,0);
  assert.equal(feedingAnimation(.12,1).flip,false);assert.equal(feedingAnimation(.9,11).flip,true);assert.equal(feedingAnimation(1,12).out,0);
});
test('Les mâchoires varient pendant que le poney mange ; les pas de retour continuent dans le bon ordre',()=>{
  const frames=new Set();let travel=-1;for(let i=0;i<=1200;i++){const t=i/1200,p=feedingAnimation(t,t*12);assert.ok(p.travel>=travel-1e-10);travel=p.travel;assert.ok(p.out>=0&&p.out<=1);if(t>.35&&t<.65)frames.add(p.horsePose.from);}
  assert.ok(frames.size>=3);assert.equal(travel,2);
});
test('Les parcours difficiles ont de grands virages sans croisement et des portes larges, avec les hauteurs conservées',()=>{
  for(const id of ['forest','stars','rainbow']){const g=createGame('gentle',id),p=[{x:0,z:40},...g.obstacles];assert.equal(g.obstacles.length,10);assert.ok(g.obstacles.every(o=>o.width>=4.5&&o.height>=COURSES[id].height&&o.height<=COURSES[id].maxHeight));
    for(let i=1;i<p.length;i++)assert.ok(Math.hypot(p[i].x-p[i-1].x,p[i].z-p[i-1].z)>=15);
    for(let i=1;i<p.length-1;i++){const a=Math.atan2(p[i].x-p[i-1].x,p[i].z-p[i-1].z),b=Math.atan2(p[i+1].x-p[i].x,p[i+1].z-p[i].z);assert.ok(Math.abs(Math.atan2(Math.sin(b-a),Math.cos(b-a)))<1.15,id);}
    const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);for(let i=0;i<p.length-1;i++)for(let j=i+2;j<p.length-1;j++)assert.ok(!(cross(p[i],p[i+1],p[j])*cross(p[i],p[i+1],p[j+1])<0&&cross(p[j],p[j+1],p[i])*cross(p[j],p[j+1],p[i+1])<0),'crossed '+id);
    assert.ok(g.obstacles.every(o=>o.x>BOUNDS.minX&&o.x<BOUNDS.maxX&&o.z>BOUNDS.minZ&&o.z<BOUNDS.maxZ));
  }
});
test('Les trois nouveaux tracés difficiles se terminent en pilotage manuel au pas, au trot et au galop',()=>{
  for(const id of ['forest','stars','rainbow'])for(const pace of ['gentle','trot','gallop']){
    const g=createGame(pace,id);for(let i=0;i<40000&&g.status==='playing';i++){const target=g.obstacles[g.next],delta=Math.atan2(-(target.x-g.x),-(target.z-g.z))-g.heading,angle=Math.atan2(Math.sin(delta),Math.cos(delta));
      if(timeToTarget(g)<JUMP_PREPARATION+JUMP_FLIGHT*.5&&Math.abs(localToGate(target,g.x,g.z).side)<3)jump(g);advance(g,1/120,{left:angle>.02,right:angle<-.02});
    }assert.equal(g.status,'finished',id+' '+pace);assert.equal(g.cleared,10,id+' '+pace);
  }
});
