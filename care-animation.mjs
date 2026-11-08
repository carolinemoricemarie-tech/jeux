import {ease} from './stable-motion.mjs';
const clamp=n=>Math.max(0,Math.min(1,n));
const pose=(from,to,mix)=>({from,to,mix:ease(mix)});
export function feedingAnimation(progress,seconds=0){
  const t=clamp(progress),approach=ease(t/.24),retreat=ease((t-.76)/.24),out=t<.24?approach:t>.76?1-retreat:1;
  const extending=clamp((t-.24)/.11),withdraw=clamp((t-.65)/.11),contact=t>=.35&&t<.65;
  let childPose,horsePose;
  if(t<.24)childPose=pose(0,0,0);
  else if(t<.295)childPose=pose(0,1,(t-.24)/.055);
  else if(t<.35)childPose=pose(1,2,(t-.295)/.055);
  else if(t<.65)childPose=pose(2,2,0);
  else if(t<.705)childPose=pose(2,3,(t-.65)/.055);
  else if(t<.76)childPose=pose(3,0,(t-.705)/.055);
  else childPose=pose(0,0,0);
  if(t<.24)horsePose=pose(0,0,0);
  else if(t<.35)horsePose=pose(0,1,extending);
  else if(t<.7){const path=[3,2,3,4,5,3],q=((seconds*1.3)%1)*(path.length-1),i=Math.floor(q);horsePose=pose(path[i],path[i+1],q-i);}
  else if(t<.8)horsePose=pose(5,0,(t-.7)/.1);
  else horsePose=pose(0,0,0);
  return{stage:t<.24?'approach':t<.35?'offer':t<.65?'chew':t<.76?'withdraw':'return',out,walking:t>0&&t<.24||t>.76&&t<1,flip:t>.76,
    travel:approach+retreat,childPose,horsePose,contact,food:Math.max(0,1-clamp((t-.4)/.25)),handReach:ease(extending)*(1-ease(withdraw))};
}
