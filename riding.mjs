// A deliberate press selects an allure. Key repeat never changes it.
export const GAITS=['stop','gentle','trot','gallop'];
export const GAIT_LABELS=['À l’arrêt','Au pas','Au trot','Au galop'];
export function setRideGait(game,pace){
  if(!game||!['trail','paddock'].includes(game.activity)||!['playing','countdown','paused','preview'].includes(game.status))return false;
  const step=GAITS.indexOf(pace);if(step<0)return false;
  game.gaitStep=step;if(step)game.pace=pace;return true;
}
export function changeRideGait(game,delta){
  if(!game||!['trail','paddock'].includes(game.activity))return false;
  return setRideGait(game,GAITS[Math.max(0,Math.min(3,(game.gaitStep||0)+delta))]);
}
export const STRIDE_LENGTHS={gentle:1.55,trot:2.8,gallop:4.6};
export function strideMotion(phase,speed,pace){
  const amount=Math.min(1,speed/.8);
  return {phase:phase*8,lift:amount*(pace==='gentle'?.009:pace==='trot'?.028:.055)*(1-Math.cos(phase*Math.PI*4))*.5,
    pitch:amount*Math.sin(phase*Math.PI*2)*(pace==='gallop'?.015:pace==='trot'?.006:.003)};
}
