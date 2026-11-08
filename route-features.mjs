import {railPoint} from './guidance.mjs';
import {groundHeight} from './terrain.mjs';
export function makeTrailFeatures(theme,rail){
  if(theme==='paddock')return [];
  const fractions=theme==='forest'?[.055,.28,.68]:theme==='country'?[.15,.72]:[.22];
  const features=fractions.map((q,i)=>({...railPoint(rail,rail.length*q),id:'log'+i,kind:'log',width:3.8,height:.32+i*.07,depth:.45}));
  if(theme!=='beach')features.push({...railPoint(rail,rail.length*.46),id:'bridge',kind:'bridge',width:5,depth:8,height:.32});
  return features;
}
export function featureLocal(f,x,z){const dx=x-f.x,dz=z-f.z;return {side:Math.cos(f.heading)*dx-Math.sin(f.heading)*dz,forward:Math.sin(f.heading)*dx+Math.cos(f.heading)*dz};}
export function trailGroundHeight(theme,x,z,features=[],{deck=true}={}){
  let y=groundHeight(theme,x,z);
  for(const f of features)if(f.kind==='bridge'){
    const p=featureLocal(f,x,z),forward=Math.abs(p.forward),side=Math.abs(p.side);
    if(side<18&&forward<3)y-=.6*Math.min(1,(3-forward)/1.4)*Math.min(1,(18-side)/3);
    if(deck&&side<f.width/2&&forward<f.depth/2)y=groundHeight(theme,x,z)+f.height*Math.min(1,(f.depth/2-forward)/1.4);
  }
  return y;
}
