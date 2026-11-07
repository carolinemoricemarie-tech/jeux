const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function spline(points,u){
  const i=Math.min(points.length-2,Math.max(0,Math.floor(u))),t=clamp(u-i,0,1);
  const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
  const value=key=>{
    const m=(c[key]-a[key])*.5,n=(d[key]-b[key])*.5;
    return {p:(2*t*t*t-3*t*t+1)*b[key]+(t*t*t-2*t*t+t)*m+(-2*t*t*t+3*t*t)*c[key]+(t*t*t-t*t)*n,
      v:(6*t*t-6*t)*b[key]+(3*t*t-4*t+1)*m+(-6*t*t+6*t)*c[key]+(3*t*t-2*t)*n};
  };
  const x=value('x'),z=value('z');return{x:x.p,z:z.p,heading:Math.atan2(-x.v,-z.v)};
}
export function createRail(input){
  const points=input.map(p=>Array.isArray(p)?{x:p[0],z:p[1]}:{x:p.x,z:p.z});
  const samples=[];let length=0,previous=null;
  for(let n=0;n<=(points.length-1)*40;n++){
    const u=n/40,p=spline(points,u);if(previous)length+=Math.hypot(p.x-previous.x,p.z-previous.z);
    samples.push({u,distance:length});previous=p;
  }
  return{points,samples,length};
}
export function railPoint(rail,distance){
  distance=clamp(distance,0,rail.length);let lo=0,hi=rail.samples.length-1;
  while(lo+1<hi){const m=(lo+hi)>>1;if(rail.samples[m].distance<distance)lo=m;else hi=m;}
  const a=rail.samples[lo],b=rail.samples[hi],t=(distance-a.distance)/Math.max(1e-8,b.distance-a.distance);
  return spline(rail.points,a.u+(b.u-a.u)*t);
}
