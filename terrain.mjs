import {railPoint} from './guidance.mjs';
export const TRAIL_BOUNDS={minX:-70,maxX:75,minZ:-70,maxZ:75};
export const TRAIL_SPEEDS={gentle:2.2,trot:4.2,gallop:7};
export function coastline(z){return -5+Math.sin(z*.033)*2.2+Math.sin(z*.09)*.6;}
export function groundHeight(theme,x,z){
  if(theme==='paddock')return 0;
  if(theme==='beach'){
    const inland=x-coastline(z);
    return inland<0?Math.max(-1.45,inland*.105):.16+Math.min(1.4,inland*.025)+Math.sin(z*.055)*.025;
  }
  return Math.sin(x*.038)*.28+Math.sin(z*.045)*.22+Math.sin((x+z)*.065)*.1;
}
export function waterDepth(theme,x,z){return theme==='beach'?Math.max(0,.12-groundHeight(theme,x,z)):0;}
export function forestTrees(rail){
  const trees=[];let serial=0;
  const clear=(x,z)=>{for(let q=0;q<rail.length;q+=3){const p=railPoint(rail,q);if(Math.hypot(p.x-x,p.z-z)<4.3)return false;}return true;};
  for(let d=0;d<rail.length;d+=7.5){const p=railPoint(rail,d);
    for(const side of [-1,1])for(const rank of [0,1]){
      const offset=6+rank*8+Math.sin(d*.83)*1.3,x=p.x+Math.cos(p.heading)*offset*side,z=p.z-Math.sin(p.heading)*offset*side;
      if(clear(x,z)&&!trees.some(t=>Math.hypot(t.x-x,t.z-z)<3.8))trees.push({x,z,height:10+(serial++%6),species:serial%4,radius:.42});
    }
  }
  for(let i=0;i<52;i++){const a=i/52*Math.PI*2,r=62+(i%4)*3,x=Math.sin(a)*r,z=Math.cos(a)*r;if(clear(x,z))trees.push({x,z,height:12+i%6,species:i%4,radius:.45});}
  return trees;
}
