import { createGame, jump, advance, COURSES, GROUND, HORSE_X } from './engine.mjs';
import { SAVE_KEY, NEEDS, restoreStable, care, mood, rideReadiness, settleRide } from './stable.mjs';

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
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

function rounded(x,y,w,h,r,color) {
  ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill();
}
function ellipse(x,y,rx,ry,color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function path(points, color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);
  for(const p of points.slice(1))ctx.lineTo(...p);
  ctx.closePath();ctx.fill();
}
function star(x,y,size,color) {
  const pts = Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5;const r=i%2?size*.46:size;return [x+Math.cos(a)*r,y+Math.sin(a)*r];});
  path(pts,color);
}
function cloud(x,y,s) {
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,0,45,12,'#ffffffb8');ellipse(-18,-8,20,18,'#ffffffb8');ellipse(11,-14,25,23,'#ffffffb8');ellipse(36,-2,20,12,'#ffffffb8');ctx.restore();
}
function tree(x,y,s) {
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  rounded(-5,-64,10,76,4,'#a9aa78');
  ellipse(-19,-72,33,37,'#a2bb82');ellipse(17,-83,34,42,'#a9c18a');ellipse(0,-110,28,29,'#b6ca94');
  ctx.restore();
}
function flower(x,y,s,color) {
  ctx.fillStyle='#8ca66b';ctx.fillRect(x-1,y,2,10*s);
  for(let i=0;i<5;i++){let a=i*Math.PI*.4;ellipse(x+Math.cos(a)*4*s,y+Math.sin(a)*4*s,3*s,3*s,color);}
  ellipse(x,y,2*s,2*s,'#e5b64f');
}
function horse(x,y,p,airborne,running,time,mounted=true,needs=null) {
  const bob = running && !airborne && !reducedMotion ? Math.sin(time*17)*3 : 0;
  const stride = running && !airborne ? Math.sin(time*17)*15 : 0;
  ctx.save();ctx.translate(x,y+bob);ctx.scale(1.12,1.12);
  // Tail and far legs.
  ctx.strokeStyle=p.mane;ctx.lineWidth=15;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-49,-64);ctx.bezierCurveTo(-83,-72,-63,-30,-88,-28);ctx.stroke();
  ctx.strokeStyle=p.coat;ctx.lineWidth=12;
  for(const [px,shift] of [[-31,-stride],[29,stride]]){
    ctx.beginPath();ctx.moveTo(px,-47);ctx.lineTo(px+shift*.4,-24);ctx.lineTo(px+shift,airborne?-13:-4);ctx.stroke();
    rounded(px+shift-8,airborne?-16:-8,17,8,3,'#5b5143');
  }
  ellipse(-3,-64,56,29,p.coat);
  // Upward-curving neck and a friendly muzzle.
  ctx.fillStyle=p.light;ctx.beginPath();ctx.moveTo(20,-69);ctx.bezierCurveTo(34,-89,28,-112,48,-124);ctx.lineTo(71,-110);ctx.lineTo(62,-58);ctx.closePath();ctx.fill();
  ctx.strokeStyle=p.mane;ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(47,-122);ctx.bezierCurveTo(28,-114,35,-94,24,-79);ctx.stroke();
  path([[47,-125],[44,-148],[57,-133]],p.coat);path([[63,-128],[68,-147],[73,-125]],p.light);
  path([[48,-130],[47,-141],[53,-132]],'#d0a18e');
  ctx.save();ctx.translate(65,-118);ctx.rotate(.3);ellipse(0,0,24,17,p.light);ellipse(19,5,16,13,p.coat);ctx.restore();
  // Forelock, eye, nostril, smile and bridle.
  path([[42,-131],[66,-138],[61,-119],[55,-129],[49,-120]],p.mane);
  ellipse(69,-121,3.3,4,'#3d3c35');ellipse(70,-122,1,1.2,'#fffef1');ellipse(93,-108,2.4,2,'#614c40');
  ctx.strokeStyle='#765a42';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(91,-108,7,.5,1.9);ctx.stroke();
  ctx.strokeStyle='#807858';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(80,-123);ctx.lineTo(78,-102);ctx.lineTo(57,-110);ctx.lineTo(32,-68);ctx.stroke();
  // Saddle blanket, saddle and stirrup.
  if(mounted) {
  rounded(-24,-89,49,31,8,p.saddle);rounded(-20,-88,41,7,3,'#f7e9ce');rounded(-13,-93,30,12,5,'#765640');
  ctx.strokeStyle='#f7e9ce';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-20,-65);ctx.lineTo(20,-65);ctx.stroke();
  ctx.strokeStyle='#765640';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(8,-82);ctx.lineTo(8,-57);ctx.stroke();
  ctx.strokeStyle='#dfc58a';ctx.beginPath();ctx.roundRect(1,-58,14,12,3);ctx.stroke();
  }
  if(needs && needs.clean<80){
    for(const [dx,dy,r] of [[-33,-65,7],[-22,-52,5],[22,-61,8],[-46,-57,4]])ellipse(dx,dy,r,r*.65,'#8c715866');
  }
  // Near legs.
  ctx.strokeStyle=p.light;ctx.lineWidth=12;
  for(const [px,shift] of [[-38,stride],[36,-stride]]){
    ctx.beginPath();ctx.moveTo(px,-48);ctx.lineTo(px+shift*.5,-25);ctx.lineTo(px+shift,airborne?-16:0);ctx.stroke();
    rounded(px+shift-7,airborne?-18:-7,17,8,3,'#655446');
  }
  if(mounted){
    // A young rider with boots, a fitted helmet and hands on the reins.
    ctx.strokeStyle='#554b54';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,-106);ctx.lineTo(17,-83);ctx.lineTo(9,-62);ctx.stroke();
    rounded(5,-69,14,9,3,'#49434b');
    ctx.fillStyle='#c67f8b';ctx.beginPath();ctx.moveTo(-10,-147);ctx.lineTo(9,-147);ctx.lineTo(18,-106);ctx.lineTo(-7,-106);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#c67f8b';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(6,-138);ctx.lineTo(22,-119);ctx.lineTo(35,-116);ctx.stroke();
    ellipse(36,-116,4,4,'#edc4a2');
    ctx.strokeStyle='#796c4b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(36,-116);ctx.quadraticCurveTo(54,-94,80,-112);ctx.stroke();
    ellipse(-6,-155,10,14,'#875c40');ellipse(2,-159,13,15,'#edc4a2');
    ellipse(3,-170,16,12,'#4e6f62');rounded(-11,-170,34,5,3,'#3c594e');
    ellipse(9,-159,1.5,2,'#49443b');
  }
  ctx.restore();
}
function fence(x,height,touched) {
  const y=GROUND-height;
  rounded(x-3,y-9,9,height+10,3,touched?'#c5b18a':'#f9efd7');
  rounded(x+44,y-9,9,height+10,3,touched?'#c5b18a':'#f9efd7');
  rounded(x-8,y+4,66,9,3,touched?'#c0ab82':game?.course==='garden'?'#dba1ac':game?.course==='forest'?'#9aab7e':'#eee0bc');
  rounded(x-8,y+25,66,8,3,touched?'#c0ab82':game?.course==='garden'?'#dba1ac':game?.course==='forest'?'#9aab7e':'#eee0bc');
  ellipse(x+1,y-10,6,4,'#fef8e9');ellipse(x+48,y-10,6,4,'#fef8e9');
}
function drawCourse() {
  const distance=game?.distance || 0;
  const sky=ctx.createLinearGradient(0,0,0,520);sky.addColorStop(0,'#d6eae6');sky.addColorStop(.6,'#edf1d5');sky.addColorStop(1,'#c6d9a4');
  ctx.fillStyle=sky;ctx.fillRect(0,0,1000,520);
  ellipse(798,86,38,38,'#fff2c1');ellipse(798,86,51,51,'#fff6cd32');
  for(let i=0;i<5;i++){const x=((i*290-distance*.07)%1450+1450)%1450-150;cloud(x,75+i%3*30,.7+i%2*.3);}
  ctx.fillStyle='#c5d6af';ctx.beginPath();ctx.moveTo(0,268);ctx.bezierCurveTo(180,150,250,215,420,260);ctx.bezierCurveTo(680,99,800,184,1000,245);ctx.lineTo(1000,520);ctx.lineTo(0,520);ctx.fill();
  ctx.fillStyle='#b4cd97';ctx.beginPath();ctx.moveTo(0,305);ctx.bezierCurveTo(180,240,355,260,500,300);ctx.bezierCurveTo(720,209,850,255,1000,290);ctx.lineTo(1000,520);ctx.lineTo(0,520);ctx.fill();
  for(let i=0;i<8;i++){const x=((i*190-distance*.25)%1520+1520)%1520-180;tree(x,309+i%2*15,.55+i%3*.13);}
  if(game?.course==='forest')for(let i=0;i<9;i++)tree(((i*147-distance*.35)%1323+1323)%1323-100,350,1.2);
  // Distant paddock.
  ctx.strokeStyle='#e9e8c6';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,330);ctx.lineTo(1000,330);ctx.moveTo(0,346);ctx.lineTo(1000,346);ctx.stroke();
  for(let i=-1;i<17;i++){let x=i*72-(distance*.4%72);rounded(x,317,5,44,2,'#eae8ca');}
  ctx.fillStyle='#c6d99f';ctx.fillRect(0,359,1000,161);
  ctx.fillStyle='#e7dcb8';ctx.beginPath();ctx.moveTo(0,389);ctx.quadraticCurveTo(480,375,1000,389);ctx.lineTo(1000,445);ctx.quadraticCurveTo(500,425,0,447);ctx.fill();
  ctx.fillStyle='#f1e6c8';ctx.fillRect(0,398,1000,16);
  for(let i=0;i<35;i++){
    let x=((i*97-distance*.85)%1160+1160)%1160-80;
    let y=460+(i*29%55);flower(x,y,.65+(i%3)*.22,i%3===0?'#f6e9b0':i%3===1?'#fffcdf':'#d8c6d9');
  }
  if(game){
    for(const obstacle of game.obstacles){const x=obstacle.x-distance;if(x>-80&&x<1080)fence(x,obstacle.height,obstacle.touched);}
    for(const s of game.collectibles){const x=s.x-distance;if(!s.collected&&x>-30&&x<1030){
      const y=GROUND-s.height+(reducedMotion?0:Math.sin(clock*3+s.x)*3);
      ellipse(x,y,20,20,'#fff6bd50');star(x,y,14,'#e4ac42');star(x-2,y-2,8,'#f6ce68');
    }}
    const finishX=game.finish+HORSE_X-distance;
    if(finishX<1030){rounded(finishX,GROUND-147,8,151,3,'#9c9c6c');path([[finishX+8,GROUND-145],[finishX+100,GROUND-145],[finishX+84,GROUND-124],[finishX+100,GROUND-103],[finishX+8,GROUND-103]],'#fcf6dd');ctx.fillStyle='#678459';ctx.font='bold 14px Trebuchet MS';ctx.fillText('BRAVO !',finishX+17,GROUND-119);}
  }else{
    fence(740,50,false);star(660,GROUND-112,14,'#e4b153');
  }
  const height=game?.height||0;
  ellipse(HORSE_X-3,GROUND+7,Math.max(24,63-height*.15),8,'#6c81512b');
  horse(HORSE_X,GROUND-height,ponies[chosen],height>0,game?.status==='playing',clock);
  // Foreground tufts.
  for(let i=0;i<12;i++){const x=((i*113-distance*.95)%1200+1200)%1200-70;ctx.strokeStyle='#92ad72';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,513);ctx.lineTo(x-4,501);ctx.moveTo(x,513);ctx.lineTo(x+4,496);ctx.stroke();}
}

