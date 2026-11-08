// Milliseconds: let each small gesture finish instead of rapidly cycling poses.
export const ACTION_DURATION = {
  hay: 12000, carrot: 11000, brush: 6800, pet: 4800, rest: 5000,
  pad: 5500, saddle: 6000, bridle: 5600
};
const clamp = n => Math.max(0, Math.min(1, n));
export const ease = n => { const t=clamp(n); return t*t*t*(t*(t*6-15)+10); };
export function actionPose(action, progress, reducedMotion=false) {
  if(reducedMotion) return { from:3, to:3, mix:0 };
  const path=action==='rest'?[0,0]:action==='brush'?[0,1,2,3,2,1,2,3]:[0,1,2,3];
  const position=clamp(progress)*(path.length-1),index=Math.min(path.length-2,Math.floor(position));
  return { from:path[index], to:path[index+1], mix:ease(position-index) };
}
