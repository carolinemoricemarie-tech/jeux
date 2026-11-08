import { StableRoom } from './stable-room.mjs';
import { PaddockRoom } from './paddock-room.mjs';
import { GameAudio } from './audio.mjs';
import { Celebration } from './celebration.mjs';
import { ACTION_DURATION } from './stable-motion.mjs';
import { CHARACTERS } from './characters.mjs';
import { createPhotoWorld } from './scene3d.mjs';
import { createGame, jump, advance, COURSES, LEVELS, BOUNDS, PACES, ridingRules, resetToTarget, timeToTarget, JUMP_PREPARATION, JUMP_FLIGHT } from './engine.mjs';
import {PONIES} from './ponies.mjs';
import {TRAILS,createTrail,createFreeRide} from './trails.mjs';
import {setRideGait,changeRideGait,GAIT_LABELS} from './riding.mjs';
import {createCentre,advanceCentre,nearestCentreInteraction,interactCentre,walkCentreTo,activateCentreObject,placeInCourtyard,BOXES} from './centre.mjs';
import { SAVE_KEY, NEEDS, restoreStable, care, mood, rideReadiness, settleRide, tackReadiness, fitTack, removeTack, prepareForRide, TACK_ORDER } from './stable.mjs';

const $ = id => document.getElementById(id);
const canvas = $('game');
const heldKeys=new Set(),touchKeys=new Set();
const releaseInputs=()=>{heldKeys.clear();touchKeys.clear();paddock?.release();document.querySelectorAll('[data-input]').forEach(b=>b.classList.remove('held'));};
const inputState=()=>Object.fromEntries(['left','right','up','down'].map(key=>[key,heldKeys.has(key)||touchKeys.has(key)]));
const ponies=PONIES;
let saved;
try { saved = localStorage.getItem(SAVE_KEY); } catch { /* The game also works without storage. */ }
const stable = restoreStable(saved);
let chosen = stable.chosen, pace = 'gentle', course = 'prairie', view = 'stable',activity='jump',trail='woodland';
let game = null, clock = 0, last = 0, effect = null, toastUntil = 0;
let centre=null,lastCentreUI='';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ponyState = () => stable.ponies[chosen];
const audio=new GameAudio(),celebration=new Celebration($('celebration'),{reducedMotion});
let victoryStarted=null,startFlashUntil=0,lastHudAt=-1000;
document.querySelector('.page').inert=true;
for(const [level,label] of Object.entries(LEVELS)){
  const section=document.createElement('section');section.className='course-level';section.dataset.level=level;
  const title=document.createElement('h3');title.textContent=label;section.append(title);
  const hint=document.createElement('p');hint.textContent=level==='beginner'?'De grandes portes et de petites barres pour apprendre.':level==='intermediate'?'Des virages variés et des barres qui montent doucement.':'Des portes larges, de grandes courbes et des obstacles plus hauts.';section.append(hint);
  const options=document.createElement('div');options.className='course-options';options.setAttribute('role','group');options.setAttribute('aria-label','Parcours '+label);
  for(const [id,config] of Object.entries(COURSES).filter(([,c])=>c.level===level)){
    const b=document.createElement('button');b.dataset.course=id;b.classList.toggle('active',id===course);b.setAttribute('aria-pressed',id===course);
    b.innerHTML='<span>'+config.icon+'</span><strong>'+config.name+'</strong><small>10 obstacles · '+Math.round(config.height*100)+'–'+Math.round(config.maxHeight*100)+' cm</small><em id="record-'+id+'">À découvrir</em>';options.append(b);
  }
  section.append(options);$('course-options').append(section);
}
function refreshSound(){const b=$('sound-toggle');b.textContent=audio.enabled?'♫ Son activé':'♫ Son coupé';b.setAttribute('aria-pressed',audio.enabled);}
refreshSound();$('sound-toggle').addEventListener('click',()=>{audio.toggle();refreshSound();});

let world,room,paddock,lastBusy=null;
$('mount').disabled=true;$('course-tab').disabled=true;$('paddock-tab').disabled=true;
createPhotoWorld(canvas,{reducedMotion,onLost:()=>{if(game?.status==='playing')pause();$('webgl-error').hidden=false;}})
.then(instance=>{world=instance;room=new StableRoom($('stable-room'),world.photos,{reducedMotion});
  paddock=new PaddockRoom($('paddock-room'),world.photos,{audio,reducedMotion,onExit:()=>openCentre('paddock'),onMount:openFreeRide,onEnterBox:id=>{chosen=id;goHome();message('Bienvenue dans le box de '+ponies[id].name+' !');},onZone:name=>$('place-name').textContent=name.toUpperCase(),onReward:kind=>{
    const pony=ponyState();pony.bond=Math.min(100,pony.bond+(kind==='ball'?3:6));if(kind==='lunge')pony.energy=Math.max(0,pony.energy-3);refreshStable();save();
  }});
  const available=Object.keys(world.photos.characters);$('character-picker').hidden=!available.length;
  $('entry-characters').hidden=!available.length;$('entry-demo').hidden=!!available.length;
  for(const button of document.querySelectorAll('[data-character],[data-entry-character]')){
    const id=button.dataset.character||button.dataset.entryCharacter;button.disabled=!available.includes(id);
    const ref=world.photos.characterPortraits;if(!ref)continue;
    const portrait=document.createElement('canvas');portrait.width=360;portrait.height=360;
    const w=ref.width/2,top=Math.floor(ref.height*.62),h=ref.height-top,dw=360*w/h;
    portrait.getContext('2d').drawImage(ref,id==='emmy'?0:w,top,w,h,(360-dw)/2,0,dw,360);
    button.querySelector('.character-portrait,.entry-portrait').append(portrait);
  }
  selectCharacter(stable.character,false);
  for(const button of document.querySelectorAll('[data-pony]')){
    const portrait=button.querySelector('.portrait');portrait.textContent='';const c=document.createElement('canvas');c.width=c.height=160;
    const image=world.photos.ponyRest,w=image.width/4,h=image.height/3,row=ponies[button.dataset.pony].row;
    c.getContext('2d').drawImage(image,w*.56,row*h,w*.44,h*.55,0,0,160,160);portrait.append(c);
  }
  $('entry-screen').style.setProperty('--entry-image','url("'+world.photos.room.src+'")');
  $('entry-status').textContent=available.length?'Emmy et Louane t’attendent. À toi de choisir !':'Une petite aventure à partager avec ton poney.';
  $('asset-loading').hidden=true;$('mount').disabled=false;$('course-tab').disabled=false;$('paddock-tab').disabled=false;refreshStable();
  (available.length?document.querySelector('[data-entry-character="'+stable.character+'"]'):$('entry-demo')).focus();})
