import test from 'node:test';
import assert from 'node:assert/strict';
import { damp,walkingPose,idlePose,jumpPose,facingDirection,advanceLanding,detailPose } from '../animation.mjs';
import { JUMP_DURATION } from '../engine.mjs';
import { createPaddock,advancePaddock } from '../paddock.mjs';
test('L’amortissement donne le même résultat à 30, 60 et 120 images par seconde',()=>{
  const values=[30,60,120].map(fps=>{let value=0;for(let i=0;i<fps;i++)value=damp(value,1,8,1/fps);return value;});
  for(const value of values)assert.ok(Math.abs(value-values[0])<1e-12);
  assert.equal(damp(.4,1,8,0),.4);
});
test('La marche suit la distance réelle et s’arrête contre la clôture',()=>{
  const s=createPaddock({age:5});for(let i=0;i<60;i++)advancePaddock(s,1/60,{right:true});
  assert.ok(s.player.travel>.8);const before=walkingPose(s.player.travel,5);
  for(let i=0;i<600;i++)advancePaddock(s,1/60,{right:true});
  const stopped=s.player.travel;
  for(let i=0;i<60;i++)advancePaddock(s,1/60,{right:true});
  assert.equal(s.player.travel,stopped);assert.notDeepEqual(walkingPose(stopped,5),before);
  s.status='paused';const snapshot=structuredClone(s);advancePaddock(s,.1,{left:true});assert.deepEqual(s,snapshot);
});
test('Le saut interpole les huit poses dans l’ordre sans cassure',()=>{
  let previous=0;
  for(let i=0;i<=2000;i++){
    const p=jumpPose(JUMP_DURATION*i/2000),position=p.from+(p.to-p.from)*p.mix;
    assert.ok(position>=previous-1e-10);assert.ok(position-previous<.03);previous=position;
  }
  assert.equal(previous,7);
});
test('Le clignement reste bref et les animations de repos bouclent sans saut',()=>{
  for(const stable of [false,true]){
    assert.deepEqual(idlePose(0,stable),idlePose(8,stable));
    const blink=stable?4:10;
    let closed=0;
    for(let i=0;i<8000;i++){const p=idlePose(i/1000,stable);if((p.from===blink&&p.mix<.5)||(p.to===blink&&p.mix>.5))closed++;}
    assert.ok(closed>=50&&closed<130);
  }
});
test('Le poney conserve son orientation à l’arrêt et ne tremble pas autour d’une diagonale',()=>{
  assert.equal(facingDirection(1,0,3),0);assert.equal(facingDirection(-1,0,3),2);
  assert.equal(facingDirection(0,-1,0),1);assert.equal(facingDirection(0,1,0),3);
  assert.equal(facingDirection(0,0,1),1);
  for(const x of [.98,1,1.02])assert.equal(facingDirection(x,1,0),0);
});
test('La réception termine la trajectoire du saut après la fin d’un parcours',()=>{
  const landing={height:.8,velocity:1,time:.4};advanceLanding(landing,0);assert.equal(landing.height,.8);
  advanceLanding(landing,1/60);assert.ok(landing.height>.8);
  for(let i=0;i<60;i++)advanceLanding(landing,1/60);
  assert.equal(landing.height,0);assert.equal(landing.velocity,0);assert.ok(landing.time>JUMP_DURATION);
});
test('Les silhouettes photographiques restent nettes entre les transitions courtes',()=>{
  assert.equal(detailPose({from:2,to:3,mix:.8}).mix,0);
  const middle=detailPose({from:2,to:3,mix:.92});assert.ok(Math.abs(middle.mix-.5)<1e-12);
  assert.equal(detailPose({from:2,to:3,mix:1}).mix,1);
});
