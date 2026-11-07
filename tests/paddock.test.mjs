import test from 'node:test';
import assert from 'node:assert/strict';
import {createPaddock,paddockCommand,advancePaddock,targetPlayer,LUNGE_RADIUS,PADDOCK_BOUNDS} from '../paddock.mjs';
const run=(s,seconds,input={})=>{const events=[];for(let i=0;i<seconds*60;i++)events.push(...advancePaddock(s,1/60,input));return events;};

test('La marche est progressive, diagonale bornée et adaptée aux deux âges',()=>{
  const small=createPaddock({age:5}),big=createPaddock({age:8});
  run(small,1,{right:true});run(big,1,{right:true});assert.ok(big.player.x>small.player.x);assert.ok(small.player.x>.5);
  assert.ok(small.player.speed<=small.walkSpeed+.001);
  run(small,100,{right:true,down:true});assert.ok(small.player.x<=PADDOCK_BOUNDS.maxX);assert.ok(small.player.z<=PADDOCK_BOUNDS.maxZ);
  run(small,1);assert.ok(small.player.speed<.005);
});
test('Le poney vient et rapporte le ballon une seule fois par lancer',()=>{
  const s=createPaddock();paddockCommand(s,'call');run(s,5);assert.ok(Math.hypot(s.player.x-s.horse.x,s.player.z-s.horse.z)<1.65);
  assert.equal(paddockCommand(s,'ball'),true);assert.equal(paddockCommand(s,'ball'),false);
  const events=run(s,20);assert.equal(s.games,1);assert.equal(s.ball,null);assert.equal(events.filter(e=>e==='ball-return').length,1);
  run(s,10);assert.equal(s.games,1);
});
test('La longe garde un cercle, permet arrêt et changement de main, et récompense trois tours',()=>{
  const s=createPaddock();paddockCommand(s,'lunge');paddockCommand(s,'trot');const events=run(s,50);
  assert.equal(s.stage,'circle');assert.ok(s.laps>=3);assert.equal(events.filter(e=>e==='training-complete').length,1);
  assert.ok(Math.abs(Math.hypot(s.horse.x,s.horse.z)-LUNGE_RADIUS)<.15);
  paddockCommand(s,'stop');run(s,2);const position={x:s.horse.x,z:s.horse.z};run(s,2);assert.ok(Math.hypot(s.horse.x-position.x,s.horse.z-position.z)<.01);
  const angle=s.angle;paddockCommand(s,'reverse');paddockCommand(s,'walk');run(s,2);assert.ok(s.angle<angle);
  assert.equal(run(s,50).filter(e=>e==='training-complete').length,0);
});
test('La pause fige l’enclos et le clic ne déplace pas la cavalière en longe',()=>{
  const s=createPaddock();targetPlayer(s,200,-200);run(s,2);assert.ok(s.player.z>=PADDOCK_BOUNDS.minZ);
  s.status='paused';const snapshot=structuredClone(s);assert.deepEqual(run(s,3,{up:true}),[]);assert.deepEqual(s,snapshot);
  s.status='playing';paddockCommand(s,'lunge');assert.equal(targetPlayer(s,5,5),false);assert.equal(paddockCommand(s,'ball'),false);
});
