import { createRail,railPoint } from './guidance.mjs';
import {TRAIL_BOUNDS,forestTrees} from './terrain.mjs';
export const TRAILS={
  woodland:{name:'Le sentier de la forêt',icon:'🌲',theme:'forest',description:'Un chemin ombragé entre les grands arbres.',points:[[0,40],[-12,24],[-25,2],[-14,-20],[4,-38],[26,-25],[37,-2],[24,23],[0,40]]},
  seaside:{name:'Les sabots sur la plage',icon:'🐚',theme:'beach',description:'Le sable, les vagues et le grand air du bord de mer.',points:[[12,40],[7,16],[11,-12],[16,-36],[35,-38],[39,-10],[32,20],[12,40]]},
  fields:{name:'La boucle de la campagne',icon:'🌾',theme:'country',description:'Les prés, les fleurs et les champs autour du domaine.',points:[[0,40],[-20,20],[-26,-10],[-6,-32],[22,-36],[41,-10],[30,15],[9,30],[0,40]]}
};
export function createTrail(id='woodland',pace='gentle',{character='louane'}={}){
  if(!TRAILS[id])id='woodland';const config=TRAILS[id],rail=createRail(config.points),start=railPoint(rail,0);
  if(config.theme==='beach')start.heading=Math.atan2(-(config.points[1][0]-start.x),-(config.points[1][1]-start.z));
  return {activity:'trail',trail:id,theme:config.theme,course:null,character,pace,status:'playing',autoSteer:false,manualThrottle:true,maxMisses:null,bounds:{...TRAIL_BOUNDS},colliders:config.theme==='forest'?forestTrees(rail):[],waterDepth:0,swimming:false,
    ...start,speed:0,height:0,velocity:0,rail,guidanceDistance:0,waypoints:config.points.map(([x,z])=>({x,z})),nextWaypoint:1,
    obstacles:[],next:0,cleared:0,bumps:0,stars:0,distance:0,finish:config.points.length-1,traveled:0,effort:0,time:0,edgeCooldown:0,jumpActive:false,jumpTime:0};
}
