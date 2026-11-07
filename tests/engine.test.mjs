import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, jump, advance, resetToTarget, localToGate, BOUNDS, COURSES, MAX_MISSES, jumpFrame, JUMP_DURATION, timeToTarget, JUMP_PREPARATION, JUMP_FLIGHT, JUMP_RECOVERY, jumpClearance } from '../engine.mjs';

function approach(game,index=game.next,distance=3,side=0){
  const gate=game.obstacles[index];
  game.x=gate.x+Math.sin(gate.yaw)*distance+Math.cos(gate.yaw)*side;
  game.z=gate.z+Math.cos(gate.yaw)*distance-Math.sin(gate.yaw)*side;
  game.heading=gate.yaw;game.speed=4.8;
}
function run(game,seconds,input={}){
  const events=[];for(let i=0;i<Math.ceil(seconds*120);i++)events.push(...advance(game,1/120,input));return events;
}
test('Les flèches tournent réellement dans la carrière, dans les deux sens',()=>{
  const left=createGame(),right=createGame();run(left,1,{left:true});run(right,1,{right:true});
  assert.ok(left.heading>0&&left.x<0);assert.ok(right.heading<0&&right.x>0);
  assert.ok(Math.abs(left.x+right.x)<.001);assert.ok(left.z<40&&right.z<40);
});
test('Accélérer, relâcher et freiner changent l’allure sans mouvement bloqué',()=>{
  const game=createGame();run(game,2.5,{up:true});assert.equal(game.speed,9);
  run(game,1);assert.equal(game.speed,4.8);
  run(game,1,{down:true});assert.equal(game.speed,0);
  const point={x:game.x,z:game.z};run(game,1,{down:true});assert.equal(game.x,point.x);assert.equal(game.z,point.z);
});
test('Un saut a une vraie hauteur, interdit le double saut et revient au sol',()=>{
  const game=createGame();assert.equal(jump(game),true);run(game,.35);
  assert.ok(game.height>.5);assert.equal(jump(game),false);run(game,1.7);
  assert.equal(game.height,0);assert.equal(game.velocity,0);assert.equal(jump(game),true);
});
test('Passer au sol compte une barrière touchée une fois, sans défaite',()=>{
  const game=createGame();approach(game);const events=run(game,1);
  assert.ok(events.includes('bump'));assert.equal(game.next,1);assert.equal(game.bumps,1);
  assert.equal(game.cleared,0);assert.equal(game.status,'playing');
  run(game,.5);assert.equal(game.bumps,1);
});
test('Un saut au-dessus du bon obstacle rapporte un saut réussi et trois étoiles',()=>{
  const game=createGame();approach(game);jump(game);
  const events=run(game,1);assert.ok(events.includes('clear'));
  assert.equal(game.cleared,1);assert.equal(game.stars,3);assert.equal(game.next,1);
});
test('Contourner le bon obstacle compte une erreur et Me replacer vise le suivant',()=>{
  const game=createGame();approach(game,0,3,6);jump(game);run(game,1.7);
  assert.equal(game.next,1);assert.equal(game.cleared,0);assert.equal(game.bumps,1);
  assert.equal(resetToTarget(game),true);assert.equal(game.speed,0);
  assert.ok(Math.abs(localToGate(game.obstacles[1],game.x,game.z).side)<.001);
  assert.ok(localToGate(game.obstacles[1],game.x,game.z).forward>10);
  approach(game);jump(game);run(game,1);assert.equal(game.next,2);
});
test('Les obstacles doivent être passés dans l’ordre et dans le bon sens',()=>{
  const game=createGame();approach(game,1);jump(game);run(game,1.7);assert.equal(game.next,0);
  approach(game,0,-3);game.heading+=Math.PI;jump(game);run(game,1.7);assert.equal(game.next,0);
});
test('La pause fige la position, le saut et le temps ; aucune action ne termine la pause',()=>{
  const game=createGame();jump(game);run(game,.1);game.status='paused';const snapshot=structuredClone(game);
  run(game,3,{up:true,left:true});assert.deepEqual(game,snapshot);
  assert.equal(jump(game),false);assert.equal(resetToTarget(game),false);
});
test('Les limites retiennent le poney dans la carrière et autorisent un retour au parcours',()=>{
  const game=createGame();game.x=BOUNDS.minX+.1;game.heading=Math.PI/2;
  const events=run(game,1,{up:true});assert.ok(events.includes('edge'));
  assert.ok(game.x>=BOUNDS.minX);assert.equal(resetToTarget(game),true);
  assert.ok(game.x>BOUNDS.minX);
});
test('Les neuf circuits se terminent avec les virages et sauts correctement placés',()=>{
  for(const [id,config] of Object.entries(COURSES)){
    const game=createGame('gentle',id);
    for(let i=0;i<24000&&game.status==='playing';i++){
      const gate=game.obstacles[game.next],dx=gate.x-game.x,dz=gate.z-game.z;
      const angle=Math.atan2(-dx,-dz)-game.heading,delta=Math.atan2(Math.sin(angle),Math.cos(angle));
      const local=localToGate(gate,game.x,game.z);
      if(timeToTarget(game)<JUMP_PREPARATION+JUMP_FLIGHT*.5&&Math.abs(local.side)<3)jump(game);
      advance(game,1/120,{left:delta>.02,right:delta<-.02});
    }
    assert.equal(game.status,'finished',id);assert.equal(game.cleared,config.count,id);assert.equal(game.stars,config.count*3,id);
    assert.equal(game.distance,game.finish);assert.equal(game.effort,1);
    const position={x:game.x,z:game.z};assert.deepEqual(advance(game,.1,{up:true}),[]);assert.equal(game.x,position.x);
  }
});
test('Un départ invalide retrouve un circuit connu et les grands délais restent bornés',()=>{
  const game=createGame('gentle','inconnu');assert.equal(game.course,'prairie');
  advance(game,100,{up:true});assert.ok(game.time<=.10001);assert.ok(game.traveled<1);
  const position={x:game.x,z:game.z};advance(game,-1);assert.equal(game.x,position.x);assert.equal(game.z,position.z);
});

