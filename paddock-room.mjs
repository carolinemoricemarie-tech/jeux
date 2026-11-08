import { createPaddock,advancePaddock,paddockCommand,targetPlayer,LUNGE_RADIUS } from './paddock.mjs';
import { CHARACTERS } from './characters.mjs';
import { actorAtlas,drawActor } from './actor-atlas.mjs';
import { walkingPose,idlePose,cyclePose,damp,facingDirection,detailPose,clamp } from './animation.mjs';
import { PONIES } from './ponies.mjs';
import { ZONES,projectEstate,advanceEstate,visitPortal } from './estate.mjs';
function atlas(image,columns,rows){
  const w=Math.floor(image.width/columns),h=Math.floor(image.height/rows),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),cells=[];
  for(let i=0;i<columns*rows;i++){
    ctx.clearRect(0,0,w,h);ctx.drawImage(image,i%columns*w,Math.floor(i/columns)*h,w,h,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h).data;let left=w,right=0,top=h,bottom=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>80){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    cells.push({left,right,top,bottom});
  }
  return{image,w,h,columns,cells,maxHeight:Math.max(...cells.map(b=>b.bottom-b.top+1))};
}
export class PaddockRoom {
  constructor(root,photos,{audio,onReward=()=>{},onEnterBox=()=>{},onZone=()=>{},onExit=()=>{},reducedMotion=false}={}){
    this.root=root;this.photos=photos;this.audio=audio;this.onReward=onReward;this.onEnterBox=onEnterBox;this.onZone=onZone;this.onExit=onExit;this.reduced=reducedMotion;
    this.canvas=root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.held=new Set();this.state=createPaddock();this.cache=new Map();
    this.ponyAtlas=atlas(photos.ponyFree,4,4);this.horseMotion=actorAtlas(photos.ponyFree,4,4);this.ballAtlas=atlas(photos.playBall,1,1);this.lastRender=-1000;
    for(const b of root.querySelectorAll('[data-paddock-command]'))b.addEventListener('click',()=>{this.audio.unlock();const command=b.dataset.paddockCommand;if(paddockCommand(this.state,command)){if(command==='call')this.audio.snort();const messages={ball:'Le ballon est lancé ! Ton poney part le chercher.',call:'Viens, mon poney !',lunge:'Rejoins le centre, puis choisis une allure.',free:'À vous de jouer ! Déplace-toi ou lance le ballon.',reverse:'On change de main en douceur.',stop:'Arrêt. Ton poney se repose.',walk:'Au pas, tout tranquillement.',trot:'Au trot !',gallop:'Au galop ! Regarde ton poney courir.'};this.message(messages[command]);this.updateUI();}});
    root.querySelector('#paddock-pause').addEventListener('click',()=>{this.state.status=this.state.status==='playing'?'paused':'playing';this.release();this.updateUI();});
    root.querySelector('#paddock-exit').addEventListener('click',()=>{this.release();this.onExit();});
    this.canvas.addEventListener('pointerdown',event=>{
      if(this.state.status!=='playing')return;
      const b=this.canvas.getBoundingClientRect(),x=(event.clientX-b.x)/b.width*1200,y=(event.clientY-b.y)/b.height*800;
      const zone=ZONES[this.state.zone];if(y<zone.ground||y>zone.ground+zone.depth)return;const depth=(y-zone.ground)/zone.depth,scale=.82+depth*.36;
      this.state.portal=null;targetPlayer(this.state,(x-600)/(zone.side*scale),depth*8.4-4.2);this.audio.unlock();
    });
    for(const b of root.querySelectorAll('[data-paddock-input]')){
      b.addEventListener('pointerdown',event=>{event.preventDefault();b.setPointerCapture(event.pointerId);this.held.add(b.dataset.paddockInput);this.state.target=null;});
      for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>this.held.delete(b.dataset.paddockInput));
    }
  }
  open(character,ponyId='noisette'){
    this.pony=PONIES[ponyId]||PONIES.noisette;
    const base=this.pony.kind==='unicorn'?this.photos.unicornFree:this.pony.kind==='white'?this.photos.whiteFree:this.photos.ponyFree;
    const gallop=this.pony.kind==='bay'?this.photos.ponyGallop:base;
    this.horseMotion=actorAtlas(base,4,4);this.gallopMotion=actorAtlas(gallop,4,4);
    this.character=character;const image=this.photos.characters[character]?.paddock||this.photos.demoPaddock;
    if(!image)throw new Error('Personnage de l’enclos indisponible.');
    if(!this.cache.has(image))this.cache.set(image,atlas(image,4,2));
    this.actor=this.cache.get(image);const motion=this.photos.characters[character]?.paddockMotion;
    this.motion=motion?actorAtlas(motion):null;this.lastRender=-1000;this.walkBlend=0;this.lastUI='';this.horseDirection=3;
    this.state=createPaddock({age:CHARACTERS[character]?.age});this.release();this.message('Flèches ou clic sur l’herbe pour marcher. Appelle ton poney ou lance le ballon.');this.updateUI();
  }
  release(){this.held.clear();}
  message(text){if(text)this.root.querySelector('#paddock-message').textContent=text;}
  updateUI(){
    const s=this.state;
    const key=[s.mode,s.gait,s.direction,s.laps,s.games,s.status,s.zone,s.portal].join(':');if(key===this.lastUI)return;this.lastUI=key;
    this.root.dataset.mode=s.mode;
    this.root.dataset.zone=s.zone;
    for(const b of this.root.querySelectorAll('[data-paddock-command]')){
      const command=b.dataset.paddockCommand,selected=['free','lunge'].includes(command)?s.mode===command:['walk','trot','gallop','stop'].includes(command)?s.gait===command:false;
      if(['free','lunge','walk','trot','gallop','stop'].includes(command))b.setAttribute('aria-pressed',selected);
      b.classList.toggle('active',selected);
    }
    const outside=s.zone!=='paddock';this.root.querySelector('.paddock-modes').hidden=outside;this.root.querySelector('#paddock-gaits').hidden=outside;
    this.root.querySelector('#free-actions').hidden=outside||s.mode!=='free';this.root.querySelector('#lunge-actions').hidden=outside||s.mode!=='lunge';
    this.root.querySelector('#paddock-steering').hidden=s.mode!=='free';
    this.root.querySelector('#paddock-pause').textContent=s.status==='paused'?'Reprendre':'Pause';
    this.root.querySelector('#paddock-score').textContent=outside?ZONES[s.zone].name:s.mode==='lunge'?'Tours : '+s.laps+' / 3 · '+(s.direction===1?'Main gauche':'Main droite'):'Ballons rapportés : '+s.games;
    const portals=this.root.querySelector('#estate-portals');portals.replaceChildren();
    if(s.mode==='free')for(const portal of ZONES[s.zone].portals){
      const b=document.createElement('button'),point=projectEstate(portal.x,portal.z,s.zone);b.className='estate-portal';b.dataset.portal=portal.id;b.textContent=(s.portal===portal.id?'→ ':'')+portal.label;b.style.left=point.x/12+'%';b.style.top=(point.y-28)/8+'%';
      b.addEventListener('click',()=>{if(s.zone==='paddock'&&portal.id==='yard'){this.release();this.onExit();return;}if(visitPortal(s,portal.id)){this.message('Ta cavalière marche vers '+portal.label.toLowerCase()+'.');this.updateUI();}});portals.append(b);
    }
  }
  step(dt,input){
    const combined=Object.fromEntries(['left','right','up','down'].map(k=>[k,input[k]||this.held.has(k)]));
    const events=advanceEstate(this.state,dt,combined);
    for(const event of events){if(event?.type==='box')this.onEnterBox(event.pony);if(event?.type==='zone'){this.onZone(ZONES[event.zone].name);this.message('Tu peux marcher et choisir une porte pour continuer.');if(!this.reduced)this.canvas.animate([{opacity:.3},{opacity:1}],{duration:350});}}
    if(events.includes('ball-found'))this.message('Bravo ! Le poney revient vers toi avec le ballon.');
    if(events.includes('ball-return')){this.message('Ballon rapporté ! Votre complicité grandit.');this.audio.snort();this.onReward('ball');}
    if(events.includes('training-complete')){this.message('Trois tours tout en douceur. Bravo à votre équipe !');this.audio.clear();this.onReward('lunge');}
    if(this.state.status==='playing')this.audio.step(this.state.horse.speed,dt);
    this.updateUI();
  }
  drawFigure(data,index,point,height,flip=false){
    const b=data.cells[index],scale=height/data.maxHeight,w=(b.right-b.left+1)*scale,h=(b.bottom-b.top+1)*scale,c=this.ctx;
    c.save();c.translate(point.x,point.y);if(flip)c.scale(-1,1);
    c.drawImage(data.image,index%data.columns*data.w+b.left,Math.floor(index/data.columns)*data.h+b.top,b.right-b.left+1,b.bottom-b.top+1,-w/2,-h,w,h);c.restore();
    return{width:w,height:h,x:point.x,y:point.y};
  }
  shadow(point,w){const c=this.ctx;c.save();c.translate(point.x,point.y);c.scale(w,9*point.scale);const g=c.createRadialGradient(0,0,.1,0,0,1);g.addColorStop(0,'#28311955');g.addColorStop(1,'#28311900');c.fillStyle=g;c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fill();c.restore();}
  render(now){
    if(now-this.lastRender<1000/60-1)return;
    const dt=this.lastRender<0?0:Math.min(.1,(now-this.lastRender)/1000);this.lastRender=now;
    const c=this.ctx,s=this.state,project=(x,z)=>projectEstate(x,z,s.zone),p=project(s.player.x,s.player.z),h=project(s.horse.x,s.horse.z);
    c.clearRect(0,0,1200,800);c.drawImage(this.photos[ZONES[s.zone].image],0,0,1200,800);
    this.shadow(p,27*p.scale);this.shadow(h,68*h.scale);
    const direction=facingDirection(s.horse.vx,s.horse.vz,this.horseDirection);this.horseDirection=direction;
    const actorIndex=s.player.speed>.06?Math.floor(s.time*4)%4:s.mode==='lunge'?4+(this.reduced?1:Math.floor(s.time*.7)%4):0;
    const actorHeight=(this.photos.characters[this.character]?this.character==='emmy'?1.1:1.3:1.65)*135*p.scale,horseHeight=1.62*135*h.scale;
    if(s.mode==='lunge'){
      c.strokeStyle='#fff4cc80';c.lineWidth=2;c.setLineDash([5,9]);c.beginPath();
      for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,q=project(Math.sin(a)*LUNGE_RADIUS,Math.cos(a)*LUNGE_RADIUS);if(!i)c.moveTo(q.x,q.y);else c.lineTo(q.x,q.y);}c.stroke();c.setLineDash([]);
      const from={x:p.x+actorHeight*.09,y:p.y-actorHeight*.44},to={x:h.x+(direction===0?1:direction===2?-1:0)*horseHeight*.34,y:h.y-horseHeight*(direction===1?.83:direction===3?.66:.69)};
      c.lineWidth=2.2;c.strokeStyle='#5f4430';c.beginPath();c.moveTo(from.x,from.y);c.quadraticCurveTo((from.x+to.x)/2,(from.y+to.y)/2+25,to.x,to.y);c.stroke();
    }
    let pose=null,standingPose=null;
    if(this.motion){
      const moving=s.player.speed>.04,walk=walkingPose(s.player.travel,CHARACTERS[this.character]?.age);
      this.walkBlend=damp(this.walkBlend,moving?1:0,12,s.status==='playing'?dt:0);
      standingPose=this.reduced?{from:8,to:8,mix:0}:s.mode==='lunge'?cyclePose(s.time*.75,4,12):idlePose(s.time);
      pose=this.reduced?{from:walk.from,to:walk.from,mix:0}:detailPose(walk);
      if(this.reduced)this.walkBlend=moving?1:0;
      this.canvas.dataset.actorPose=(this.walkBlend>.5?pose.from:standingPose.from)+':'+this.walkBlend.toFixed(3)+':'+standingPose.mix.toFixed(3);
    }
    const horsePose=s.horse.speed<.08?{from:direction*4,to:direction*4,mix:0}:cyclePose(s.horse.travel/(s.gait==='gallop'?2.6:s.gait==='trot'?1.8:1.25)*4,4,direction*4);
    if(this.reduced){horsePose.to=horsePose.from;horsePose.mix=0;}
    const subjects=[{z:s.player.z,draw:()=>this.motion?drawActor(c,this.motion,pose,p.x,p.y,actorHeight,{flip:s.mode==='free'&&s.player.facing<0,breath:this.reduced?0:Math.sin(s.time*2)*.002,other:standingPose,weight:clamp((this.walkBlend-.45)/.1)}):this.drawFigure(this.actor,actorIndex,p,actorHeight,s.mode==='free'&&s.player.facing<0)},{z:s.horse.z,draw:()=>drawActor(c,s.gait==='gallop'?this.gallopMotion:this.horseMotion,detailPose(horsePose),h.x,h.y,horseHeight,{breath:this.reduced?0:Math.sin(s.time*1.6)*.0015})}];
    if(s.ball){const ball=s.ball;subjects.push({z:ball.z,draw:()=>{
      const progress=Math.min(1,ball.time),q=project(ball.fromX+(ball.x-ball.fromX)*progress,ball.fromZ+(ball.z-ball.fromZ)*progress),radius=13*q.scale,bounce=ball.time<1?Math.sin(progress*Math.PI)*90:0;
      this.shadow(q,18*q.scale);this.drawFigure(this.ballAtlas,0,{x:q.x,y:q.y-bounce},radius*2);
    }});}
    subjects.sort((a,b)=>a.z-b.z).forEach(o=>o.draw());
    if(s.target&&s.mode==='free'){const q=project(s.target.x,s.target.z);c.strokeStyle='#fff9d3cc';c.lineWidth=2;c.beginPath();c.ellipse(q.x,q.y,12*q.scale,5*q.scale,0,0,Math.PI*2);c.stroke();}
    if(s.status==='paused'){c.fillStyle='#17342560';c.fillRect(0,0,1200,800);c.font='bold 38px Trebuchet MS';c.fillStyle='#fff9e8';c.textAlign='center';c.fillText('Petite pause',600,370);}
    this.canvas.dataset.playerX=s.player.x.toFixed(2);this.canvas.dataset.playerZ=s.player.z.toFixed(2);this.canvas.dataset.horseX=s.horse.x.toFixed(2);this.canvas.dataset.horseZ=s.horse.z.toFixed(2);
    this.canvas.dataset.direction=direction;const name=this.photos.characters[this.character]?CHARACTERS[this.character].name:'La cavalière';this.canvas.setAttribute('aria-label',name+' et son poney '+(s.mode==='lunge'?'en longe, '+s.laps+' tours.':'en liberté.'));
  }
}
