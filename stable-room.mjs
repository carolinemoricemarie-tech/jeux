// Photographic care sequences are composited over a real-looking stable room.
const CLIPS={hay:'careHay',carrot:'careCarrot',brush:'careBrush',pet:'carePet',rest:'carePet',pad:'equipPad',saddle:'equipSaddle',bridle:'equipBridle'};
const DESCRIPTIONS={hay:'La cavalière donne du foin au cheval.',carrot:'La cavalière donne une carotte au cheval.',brush:'La cavalière brosse le cheval.',pet:'La cavalière caresse le cheval.',rest:'Le cheval se repose avec sa cavalière.',pad:'La cavalière installe le tapis.',saddle:'La cavalière installe la selle sur le tapis.',bridle:'La cavalière met le filet au cheval.'};
export class StableRoom {
  constructor(root,photos){
    this.root=root;this.photos=photos;this.canvas=root.querySelector('#stable-actor');this.ctx=this.canvas.getContext('2d');
    root.querySelector('#stable-backdrop').src=photos.room.src;
    this.bounds={};this.lastKey='';this.lastStamp=-1000;
    for(const [name,image] of Object.entries(photos)){
      if(!Object.values(CLIPS).includes(name))continue;
      const w=Math.floor(image.width/2),h=Math.floor(image.height/2),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const c=canvas.getContext('2d',{willReadFrequently:true});const cells=[];
      for(let i=0;i<4;i++){
        c.clearRect(0,0,w,h);c.drawImage(image,i%2*w,Math.floor(i/2)*h,w,h,0,0,w,h);
        const pixels=c.getImageData(0,0,w,h).data;let minX=w,maxX=0,minY=h,maxY=0;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>55){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
        cells.push({minX,maxX,minY,maxY});
      }
      this.bounds[name]=cells;
    }
  }
  render(pony,effect,now){
    if(now-this.lastStamp<1000/24)return;this.lastStamp=now;
    const active=effect&&now<effect.until;
    let clip,index=0;
    if(active){
      clip=CLIPS[effect.action];const progress=(now-effect.started)/(effect.until-effect.started);
      if(effect.action==='brush')index=[0,1,2,3,2,1][Math.floor(progress*18)%6];
      else if(effect.action==='rest')index=0;
      else index=Math.min(3,Math.floor(progress*4));
    }else{
      clip=pony.tack?.bridle?'equipBridle':pony.tack?.saddle?'equipSaddle':pony.tack?.pad?'equipPad':'carePet';
      index=clip==='carePet'?0:3;
    }
    const key=clip+':'+index;if(key===this.lastKey)return;this.lastKey=key;
    const image=this.photos[clip];if(!image)return;
    const w=Math.floor(image.width/2),h=Math.floor(image.height/2),bounds=this.bounds[clip];
    const bottom=Math.max(...bounds.map(b=>b.maxY));
    // Keep a fixed scale and baseline throughout the four poses; do not rescale moving arms.
    const maxWidth=Math.max(...bounds.map(b=>b.maxX-b.minX));
    const scale=Math.min(780/Math.max(1,maxWidth),530/Math.max(1,bottom-Math.min(...bounds.map(b=>b.minY))));
    const dx=600-w*scale/2,dy=704-bottom*scale;
    this.ctx.clearRect(0,0,1200,800);this.ctx.drawImage(image,index%2*w,Math.floor(index/2)*h,w,h,dx,dy,w*scale,h*scale);
    this.canvas.dataset.clip=clip;this.canvas.dataset.frame=index;
    this.canvas.setAttribute('aria-label',active?DESCRIPTIONS[effect.action]:'Le cheval et sa cavalière dans l’écurie.');
  }
}
