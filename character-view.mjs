const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const ANGLES={back:0,left:Math.PI/2,front:Math.PI,right:-Math.PI/2};
// The plane faces the camera; positive relative yaw moves toward SCREEN LEFT.
export function characterView(heading,cameraYaw,character,previous=null){
  const relative=wrap(heading-cameraYaw);
  let direction;
  if(previous&&Object.hasOwn(ANGLES,previous)&&Math.abs(wrap(relative-ANGLES[previous]))<Math.PI/4+.09)direction=previous;
  else{const sector=Math.round(relative/(Math.PI/2));direction=sector===0?'back':Math.abs(sector)===2?'front':sector>0?'left':'right';}
  return directionView(direction,character);
}
export function directionView(direction,character){
  const row={front:0,back:1,left:2,right:3}[direction]??1;
  return{direction,row,flip:character==='emmy'&&direction==='left'};
}
export function flatCharacterView(vx,vz,character,previous='front'){
  if(Math.hypot(vx,vz)<.04)return directionView(previous,character);
  const horizontal=Math.abs(vx),vertical=Math.abs(vz);
  const compatible=previous==='right'&&vx>0||previous==='left'&&vx<0||previous==='front'&&vz>0||previous==='back'&&vz<0;
  if(Math.abs(horizontal-vertical)<Math.max(horizontal,vertical)*.12&&compatible)return directionView(previous,character);
  return directionView(horizontal>vertical?(vx<0?'left':'right'):(vz<0?'back':'front'),character);
}
