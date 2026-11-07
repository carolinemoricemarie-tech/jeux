import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_DURATION, actionPose } from '../stable-motion.mjs';
import { createStable, restoreStable } from '../stable.mjs';

test('Les gestes ralentissent sans saut de pose ni retour brusque en fin de soin',()=>{
  assert.ok(ACTION_DURATION.brush>=6000);
  for(const action of Object.keys(ACTION_DURATION)){
    let previous=actionPose(action,0),maxStep=0;
    for(let n=1;n<=1000;n++){
      const pose=actionPose(action,n/1000);
      const position=p=>p.from+(p.to-p.from)*p.mix;
      maxStep=Math.max(maxStep,Math.abs(position(pose)-position(previous)));previous=pose;
      assert.ok(pose.mix>=0&&pose.mix<=1);
    }
    assert.ok(maxStep<.02,action+' a changé brutalement de pose');
    assert.equal(previous.to,action==='rest'?0:3);
  }
});
test('Réduire les animations garde une pose stable',()=>{
  for(const progress of [0,.2,.7,1])assert.deepEqual(actionPose('brush',progress,true),{from:3,to:3,mix:0});
});
test('Le personnage est sauvegardé et une ancienne sauvegarde garde ses poneys',()=>{
  const original=createStable();original.character='louane';original.ponies.nuage.food=91;
  const restored=restoreStable(JSON.stringify(original));assert.equal(restored.character,'louane');assert.equal(restored.ponies.nuage.food,91);
  delete original.character;assert.equal(restoreStable(JSON.stringify(original)).character,'emmy');
  original.character='__proto__';assert.equal(restoreStable(JSON.stringify(original)).character,'emmy');
});