test('Chaque thème contient exactement dix obstacles',()=>{
  for(const id of Object.keys(COURSES)){
    const game=createGame('gentle',id);assert.equal(game.obstacles.length,10);assert.equal(game.finish,10);
  }
});
test('Les neuf tracés proposent trois niveaux et des hauteurs réellement différentes',()=>{
  const counts={beginner:0,intermediate:0,hard:0},routes=new Set();
  for(const [id,config] of Object.entries(COURSES)){
    counts[config.level]++;const game=createGame('gentle',id);routes.add(JSON.stringify(game.obstacles.map(g=>[g.x,g.z])));
    assert.ok(game.obstacles.every(g=>g.height>=config.height-1e-8&&g.height<=config.maxHeight+1e-8));
    assert.ok(new Set(game.obstacles.map(g=>g.height)).size>1);
  }
  assert.deepEqual(counts,{beginner:3,intermediate:3,hard:3});assert.equal(routes.size,9);
});
test('Le décompte dure trois secondes et ne déplace jamais le poney avant le départ',()=>{
  const g=createGame('gentle','prairie',{countdown:true});assert.equal(g.status,'countdown');assert.equal(jump(g),false);assert.equal(resetToTarget(g),false);
  run(g,2.9,{up:true,left:true});assert.equal(g.status,'countdown');assert.equal(g.x,0);assert.equal(g.z,40);assert.equal(g.heading,0);assert.equal(g.speed,0);
  const events=run(g,.1);assert.equal(g.status,'playing');assert.equal(g.z,40);assert.equal(events.filter(e=>e==='start').length,1);
  advance(g,.1,{up:true});assert.ok(g.z<40);
});
test('Mettre le décompte en pause conserve exactement le temps restant',()=>{
  const g=createGame('gentle','prairie',{countdown:true});run(g,.7);g.status='paused';const snapshot=structuredClone(g);run(g,5);assert.deepEqual(g,snapshot);
  g.status='countdown';run(g,2.3);assert.equal(g.status,'playing');assert.equal(g.x,0);assert.equal(g.z,40);
});
test('La troisième erreur perd immédiatement la partie et fige toutes les commandes',()=>{
  const game=createGame();
  for(let i=0;i<MAX_MISSES;i++){
    approach(game);const events=run(game,1);
    assert.equal(game.bumps,i+1);assert.equal(game.status,i===2?'lost':'playing');
    assert.equal(events.includes('lose'),i===2);
  }
  assert.equal(game.next,3);assert.equal(game.cleared,0);
  const snapshot=structuredClone(game);
  assert.equal(jump(game),false);assert.equal(resetToTarget(game),false);
  assert.deepEqual(advance(game,1,{up:true,right:true}),[]);assert.deepEqual(game,snapshot);
});
test('La troisième erreur au dixième obstacle reste une défaite',()=>{
  const game=createGame();game.next=9;game.distance=9;game.cleared=7;game.bumps=2;
  approach(game);const events=run(game,1);
  assert.equal(game.next,10);assert.equal(game.status,'lost');assert.ok(events.includes('lose'));assert.ok(!events.includes('finish'));
});
test('Terminer les dix obstacles avec deux erreurs donne une victoire',()=>{
  const game=createGame();
  for(let i=0;i<10;i++){
    approach(game);if(i>1)jump(game);
    run(game,1.7);
  }
  assert.equal(game.status,'finished');assert.equal(game.bumps,2);assert.equal(game.cleared,8);assert.equal(game.stars,24);
});