function drawStable(now) {
  const p=ponies[chosen], needs=ponyState();
  const wall=ctx.createLinearGradient(0,0,0,520);wall.addColorStop(0,'#e7d1aa');wall.addColorStop(1,'#f6e9c9');
  ctx.fillStyle=wall;ctx.fillRect(0,0,1000,520);
  // Warm wooden boards and structural beams.
  for(let x=0;x<1000;x+=64){ctx.fillStyle=x%128===0?'#b9946330':'#fff4ce25';ctx.fillRect(x,0,62,391);ctx.fillStyle='#aa875021';ctx.fillRect(x,0,2,391);}
  rounded(0,0,1000,26,0,'#94764f');rounded(57,0,21,414,3,'#a6875b');rounded(918,0,22,414,3,'#a6875b');
  rounded(0,90,1000,14,0,'#bb9b6b');
  // Window looking out onto the paddock.
  rounded(605,116,210,181,12,'#977a51');rounded(617,127,186,157,6,'#d6e8df');
  ctx.save();ctx.beginPath();ctx.rect(617,127,186,157);ctx.clip();
  ellipse(755,160,22,22,'#fff0ba');cloud(640,166,.7);
  ellipse(711,301,147,76,'#c2d6a6');tree(787,280,.7);ctx.restore();
  rounded(703,122,9,165,0,'#c0a173');rounded(614,200,191,8,0,'#c0a173');rounded(597,282,227,13,4,'#ab8c5b');
  // Open top of the stall and its lower timber panels.
  rounded(103,124,389,18,3,'#a88a5b');rounded(103,124,13,270,0,'#b29462');rounded(479,124,13,270,0,'#b29462');
  for(let x=128;x<480;x+=32)rounded(x,141,5,180,2,'#c3aa7b');
  rounded(103,304,389,100,0,'#c9ab77');
  for(let x=116;x<490;x+=47)rounded(x,305,2,98,0,'#b5935f');
  rounded(103,299,389,13,2,'#b19260');
  ctx.fillStyle='#c6ad7a';ctx.fillRect(0,394,1000,126);
  ellipse(500,456,230,28,'#a98e6138');
  // Soft straw bedding.
  for(let i=0;i<100;i++){
    let x=90+(i*137%820), y=410+(i*37%100);
    ctx.strokeStyle=i%2?'#edcf88':'#dcc083';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+11+(i%9),y-4);ctx.stroke();
  }
  // Hay rack, water bucket and hanging grooming tools.
  rounded(155,315,119,68,7,'#ac986b');
  for(let i=0;i<26;i++){ctx.strokeStyle=i%2?'#d3bf6c':'#e3cd78';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(163+i*4,365);ctx.lineTo(155+i*5,316-i%3*7);ctx.stroke();}
  for(let x=160;x<280;x+=24)rounded(x,331,4,55,1,'#8e8c66');
  rounded(747,397,65,61,12,'#88aaa3');ellipse(779,398,32,10,'#6e9795');ellipse(779,397,25,6,'#bed7cc');
  ctx.strokeStyle='#527a75';ctx.lineWidth=3;ctx.beginPath();ctx.arc(779,394,27,Math.PI,Math.PI*2);ctx.stroke();
  rounded(851,203,48,6,3,'#aa8456');rounded(863,217,23,35,5,'#cf9e86');
  for(let i=0;i<6;i++)rounded(866+i*3,249,2,8,0,'#8c7356');
  const action=effect&&now<effect.until?effect.action:null;
  const wobble=action==='hay'||action==='carrot'?Math.sin(clock*6)*2:0;
  ctx.save();ctx.translate(489,449+wobble);ctx.scale(1.7,1.7);
  horse(0,0,p,false,false,clock,false,needs);ctx.restore();
  // A visible reaction to each care action.
  if(action){
    const t=(now-effect.started)/1000;
    ctx.font='40px system-ui';ctx.textAlign='center';
    if(action==='hay'||action==='carrot')ctx.fillText(action==='hay'?'🌾':'🥕',658,280+Math.sin(t*5)*5);
    if(action==='brush'){
      ctx.fillText('🧽',460+Math.sin(t*7)*68,335+Math.cos(t*7)*12);
      for(let i=0;i<6;i++)star(370+i*34,285+Math.sin(t*5+i)*14,5,'#ffefad');
    }
    if(action==='rest'){ctx.fillStyle='#7b93a1';ctx.font='bold 26px Georgia';ctx.fillText('z z Z',580,180-Math.sin(t)*10);}
    if(action==='pet'){ctx.fillText('💕',530,185-t%1.5*28);}
    ctx.textAlign='left';
  }
  // The pony’s mood is visible in the scene as well as in its status card.
  ctx.font='29px system-ui';ctx.fillText(mood(needs).icon,570,135);
}

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
  $('readiness').textContent=rideReadiness(needs)||'Prête pour un parcours ensemble ?';
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
function refreshRide() {
  $('stars').textContent=game?.stars||0;
  $('cleared').textContent=`${game?.cleared||0}/${game?.obstacles.length||COURSES[course].count}`;
  const progress=Math.floor((game?.distance||0)/(game?.finish||1)*100);
  $('progress-fill').style.width=progress+'%';$('progress').setAttribute('aria-valuenow',progress);
  $('progress-label').textContent=`${progress} % du parcours`;
}
function show(panel) {
  $('overlay').hidden=!panel;
  for(const id of ['welcome','paused','result'])$(id).hidden=id!==panel;
}
function setView(next) {
  view=next;canvas.classList.toggle('in-stable',view==='stable');
  for(const id of ['care-panel','stable-bubble','stable-caption','box-tag'])$(id).hidden=view!=='stable';
  for(const id of ['ride-hud','ride-progress','course-panel'])$(id).hidden=view!=='course';
  $('controls').hidden=true;$('pause').hidden=true;
  for(const [id,selected] of [['stable-tab',view==='stable'],['course-tab',view==='course']]){
    if(selected)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');
  }
  canvas.setAttribute('aria-label',view==='stable'?'Ton poney dans son écurie. Utilise les boutons en dessous pour le nourrir, le brosser, le câliner ou le reposer.':'Une cavalière sur son poney. Espace, flèche haute ou Sauter pour sauter les obstacles.');
}
function lockChoices(locked) {
  document.querySelectorAll('[data-pony], [data-pace], [data-course]').forEach(button=>button.disabled=locked);
}
function coursePreview() {
  const reason=rideReadiness(ponyState());
  if(reason){goHome();$('care-message').textContent=reason;$('announcer').textContent=reason;$('care-panel').scrollIntoView({block:'nearest'});return;}
  if(game&&!game.settled)settleRide(stable,chosen,game);
  game=null;setView('course');lockChoices(false);refreshStable();refreshRide();
  const config=COURSES[course];
  $('place-name').textContent=config.name.toUpperCase();$('course-title').textContent=config.name;
  $('course-icon').textContent=config.icon;$('course-description').textContent=config.description;
  const preview=createGame(pace,course);
  $('duration').textContent=`${config.count} obstacles · environ ${Math.round(preview.finish/preview.speed)} secondes · aucune défaite`;
  show('welcome');$('start').focus({preventScroll:true});save();
  if(matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});
}
function goHome() {
  if(game)settleRide(stable,chosen,game);
  game=null;effect=null;setView('stable');show(null);lockChoices(false);$('jump').disabled=true;
  $('stable-bubble').textContent=`${ponies[chosen].name} est bien dans son petit chez-soi. ♡`;
  refreshStable();save();
}
function start() {
  if(rideReadiness(ponyState())){goHome();return;}
  game=createGame(pace,course);last=0;show(null);refreshRide();lockChoices(true);
  $('course-panel').hidden=true;$('controls').hidden=false;$('pause').hidden=false;$('jump').disabled=false;
  $('pause').innerHTML='Ⅱ <span>Pause</span>';$('pause').setAttribute('aria-label','Mettre en pause');
  $('announcer').textContent=`Tu es en selle sur ${ponies[chosen].name}. Le parcours commence !`;
  notify('En selle ! Espace ou Sauter pour faire un bond.');
  $('jump').focus({preventScroll:true});
  if(matchMedia('(max-width:700px)').matches)$('scene').scrollIntoView({block:'center'});
}
function pause() {
  if(!game||!['playing','paused'].includes(game.status))return;
  const paused=game.status==='playing';game.status=paused?'paused':'playing';last=0;
  show(paused?'paused':null);$('jump').disabled=paused;
  $('pause').innerHTML=paused?'▶ <span>Reprendre</span>':'Ⅱ <span>Pause</span>';
  $('pause').setAttribute('aria-label',paused?'Reprendre le parcours':'Mettre en pause');
  (paused?$('resume'):$('jump')).focus({preventScroll:true});
}
function finish() {
  settleRide(stable,chosen,game);save();refreshStable();show('result');
  $('pause').hidden=true;$('jump').disabled=true;
  $('result-text').textContent=`Avec ${ponies[chosen].name}, tu as réussi ${game.cleared} obstacles sur ${game.obstacles.length} et récolté ${game.stars} étoiles ! Après l’effort, un petit brossage et du repos lui feront plaisir.`;
  $('announcer').textContent=$('result-text').textContent;
  $('result').querySelector('[data-home]').focus({preventScroll:true});
}
function doCare(action) {
  if(view!=='stable'||!care(ponyState(),action))return;
  const name=ponies[chosen].name;
  const messages={hay:`${name} croque son foin. Miam, un bon repas !`,carrot:`Croc ! ${name} adore cette petite friandise.`,brush:`Son pelage devient tout doux. Encore un coup de brosse ?`,pet:`${name} se blottit contre toi. Quelle belle amitié !`,rest:`Chut… ${name} reprend des forces dans son box douillet.`};
  effect={action,started:performance.now(),until:performance.now()+2500};
  $('care-message').textContent=messages[action];$('stable-bubble').textContent=messages[action];
  for(const button of document.querySelectorAll('[data-care]'))button.classList.toggle('done',button.dataset.care===action);
  refreshStable();save();
}
for(const button of document.querySelectorAll('[data-care]'))button.addEventListener('click',()=>doCare(button.dataset.care));
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
for(const button of document.querySelectorAll('[data-home]'))button.addEventListener('click',()=>{goHome();$('mount').focus({preventScroll:true});});
$('mount').addEventListener('click',coursePreview);$('course-tab').addEventListener('click',()=>{
  if(view==='course'&&game&&['playing','paused'].includes(game.status))return;
  coursePreview();
});
$('start').addEventListener('click',start);$('again').addEventListener('click',coursePreview);
$('pause').addEventListener('click',pause);$('resume').addEventListener('click',pause);
$('jump').addEventListener('click',()=>{if(game)jump(game);});
canvas.addEventListener('pointerdown',()=>{if(view==='stable')doCare('pet');else if(game)jump(game);});
window.addEventListener('keydown',event=>{
  if((event.code==='Space'||event.code==='ArrowUp')&&game?.status==='playing'){
    if(event.code==='Space'&&event.target instanceof HTMLButtonElement&&event.target!==$('jump'))return;
    event.preventDefault();if(!event.repeat)jump(game);
  }
  if(event.code==='Escape'&&game&&['playing','paused'].includes(game.status)){event.preventDefault();pause();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game?.status==='playing')pause();});
// Preserve the effort already made if the page is closed during a course.
window.addEventListener('pagehide',()=>{if(game&&!game.settled){settleRide(stable,chosen,game);save();}});
window.addEventListener('pageshow',event=>{if(event.persisted)goHome();});
function frame(now){
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(view==='stable'||game?.status==='playing')clock+=dt;
  if(game?.status==='playing'){
    const events=advance(game,dt);
    if(events.includes('bump'))notify('Tout va bien, on continue ! ♡');
    else if(events.includes('clear'))notify('Un obstacle réussi ! Bravo ! 🎀');
    else if(events.includes('star'))notify('Une étoile de plus ! ★');
    refreshRide();if(events.includes('finish'))finish();
  }
  if(now>toastUntil)$('toast').classList.remove('visible');
  if(view==='stable')drawStable(now);else drawCourse();
  requestAnimationFrame(frame);
}
setView('stable');refreshStable();save();requestAnimationFrame(frame);
