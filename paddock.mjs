export const PADDOCK_BOUNDS={minX:-7.4,maxX:7.4,minZ:-4.2,maxZ:4.2};
export const LUNGE_RADIUS=3.8;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createPaddock({age=8}={}){
  return {status:'playing',mode:'free',zone:'paddock',bounds:{...PADDOCK_BOUNDS},time:0,walkSpeed:age===5?1.15:1.35,player:{x:0,z:1.2,vx:0,vz:0,facing:1,speed:0,travel:0},horse:{x:3,z:-.8,vx:0,vz:0,speed:0,travel:0},target:null,task:'idle',ball:null,games:0,gait:'walk',direction:1,angle:0,totalAngle:0,laps:0,stage:'center',rewarded:false,roamIndex:0};
}
export function paddockCommand(state,command){
  if(command==='free'){state.mode='free';state.task='idle';state.target=null;state.ball=null;return true;}
  if(command==='lunge'){state.mode='lunge';state.stage='center';state.target={x:0,z:0};state.ball=null;state.totalAngle=0;state.laps=0;return true;}
  if(command==='reverse'){state.direction*=-1;return true;}
  if(['stop','walk','trot','gallop'].includes(command)){state.gait=command;if(state.mode==='free'&&['idle','roam'].includes(state.task)&&['trot','gallop'].includes(command))state.task='roam';return true;}
  if(state.mode!=='free')return false;
  if(command==='call'){state.task='follow';state.ball=null;return true;}
  if(command==='ball'){
    if(['fetch','return'].includes(state.task))return false;
    state.ball={x:clamp(state.player.x+state.player.facing*4,-6.5,6.5),z:clamp(state.player.z-1.7,-3.4,3.4),fromX:state.player.x,fromZ:state.player.z,time:0};state.task='fetch';return true;
  }
  return false;
}
export function targetPlayer(state,x,z){
  if(state.mode!=='free')return false;
  const bounds=state.bounds||PADDOCK_BOUNDS;
  state.target={x:clamp(x,bounds.minX,bounds.maxX),z:clamp(z,bounds.minZ,bounds.maxZ)};return true;
}
function move(actor,target,speed,dt,accelerate=true,bounds=PADDOCK_BOUNDS){
  const previousX=actor.x,previousZ=actor.z;
  const dx=target.x-actor.x,dz=target.z-actor.z,d=Math.hypot(dx,dz),limit=d>0?Math.min(speed,d/dt):0;
  const tx=d>.01?dx/d*limit:0,tz=d>.01?dz/d*limit:0,smooth=accelerate?1-Math.exp(-dt*8):1;
  actor.vx+=(tx-actor.vx)*smooth;actor.vz+=(tz-actor.vz)*smooth;
  actor.x=clamp(actor.x+actor.vx*dt,bounds.minX,bounds.maxX);
  actor.z=clamp(actor.z+actor.vz*dt,bounds.minZ,bounds.maxZ);
  actor.speed=Math.hypot(actor.vx,actor.vz);
  actor.travel+=Math.hypot(actor.x-previousX,actor.z-previousZ);
  if(Math.abs(actor.vx)>.03)actor.facing=actor.vx>0?1:-1;
}
export function advancePaddock(state,dt,input={}){
  if(state.status!=='playing')return [];
  dt=clamp(dt,0,.1);if(!dt)return [];
  state.time+=dt;const events=[];
  if(state.ball)state.ball.time+=dt;
  const p=state.player,h=state.horse;
  if(state.mode==='free'){
    const ix=(input.right?1:0)-(input.left?1:0),iz=(input.down?1:0)-(input.up?1:0),length=Math.hypot(ix,iz);
    if(length){state.target=null;move(p,{x:p.x+ix/length*3,z:p.z+iz/length*3},state.walkSpeed,dt,true,state.bounds);}
    else move(p,state.target||p,state.walkSpeed,dt,true,state.bounds);
    if(state.target&&distance(p,state.target)<.08)state.target=null;
    let destination={x:2+Math.sin(state.time*.17)*1.2,z:-1+Math.cos(state.time*.2)*.7},speed=.45;
    if(state.task==='roam'){
      const points=[{x:5.2,z:-2.6},{x:5.2,z:2.6},{x:-5.2,z:2.6},{x:-5.2,z:-2.6}];destination=points[state.roamIndex%4];speed=1.3;
      if(distance(h,destination)<.5)state.roamIndex++;
    }else if(state.task==='follow'||state.task==='return'){
      destination=p;speed=distance(h,p)>1.5?1.5:0;
      if(state.task==='return'&&state.ball){const length=Math.max(.01,distance(h,p));state.ball.x=h.x+(p.x-h.x)/length*.7;state.ball.z=h.z+(p.z-h.z)/length*.7;}
      if(state.task==='return'&&distance(h,p)<1.6){state.task='follow';state.games++;state.ball=null;events.push('ball-return');}
    }else if(state.task==='fetch'&&state.ball){
      destination=state.ball;speed=state.ball.time>.8?1.7:.3;
      if(state.ball.time>1&&distance(h,destination)<.45){state.task='return';events.push('ball-found');}
    }
    speed*=state.gait==='stop'?0:state.gait==='gallop'?2.7:state.gait==='trot'?1.6:1;
    move(h,destination,speed,dt,true,state.bounds);
  }else{
    move(p,{x:0,z:0},state.walkSpeed,dt,true,state.bounds);
    if(state.stage==='center'){
      move(h,{x:p.x+2,z:p.z-1},state.gait==='stop'?0:1.2,dt,true,state.bounds);
      if(distance(p,{x:0,z:0})<.1){state.stage='approach';state.angle=Math.atan2(h.x,h.z);}
    }else{
      const speed=state.gait==='stop'?0:state.gait==='gallop'?3.1:state.gait==='trot'?1.95:1.05;
      if(state.stage==='circle'&&speed){
        const delta=state.direction*speed/LUNGE_RADIUS*dt;state.angle+=delta;state.totalAngle+=Math.abs(delta);state.laps=Math.floor((state.totalAngle+1e-8)/(Math.PI*2));
      }
      const destination={x:Math.sin(state.angle)*LUNGE_RADIUS,z:Math.cos(state.angle)*LUNGE_RADIUS};
      move(h,destination,speed,dt,state.stage!=='circle',state.bounds);
      if(state.stage==='approach'&&distance(h,destination)<.15)state.stage='circle';
      if(state.laps>=3&&!state.rewarded){state.rewarded=true;events.push('training-complete');}
    }
  }
  return events;
}
