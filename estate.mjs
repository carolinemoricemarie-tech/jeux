import {advancePaddock,targetPlayer,PADDOCK_BOUNDS} from './paddock.mjs';
export const ZONES={
  paddock:{name:'L’enclos',image:'paddockBackground',ground:345,depth:350,side:57,bounds:PADDOCK_BOUNDS,portals:[{id:'yard',label:'Sortir vers la cour',x:6.1,z:-2.7,zone:'yard'}]},
  yard:{name:'La cour des écuries',image:'stableYard',ground:430,depth:330,side:67,bounds:PADDOCK_BOUNDS,portals:[{id:'barn',label:'Entrer dans les écuries',x:0,z:-3.5,zone:'barn'},{id:'paddock',label:'Retour à l’enclos',x:5.8,z:-1.3,zone:'paddock'}]},
  barn:{name:'L’allée des boxes',image:'stableCorridor',ground:410,depth:350,side:110,bounds:{minX:-4.2,maxX:4.2,minZ:-4.2,maxZ:4.2},portals:[{id:'yard',label:'Retour dans la cour',x:0,z:-3.7,zone:'yard'},{id:'noisette',label:'Box de Noisette',x:-4,z:1.8,pony:'noisette'},{id:'nuage',label:'Box de Nuage',x:3.8,z:-1.6,pony:'nuage'},{id:'etoile',label:'Box d’Étoile',x:4,z:2.4,pony:'etoile'}]}
};
export function enterZone(state,id){
  if(!ZONES[id])return false;state.zone=id;state.bounds={...ZONES[id].bounds};state.mode='free';state.gait='walk';state.target=null;state.ball=null;state.task='follow';state.portal=null;state.portalCooldown=1.3;
  Object.assign(state.player,{x:0,z:2.7,vx:0,vz:0,speed:0});Object.assign(state.horse,{x:1.6,z:1.6,vx:0,vz:0,speed:0});return true;
}
export function visitPortal(state,id){
  if(state.status!=='playing'||state.mode!=='free')return false;
  const portal=ZONES[state.zone||'paddock'].portals.find(p=>p.id===id);if(!portal)return false;
  state.portal=id;state.task='follow';return targetPlayer(state,portal.x,portal.z);
}
export function advanceEstate(state,dt,input={}){
  const events=advancePaddock(state,dt,input);if(state.status!=='playing')return events;
  state.portalCooldown=Math.max(0,(state.portalCooldown||0)-Math.min(.1,Math.max(0,dt)));
  if(Object.values(input).some(Boolean))state.portal=null;
  const portals=ZONES[state.zone||'paddock'].portals;
  const portal=portals.find(p=>(state.portal===p.id||!state.portalCooldown)&&Math.hypot(state.player.x-p.x,state.player.z-p.z)<.55);
  if(portal){state.portal=null;if(portal.pony){events.push({type:'box',pony:portal.pony});state.portalCooldown=2;}else{enterZone(state,portal.zone);events.push({type:'zone',zone:portal.zone});}}
  return events;
}
export function projectEstate(x,z,zone='paddock'){
  const config=ZONES[zone],depth=(z+4.2)/8.4,scale=.82+depth*.36;
  return{x:600+x*config.side*scale,y:config.ground+depth*config.depth,scale};
}
