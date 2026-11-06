import { StableRoom } from './stable-room.mjs';
import { createPhotoWorld } from './scene3d.mjs';
import { createGame, jump, advance, COURSES, BOUNDS, MAX_MISSES, resetToTarget, timeToTarget, JUMP_PREPARATION, JUMP_FLIGHT } from './engine.mjs';
import { SAVE_KEY, NEEDS, restoreStable, care, mood, rideReadiness, settleRide, tackReadiness, fitTack, removeTack, TACK_ORDER } from './stable.mjs';

const $ = id => document.getElementById(id);
const canvas = $('game');
const heldKeys=new Set(),touchKeys=new Set();
const releaseInputs=()=>{heldKeys.clear();touchKeys.clear();document.querySelectorAll('[data-input]').forEach(b=>b.classList.remove('held'));};
const inputState=()=>Object.fromEntries(['left','right','up','down'].map(key=>[key,heldKeys.has(key)||touchKeys.has(key)]));
const ponies = {
  noisette: { name: 'Noisette', coat: '#ad704b', light: '#c18c64', mane: '#654231', saddle: '#d8918d' },
  nuage: { name: 'Nuage', coat: '#e4e3d9', light: '#f8f5e8', mane: '#9eacb7', saddle: '#b5a1ca' },
  caramel: { name: 'Caramel', coat: '#d6a252', light: '#e9bd70', mane: '#f5df9f', saddle: '#7da5a0' }
};
let saved;
try { saved = localStorage.getItem(SAVE_KEY); } catch { /* The game also works without storage. */ }
const stable = restoreStable(saved);
let chosen = stable.chosen, pace = 'gentle', course = 'prairie', view = 'stable';
let game = null, clock = 0, last = 0, effect = null, toastUntil = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ponyState = () => stable.ponies[chosen];

let world,room,lastBusy=null;
$('mount').disabled=true;$('course-tab').disabled=true;
createPhotoWorld(canvas,{reducedMotion,onLost:()=>{if(game?.status==='playing')pause();$('webgl-error').hidden=false;}})
.then(instance=>{world=instance;room=new StableRoom($('stable-room'),world.photos);for(const portrait of document.querySelectorAll('.portrait')){portrait.textContent='';const image=new Image();image.src=world.photos.stable.src;image.alt='';portrait.append(image);}$('asset-loading').hidden=true;$('mount').disabled=false;$('course-tab').disabled=false;refreshStable();})
.catch(()=>{$('asset-loading').hidden=true;$('webgl-error').hidden=false;});

