export const BOXES=Array.from({length:6},(_,i)=>({id:'box'+i,side:i%2?-1:1,x:i%2?-7.6:7.6,z:-3.8-Math.floor(i/2)*7.6,pony:['noisette','nuage','etoile',null,null,null][i],name:['Noisette','Nuage','Étoile','Box des invités','Réserve de foin','Box au calme'][i]}));
export const CENTRE_BOUNDS={minX:-29,maxX:29,minZ:-30,maxZ:30};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createCentre({age=8,progress={}}={}){
  return {status:'playing',time:0,player:{x:0,z:13,heading:0,speed:0,travel:0,gaitTravel:0},target:null,path:[],pending:null,walkSpeed:age===5?1.8:2.1,doors:{...Object.fromEntries(BOXES.map(b=>[b.id,progress.doors?.[b.id]===true])),sellerie:progress.doors?.sellerie===true},jobs:{...progress.jobs},action:null,actionUntil:0};
}
export function placeInCourtyard(s){
  s.status='playing';s.target=null;s.path=[];s.pending=null;s.action=null;s.actionUntil=s.time;s.cameraYaw=0;s.cameraHeight=undefined;
  Object.assign(s.player,{x:0,z:14,heading:0,speed:0});return s;
}
export function centreBlocked(s,x,z){
  if(x<CENTRE_BOUNDS.minX||x>CENTRE_BOUNDS.maxX||z<CENTRE_BOUNDS.minZ||z>CENTRE_BOUNDS.maxZ)return true;
  if(Math.abs(z-3)<.38&&Math.abs(x)>4&&Math.abs(x)<12.65)return true;
  if(Math.abs(z+25.4)<.35&&Math.abs(x)<12.65)return true;
  if(Math.abs(Math.abs(x)-12.4)<.38&&z<3.2&&z>-25.6)return true;
  if(z<2.5&&z>-25.1&&Math.abs(x)<12.2){
    if(Math.abs(x)>3.0&&[-7.6,-15.2].some(w=>Math.abs(z-w)<.32))return true;
    if(Math.abs(Math.abs(x)-3.3)<.4){
      const box=BOXES.find(b=>b.side===Math.sign(x)&&Math.abs(z-b.z)<1.22);
      if(!box||!s.doors[box.id])return true;
    }
  }
  // Solid side buildings; the courtyard and their outdoor work areas stay open.
  if(Math.abs(x+24)<.35&&z<-3.6&&z>-18.4)return true;
  if((Math.abs(z+18)<.35||Math.abs(z+4)<.35)&&x<-15.5&&x>-24.4)return true;
  if(Math.abs(x+16)<.35&&z<-3.6&&z>-18.4&&(Math.abs(z+9)>1.25||!s.doors.sellerie))return true;
  return false;
}
export function centreLocation(s){
  const p=s.player;
  if(p.z<3&&Math.abs(p.x)<12){const box=BOXES.find(b=>b.side===Math.sign(p.x)&&Math.abs(p.z-b.z)<3.6);return Math.abs(p.x)>3.7&&box?'Box · '+box.name:'L’allée des boxes';}
  return p.x<-16&&p.z<-4&&p.z>-18?'La sellerie':p.x>15?'L’aire de pansage':p.x<-15&&p.z>7?'La grange à foin':'La cour du centre équestre';
}
export function centreInteractions(s){
  const p=s.player,items=[];
  for(const box of BOXES){
    items.push({id:'door:'+box.id,x:box.side*3.3,z:box.z,label:(s.doors[box.id]?'Fermer':'Ouvrir')+' · '+box.name,box:box.id});
    if(box.pony){
      items.push({id:'care:'+box.id,x:box.x,z:box.z,label:'Prendre soin de '+box.name,box:box.id,pony:box.pony});
      items.push({id:'water:'+box.id,x:box.side*10.8,z:box.z+2,label:'Remplir l’abreuvoir',box:box.id,pony:box.pony});
      items.push({id:'hay:'+box.id,x:box.side*10.8,z:box.z-2,label:'Ajouter du foin',box:box.id,pony:box.pony});
      items.push({id:'clean:'+box.id,x:box.x,z:box.z+2,label:'Nettoyer la paille',box:box.id,pony:box.pony});
    }
  }
  items.push({id:'paddock',x:23,z:15,label:'Entrer dans l’enclos'},{id:'tack',x:-15.8,z:-9,label:(s.doors.sellerie?'Fermer':'Ouvrir')+' la sellerie'},
    {id:'groom',x:19,z:8,label:'Brosser mon poney',pony:s.pony||'noisette',action:'brush'},
    {id:'rides',x:0,z:28,label:'Partir en balade'},
    {id:'snack',x:-18,z:17,label:'Offrir une carotte',pony:s.pony||'noisette',action:'carrot'});
  for(const [i,item]of ['pad','saddle','bridle'].entries())items.push({id:'equip:'+item,x:-22.8,z:-16+i*4,label:['Prendre le tapis','Prendre la selle','Prendre le filet'][i],pony:s.pony||'noisette',item});
  return items.map(item=>({...item,distance:Math.hypot(p.x-item.x,p.z-item.z)}));
}
export function nearestCentreInteraction(s){return centreInteractions(s).sort((a,b)=>a.distance-b.distance)[0];}
export function activateCentreObject(s,id){
  if(s.status!=='playing'||s.actionUntil>s.time)return [];
  const item=centreInteractions(s).find(i=>i.id===id);if(!item)return [];
  if(id.startsWith('door:')){
    const box=BOXES.find(b=>b.id===item.box),inside=centreLocation(s)==='Box · '+box.name;
    s.doors[box.id]=true;
    walkCentreTo(s,inside?box.side*1.6:box.side*5.7,inside?box.z:box.z+1.6);
    return [{type:'door',box:box.id,open:true}];
  }
  if(item.distance<=3)return interactCentre(s,item);
  walkCentreTo(s,item.x,item.z);s.pending=item;return [];
}
export function walkCentreTo(s,x,z){
  if(s.status!=='playing')return false;s.path=[];s.pending=null;
  const p=s.player,inBarn=(x,z)=>Math.abs(x)<12&&z<3&&z>-25,inTack=(x,z)=>x<-16&&x>-24&&z<-4&&z>-18;
  const currentBarn=inBarn(p.x,p.z),targetBarn=inBarn(x,z),currentTack=inTack(p.x,p.z),targetTack=inTack(x,z),currentWest=p.x<-12&&p.z<3,targetWest=x<-12&&z<3;
  const currentBox=currentBarn&&Math.abs(p.x)>3.7?BOXES.find(b=>b.side===Math.sign(p.x)&&Math.abs(p.z-b.z)<3.7):null;
  const targetBox=targetBarn&&Math.abs(x)>3.7?BOXES.find(b=>b.side===Math.sign(x)&&Math.abs(z-b.z)<3.7):null;
  if(currentBox&&currentBox!==targetBox){s.doors[currentBox.id]=true;s.path.push({x:currentBox.side*5,z:currentBox.z},{x:currentBox.side*2,z:currentBox.z},{x:0,z:currentBox.z});}
  if(currentTack&&!targetTack){s.doors.sellerie=true;s.path.push({x:-19,z:-9},{x:-15,z:-9},{x:-13,z:-9});}
  if(currentBarn&&!targetBarn)s.path.push({x:0,z:Math.min(p.z,0)},{x:0,z:5});
  if(currentWest&&!targetWest)s.path.push({x:-13,z:5});
  if(targetWest&&!currentWest)s.path.push({x:-13,z:5});
  if(targetBarn&&!currentBarn)s.path.push({x:0,z:5},{x:0,z:-1});
  if(targetBox&&currentBox!==targetBox){s.doors[targetBox.id]=true;s.path.push({x:0,z:targetBox.z},{x:targetBox.side*2,z:targetBox.z},{x:targetBox.side*5,z:targetBox.z});}
  if(targetTack&&!currentTack){s.doors.sellerie=true;s.path.push({x:-13,z:-9},{x:-15,z:-9},{x:-19,z:-9});}
  s.path.push({x:clamp(x,-28,28),z:clamp(z,-29,29)});s.target=s.path.shift();return true;
}
export function interactCentre(s,item=nearestCentreInteraction(s)){
  if(s.status!=='playing'||s.actionUntil>s.time||!item||item.distance>3)return [];
  const [kind,id]=item.id.split(':');
  if(kind==='door'){s.doors[id]=!s.doors[id];return[{type:'door',box:id,open:s.doors[id]}];}
  if(kind==='tack'){s.doors.sellerie=!s.doors.sellerie;return[{type:'tack',open:s.doors.sellerie}];}
  if(['water','hay','clean'].includes(kind)){
    s.action=kind;s.actionUntil=s.time+2.5;s.jobs[item.id]=true;
    return[{type:'job',action:kind,pony:item.pony,id:item.id}];
  }
  return[{type:kind,pony:item.pony,action:item.action,item:item.item}];
}
export function advanceCentre(s,dt,input={}){
  if(s.status!=='playing')return [];dt=clamp(dt,0,.1);if(!dt)return [];
  s.time+=dt;const p=s.player,events=[];
  const turn=(input.left?1:0)-(input.right?1:0),move=(input.up?1:0)-(input.down? .5:0);
  if(turn||move){s.target=null;s.path=[];s.pending=null;}
  p.heading+=turn*1.75*dt;let direction=move,targetSpeed=Math.abs(move)*s.walkSpeed;
  while(s.target&&Math.hypot(s.target.x-p.x,s.target.z-p.z)<.2){s.target=s.path.shift()||null;
    if(!s.target&&s.pending){const item=s.pending;s.pending=null;events.push(...interactCentre(s,{...item,distance:Math.hypot(p.x-item.x,p.z-item.z)}));}}
  if(s.target){const dx=s.target.x-p.x,dz=s.target.z-p.z,d=Math.hypot(dx,dz);
    const angle=Math.atan2(-dx,-dz),delta=Math.atan2(Math.sin(angle-p.heading),Math.cos(angle-p.heading));p.heading+=delta*(1-Math.exp(-dt*9));direction=1;targetSpeed=Math.min(s.walkSpeed,d/dt);
  }
  if(s.actionUntil>s.time)targetSpeed=0;
  const rate=targetSpeed<p.speed?10:7;p.speed+=(targetSpeed-p.speed)*(1-Math.exp(-dt*rate));
  const sign=direction<0?-1:1,dx=-Math.sin(p.heading)*p.speed*dt*sign,dz=-Math.cos(p.heading)*p.speed*dt*sign,oldX=p.x,oldZ=p.z;
  if(!centreBlocked(s,p.x+dx,p.z))p.x+=dx;if(!centreBlocked(s,p.x,p.z+dz))p.z+=dz;
  const distance=Math.hypot(p.x-oldX,p.z-oldZ);p.travel+=distance;p.gaitTravel=(p.gaitTravel||0)+distance*sign;
  if(distance<1e-6&&!s.target)p.speed=0;
  return events;
}
