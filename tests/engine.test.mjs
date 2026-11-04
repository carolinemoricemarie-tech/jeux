import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, jump, FINISH, HORSE_X } from '../engine.mjs';

test('Un saut revient au sol et ne permet pas de double saut',()=>{
  const game=createGame();
  assert.equal(jump(game),true);
  advance(game,.1);
  assert.ok(game.height>0);
  assert.equal(jump(game),false);
  for(let i=0;i<120;i++)advance(game,1/120);
  assert.equal(game.height,0);
  assert.equal(game.velocity,0);
  assert.equal(jump(game),true);
});

test('Une barrière touchée ne termine pas la partie et ne compte qu’une fois',()=>{
  const game=createGame();
  game.distance=game.obstacles[0].x-HORSE_X-35;
  assert.ok(advance(game,.1).includes('bump'));
  for(let i=0;i<5;i++)advance(game,.1);
  assert.equal(game.bumps,1);
  assert.equal(game.status,'playing');
});

test('Un saut bien placé permet de passer une barrière',()=>{
  const game=createGame();
  game.distance=game.obstacles[0].x-HORSE_X-110;
  jump(game);
  for(let i=0;i<100;i++)advance(game,1/120);
  assert.equal(game.bumps,0);
  assert.ok(game.distance>game.obstacles[0].x-HORSE_X+48);
});

test('Une étoile se ramasse une seule fois à la bonne hauteur',()=>{
  const game=createGame();
  game.collectibles=[{x:HORSE_X,height:60,collected:false},{x:HORSE_X,height:200,collected:false}];
  assert.deepEqual(advance(game,.01),['star']);
  advance(game,.01);
  assert.equal(game.stars,1);
  assert.equal(game.collectibles[1].collected,false);
});

test('Pause, arrivée et nouvelle partie ont des états indépendants',()=>{
  const game=createGame();game.status='paused';
  assert.equal(jump(game),false);advance(game,.1);assert.equal(game.distance,0);
  game.status='playing';game.distance=FINISH-1;
  assert.ok(advance(game,.1).includes('finish'));
  assert.equal(game.status,'finished');assert.equal(game.distance,FINISH);
  assert.deepEqual(advance(game,.1),[]);
  const next=createGame('trot');
  assert.equal(next.stars,0);assert.equal(next.distance,0);assert.ok(next.speed>game.speed);
});

test('Une balade complète finit même sans sauter',()=>{
  const game=createGame();
  for(let i=0;i<4000&&game.status==='playing';i++)advance(game,1/60);
  assert.equal(game.status,'finished');assert.equal(game.bumps,13);assert.ok(game.stars>0);
});
