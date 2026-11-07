import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance,jump,COURSES,PACES,timeToTarget,JUMP_PREPARATION,JUMP_FLIGHT,localToGate} from '../engine.mjs';
import {createTrail,TRAILS} from '../trails.mjs';
import {createPaddock,paddockCommand,advancePaddock} from '../paddock.mjs';
import {visitPortal,advanceEstate,ZONES} from '../estate.mjs';
import {createStable,restoreStable,care,fitTack,prepareForRide,settleRide} from '../stable.mjs';
import {PONIES,coatPixel,childProtection} from '../ponies.mjs';

function runToEnd(g,{jumps=false,input={}}={}){
  for(let i=0;i<40000&&g.status==='playing';i++){
    if(jumps&&timeToTarget(g)<JUMP_PREPARATION+JUMP_FLIGHT*.5)jump(g);
    advance(g,1/120,input);
  }
  return g;
}
test('Emmy termine les trois parcours débutants à toutes les allures sans saut automatique ni élimination',()=>{
  for(const [id,c] of Object.entries(COURSES).filter(([,c])=>c.level==='beginner'))for(const pace of Object.keys(PACES)){
    const g=runToEnd(createGame(pace,id,{character:'emmy'}),{input:{left:true,up:true}});
    assert.equal(g.status,'finished',id+' '+pace);assert.equal(g.bumps,10);assert.equal(g.cleared,0);assert.equal(g.jumpActive,false);assert.equal(g.maxMisses,null);
  }
});
test('Les sauts commandés au bon moment franchissent les dix obstacles avec le guidage d’Emmy',()=>{
  for(const id of ['prairie','orchard','daisies'])for(const pace of Object.keys(PACES)){
    const g=runToEnd(createGame(pace,id,{character:'emmy'}),{jumps:true});assert.equal(g.status,'finished');assert.equal(g.cleared,10,id+' '+pace);
  }
});
test('Le guidage respecte le décompte et la pause ; aucun guidage pour Louane ou les niveaux suivants',()=>{
  const g=createGame('gallop','prairie',{character:'emmy',countdown:true}),start=structuredClone(g);
  for(let i=0;i<29;i++)advance(g,.1,{left:true});assert.equal(g.x,start.x);assert.equal(g.z,start.z);assert.equal(g.guidanceDistance,0);assert.equal(jump(g),false);
  g.status='paused';const paused=structuredClone(g);advance(g,.1,{up:true});assert.deepEqual(g,paused);
  for(const [id,c] of Object.entries(COURSES)){
    assert.equal(createGame('gentle',id,{character:'emmy'}).autoSteer,c.level==='beginner');
    for(const role of ['emmy','louane']){
      const ride=createGame('gentle',id,{character:role});ride.autoSteer=false;
      for(let n=0;n<4&&ride.status==='playing';n++){
        const gate=ride.obstacles[ride.next];ride.x=gate.x+Math.sin(gate.yaw)*.15;ride.z=gate.z+Math.cos(gate.yaw)*.15;ride.heading=gate.yaw;ride.speed=4.8;advance(ride,.1);
      }
      assert.equal(ride.status,role==='emmy'?'playing':'lost',role+' '+id);assert.equal(ride.bumps,role==='emmy'?4:3);
    }
  }
});
test('Les trois balades se terminent pour les deux enfants aux trois allures, sans obstacles',()=>{
  for(const id of Object.keys(TRAILS))for(const character of ['emmy','louane'])for(const pace of Object.keys(PACES)){
    const g=runToEnd(createTrail(id,pace,{character}));assert.equal(g.status,'finished',id+' '+character+' '+pace);assert.equal(g.nextWaypoint,g.waypoints.length);assert.equal(g.obstacles.length,0);assert.equal(g.bumps,0);
  }
  const manual=createTrail('seaside','gallop',{guided:false});const heading=manual.heading;advance(manual,.1,{left:true});assert.ok(manual.heading>heading);manual.status='paused';const copy=structuredClone(manual);advance(manual,.1);assert.deepEqual(manual,copy);
});
test('Le galop accélère le poney en liberté et en longe ; l’arrêt et la pause restent effectifs',()=>{
  function simulate(mode,gait){const s=createPaddock();if(mode==='lunge')paddockCommand(s,mode);paddockCommand(s,gait);for(let i=0;i<1200;i++)advancePaddock(s,1/120);return s;}
  for(const mode of ['free','lunge']){
    const fast=simulate(mode,'gallop'),slow=simulate(mode,'trot');assert.ok(fast.horse.travel>slow.horse.travel*1.25,mode);
    paddockCommand(fast,'stop');for(let i=0;i<240;i++)advancePaddock(fast,1/120);assert.ok(fast.horse.speed<.001);
    fast.status='paused';const copy=structuredClone(fast);advancePaddock(fast,.1,{right:true});assert.deepEqual(fast,copy);
  }
});
test('La cavalière marche de l’enclos à la cour, puis aux écuries et dans chacun des trois boxes',()=>{
  for(const pony of Object.keys(PONIES)){
    const s=createPaddock({age:5});let box;
    for(const id of ['yard','barn',pony]){
      assert.equal(visitPortal(s,id),true);const before={...s.player};advanceEstate(s,.05);assert.ok(Math.hypot(s.player.x-before.x,s.player.z-before.z)<.1);
      for(let i=0;i<3000;i++){
        const events=advanceEstate(s,1/120);box=events.find(e=>e?.type==='box')||box;
        if((id==='yard'&&s.zone==='yard')||(id==='barn'&&s.zone==='barn')||box)break;
      }
      if(id!==pony)assert.equal(s.zone,id);else assert.equal(box.pony,pony);
    }
    s.status='paused';const paused=structuredClone(s);advanceEstate(s,.1);assert.deepEqual(s,paused);
    assert.ok(s.player.x>=ZONES.barn.bounds.minX&&s.player.x<=ZONES.barn.bounds.maxX);
  }
});
test('Le repos persiste, les soins et la selle réveillent ; les sauvegardes Caramel migrent sans perdre les besoins',()=>{
  const s=createStable();care(s.ponies.etoile,'rest');assert.equal(restoreStable(JSON.stringify(s)).ponies.etoile.resting,true);
  care(s.ponies.etoile,'brush');assert.equal(s.ponies.etoile.resting,false);care(s.ponies.etoile,'rest');fitTack(s.ponies.etoile,'pad');assert.equal(s.ponies.etoile.resting,false);
  care(s.ponies.etoile,'rest');prepareForRide(s.ponies.etoile);assert.equal(s.ponies.etoile.resting,false);
  const old=createStable();old.chosen='caramel';old.ponies.caramel={...old.ponies.etoile,food:93};delete old.ponies.etoile;
  const restored=restoreStable(JSON.stringify(old));assert.equal(restored.chosen,'etoile');assert.equal(restored.ponies.etoile.food,93);assert.equal(Object.keys(restored.ponies).length,3);
});
test('Les balades ne créent pas de record de saut et les records d’Emmy et Louane restent séparés',()=>{
  const s=createStable(),trail=runToEnd(createTrail());settleRide(s,'etoile',trail);assert.equal(s.walks,1);assert.equal(s.rides,0);assert.deepEqual(s.records,{});assert.equal(settleRide(s,'etoile',trail),false);
  for(const character of ['emmy','louane']){const g=createGame('gentle','prairie',{character});g.status='finished';g.cleared=character==='emmy'?10:8;g.distance=10;settleRide(s,'noisette',g);}
  assert.equal(s.records['emmy:prairie'].clear,10);assert.equal(s.records['louane:prairie'].clear,8);assert.deepEqual(restoreStable(JSON.stringify(s)).records,s.records);
});
test('Les robes sont distinctes et la recoloration conserve la peau et les habits des enfants',()=>{
  const brown=[145,78,37];assert.notDeepEqual(coatPixel(...brown,'white'),brown);assert.notDeepEqual(coatPixel(...brown,'unicorn'),coatPixel(...brown,'white'));
  for(const character of ['emmy','louane']){
    const pixels=new Uint8Array(200*200*4),paint=(x,y,color)=>pixels.set([...color,255],(y*200+x)*4);
    for(let y=0;y<200;y++)for(let x=0;x<200;x++)paint(x,y,brown);
    for(let y=33;y<65;y++)for(let x=34;x<51;x++)paint(x,y,character==='emmy'?[130,150,128]:[170,140,175]);
    for(let y=65;y<96;y++)for(let x=37;x<51;x++)paint(x,y,[185,160,135]);
    for(let y=18;y<29;y++)for(let x=39;x<52;x++)paint(x,y,[220,177,150]);
    const protection=childProtection(pixels,200,200,2,character);
    assert.equal(protection[23*200+45],1);assert.equal(protection[45*200+42],1);assert.equal(protection[80*200+44],1);assert.equal(protection[45*200+85],0);assert.equal(protection[45*200+54],0);
  }
});
