import test from 'node:test';
import assert from 'node:assert/strict';
import { rearChaseCamera } from '../course-camera.mjs';
import { createGame, advance } from '../engine.mjs';
test('La caméra reste derrière le cheval et regarde dans son sens pour toutes les orientations',()=>{
  for(let heading=-Math.PI;heading<=Math.PI;heading+=.025){
    const state={x:14,z:-9,heading},view=rearChaseCamera(state,.8);
    const forward={x:-Math.sin(heading),z:-Math.cos(heading)};
    const behind={x:view.position.x-state.x,z:view.position.z-state.z};
    assert.ok(behind.x*forward.x+behind.z*forward.z<0);
    assert.ok(Math.abs(behind.x*forward.z-behind.z*forward.x)<1e-12);
    const ahead={x:view.target.x-state.x,z:view.target.z-state.z};
    assert.ok(ahead.x*forward.x+ahead.z*forward.z>0);
    assert.ok(Math.abs(Math.hypot(behind.x,behind.z)-7.8)<1e-12);
  }
});
test('Un virage et le passage de pi à moins pi gardent une caméra continue',()=>{
  const game=createGame();game.heading=3.13;let previous=rearChaseCamera(game);
  for(let i=0;i<100;i++){
    advance(game,1/60,{left:true,up:true});const next=rearChaseCamera(game,game.height);
    assert.ok(Math.hypot(next.position.x-previous.position.x,next.position.z-previous.position.z)<.3);
    previous=next;
  }
});
