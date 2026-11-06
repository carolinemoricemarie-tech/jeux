export const MAX_MISSES = 3;
export const JUMP_PREPARATION = .12;
export const JUMP_IMPULSE = 4.85;
export const JUMP_GRAVITY = 12;
export const JUMP_FLIGHT = 2 * JUMP_IMPULSE / JUMP_GRAVITY;
export const JUMP_RECOVERY = .18;
export const JUMP_DURATION = JUMP_PREPARATION + JUMP_FLIGHT + JUMP_RECOVERY;
export function jumpFrame(game) {
  if (!game.jumpActive) return -1;
  const time = game.jumpTime;
  const limits = [JUMP_PREPARATION, ...[.12,.26,.54,.72,.89].map(part=>JUMP_PREPARATION+JUMP_FLIGHT*part), JUMP_PREPARATION+JUMP_FLIGHT+JUMP_RECOVERY*.25];
  const index = limits.findIndex(limit => time < limit);
  return index === -1 ? 7 : index;
}
export function jumpClearance(game) {
  const frame=jumpFrame(game);
  const foldedLegLift=[0,.05,.25,.55,.5,.25,0,0][frame]||0;
  return game.height+foldedLegLift;
}
export const BOUNDS = { minX: -44, maxX: 57, minZ: -49, maxZ: 53 };
export const COURSES = {
  prairie: { name: 'La prairie fleurie', icon: '🌼', count: 10, height: .8, description: 'Dix obstacles dans la prairie. Trois erreurs et la partie est perdue.' },
  garden: { name: 'Le jardin des rubans', icon: '🎀', count: 10, height: 1, description: 'Dix obstacles colorés. Prépare tes virages : tu as droit à deux erreurs.' },
  forest: { name: 'La forêt enchantée', icon: '🌲', count: 10, height: 1.2, description: 'Dix obstacles plus hauts, dans les arbres. La troisième erreur arrête le parcours.' }
};
const ROUTE = [[0,22],[0,5],[0,-12],[8,-30],[28,-34],[43,-23],[44,-3],[44,17],[34,35],[14,40],[-8,39],[-28,26],[-29,4]];
const CIRCUIT = [0,1,2,3,4,6,7,8,10,12];
const SELECTIONS = { prairie: CIRCUIT, garden: CIRCUIT, forest: CIRCUIT };
export function createGame(pace='gentle', course='prairie') {
  if (!COURSES[course]) course='prairie';
  const points=SELECTIONS[course].map(i=>ROUTE[i]);
  const obstacles=points.map(([x,z],i)=>{
    const prev=points[i-1]||[0,40], next=points[i+1]||[x,z-16];
    return { x,z,yaw:Math.atan2(-(next[0]-prev[0]),-(next[1]-prev[1])),width:9,
      height:COURSES[course].height+(i%2)*.1,passed:false,touched:false };
  });
  return { course,pace,status:'playing',x:0,z:40,heading:0,speed:0,height:0,velocity:0,
    obstacles,next:0,cleared:0,bumps:0,stars:0,distance:0,finish:obstacles.length,
    traveled:0,effort:0,time:0,edgeCooldown:0,jumpActive:false,jumpTime:0 };
}
export function jump(game) {
  if(game.status!=='playing'||game.jumpActive||game.height>0||game.velocity!==0)return false;
  game.jumpActive=true;game.jumpTime=0;return true;
}
export function localToGate(gate,x,z) {
  const dx=x-gate.x,dz=z-gate.z;
  return { side:Math.cos(gate.yaw)*dx-Math.sin(gate.yaw)*dz, forward:Math.sin(gate.yaw)*dx+Math.cos(gate.yaw)*dz };
}
export function timeToTarget(game) {
  const gate=game.obstacles[game.next];
  if(!gate)return Infinity;
  const local=localToGate(gate,game.x,game.z);
  const closingSpeed=game.speed*Math.cos(game.heading-gate.yaw);
  return local.forward>0&&closingSpeed>.1?local.forward/closingSpeed:Infinity;
}
export function resetToTarget(game) {
  if(game.status!=='playing')return false;
  const gate=game.obstacles[game.next];
  if(!gate)return false;
  game.x=gate.x+Math.sin(gate.yaw)*11;game.z=gate.z+Math.cos(gate.yaw)*11;
  game.heading=gate.yaw;game.speed=0;game.height=0;game.velocity=0;
  game.jumpActive=false;game.jumpTime=0;
  return true;
}
export function advance(game,dt,input={}) {
  if(game.status!=='playing')return [];
  let remaining=Math.max(0,Math.min(dt,.1));const events=[];
  while(remaining>0&&game.status==='playing'){
    const step=Math.min(remaining,1/120);remaining-=step;game.time+=step;
    game.edgeCooldown=Math.max(0,game.edgeCooldown-step);
    const targetSpeed=input.down?0:input.up?(game.pace==='trot'?11:9):(game.pace==='trot'?6.5:4.8);
    const acceleration=targetSpeed<game.speed?10:4;
    game.speed+=Math.sign(targetSpeed-game.speed)*Math.min(Math.abs(targetSpeed-game.speed),acceleration*step);
    const turn=(input.left?1:0)-(input.right?1:0);
    game.heading+=turn*(.85+Math.min(game.speed,7)*.055)*step;
    game.heading=Math.atan2(Math.sin(game.heading),Math.cos(game.heading));
    const previous={x:game.x,z:game.z};
    game.x-=Math.sin(game.heading)*game.speed*step;game.z-=Math.cos(game.heading)*game.speed*step;
    if(game.x<BOUNDS.minX||game.x>BOUNDS.maxX||game.z<BOUNDS.minZ||game.z>BOUNDS.maxZ){
      game.x=Math.max(BOUNDS.minX,Math.min(BOUNDS.maxX,game.x));
      game.z=Math.max(BOUNDS.minZ,Math.min(BOUNDS.maxZ,game.z));game.speed=0;
      if(game.edgeCooldown===0){events.push('edge');game.edgeCooldown=3;}
    }
    game.traveled+=Math.hypot(game.x-previous.x,game.z-previous.z);
    game.effort=Math.min(1,Math.max(game.traveled/340,game.next/game.finish));
    if(game.jumpActive){
      const previousTime=game.jumpTime;game.jumpTime+=step;
      if(previousTime<JUMP_PREPARATION&&game.jumpTime>=JUMP_PREPARATION)game.velocity=JUMP_IMPULSE;
      if(game.jumpTime>=JUMP_DURATION){game.jumpActive=false;game.jumpTime=0;}
    }
    if(game.height>0||game.velocity!==0){
      game.height=Math.max(0,game.height+game.velocity*step-.5*JUMP_GRAVITY*step*step);game.velocity-=JUMP_GRAVITY*step;
      if(game.height===0)game.velocity=0;
    }
    for(let i=0;i<game.obstacles.length;i++){
      const gate=game.obstacles[i];
      const before=localToGate(gate,previous.x,previous.z),after=localToGate(gate,game.x,game.z);
      if(!(before.forward>0&&after.forward<=0))continue;
      const t=before.forward/(before.forward-after.forward);
      const side=before.side+(after.side-before.side)*t;
      if(i!==game.next)continue;
      const success=Math.abs(side)<=gate.width/2-.35&&jumpClearance(game)>=gate.height*.85;
      gate.passed=true;gate.touched=!success;
      if(success){game.cleared++;game.stars+=3;events.push('clear');}
      else{game.bumps++;events.push('bump');}
      game.next++;game.distance=game.next;game.effort=Math.max(game.effort,game.next/game.finish);
      if(game.bumps>=MAX_MISSES){game.status='lost';events.push('lose');}
      else if(game.next===game.obstacles.length){game.status='finished';events.push('finish');}
    }
  }
  return events;
}