.catch(error=>{console.error(error);$('asset-loading').hidden=true;$('webgl-error').hidden=false;$('entry-status').textContent='Le domaine n’a pas pu s’ouvrir. Réessaie dans un navigateur récent.';$('entry-retry').hidden=false;});
$('entry-retry').addEventListener('click',()=>location.reload());
function enterGame(id){
  if(!world)return;audio.unlock();selectCharacter(id);$('entry-screen').hidden=true;document.querySelector('.page').inert=false;openCentre();$('centre-tab').focus({preventScroll:true});
}
for(const b of document.querySelectorAll('[data-entry-character]'))b.addEventListener('click',()=>enterGame(b.dataset.entryCharacter));
$('entry-demo').addEventListener('click',()=>enterGame(stable.character));
$('change-character').addEventListener('click',()=>{if(isBusy())return;goHome();audio.stop();$('entry-screen').hidden=false;document.querySelector('.page').inert=true;(document.querySelector('[data-entry-character="'+stable.character+'"]:not(:disabled)')||$('entry-demo')).focus();});

function save() {
  stable.chosen=chosen;
  if(centre)stable.centre={doors:{...centre.doors},jobs:{...centre.jobs}};
  try {localStorage.setItem(SAVE_KEY,JSON.stringify(stable));$('save-note').textContent='✓ Ton écurie est sauvegardée ici. Ton poney t’attend quand tu t’absentes.';}
  catch {$('save-note').textContent='Tu peux jouer ! La sauvegarde est indisponible dans ce navigateur.';}
}
function refreshStable() {
  const needs=ponyState(), feeling=mood(needs), name=ponies[chosen].name;
  room?.setPony(chosen);if(world&&world.ponyKind!==ponies[chosen].kind)world.setCharacter(stable.character,ponies[chosen].kind);
  for(const key of NEEDS){$(key).value=needs[key];$(key+'-value').textContent=Math.round(needs[key])+' %';}
  $('mood-icon').textContent=feeling.icon;$('mood-label').textContent=feeling.label;$('mood-hint').textContent=feeling.hint;
  document.querySelector('.nameplate').textContent=name.toUpperCase();
  $('collection').textContent=`🏵️ ${stable.rides} parcours · ☀ ${stable.walks||0} balades · ★ ${stable.stars}`;
  $('readiness').textContent=rideReadiness(needs)||tackReadiness(needs)||'Tout est prêt. Clique sur Monter !';
  $('mount').classList.toggle('ready',!rideReadiness(needs)&&!tackReadiness(needs));
  const names={pad:'Tapis',saddle:'Selle',bridle:'Filet'};
  for(const key of TACK_ORDER){const fitted=!!needs.tack?.[key];$('tack-'+key).textContent=names[key]+(fitted?' ✓':' ○');$('tack-'+key).classList.toggle('done',fitted);document.querySelector('[data-tack="'+key+'"]').classList.toggle('fitted',fitted);}
  for(const button of document.querySelectorAll('[data-pony]')){
    const selected=button.dataset.pony===chosen;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',selected);
  }
  for(const [id,config] of Object.entries(COURSES)){
    const record=stable.records[stable.character+':'+id]||(stable.character==='louane'?stable.records[id]:null);$('record-'+id).textContent=record?`Record : ${record.clear}/${config.count} sauts · ★ ${record.stars}`:'À découvrir';
  }
  if(view==='stable')$('place-name').textContent='LE BOX DE '+name.toUpperCase();
}
function notify(message) {
  $('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+2200;
}
function updateNavigation(){
  const state=game||createGame(pace,course,{character:stable.character}),walking=state.activity==='trail',points=walking?state.waypoints:state.obstacles,target=points[walking?state.nextWaypoint:state.next];
  document.querySelector('.target-card .eyebrow').textContent=walking?'TON CHEMIN':'TON PROCHAIN SAUT';
  if(game?.status==='lost'){$('next-target').textContent='Partie perdue';$('direction-hint').textContent='Trois obstacles manqués';}
  else if(target){
    const distance=Math.hypot(target.x-state.x,target.z-state.z);
    let angle=Math.atan2(-(target.x-state.x),-(target.z-state.z))-state.heading;
    angle=Math.atan2(Math.sin(angle),Math.cos(angle));
    $('next-target').textContent=walking?`Repère ${state.nextWaypoint} / ${points.length-1} · ${Math.round(distance)} m`:`Obstacle ${state.next+1} / ${state.obstacles.length} · ${Math.round(distance)} m`;
    const timing=timeToTarget(state);
    $('direction-hint').textContent=walking&&state.autoSteer?'Ton poney suit le sentier':!walking&&timing<JUMP_PREPARATION+JUMP_FLIGHT*.62?'↟ Saute maintenant !':state.autoSteer?'Ton poney tourne tout seul · Espace pour sauter':Math.abs(angle)>2?'↶ Fais demi-tour':angle>.3?'← Tourne à gauche':angle<-.3?'→ Tourne à droite':state.jumpActive?'Passe la barre en douceur':distance<9?'Approche à ton rythme':'↑ Tout droit';
  }else{$('next-target').textContent='Parcours terminé !';$('direction-hint').textContent='Une belle équipe ♡';}
  const map=$('minimap'),c=map.getContext('2d');c.clearRect(0,0,map.width,map.height);
  c.fillStyle='#fffaf0e8';c.beginPath();c.roundRect(0,0,220,160,12);c.fill();
  const bounds=state.bounds||BOUNDS,mx=x=>12+(x-bounds.minX)/(bounds.maxX-bounds.minX)*196;
  const mz=z=>12+(z-bounds.minZ)/(bounds.maxZ-bounds.minZ)*136;
  c.strokeStyle='#ddd5ba';c.lineWidth=1;c.strokeRect(10,10,200,140);
  c.beginPath();c.moveTo(mx(walking?points[0].x:0),mz(walking?points[0].z:40));for(const gate of points)c.lineTo(mx(gate.x),mz(gate.z));c.strokeStyle='#c9bb8b';c.setLineDash([3,4]);c.stroke();c.setLineDash([]);
  const next=walking?state.nextWaypoint:state.next;
  for(const [i,gate] of points.entries()){
    c.beginPath();c.arc(mx(gate.x),mz(gate.z),i===next?6:4,0,Math.PI*2);c.fillStyle=i<next?'#829f75':i===next?'#d6a951':'#d4cdb6';c.fill();
  }
  c.save();c.translate(mx(state.x),mz(state.z));c.rotate(-state.heading);c.fillStyle='#315e50';c.beginPath();c.moveTo(0,-7);c.lineTo(-4,5);c.lineTo(4,5);c.closePath();c.fill();c.restore();
}
function refreshRide() {
  const walking=game?.activity==='trail',rules=game||ridingRules(stable.character,course);
  $('stars').textContent=game?.stars||0;
  $('cleared').textContent=walking?`${game.nextWaypoint-1}/${game.finish}`:`${game?.cleared||0}/${game?.obstacles.length||COURSES[course].count}`;
  $('completed-label').textContent=walking?'repères atteints':'obstacles réussis';$('faults').hidden=walking;
  $('fault-count').textContent=rules.maxMisses===null?String(game?.bumps||0):`${game?.bumps||0} / ${rules.maxMisses}`;
  $('faults').classList.toggle('danger',rules.maxMisses!==null&&(game?.bumps||0)>=2);
  document.querySelector('.star-count').hidden=walking;
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
  $('toast').classList.remove('visible');toastUntil=0;view=next;document.body.classList.toggle('in-course',['course','trail'].includes(view));document.body.classList.toggle('in-paddock',view==='paddock');document.body.classList.toggle('in-centre',view==='centre');canvas.classList.toggle('in-stable',view==='stable');
  if(world)world.lastCourseView=false;releaseInputs();
  for(const id of ['stable-room','stable-bubble','stable-caption','box-tag'])$(id).hidden=view!=='stable';
  for(const id of ['ride-hud','ride-progress','navigation'])$(id).hidden=!['course','trail'].includes(view);
  $('course-panel').hidden=view!=='course';$('trail-panel').hidden=view!=='trail';
  $('paddock-room').hidden=view!=='paddock';
  $('centre-ui').hidden=view!=='centre';$('trail-menu').hidden=true;$('travel-toolbar').hidden=view!=='trail';
  $('dismount').hidden=true;$('change-trail').hidden=false;$('ride-stop').hidden=view!=='trail';$('gait-status').hidden=view!=='trail';
  $('controls').hidden=true;$('pause').hidden=true;
  for(const [id,selected] of [['stable-tab',view==='stable'],['centre-tab',view==='centre'],['course-tab',view==='course'],['paddock-tab',view==='paddock'],['trails-tab',view==='trail']]){
    if(selected)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');
  }
  canvas.setAttribute('aria-label',view==='stable'?'Écurie interactive. Clique sur les objets pour les soins, puis installe tapis, selle et filet.':'Une carrière en 3D. Flèches gauche et droite pour tourner, flèche haute pour accélérer, flèche basse pour freiner. Espace pour sauter.');
}
function resetCelebration(){victoryStarted=null;startFlashUntil=0;celebration.stop();$('countdown').hidden=true;$('adventure').classList.remove('celebrating');audio.stop();}
function lockChoices(locked) {
  document.querySelectorAll('[data-pony], [data-character], [data-pace], [data-course]').forEach(button=>button.disabled=locked);
}
function selectCharacter(id,persist=true){
  if(!world?.photos.characters[id])return;
  stable.character=id;room.setCharacter(id,CHARACTERS[id].name);world.setCharacter(id,ponies[chosen].kind);
  for(const button of document.querySelectorAll('[data-character]')){
    const selected=button.dataset.character===id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',selected);
  }
  $('character-description').textContent=CHARACTERS[id].name+' · '+CHARACTERS[id].ageLabel+' · Prête pour son poney';
  if(persist){message(CHARACTERS[id].name+' rejoint son poney.');save();}
}
for(const button of document.querySelectorAll('[data-character]'))button.addEventListener('click',()=>{
  if(view!=='stable'||isBusy())return;selectCharacter(button.dataset.character);
});
function coursePreview() {
  if(isBusy()){message('Un petit instant : ta cavalière termine son geste.');return;}
  if(!world)return;
  if(game&&!game.settled)settleRide(stable,chosen,game);
  const reason=rideReadiness(ponyState())||tackReadiness(ponyState());
  resetCelebration();
  activity='jump';game=null;setView('course');lockChoices(false);refreshStable();refreshRide();
  const config=COURSES[course];
  $('place-name').textContent=config.name.toUpperCase();$('course-title').textContent=config.name;
  const rules=ridingRules(stable.character,course);
  $('course-icon').textContent=config.icon;$('course-description').textContent=LEVELS[config.level]+' · '+Math.round(config.height*100)+' à '+Math.round(config.maxHeight*100)+' cm. '+(rules.maxMisses===null?'Tu peux continuer même si tu rates des obstacles.':'Trois erreurs : partie perdue.');
  $('duration').textContent=rules.autoSteer?'10 obstacles · direction automatique · Espace pour sauter':rules.maxMisses===null?'10 obstacles · sans élimination':'10 obstacles · 3 erreurs = partie perdue';
  $('course-help').innerHTML=rules.autoSteer?'Ton poney suit le tracé tout seul.<br><strong>Appuie sur Espace pour sauter !</strong>':'← → pour tourner · ↑ accélérer · ↓ freiner<br><strong>Espace pour sauter.</strong> Suis les numéros !';
  $('start').textContent=reason?'Préparer et partir ! →':'C’est parti ! →';
  $('ride-preparation').hidden=!reason;
  $('ride-preparation').textContent=reason?reason+' Avec « Préparer et partir », les soins et le matériel manquants sont préparés pour toi.':'';
  $('prepare-stable').hidden=!reason;
  show('welcome');$('start').focus({preventScroll:true});save();
  if(matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});
}
function trailPreview(id=trail){
  if(isBusy()||!world)return;if(game&&!game.settled)settleRide(stable,chosen,game);
  trail=TRAILS[id]?id:'woodland';activity='trail';resetCelebration();game=createTrail(trail,pace,{character:stable.character});game.status='preview';setView('trail');lockChoices(false);refreshStable();refreshRide();
  const config=TRAILS[trail],reason=rideReadiness(ponyState())||tackReadiness(ponyState());
  $('trail-panel').hidden=true;
  $('course-title').textContent=config.name;$('place-name').textContent=config.name.toUpperCase();$('course-icon').textContent=config.icon;$('course-description').textContent=config.description;
  $('course-help').textContent='↑ une pression : pas, deux : trot, trois : galop. ↓ pour ralentir puis arrêter. ← → pour tourner. Espace pour sauter les troncs. '+(id==='seaside'?'Tu peux entrer doucement dans la mer et te baigner.':'Un petit pont et des troncs t’attendent sur le chemin.');
  $('duration').textContent='Balade sans élimination · pas, trot ou galop';$('start').textContent=reason?'Préparer et partir ! →':'Partir en balade ! →';$('ride-preparation').hidden=!reason;$('ride-preparation').textContent=reason?reason+' La préparation peut être faite pour toi.':'';$('prepare-stable').hidden=!reason;show('welcome');$('start').focus({preventScroll:true});
  for(const b of document.querySelectorAll('[data-trail]'))b.classList.toggle('active',b.dataset.trail===trail);
  if(matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});
}
function openTrailMenu(){
  if(isBusy()||!world)return;if(game&&!game.settled)settleRide(stable,chosen,game);game=createTrail(trail);game.status='preview';activity='trail';resetCelebration();setView('trail');show(null);lockChoices(false);$('trail-panel').hidden=true;$('travel-toolbar').hidden=true;$('ride-hud').hidden=true;$('navigation').hidden=true;$('ride-progress').hidden=true;$('trail-menu').hidden=false;$('place-name').textContent='LES TROIS BALADES';save();
}
function openCentre(from='yard'){
  if(!world)return;goHome();centre ||= createCentre({age:CHARACTERS[stable.character].age,progress:stable.centre});centre.status='playing';centre.walkSpeed=stable.character==='emmy'?1.8:2.1;
  centre.target=null;centre.path=[];centre.pending=null;centre.pony=chosen;
  if(from==='paddock'||from==='yard')placeInCourtyard(centre);
  if(from==='box'){const b=BOXES.find(b=>b.pony===chosen);if(b){centre.doors[b.id]=true;Object.assign(centre.player,{x:b.side*5.7,z:b.z+1.6,heading:b.side*Math.PI/2,speed:0});}}
  setView('centre');show(null);$('centre-map').hidden=true;$('centre-map-toggle').setAttribute('aria-expanded','false');lastCentreUI='';$('place-name').textContent='LE CENTRE ÉQUESTRE';$('centre-pause').textContent='Pause';audio.unlock();updateCentreUI();save();
  if(from!=='box'){$('centre-location').textContent='La cour du centre équestre';$('announcer').textContent='Tu es dans la cour. Tu peux marcher vers les boxes, la sellerie ou l’enclos.';}
  if(matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});
}
function centreEvents(events){
  if(!events.length)return;
  for(const event of events){
    if(event.type==='care'){chosen=event.pony;goHome();message('Tu es auprès de '+ponies[chosen].name+'. Les soins sont à portée de main.');}
    else if(['equip','snack','groom'].includes(event.type)){chosen=event.pony||chosen;goHome();if(event.type==='equip')doEquip(event.item);else doCare(event.action||'brush');}
    else if(event.type==='paddock')$('paddock-tab').click();
    else if(event.type==='rides')openTrailMenu();
    else if(event.type==='job'){
      const p=stable.ponies[event.pony];if(event.action==='hay'){p.food=Math.min(100,p.food+15);notify('Du foin tout frais pour '+ponies[event.pony].name+' !');}else if(event.action==='water'){p.bond=Math.min(100,p.bond+5);notify('L’abreuvoir est rempli d’eau fraîche.');}else{p.clean=Math.min(100,p.clean+15);notify('Un box propre et une paille toute fraîche !');}refreshStable();
    }else if(event.type==='tack')notify('La sellerie : clique sur le tapis, la selle ou le filet.');
  }save();
}
const centreButtons=new Map();
function updateCentreHotspots(){
  if(!world||!centre)return;const visible=world.centreHotspots(centre),ids=new Set(visible.map(i=>i.id));
  for(const [id,b]of centreButtons)b.hidden=!ids.has(id);
  const placed=[],width=canvas.clientWidth,small=width<500;
  for(const item of visible){let b=centreButtons.get(item.id);if(!b){b=document.createElement('button');b.className='centre-hotspot';b.dataset.centreAction=item.id;b.addEventListener('click',e=>{e.stopPropagation();centreEvents(activateCentreObject(centre,item.id));lastCentreUI='';updateCentreUI();});$('centre-hotspots').append(b);centreButtons.set(item.id,b);}
    const w=(item.label.length*(small?4:5.5)+20)/width*100,left=Math.max(w/2+1,Math.min(99-w/2,item.left));let top=item.top;
    for(const offset of [0,-6,6,-12,12,-18,18]){const y=Math.max(18,Math.min(79,item.top+offset));if(!placed.some(p=>Math.abs(left-p.x)<(w+p.w)/2+1&&Math.abs(y-p.y)<5.8)){top=y;break;}}
    placed.push({x:left,y:top,w});b.hidden=false;b.style.left=left+'%';b.style.top=top+'%';if(b.textContent!==item.label)b.textContent=item.label;b.disabled=centre.status!=='playing'||centre.actionUntil>centre.time;
  }
}
function openFreeRide(){
  if(!world)return;goHome();prepareForRide(ponyState());refreshStable();save();activity='paddock';game=createFreeRide(stable.character);setView('trail');show(null);lockChoices(true);
  $('trails-tab').removeAttribute('aria-current');$('paddock-tab').setAttribute('aria-current','page');$('place-name').textContent='L’ENCLOS · EN SELLE LIBREMENT';$('course-panel').hidden=true;$('trail-panel').hidden=true;$('ride-hud').hidden=true;$('ride-progress').hidden=true;$('navigation').hidden=true;
  $('controls').hidden=false;$('pause').hidden=false;$('jump').disabled=false;$('reposition').hidden=true;$('dismount').hidden=false;$('change-trail').hidden=true;$('travel-toolbar').hidden=false;
  $('control-caption').innerHTML='<p><strong>Ton enclos, en toute liberté</strong><span>↑ pas → trot → galop · ↓ ralentir · ← → tourner · Espace sauter</span></p>';
  $('pause').textContent='Pause';document.querySelector('.steering').hidden=false;refreshGait();audio.unlock();last=0;
}
function refreshGait(){
  if(!game||!['trail','paddock'].includes(game.activity))return;
  $('gait-status').textContent=GAIT_LABELS[game.gaitStep||0];
  for(const b of document.querySelectorAll('[data-live-pace]'))b.setAttribute('aria-pressed',game.gaitStep>0&&b.dataset.livePace===game.pace);
  $('ride-stop').setAttribute('aria-pressed',!game.gaitStep);
}
function pressGait(direction){if(changeRideGait(game,direction)){pace=game.pace;refreshGait();notify(GAIT_LABELS[game.gaitStep]);}}
function updateCentreUI(){
  if(!centre)return;const item=nearestCentreInteraction(centre),close=item?.distance<=3,busy=centre.actionUntil>centre.time,key=[item?.id,item?.label,close,busy,centre.status,Object.keys(centre.jobs).length].join(':');if(key===lastCentreUI)return;lastCentreUI=key;
  $('centre-interact').disabled=!close||busy||centre.status!=='playing';$('centre-interact').textContent=busy?'Ton geste se termine…':close?item.label:'Approche-toi d’une porte ou d’un objet';$('centre-jobs').textContent=Object.keys(centre.jobs).length+' petites attentions aujourd’hui ♡';
}
function goHome() {
  releaseInputs();
  resetCelebration();
  if(game)settleRide(stable,chosen,game);
  game=null;effect=null;setView('stable');show(null);lockChoices(false);$('jump').disabled=true;
  $('stable-bubble').textContent=`${ponies[chosen].name} est bien dans son petit chez-soi. ♡`;
  refreshStable();save();
}
function start() {
  prepareForRide(ponyState());refreshStable();save();
  audio.unlock();resetCelebration();releaseInputs();game=activity==='trail'?createTrail(trail,pace,{character:stable.character}):createGame(pace,course,{countdown:true,character:stable.character});game.status='countdown';game.countdown=3;last=0;show(null);refreshRide();lockChoices(true);
  $('course-panel').hidden=true;$('trail-panel').hidden=true;$('controls').hidden=false;$('pause').hidden=false;$('jump').disabled=true;
  document.querySelector('.steering').hidden=game.autoSteer;$('reposition').hidden=game.autoSteer||activity==='trail';
  $('control-caption').innerHTML='<p><strong>'+ (game.autoSteer?'Ton poney tient le chemin':'À toi de tenir les rênes !')+'</strong><span>'+(game.activity==='trail'?'↑ pas → trot → galop · ↓ ralentir · ← → tourner · Espace sauter':game.autoSteer?'Espace pour sauter · choisis ton allure':'Flèches pour diriger · Espace pour sauter')+'</span></p>';
  $('countdown').hidden=false;$('countdown-number').textContent='3';audio.countdown(3);
  $('pause').textContent='Pause';$('pause').setAttribute('aria-label','Mettre en pause');
  for(const b of document.querySelectorAll('[data-live-pace]'))b.setAttribute('aria-pressed',b.dataset.livePace===pace);
  refreshGait();
  $('announcer').textContent=`Tu es en selle sur ${ponies[chosen].name}. Départ dans trois secondes.`;
  if(matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});
}
function pause() {
  releaseInputs();
  if(!game||!['playing','countdown','paused'].includes(game.status))return;
  const paused=game.status!=='paused';
  if(paused){game.pausedFrom=game.status;game.status='paused';}else game.status=game.pausedFrom||'playing';last=0;
  show(paused?'paused':null);$('jump').disabled=paused||game.status==='countdown';
  $('pause').textContent=paused?'Reprendre':'Pause';
  $('pause').setAttribute('aria-label',paused?'Reprendre le parcours':'Mettre en pause');
  (paused?$('resume'):$('jump')).focus({preventScroll:true});
}
function finish() {
  releaseInputs();
  settleRide(stable,chosen,game);save();refreshStable();
  if(game.activity==='trail'){
    celebration.stop();show('result');audio.snort();$('result-title').textContent='Quelle jolie balade !';$('result-eyebrow').textContent='UN BEAU MOMENT ENSEMBLE';$('result-icon').textContent=TRAILS[game.trail].icon;$('result-stars').textContent='♡ ♡ ♡';$('result-text').textContent=CHARACTERS[stable.character].name+' et '+ponies[chosen].name+' ont terminé '+TRAILS[game.trail].name.toLowerCase()+'. Votre complicité grandit !';$('pause').hidden=true;$('jump').disabled=true;$('controls').hidden=true;return;
  }
  const lost=game.status==='lost';
  if(lost){show('result');celebration.stop();}else{victoryStarted=performance.now();celebration.start(victoryStarted);$('adventure').classList.add('celebrating');show(null);audio.applause();}
  $('result-title').textContent=lost?'Partie perdue':game.character==='emmy'?'Bravo, parcours terminé !':'Parcours réussi !';
  $('result-eyebrow').textContent=lost?'ON REPREND QUAND TU VEUX':'BRAVO, CAVALIÈRE !';
  $('result-icon').textContent=lost?'🍀':'🏆';
  $('result-stars').textContent=lost?'Encore un essai ?':'★ ★ ★';
  $('pause').hidden=true;$('jump').disabled=true;
  $('controls').hidden=true;
  $('result-text').textContent=lost
    ?`Trois obstacles manqués : le parcours s’arrête ici. Tu as réussi ${game.cleared} saut${game.cleared>1?'s':''}. Ton cheval va bien, tu peux le soigner et réessayer !`
    :`Avec ${ponies[chosen].name}, tu as réussi ${game.cleared} obstacles sur 10, avec ${game.bumps} erreur${game.bumps>1?'s':''}, et récolté ${game.stars} étoiles. Quelle belle équipe !`;
  $('announcer').textContent=$('result-text').textContent;
  if(lost)$('result').querySelector('[data-home]').focus({preventScroll:true});
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
    for(const b of document.querySelectorAll('[data-care],[data-tack],[data-pony],[data-character]'))b.disabled=busy;
    $('mount').disabled=busy||!world;$('action-progress').hidden=!busy;
    $('change-character').disabled=busy;
  }
  if(busy)$('action-progress').firstElementChild.style.transform='scaleX('+Math.min(1,(now-effect.started)/(effect.until-effect.started))+')';
}
function doCare(action) {
  if(view!=='stable'||isBusy())return;
  if(!care(ponyState(),action))return;
  audio.unlock();if(['hay','carrot','pet'].includes(action))audio.snort();
  const removed=removeTack(ponyState()),name=ponies[chosen].name;
  const messages={hay:`Ta cavalière donne du foin à ${name}. Bon appétit !`,carrot:`Croc ! Ta cavalière offre une carotte à ${name}.`,brush:`Ta cavalière brosse doucement le pelage de ${name}.`,pet:`Un petit câlin pour ${name}.`,rest:`Un moment au calme pour reprendre des forces.`};
  message((removed?'On retire l’équipement pour le soin. ':'')+messages[action]);
  beginAction(action,ACTION_DURATION[action]);
  refreshStable();save();
}
function doEquip(item){
  if(view!=='stable'||isBusy())return;
  const result=fitTack(ponyState(),item);message(result.message);
  if(!result.ok)return;
  audio.unlock();
  beginAction(item,ACTION_DURATION[item]);refreshStable();save();
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
  activity==='trail'?trailPreview():coursePreview();
});
for(const button of document.querySelectorAll('[data-live-pace]'))button.addEventListener('click',()=>{
  if(!game||!['playing','countdown','paused'].includes(game.status))return;
  pace=button.dataset.livePace;game.pace=pace;
  if(['trail','paddock'].includes(game.activity))setRideGait(game,pace);
  for(const b of document.querySelectorAll('[data-live-pace]'))b.setAttribute('aria-pressed',b===button);
  for(const b of document.querySelectorAll('[data-pace]')){b.setAttribute('aria-pressed',b.dataset.pace===pace);b.classList.toggle('active',b.dataset.pace===pace);}
  notify(pace==='gallop'?'Au galop !':pace==='trot'?'Au trot !':'Au pas, tranquillement.');
  refreshGait();
});
$('ride-stop').addEventListener('click',()=>{if(setRideGait(game,'stop')){refreshGait();notify('On s’arrête en douceur.');}});
$('dismount').addEventListener('click',()=>$('paddock-tab').click());
for(const b of document.querySelectorAll('[data-trail]'))b.addEventListener('click',()=>trailPreview(b.dataset.trail));
$('trails-tab').addEventListener('click',openTrailMenu);
$('change-trail').addEventListener('click',openTrailMenu);$('trail-to-centre').addEventListener('click',()=>openCentre(game?.activity==='paddock'?'paddock':'yard'));
$('centre-tab').addEventListener('click',()=>openCentre());$('leave-box').addEventListener('click',()=>openCentre('box'));
$('courtyard-shortcut').addEventListener('click',()=>openCentre('yard'));
$('centre-map-toggle').addEventListener('click',()=>{$('centre-map').hidden=!$('centre-map').hidden;$('centre-map-toggle').setAttribute('aria-expanded',!$('centre-map').hidden);});
$('centre-to-paddock').addEventListener('click',()=>$('paddock-tab').click());
$('centre-interact').addEventListener('click',()=>{if(centre)centreEvents(interactCentre(centre));lastCentreUI='';updateCentreUI();});
$('centre-pause').addEventListener('click',()=>{if(!centre)return;centre.status=centre.status==='playing'?'paused':'playing';releaseInputs();$('centre-pause').textContent=centre.status==='paused'?'Reprendre':'Pause';lastCentreUI='';updateCentreUI();});
for(const b of document.querySelectorAll('[data-centre-go]'))b.addEventListener('click',()=>{if(!centre)return;const [x,z]=b.dataset.centreGo.split(',').map(Number);walkCentreTo(centre,x,z);$('centre-map').hidden=true;$('centre-map-toggle').setAttribute('aria-expanded','false');});
for(const b of document.querySelectorAll('[data-centre-input]')){
  b.addEventListener('pointerdown',e=>{if(centre?.status!=='playing')return;e.preventDefault();b.setPointerCapture(e.pointerId);touchKeys.add(b.dataset.centreInput);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>touchKeys.delete(b.dataset.centreInput));
}
for(const button of document.querySelectorAll('[data-course]'))button.addEventListener('click',()=>{
  course=button.dataset.course;
  for(const b of document.querySelectorAll('[data-course]')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);}
  coursePreview();
});
$('stable-tab').addEventListener('click',goHome);
$('paddock-tab').addEventListener('click',()=>{
  if(!paddock||isBusy())return;
  goHome();removeTack(ponyState());ponyState().resting=false;refreshStable();save();paddock.open(stable.character,chosen);setView('paddock');lockChoices(false);$('place-name').textContent='L’ENCLOS DE '+ponies[chosen].name.toUpperCase();audio.unlock();
  if(matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});
});
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();goHome();});
for(const button of document.querySelectorAll('[data-home]'))button.addEventListener('click',()=>{goHome();$('mount').focus({preventScroll:true});});
$('mount').addEventListener('click',coursePreview);$('course-tab').addEventListener('click',()=>{
  if(view==='course'&&game&&['playing','countdown','paused'].includes(game.status))return;
  coursePreview();
});
$('start').addEventListener('click',start);$('again').addEventListener('click',()=>activity==='trail'?trailPreview():coursePreview());
$('prepare-stable').addEventListener('click',()=>{
  goHome();message(rideReadiness(ponyState())||tackReadiness(ponyState())||'Ton poney est prêt. Clique sur Monter !');
  $('mount').focus({preventScroll:true});
});
$('pause').addEventListener('click',pause);$('resume').addEventListener('click',pause);
$('jump').addEventListener('click',()=>{if(game)jump(game);});
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  if(view==='course'&&game)jump(game);
  if(view==='centre'&&centre?.status==='playing'){
    const id=world.centrePickObject(event.clientX,event.clientY);if(id){centreEvents(activateCentreObject(centre,id));return;}
    const point=world.centreGroundPoint(event.clientX,event.clientY);if(!point)return;
    walkCentreTo(centre,point.x,point.z);
  }
});
let orbitDrag=null;
canvas.addEventListener('contextmenu',e=>{if(view==='centre')e.preventDefault();});
canvas.addEventListener('pointerdown',e=>{if(view==='centre'&&e.button===2){e.preventDefault();canvas.setPointerCapture(e.pointerId);orbitDrag={x:e.clientX,y:e.clientY};}});
canvas.addEventListener('pointermove',e=>{if(!orbitDrag||view!=='centre'||!centre)return;centre.cameraYaw=(centre.cameraYaw||0)+(e.clientX-orbitDrag.x)*.009;centre.cameraHeight=Math.max(1.6,Math.min(4.1,(centre.cameraHeight||2.2)+(e.clientY-orbitDrag.y)*.012));orbitDrag={x:e.clientX,y:e.clientY};});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>orbitDrag=null);
const arrowKeys={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
window.addEventListener('keydown',event=>{
  if(!$('entry-screen').hidden){
    if(event.code==='Tab'){
      const buttons=[...$('entry-screen').querySelectorAll('button:not(:disabled)')].filter(b=>b.offsetParent!==null),first=buttons[0],end=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();end?.focus();}else if(!event.shiftKey&&document.activeElement===end){event.preventDefault();first?.focus();}
    }
    return;
  }
  if(view==='paddock'){
    if(arrowKeys[event.code]){event.preventDefault();heldKeys.add(arrowKeys[event.code]);}
    if(event.code==='Space'&&!event.repeat){event.preventDefault();$('paddock-room').querySelector('[data-paddock-command="call"]').click();}
    if(event.code==='Escape'&&!event.repeat){event.preventDefault();$('paddock-pause').click();}
    return;
  }
  if(view==='centre'){
    if(arrowKeys[event.code]){event.preventDefault();heldKeys.add(arrowKeys[event.code]);}
    if(event.code==='KeyE'&&!event.repeat){event.preventDefault();$('centre-interact').click();}
    if(event.code==='Escape'&&!event.repeat){event.preventDefault();$('centre-pause').click();}return;
  }
  if(game&&['playing','countdown'].includes(game.status)){
    if(['trail','paddock'].includes(game.activity)&&['ArrowUp','ArrowDown'].includes(event.code)){event.preventDefault();if(!event.repeat)pressGait(event.code==='ArrowUp'?1:-1);return;}
    if(arrowKeys[event.code]){event.preventDefault();heldKeys.add(arrowKeys[event.code]);}
    if(event.code==='Space'){
      event.preventDefault();if(!event.repeat)jump(game);
    }
    if(event.code==='KeyR'&&!event.repeat&&game.status==='playing'&&resetToTarget(game)){event.preventDefault();notify('Te voilà bien placée pour le prochain saut !');}
  }
  if(event.code==='Escape'&&!event.repeat&&game&&['playing','countdown','paused'].includes(game.status)){event.preventDefault();pause();}
});
window.addEventListener('keyup',event=>{if(arrowKeys[event.code])heldKeys.delete(arrowKeys[event.code]);});
window.addEventListener('blur',()=>{releaseInputs();if(game&&['playing','countdown'].includes(game.status))pause();if(view==='paddock'&&paddock.state.status==='playing'){$('paddock-pause').click();}if(view==='centre'&&centre?.status==='playing')$('centre-pause').click();});
for(const button of document.querySelectorAll('[data-input]')){
  button.addEventListener('pointerdown',event=>{
    if(!game||!['playing','countdown'].includes(game.status))return;event.preventDefault();button.setPointerCapture(event.pointerId);touchKeys.add(button.dataset.input);button.classList.add('held');
    if(['trail','paddock'].includes(game.activity)&&['up','down'].includes(button.dataset.input))pressGait(button.dataset.input==='up'?1:-1);
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden)return;audio.stop();if(game&&['playing','countdown'].includes(game.status))pause();if(view==='paddock'&&paddock.state.status==='playing')$('paddock-pause').click();if(view==='centre'&&centre?.status==='playing')$('centre-pause').click();});
// Preserve the effort already made if the page is closed during a course.
window.addEventListener('pagehide',()=>{if(game&&!game.settled){settleRide(stable,chosen,game);save();}});
window.addEventListener('pageshow',event=>{if(event.persisted)goHome();});
function frame(now){
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(view==='stable'||['course','trail'].includes(view)&&game?.status!=='paused')clock+=dt;
  if(game&&['playing','countdown'].includes(game.status)){
    const events=advance(game,dt,inputState());
    if(events.includes('start')){startFlashUntil=now+650;audio.countdown(0);$('jump').disabled=false;notify(game.autoSteer?'Ton poney suit le chemin · Espace pour sauter':'← → pour tourner · Espace pour sauter');}
    if(events.includes('bump'))notify(game.maxMisses===null?'On continue ! Essaie de sauter le prochain obstacle.':`Obstacle manqué : ${game.bumps} / ${game.maxMisses} erreurs`);
    if(events.includes('log-stop'))notify('Un tronc ! Appuie sur Espace pour sauter, ou contourne-le.');
    if(events.includes('log-jump')){notify('Joli saut au-dessus du tronc !');audio.clear();}
    else if(events.includes('clear')){notify('Un obstacle réussi ! Bravo ! 🎀');audio.clear();}
    else if(events.includes('edge'))notify('Tourne pour rester dans la carrière, ou choisis Me replacer.');
    if(events.length||now-lastHudAt>=80){refreshRide();lastHudAt=now;}
    if(events.includes('finish')||events.includes('lose'))finish();
    if(game.status==='playing')audio.step(game.jumpActive?0:game.speed,dt);
    if(game.activity==='trail'){$('water-status').textContent=game.swimming?'♡ Baignade avec ton poney':game.waterDepth>.1?'Les sabots dans l’eau':'';audio.ambience(game.theme,dt,game.waterDepth>.1);}
  }
  const counting=game?.status==='countdown',hideCountdown=!(counting||game?.status==='playing'&&now<startFlashUntil);
  if($('countdown').hidden!==hideCountdown)$('countdown').hidden=hideCountdown;
  if(counting){if($('countdown-hint').textContent!=='Le départ approche')$('countdown-hint').textContent='Le départ approche';const number=Math.ceil(game.countdown);if($('countdown-number').textContent!==String(number))$('countdown-number').textContent=number;audio.countdown(number);}else if(now<startFlashUntil&&$('countdown-number').textContent!=='Partez !'){$('countdown-number').textContent='Partez !';$('countdown-hint').textContent='Bonne promenade, bonne aventure !';}
  if(victoryStarted!==null){
    if(celebration.render(now))audio.firework();
    if(now-victoryStarted>3600&&$('result').hidden){show('result');$('result').querySelector('[data-home]').focus({preventScroll:true});}
  }
  if(now>toastUntil)$('toast').classList.remove('visible');
  const activeEffect=effect&&now<effect.until?effect:null;
  updateActionUI(now);
  if(view==='stable'&&room)room.render(ponyState(),activeEffect,now);
  else if(view==='paddock'&&paddock){if($('entry-screen').hidden)paddock.step(dt,inputState());paddock.render(now);}
  else if(view==='centre'&&centre&&world){centreEvents(advanceCentre(centre,dt,inputState()));if(view==='centre'){const location=world.renderCentre(centre,stable.character,centre.status==='playing'?dt:0);if(location&&$('centre-location').textContent!==location)$('centre-location').textContent=location;updateCentreUI();updateCentreHotspots();}}
  else if(world)world.render(view,game,ponies[chosen],ponyState(),activeEffect,clock,dt,course);
  requestAnimationFrame(frame);
}
setView('stable');refreshStable();save();requestAnimationFrame(frame);
