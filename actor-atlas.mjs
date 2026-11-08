const cache=new WeakMap();
export function actorAtlas(image,columns=4,rows=4,resolution=480){
  let versions=cache.get(image);if(!versions){versions=new Map();cache.set(image,versions);}const key=[columns,rows,resolution].join(':');if(versions.has(key))return versions.get(key);
  const w=image.width/columns,h=image.height/rows,c=document.createElement('canvas');c.width=Math.floor(w);c.height=Math.floor(h);
  const ctx=c.getContext('2d',{willReadFrequently:true}),cells=[];
  for(let i=0;i<columns*rows;i++){
    ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(image,i%columns*w,Math.floor(i/columns)*h,w,h,0,0,c.width,c.height);
    const pixels=ctx.getImageData(0,0,c.width,c.height).data;let left=c.width,right=0,top=c.height,bottom=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>80){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    cells.push({left,right,top,bottom});
  }
  const maxHeight=Math.max(...cells.map(b=>b.bottom-b.top+1)),scale=resolution/maxHeight,baseline=resolution+20,height=resolution+32;
  const reference=cells[rows===4?8:0],center=(reference.left+reference.right)/2;
  const halfWidth=Math.max(...cells.flatMap(b=>[Math.abs(b.left-center),Math.abs(b.right-center)]))*scale;
  const width=Math.ceil(halfWidth*2+16),frames=cells.map((b,i)=>{
    const frame=document.createElement('canvas');frame.width=width;frame.height=height;
    frame.getContext('2d').drawImage(image,i%columns*w,Math.floor(i/columns)*h,w,h,width/2-center*scale,baseline-b.bottom*scale,c.width*scale,c.height*scale);
    return frame;
  });
  const scratch=document.createElement('canvas');scratch.width=width;scratch.height=height;
  const value={frames,scratch,width,height,baseline,resolution};versions.set(key,value);return value;
}
export function drawActor(ctx,data,pose,x,y,height,{flip=false,breath=0,lean=0,other=null,weight=1}={}){
  let source=data.frames[pose.from];
  if(other||pose.mix){
    const c=data.scratch.getContext('2d');c.clearRect(0,0,data.width,data.height);c.globalCompositeOperation='lighter';
    for(const [p,alpha] of [[pose,other?weight:1],[other,1-weight]]){
      if(!p||alpha<=0)continue;
      c.globalAlpha=(1-p.mix)*alpha;c.drawImage(data.frames[p.from],0,0);
      if(p.mix){c.globalAlpha=p.mix*alpha;c.drawImage(data.frames[p.to],0,0);}
    }
    c.globalAlpha=1;c.globalCompositeOperation='source-over';source=data.scratch;
  }
  const scale=height/data.resolution;ctx.save();ctx.translate(x,y);ctx.rotate(lean);ctx.scale(flip?-1:1,1+breath);
  ctx.drawImage(source,-data.width*scale/2,-data.baseline*scale,data.width*scale,data.height*scale);ctx.restore();
}