function save() {
  stable.chosen=chosen;
  try {localStorage.setItem(SAVE_KEY,JSON.stringify(stable));$('save-note').textContent='✓ Ton écurie est sauvegardée ici. Ton poney t’attend quand tu t’absentes.';}
  catch {$('save-note').textContent='Tu peux jouer ! La sauvegarde est indisponible dans ce navigateur.';}
}
function refreshStable() {
  const needs=ponyState(), feeling=mood(needs), name=ponies[chosen].name;
  for(const key of NEEDS){$(key).value=needs[key];$(key+'-value').textContent=Math.round(needs[key])+' %';}
  $('mood-icon').textContent=feeling.icon;$('mood-label').textContent=feeling.label;$('mood-hint').textContent=feeling.hint;
  document.querySelector('.nameplate').textContent=name.toUpperCase();
  $('collection').textContent=`🏵️ ${stable.rides} parcours · ★ ${stable.stars}`;
  $('readiness').textContent=rideReadiness(needs)||tackReadiness(needs)||'Tout est prêt. Clique sur Monter !';
  $('mount').classList.toggle('ready',!rideReadiness(needs)&&!tackReadiness(needs));
  const names={pad:'Tapis',saddle:'Selle',bridle:'Filet'};
  for(const key of TACK_ORDER){const fitted=!!needs.tack?.[key];$('tack-'+key).textContent=names[key]+(fitted?' ✓':' ○');$('tack-'+key).classList.toggle('done',fitted);document.querySelector('[data-tack="'+key+'"]').classList.toggle('fitted',fitted);}
  for(const button of document.querySelectorAll('[data-pony]')){
    const selected=button.dataset.pony===chosen;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',selected);
  }
  for(const [id,config] of Object.entries(COURSES)){
    const record=stable.records[id];$('record-'+id).textContent=record?`Record : ${record.clear}/${config.count} sauts · ★ ${record.stars}`:'À découvrir';
  }
  if(view==='stable')$('place-name').textContent='LE BOX DE '+name.toUpperCase();
}
function notify(message) {
  $('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+2200;
}
function updateNavigation(){
  const state=game||createGame(pace,course),target=state.obstacles[state.next];
  if(game?.status==='lost'){$('next-target').textContent='Partie perdue';$('direction-hint').textContent='Trois obstacles manqués';}
  else if(target){
    const distance=Math.hypot(target.x-state.x,target.z-state.z);
    let angle=Math.atan2(-(target.x-state.x),-(target.z-state.z))-state.heading;
    angle=Math.atan2(Math.sin(angle),Math.cos(angle));
    $('next-target').textContent=`Obstacle ${state.next+1} / ${state.obstacles.length} · ${Math.round(distance)} m`;
    const timing=timeToTarget(state);
    $('direction-hint').textContent=Math.abs(angle)>2?'↶ Fais demi-tour':angle>.3?'↰ Tourne à gauche':angle<-.3?'↱ Tourne à droite':state.jumpActive?'Passe la barre en douceur':timing<JUMP_PREPARATION+JUMP_FLIGHT*.62?'↟ Saute maintenant !':distance<9?'Approche à ton rythme':'↑ Tout droit';
  }else{$('next-target').textContent='Parcours terminé !';$('direction-hint').textContent='Une belle équipe ♡';}
  const map=$('minimap'),c=map.getContext('2d');c.clearRect(0,0,map.width,map.height);
  c.fillStyle='#fffaf0e8';c.beginPath();c.roundRect(0,0,220,160,12);c.fill();
  const mx=x=>12+(x-BOUNDS.minX)/(BOUNDS.maxX-BOUNDS.minX)*196;
  const mz=z=>12+(z-BOUNDS.minZ)/(BOUNDS.maxZ-BOUNDS.minZ)*136;
  c.strokeStyle='#ddd5ba';c.lineWidth=1;c.strokeRect(10,10,200,140);
  c.beginPath();c.moveTo(mx(0),mz(40));for(const gate of state.obstacles)c.lineTo(mx(gate.x),mz(gate.z));c.strokeStyle='#c9bb8b';c.setLineDash([3,4]);c.stroke();c.setLineDash([]);
  for(const [i,gate] of state.obstacles.entries()){
    c.beginPath();c.arc(mx(gate.x),mz(gate.z),i===state.next?6:4,0,Math.PI*2);c.fillStyle=i<state.next?'#829f75':i===state.next?'#d6a951':'#d4cdb6';c.fill();
  }
  c.save();c.translate(mx(state.x),mz(state.z));c.rotate(-state.heading);c.fillStyle='#315e50';c.beginPath();c.moveTo(0,-7);c.lineTo(-4,5);c.lineTo(4,5);c.closePath();c.fill();c.restore();
}
function refreshRide() {
  $('stars').textContent=game?.stars||0;
  $('cleared').textContent=`${game?.cleared||0}/${game?.obstacles.length||COURSES[course].count}`;
  $('fault-count').textContent=`${game?.bumps||0} / ${MAX_MISSES}`;
  $('faults').classList.toggle('danger',(game?.bumps||0)>=2);
  updateNavigation();
  const progress=Math.floor((game?.distance||0)/(game?.finish||1)*100);
  $('progress-fill').style.width=progress+'%';$('progress').setAttribute('aria-valuenow',progress);
  $('progress-label').textContent=`${progress} % du parcours`;
}
function show(panel) {
  $('overlay').hidden=!panel;
  for(const id of ['welcome','paused','result'])$(id).hidden=id!==panel;
}
function setView(next) {
  view=next;document.body.classList.toggle('in-course',view==='course');canvas.classList.toggle('in-stable',view==='stable');
  if(world)world.lastCourseView=false;releaseInputs();
  for(const id of ['stable-room','stable-bubble','stable-caption','box-tag'])$(id).hidden=view!=='stable';
  for(const id of ['ride-hud','ride-progress','course-panel','navigation'])$(id).hidden=view!=='course';
  $('controls').hidden=true;$('pause').hidden=true;
  for(const [id,selected] of [['stable-tab',view==='stable'],['course-tab',view==='course']]){
    if(selected)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');
  }
  canvas.setAttribute('aria-label',view==='stable'?'Écurie interactive. Clique sur les objets pour les soins, puis installe tapis, selle et filet.':'Une carrière en 3D. Flèches gauche et droite pour tourner, flèche haute pour accélérer, flèche basse pour freiner. Espace pour sauter.');
}
function lockChoices(locked) {
  document.querySelectorAll('[data-pony], [data-pace], [data-course]').forEach(button=>button.disabled=locked);
}
function coursePreview() {
  if(isBusy()){message('Un petit instant : ta cavalière termine son geste.');return;}
  const reason=rideReadiness(ponyState())||tackReadiness(ponyState());
  if(!world)return;
  if(reason){goHome();$('care-message').textContent=reason;$('announcer').textContent=reason;$('care-panel').scrollIntoView({block:'nearest'});return;}
  if(game&&!game.settled)settleRide(stable,chosen,game);
  game=null;setView('course');lockChoices(false);refreshStable();refreshRide();
  const config=COURSES[course];
  $('place-name').textContent=config.name.toUpperCase();$('course-title').textContent=config.name;
  $('course-icon').textContent=config.icon;$('course-description').textContent=config.description;
  $('duration').textContent=`10 obstacles · 3 erreurs = partie perdue`;
  show('welcome');$('start').focus({preventScroll:true});save();
  if(matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});
}
function goHome() {
  releaseInputs();
  if(game)settleRide(stable,chosen,game);
  game=null;effect=null;setView('stable');show(null);lockChoices(false);$('jump').disabled=true;
  $('stable-bubble').textContent=`${ponies[chosen].name} est bien dans son petit chez-soi. ♡`;
  refreshStable();save();
}
function start() {
  if(rideReadiness(ponyState())||tackReadiness(ponyState())){goHome();return;}
  releaseInputs();game=createGame(pace,course);last=0;show(null);refreshRide();lockChoices(true);
  $('course-panel').hidden=true;$('controls').hidden=false;$('pause').hidden=false;$('jump').disabled=false;
  $('pause').innerHTML='Ⅱ <span>Pause</span>';$('pause').setAttribute('aria-label','Mettre en pause');
  $('announcer').textContent=`Tu es en selle sur ${ponies[chosen].name}. Le parcours commence !`;
  notify('← → pour tourner · Espace pour sauter');
  $('jump').focus({preventScroll:true});
  if(matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});
}
function pause() {
  releaseInputs();
  if(!game||!['playing','paused'].includes(game.status))return;
  const paused=game.status==='playing';game.status=paused?'paused':'playing';last=0;
  show(paused?'paused':null);$('jump').disabled=paused;
  $('pause').innerHTML=paused?'▶ <span>Reprendre</span>':'Ⅱ <span>Pause</span>';
  $('pause').setAttribute('aria-label',paused?'Reprendre le parcours':'Mettre en pause');
  (paused?$('resume'):$('jump')).focus({preventScroll:true});
}
function finish() {
  releaseInputs();
  settleRide(stable,chosen,game);save();refreshStable();show('result');
  const lost=game.status==='lost';
  $('result-title').textContent=lost?'Partie perdue':'Parcours réussi !';
  $('result-eyebrow').textContent=lost?'ON REPREND QUAND TU VEUX':'BRAVO, CAVALIÈRE !';
  $('result-icon').textContent=lost?'🍀':'🏆';
  $('result-stars').textContent=lost?'Encore un essai ?':'★ ★ ★';
  $('pause').hidden=true;$('jump').disabled=true;
  $('result-text').textContent=lost
    ?`Trois obstacles manqués : le parcours s’arrête ici. Tu as réussi ${game.cleared} saut${game.cleared>1?'s':''}. Ton cheval va bien, tu peux le soigner et réessayer !`
    :`Avec ${ponies[chosen].name}, tu as réussi ${game.cleared} obstacles sur 10, avec ${game.bumps} erreur${game.bumps>1?'s':''}, et récolté ${game.stars} étoiles. Quelle belle équipe !`;
  $('announcer').textContent=$('result-text').textContent;
  $('result').querySelector('[data-home]').focus({preventScroll:true});
}
function isBusy(){return !!effect&&performance.now()<effect.until;}
function message(text){$('care-message').textContent=text;$('stable-bubble').textContent=text;}
function beginAction(action,duration){
  const now=performance.now();effect={action,started:now,until:now+duration};
  updateActionUI(now);
}
function updateActionUI(now){
  const busy=isBusy();
  if(busy!==lastBusy){
    if(lastBusy&&!busy&&effect&&view==='stable'){const done={hay:'Le foin est distribué. Bon appétit !',carrot:'La carotte a été dégustée !',brush:'Le pelage est brossé, tout beau et tout propre.',pet:'Un bon moment de complicité !',rest:'Ton cheval a repris des forces.'};if(done[effect.action])message(done[effect.action]);}
    lastBusy=busy;$('stable-room').setAttribute('aria-busy',busy);
    for(const b of document.querySelectorAll('[data-care],[data-tack],[data-pony]'))b.disabled=busy;
    $('mount').disabled=busy||!world;$('action-progress').hidden=!busy;
  }
  if(busy)$('action-progress').firstElementChild.style.width=Math.min(100,(now-effect.started)/(effect.until-effect.started)*100)+'%';
}
function doCare(action) {
  if(view!=='stable'||isBusy())return;
  if(!care(ponyState(),action))return;
  const removed=removeTack(ponyState()),name=ponies[chosen].name;
  const messages={hay:`Ta cavalière donne du foin à ${name}. Bon appétit !`,carrot:`Croc ! Ta cavalière offre une carotte à ${name}.`,brush:`Ta cavalière brosse doucement le pelage de ${name}.`,pet:`Un petit câlin pour ${name}.`,rest:`Un moment au calme pour reprendre des forces.`};
  message((removed?'On retire l’équipement pour le soin. ':'')+messages[action]);
  beginAction(action,action==='brush'?3200:action==='rest'?3500:2600);
  refreshStable();save();
}
function doEquip(item){
  if(view!=='stable'||isBusy())return;
  const result=fitTack(ponyState(),item);message(result.message);
  if(!result.ok)return;
  beginAction(item,2600);refreshStable();save();
}
for(const button of document.querySelectorAll('[data-care]'))button.addEventListener('click',()=>doCare(button.dataset.care));
for(const button of document.querySelectorAll('[data-tack]'))button.addEventListener('click',()=>doEquip(button.dataset.tack));
$('object-labels').addEventListener('click',()=>{
  const hidden=$('stable-room').classList.toggle('hide-object-names');
  $('object-labels').setAttribute('aria-pressed',!hidden);$('object-labels').textContent=hidden?'Voir les noms':'Masquer les noms';
});
for(const button of document.querySelectorAll('[data-pony]'))button.addEventListener('click',()=>{
  chosen=button.dataset.pony;goHome();$('care-message').textContent=`${ponies[chosen].name} est content de te voir !`;
});
for(const button of document.querySelectorAll('[data-pace]'))button.addEventListener('click',()=>{
  pace=button.dataset.pace;
  for(const b of document.querySelectorAll('[data-pace]')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);}
  coursePreview();
});
for(const button of document.querySelectorAll('[data-course]'))button.addEventListener('click',()=>{
  course=button.dataset.course;
  for(const b of document.querySelectorAll('[data-course]')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);}
  coursePreview();
});
$('stable-tab').addEventListener('click',goHome);
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();goHome();});
for(const button of document.querySelectorAll('[data-home]'))button.addEventListener('click',()=>{goHome();$('mount').focus({preventScroll:true});});
$('mount').addEventListener('click',coursePreview);$('course-tab').addEventListener('click',()=>{
  if(view==='course'&&game&&['playing','paused'].includes(game.status))return;
  coursePreview();
});
$('start').addEventListener('click',start);$('again').addEventListener('click',coursePreview);
$('pause').addEventListener('click',pause);$('resume').addEventListener('click',pause);
$('jump').addEventListener('click',()=>{if(game)jump(game);});
canvas.addEventListener('pointerdown',()=>{if(view==='course'&&game)jump(game);});
const arrowKeys={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
window.addEventListener('keydown',event=>{
  if(game?.status==='playing'){
    if(arrowKeys[event.code]){event.preventDefault();heldKeys.add(arrowKeys[event.code]);}
    if(event.code==='Space'){
      event.preventDefault();if(!event.repeat)jump(game);
    }
    if(event.code==='KeyR'&&!event.repeat){event.preventDefault();resetToTarget(game);notify('Te voilà bien placée pour le prochain saut !');}
  }
  if(event.code==='Escape'&&game&&['playing','paused'].includes(game.status)){event.preventDefault();pause();}
});
window.addEventListener('keyup',event=>{if(arrowKeys[event.code])heldKeys.delete(arrowKeys[event.code]);});
window.addEventListener('blur',()=>{releaseInputs();if(game?.status==='playing')pause();});
for(const button of document.querySelectorAll('[data-input]')){
  button.addEventListener('pointerdown',event=>{
    if(game?.status!=='playing')return;event.preventDefault();button.setPointerCapture(event.pointerId);touchKeys.add(button.dataset.input);button.classList.add('held');
  });
  const release=()=>{touchKeys.delete(button.dataset.input);button.classList.remove('held');};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
}
$('reposition').addEventListener('click',()=>{if(game&&resetToTarget(game)){releaseInputs();notify('Prête à sauter ! Avance vers la barrière.');}});
$('fullscreen').addEventListener('click',async()=>{
  try {if(document.fullscreenElement)await document.exitFullscreen();else await $('adventure').requestFullscreen();}
  catch {$('announcer').textContent='Le plein écran n’est pas disponible ici.';}
});
document.addEventListener('fullscreenchange',()=>{
  releaseInputs();
  if(document.fullscreenElement===$('adventure'))$('adventure').append($('controls'));
  else document.querySelector('.main-column').append($('controls'));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game?.status==='playing')pause();});
// Preserve the effort already made if the page is closed during a course.
window.addEventListener('pagehide',()=>{if(game&&!game.settled){settleRide(stable,chosen,game);save();}});
window.addEventListener('pageshow',event=>{if(event.persisted)goHome();});
function frame(now){
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(view==='stable'||game?.status==='playing')clock+=dt;
  if(game?.status==='playing'){
    const events=advance(game,dt,inputState());
    if(events.includes('bump'))notify(`Obstacle manqué : ${game.bumps} / 3 erreurs`);
    else if(events.includes('clear'))notify('Un obstacle réussi ! Bravo ! 🎀');
    else if(events.includes('edge'))notify('Tourne pour rester dans la carrière, ou choisis Me replacer.');
    refreshRide();if(events.includes('finish')||events.includes('lose'))finish();
  }
  if(now>toastUntil)$('toast').classList.remove('visible');
  const activeEffect=effect&&now<effect.until?effect:null;
  updateActionUI(now);
  if(view==='stable'&&room)room.render(ponyState(),activeEffect,now);
  else if(world)world.render(view,game,ponies[chosen],ponyState(),activeEffect,clock,dt,course);
  requestAnimationFrame(frame);
}
setView('stable');refreshStable();save();requestAnimationFrame(frame);
