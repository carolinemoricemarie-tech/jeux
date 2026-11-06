import test from 'node:test';
import assert from 'node:assert/strict';
import { createStable, restoreStable, care, mood, rideReadiness, settleRide, NEEDS, fitTack, tackReadiness, removeTack } from '../stable.mjs';
import { createGame } from '../engine.mjs';

test('Chaque poney a ses propres besoins et les soins améliorent son humeur', () => {
  const stable = createStable();
  const pony = stable.ponies.noisette;
  const before = structuredClone(stable.ponies.nuage);
  assert.equal(mood(pony).label, 'Tout tranquille');
  for (const action of ['hay', 'carrot', 'brush', 'brush', 'rest', 'pet']) care(pony, action);
  assert.equal(mood(pony).label, 'Au comble du bonheur');
  assert.deepEqual(stable.ponies.nuage, before);
});

test('Chaque soin agit sur les besoins attendus et les jauges restent bornées', () => {
  const pony = { food: 0, clean: 0, energy: 0, bond: 0 };
  care(pony, 'hay'); assert.equal(pony.food, 28);
  care(pony, 'brush'); assert.equal(pony.clean, 24);
  care(pony, 'rest'); assert.equal(pony.energy, 35);
  care(pony, 'carrot'); assert.equal(pony.food, 37);
  care(pony, 'pet'); assert.equal(pony.bond, 37);
  const snapshot = structuredClone(pony);
  assert.equal(care(pony, '__proto__'), false);
  assert.deepEqual(pony, snapshot);
  for (let i = 0; i < 100; i++) for (const action of ['rest', 'hay', 'brush', 'pet']) care(pony, action);
  for (const need of NEEDS) assert.ok(pony[need] >= 0 && pony[need] <= 100);
});

test('Les besoins indiquent le soin nécessaire avant de monter', () => {
  const pony = { food: 10, clean: 10, energy: 10, bond: 50 };
  assert.match(mood(pony).label, /fatigué/); assert.match(rideReadiness(pony), /repos/);
  care(pony, 'rest'); assert.match(rideReadiness(pony), /foin/);
  care(pony, 'hay'); assert.match(rideReadiness(pony), /Brosse/);
  care(pony, 'brush'); assert.equal(rideReadiness(pony), '');
});

test('Un parcours coûte de l’énergie et de la propreté une seule fois, et conserve le record', () => {
  const stable = createStable(), pony = stable.ponies.noisette;
  const game = createGame('gentle', 'prairie');
  game.distance = game.finish;game.status = 'finished';game.cleared = 7;game.stars = 18;
  assert.equal(settleRide(stable, 'noisette', game), true);
  assert.equal(pony.energy, 53);assert.equal(pony.clean, 16);assert.equal(pony.food, 38);
  assert.equal(stable.rides, 1);assert.equal(stable.stars, 18);
  assert.equal(settleRide(stable, 'noisette', game), false);
  assert.equal(stable.rides, 1);assert.equal(pony.energy, 53);
  const other = createGame('gentle', 'prairie');other.status = 'finished';other.distance = other.finish;other.cleared = 2;
  settleRide(stable, 'noisette', other);
  assert.deepEqual(stable.records.prairie, { clear: 7, stars: 18 });
});

test('Un retour anticipé compte seulement l’effort accompli, sans ruban ni record', () => {
  const stable = createStable(), game = createGame('gentle', 'garden');
  game.distance = game.finish / 2;
  settleRide(stable, 'caramel', game);
  assert.equal(stable.ponies.caramel.energy, 65.5);
  assert.equal(stable.ponies.noisette.energy, 78);
  assert.equal(stable.rides, 0);assert.deepEqual(stable.records, {});
});