test('Le saut commence par une impulsion au sol sans double saut pendant la préparation',()=>{
  const game=createGame();jump(game);advance(game,.06);
  assert.equal(game.height,0);assert.equal(jumpFrame(game),0);assert.equal(jump(game),false);
  run(game,.25);assert.ok(game.height>0);assert.ok(jumpFrame(game)>=2);
});
test('Les huit poses du saut passent dans l’ordre et la réception revient au galop',()=>{
  const game=createGame();jump(game);const seen=new Set([jumpFrame(game)]);
  let lastFrame=0,maxHeight=0;
  for(let i=0;i<Math.ceil(JUMP_DURATION*120)+5;i++){
    advance(game,1/120,{down:true});maxHeight=Math.max(maxHeight,game.height);
    const phase=jumpFrame(game);
    if(phase>=0){assert.ok(phase>=lastFrame);lastFrame=phase;seen.add(phase);}
  }
  assert.deepEqual([...seen],[0,1,2,3,4,5,6,7]);assert.ok(maxHeight>.85&&maxHeight<1.15);
  assert.equal(game.height,0);assert.equal(game.jumpActive,false);assert.equal(jumpFrame(game),-1);
  assert.equal(jump(game),true);
});
test('La pause conserve la pose du saut et Me replacer annule le saut',()=>{
  const game=createGame();jump(game);run(game,.55);const pose=jumpFrame(game),time=game.jumpTime;
  game.status='paused';run(game,2);assert.equal(jumpFrame(game),pose);assert.equal(game.jumpTime,time);
  game.status='playing';resetToTarget(game);assert.equal(jumpFrame(game),-1);assert.equal(game.height,0);
});
test('Le conseil de saut tient compte de la vitesse et du sens d’approche',()=>{
  const game=createGame();approach(game,0,6);
  const slower=timeToTarget(game);game.speed=9;assert.ok(timeToTarget(game)<slower);
  game.heading+=Math.PI;assert.equal(timeToTarget(game),Infinity);
  game.heading-=Math.PI;game.speed=0;assert.equal(timeToTarget(game),Infinity);
  game.next=game.finish;assert.equal(timeToTarget(game),Infinity);
});
test('Les antérieurs repliés passent la barre sans faire flotter tout le corps plus haut',()=>{
  const folded=createGame('gentle','forest');folded.obstacles[0].height=1.3;approach(folded,0,.01);
  folded.height=.85;folded.jumpActive=true;folded.jumpTime=JUMP_PREPARATION+JUMP_FLIGHT*.4;
  assert.ok(jumpClearance(folded)>1.3);advance(folded,.01);assert.equal(folded.cleared,1);
  const extended=createGame('gentle','forest');extended.obstacles[0].height=1.3;approach(extended,0,.01);
  extended.height=.85;extended.jumpActive=true;extended.jumpTime=JUMP_PREPARATION+JUMP_FLIGHT+JUMP_RECOVERY*.1;
  assert.ok(jumpClearance(extended)<1.3);advance(extended,.01);assert.equal(extended.bumps,1);
});
