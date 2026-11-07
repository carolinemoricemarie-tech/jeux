import { JUMP_PREPARATION, JUMP_FLIGHT, JUMP_DURATION, JUMP_GRAVITY } from './engine.mjs';
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const damp=(value,target,rate,dt)=>value+(target-value)*(1-Math.exp(-rate*Math.max(0,dt)));
export function cyclePose(phase,count=8,start=0){
  const wrapped=((phase%count)+count)%count,from=Math.floor(wrapped);
  return {from:start+from,to:start+(from+1)%count,mix:wrapped-from};
}
export function idlePose(time,stable=false){
  const points=stable?[[0,0],[2.2,0],[3,1],[3.6,2],[4.2,3],[4.28,4],[4.36,3],[5.3,5],[6.3,6],[7.5,7],[8,0]]:
    [[0,8],[2.2,8],[3,9],[3.08,10],[3.16,9],[4.4,8],[5.5,11],[7,8],[8,8]];
  const t=((time%8)+8)%8;
  const end=points.findIndex(p=>p[0]>t),a=points[Math.max(0,end-1)],b=points[end];
  const n=(t-a[0])/(b[0]-a[0]);return {from:a[1],to:b[1],mix:n*n*(3-2*n)};
}
export function jumpPose(time){
  const points=[0,JUMP_PREPARATION,JUMP_PREPARATION+JUMP_FLIGHT*.2,JUMP_PREPARATION+JUMP_FLIGHT*.42,JUMP_PREPARATION+JUMP_FLIGHT*.64,JUMP_PREPARATION+JUMP_FLIGHT*.83,JUMP_PREPARATION+JUMP_FLIGHT,JUMP_DURATION];
  const t=clamp(time,0,JUMP_DURATION),end=points.findIndex(p=>p>t);
  if(end<0)return {from:7,to:7,mix:0};
  const from=Math.max(0,end-1),mix=(t-points[from])/(points[end]-points[from]);
  return {from,to:end,mix:mix*mix*(3-2*mix)};
}
export function walkingPose(distance,age=8){return cyclePose(distance/(age===5?.85:1)*8);}
// Keep photographic detail sharp; a short transition avoids persistent double
// silhouettes when a hoof or the rider's head changes position substantially.
export function detailPose(pose){
  const t=clamp((pose.mix-.84)/.16);
  return {...pose,mix:t*t*(3-2*t)};
}
export function facingDirection(vx,vz,previous=3){
  if(Math.hypot(vx,vz)<.08)return previous;
  if(Math.abs(vx)>Math.abs(vz)*1.15)return vx>0?0:2;
  if(Math.abs(vz)>Math.abs(vx)*1.15)return vz<0?1:3;
  return previous;
}
export function advanceLanding(landing,dt){
  dt=clamp(dt,0,.1);landing.time+=dt;
  if(landing.height>0||landing.velocity>0){
    landing.height=Math.max(0,landing.height+landing.velocity*dt-JUMP_GRAVITY*dt*dt*.5);
    landing.velocity=landing.height>0?landing.velocity-JUMP_GRAVITY*dt:0;
  }
  return landing;
}