test('La sauvegarde restaure les poneys et records sans dégradation pendant l’absence', () => {
  const stable = createStable();stable.chosen = 'nuage';care(stable.ponies.nuage, 'brush');
  stable.records.garden = { clear: 8, stars: 19 };
  assert.deepEqual(restoreStable(JSON.stringify(stable)), stable);
  assert.deepEqual(restoreStable('du texte abîmé'), createStable());
  const corrupted = JSON.stringify({ version: 1, chosen: 'inconnu', ponies: { noisette: { food: -80, energy: 500, clean: 'a' } }, rides: -5, records: { garden: { clear: -3, stars: 1 } } });
  const restored = restoreStable(corrupted);
  assert.equal(restored.chosen, 'noisette');assert.equal(restored.ponies.noisette.food, 0);
  assert.equal(restored.ponies.noisette.energy, 100);assert.equal(restored.ponies.noisette.clean, 44);
  assert.deepEqual(restored.records, {});assert.equal(restored.rides, 0);
});


test('Une partie perdue consomme l’effort sans attribuer de victoire ni de record',()=>{
  const stable=createStable(),game=createGame();game.status='lost';game.next=3;game.distance=3;game.bumps=3;
  settleRide(stable,'noisette',game);
  assert.ok(stable.ponies.noisette.energy<78);assert.equal(stable.rides,0);assert.equal(stable.stars,0);assert.deepEqual(stable.records,{});
});
test('Le nouveau défi conserve les besoins et totaux, avec des records distincts de l’ancien mode',()=>{
  const stable=createStable();stable.ponies.nuage.food=92;stable.stars=27;stable.challengeVersion=2;stable.records.prairie={clear:8,stars:24};
  const restored=restoreStable(JSON.stringify(stable));assert.equal(restored.ponies.nuage.food,92);assert.equal(restored.stars,27);assert.deepEqual(restored.records,{});assert.equal(restored.challengeVersion,3);
});

test('Le tapis, la selle et le filet se posent dans cet ordre',()=>{
  const pony=createStable().ponies.noisette;
  assert.match(tackReadiness(pony),/tapis/);
  assert.equal(fitTack(pony,'saddle').ok,false);assert.equal(pony.tack.saddle,false);
  assert.equal(fitTack(pony,'bridle').ok,false);
  assert.equal(fitTack(pony,'pad').ok,true);assert.match(tackReadiness(pony),/selle/);
  assert.equal(fitTack(pony,'bridle').ok,false);
  assert.equal(fitTack(pony,'saddle').ok,true);assert.match(tackReadiness(pony),/filet/);
  assert.equal(fitTack(pony,'bridle').ok,true);assert.equal(tackReadiness(pony),'');
  assert.equal(fitTack(pony,'bridle').ok,false);
  assert.equal(fitTack(pony,'__proto__').ok,false);
});
test('L’équipement est propre à chaque poney et sauvegardé avec lui',()=>{
  const stable=createStable();for(const item of ['pad','saddle','bridle'])fitTack(stable.ponies.noisette,item);
  assert.equal(stable.ponies.nuage.tack.pad,false);assert.equal(stable.ponies.caramel.tack.pad,false);
  const restored=restoreStable(JSON.stringify(stable));assert.deepEqual(restored,stable);
  assert.equal(tackReadiness(restored.ponies.noisette),'');
});
test('Retirer le matériel pour un soin conserve les besoins et permet de rééquiper',()=>{
  const pony=createStable().ponies.noisette;for(const item of ['pad','saddle','bridle'])fitTack(pony,item);
  const food=pony.food;assert.equal(removeTack(pony),true);assert.equal(pony.food,food);
  assert.deepEqual(pony.tack,{pad:false,saddle:false,bridle:false});assert.match(tackReadiness(pony),/tapis/);
  assert.equal(removeTack(pony),false);assert.equal(fitTack(pony,'pad').ok,true);
});
test('Les anciennes sauvegardes et équipements incohérents restent utilisables',()=>{
  const legacy=createStable();delete legacy.ponies.noisette.tack;legacy.ponies.noisette.food=89;
  legacy.ponies.nuage.tack={pad:false,saddle:true,bridle:true};
  const restored=restoreStable(JSON.stringify(legacy));assert.equal(restored.ponies.noisette.food,89);
  assert.deepEqual(restored.ponies.noisette.tack,{pad:false,saddle:false,bridle:false});
  assert.deepEqual(restored.ponies.nuage.tack,{pad:false,saddle:false,bridle:false});
});
