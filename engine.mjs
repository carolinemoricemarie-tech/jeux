import { createRail,railPoint } from './guidance.mjs';
import {TRAIL_SPEEDS,waterDepth} from './terrain.mjs';
export const MAX_MISSES = 3;
export const PACES={gentle:{cruise:4.8,max:9},trot:{cruise:6.5,max:11},gallop:{cruise:8.5,max:13}};
export function ridingRules(character,course){return {maxMisses:character==='emmy'?null:MAX_MISSES,autoSteer:character==='emmy'&&COURSES[course]?.level==='beginner'};}
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
export const LEVELS = { beginner:'Débutant', intermediate:'Intermédiaire', hard:'Difficile' };
export const COURSES = {
  prairie: { name:'La prairie fleurie',icon:'🌼',level:'beginner',height:.45,maxHeight:.60,width:4.5,route:0 },
  orchard: { name:'Le petit verger',icon:'🍎',level:'beginner',height:.60,maxHeight:.75,width:4.3,route:1 },
  daisies: { name:'La ronde des pâquerettes',icon:'🌸',level:'beginner',height:.70,maxHeight:.85,width:4.1,route:2 },
  garden: { name:'Le jardin des rubans',icon:'🎀',level:'intermediate',height:.85,maxHeight:1.00,width:4,route:3 },
  river: { name:'Les méandres du ruisseau',icon:'💧',level:'intermediate',height:.95,maxHeight:1.10,width:3.9,route:4 },
  mill: { name:'Le tour du vieux moulin',icon:'🌾',level:'intermediate',height:1.00,maxHeight:1.15,width:3.8,route:5 },
  forest: { name:'La forêt enchantée',icon:'🌲',level:'hard',height:1.10,maxHeight:1.25,width:3.7,route:6 },
  stars: { name:'Le défi des étoiles',icon:'⭐',level:'hard',height:1.15,maxHeight:1.30,width:3.6,route:7 },
  rainbow: { name:'Le grand prix arc-en-ciel',icon:'🌈',level:'hard',height:1.25,maxHeight:1.40,width:3.5,route:8 }
};
for(const config of Object.values(COURSES)){
  config.count=10;
  config.description=LEVELS[config.level]+' · '+Math.round(config.height*100)+' à '+Math.round(config.maxHeight*100)+' cm. Dix obstacles. Troisième erreur : partie perdue.';
}
const ROUTES = [
  [[0,22],[0,5],[0,-12],[8,-30],[28,-34],[44,-3],[44,17],[34,35],[-8,39],[-29,4]],
  [[0,22],[-4,3],[-18,-14],[-26,-32],[-6,-39],[17,-32],[34,-13],[36,8],[24,29],[2,37]],
  [[0,22],[8,5],[21,-8],[36,-21],[22,-36],[2,-34],[-18,-22],[-28,-2],[-20,19],[-1,33]],
  [[0,22],[4,4],[-7,-12],[6,-31],[27,-35],[43,-16],[35,5],[43,24],[22,38],[-4,35]],
  [[0,22],[-10,6],[-1,-11],[-20,-29],[0,-40],[23,-29],[37,-9],[24,8],[37,27],[12,39]],
  [[0,22],[14,8],[25,-9],[9,-23],[-9,-37],[-28,-20],[-19,0],[-30,19],[-9,36],[13,34]],
  [[0,22],[12,8],[-3,-5],[11,-20],[30,-32],[43,-16],[29,0],[43,17],[24,32],[2,35]],
  [[0,22],[-13,8],[1,-8],[-13,-25],[8,-37],[31,-28],[42,-7],[25,8],[39,27],[16,40]],
  [[0,22],[15,6],[1,-10],[17,-28],[37,-34],[44,-12],[27,4],[40,22],[19,38],[-4,32]]
];
export function createGame(pace='gentle', course='prairie', {countdown=false,character='louane'}={}) {
  if (!COURSES[course]) course='prairie';
  const config=COURSES[course],points=ROUTES[config.route];
  const obstacles=points.map(([x,z],i)=>{
    const prev=points[i-1]||[0,40], next=points[i+1]||[x,z-16];
    return { x,z,yaw:Math.atan2(-(next[0]-prev[0]),-(next[1]-prev[1])),width:config.width,
      height:config.height+(config.maxHeight-config.height)*(i%4)/3,passed:false,touched:false };
  });
  const rules=ridingRules(character,course),last=obstacles.at(-1);
  const rail=rules.autoSteer?createRail([[0,40],...points,[last.x-Math.sin(last.yaw)*8,last.z-Math.cos(last.yaw)*8]]):null;
  return { course,character,pace:PACEsValid(pace),...rules,rail,guidanceDistance:0,status:countdown?'countdown':'playing',countdown:countdown?3:0,x:0,z:40,heading:0,speed:0,height:0,velocity:0,
    obstacles,next:0,cleared:0,bumps:0,stars:0,distance:0,finish:obstacles.length,
    traveled:0,effort:0,time:0,edgeCooldown:0,jumpActive:false,jumpTime:0 };
}
function PACEsValid(pace){return Object.hasOwn(PACES,pace)?pace:'gentle';}
export function jump(game) {
  if(game.status!=='playing'||game.jumpActive||game.height>0||game.velocity!==0||game.swimming)return false;
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
  if(game.status!=='playing'||game.autoSteer)return false;
  const gate=game.obstacles[game.next];
  if(!gate)return false;
  game.x=gate.x+Math.sin(gate.yaw)*11;game.z=gate.z+Math.cos(gate.yaw)*11;
  game.heading=gate.yaw;game.speed=0;game.height=0;game.velocity=0;
  game.jumpActive=false;game.jumpTime=0;
  return true;
}
export function advance(game,dt,input={}) {
  if(game.status==='countdown'){
    game.countdown=Math.max(0,game.countdown-Math.max(0,Math.min(dt,.1)));
    if(game.countdown<1e-7){game.countdown=0;game.status='playing';return ['start'];}
    return [];
  }
  if(game.status!=='playing')return [];
  let remaining=Math.max(0,Math.min(dt,.1));const events=[];
  while(remaining>0&&game.status==='playing'){
    const step=Math.min(remaining,1/120);remaining-=step;game.time+=step;
    game.edgeCooldown=Math.max(0,game.edgeCooldown-step);
    const pace=PACES[game.pace]||PACES.gentle;
    let targetSpeed=game.manualThrottle?(input.up&&!input.down?(TRAIL_SPEEDS[game.pace]||TRAIL_SPEEDS.gentle):0):game.autoSteer?pace.cruise:input.down?0:input.up?pace.max:pace.cruise;
    if(game.activity==='trail'){game.waterDepth=waterDepth(game.theme,game.x,game.z);game.swimming=game.waterDepth>.85;if(game.waterDepth>.15)targetSpeed*=game.swimming?.42:.72;}
    const acceleration=targetSpeed<game.speed?10:4;
    game.speed+=Math.sign(targetSpeed-game.speed)*Math.min(Math.abs(targetSpeed-game.speed),acceleration*step);
    const previous={x:game.x,z:game.z};
    if(game.autoSteer&&game.rail){game.guidanceDistance+=game.speed*step;Object.assign(game,railPoint(game.rail,game.guidanceDistance));}
    else{
      const turn=(input.left?1:0)-(input.right?1:0);
      game.heading+=turn*(.85+Math.min(game.speed,7)*.055)*step;
      game.heading=Math.atan2(Math.sin(game.heading),Math.cos(game.heading));
      game.x-=Math.sin(game.heading)*game.speed*step;game.z-=Math.cos(game.heading)*game.speed*step;
    }
    for(const obstacle of game.colliders||[]){
      const dx=game.x-obstacle.x,dz=game.z-obstacle.z,range=(obstacle.radius||.4)+.6,distance=Math.hypot(dx,dz);
      if(distance<range){const factor=range/Math.max(.001,distance);game.x=obstacle.x+dx*factor;game.z=obstacle.z+dz*factor;game.speed*=.8;}
    }
    const bounds=game.bounds||BOUNDS;
    if(game.x<bounds.minX||game.x>bounds.maxX||game.z<bounds.minZ||game.z>bounds.maxZ){
      game.x=Math.max(bounds.minX,Math.min(bounds.maxX,game.x));
      game.z=Math.max(bounds.minZ,Math.min(bounds.maxZ,game.z));game.speed=0;
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
      if(game.maxMisses!==null&&game.bumps>=(game.maxMisses??MAX_MISSES)){game.status='lost';events.push('lose');}
      else if(game.next===game.obstacles.length){game.status='finished';events.push('finish');}
    }
    if(game.activity==='trail'){
      const target=game.waypoints[game.nextWaypoint];
      if(target&&Math.hypot(game.x-target.x,game.z-target.z)<3.5){
        game.nextWaypoint++;game.distance=game.nextWaypoint-1;events.push('waypoint');
        if(game.nextWaypoint>=game.waypoints.length){game.status='finished';events.push('finish');}
      }
    }
  }
  return events;
}
