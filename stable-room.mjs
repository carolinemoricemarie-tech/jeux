import { actionPose, ease } from './stable-motion.mjs';
import { idlePose } from './animation.mjs';
import {PONIES} from './ponies.mjs';
import {actorAtlas,drawActor} from './actor-atlas.mjs';
import {walkingPose,clamp} from './animation.mjs';
import {cyclePose,detailPose} from './animation.mjs';
const CLIPS={hay:'careHay',carrot:'careCarrot',brush:'careBrush',pet:'carePet',rest:'carePet',pad:'equipPad',saddle:'equipSaddle',bridle:'equipBridle'};
const DESCRIPTIONS={hay:'donne du foin au poney',carrot:'donne une carotte au poney',brush:'brosse le poney',pet:'caresse le poney',rest:'se repose avec son poney',pad:'installe le tapis',saddle:'installe la selle sur le tapis',bridle:'met le filet au poney'};
const surface=()=>{const c=document.createElement('canvas');c.width=1200;c.height=800;return c;};
export class StableRoom {
  constructor(root,photos,{reducedMotion=false}={}){
    this.root=root;this.allPhotos=photos;this.photos=photos;this.reducedMotion=reducedMotion;
    this.canvas=root.querySelector('#stable-actor');this.ctx=this.canvas.getContext('2d');
    this.canvas.width=2400;this.canvas.height=1600;this.ctx.setTransform(2,0,0,2,0,0);this.ctx.imageSmoothingQuality='high';
    root.querySelector('#stable-backdrop').src=photos.room.src;
    this.work=surface();this.workCtx=this.work.getContext('2d');this.previous=surface();
    this.profiles=new Map();this.lastStamp=-1000;this.changedAt=-1000;this.identity='';this.character='';
    this.ponyId='noisette';this.restAtlas=actorAtlas(photos.ponyRest,4,3);
    if(!Object.keys(photos.characters).length)this.prepare('demo',photos);
  }
  prepare(id,photos){
    if(this.profiles.has(id))return;
    const bounds={};
    for(const name of new Set([...Object.values(CLIPS),'careIdle'])){
      const image=photos[name];if(!image)continue;
      const columns=name==='careIdle'?4:2,count=name==='careIdle'?8:4;
      const w=Math.floor(image.width/columns),h=Math.floor(image.height/2),c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d',{willReadFrequently:true}),cells=[];
      for(let i=0;i<count;i++){
        ctx.clearRect(0,0,w,h);ctx.drawImage(image,i%columns*image.width/columns,Math.floor(i/columns)*image.height/2,w,h,0,0,w,h);
        const pixels=ctx.getImageData(0,0,w,h).data;let minX=w,maxX=0,minY=h,maxY=0;
        let coatX=0,weight=0,starX=0,starY=0,stars=0;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
          const k=(y*w+x)*4;if(pixels[k+3]<=80)continue;
          minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
          const r=pixels[k],g=pixels[k+1],b=pixels[k+2];
          if(y>h*.35&&y<h*.7&&r>45&&r<205&&g<155&&r>g*1.16&&g>b*1.1){coatX+=x;weight++;}
          if(x>w*.55&&y<h*.5&&Math.min(r,g,b)>170&&Math.max(r,g,b)-Math.min(r,g,b)<35){starX+=x;starY+=y;stars++;}
        }
        cells.push({minX,maxX,minY,maxY,anchor:weight>200?coatX/weight:(minX+maxX)/2,star:stars>3?{x:starX/stars,y:starY/stars}:null});
      }
      const bottom=Math.max(...cells.map(b=>b.maxY));
      const maxWidth=Math.max(...cells.map(b=>b.maxX-b.minX));
      const scale=Math.min(780/Math.max(1,maxWidth),530/Math.max(1,bottom-Math.min(...cells.map(b=>b.minY))));
      // Register the cutouts before blending, so their feet and body do not drift.
      const poses=cells.map(b=>({dx:630-b.anchor*scale,dy:704-b.maxY*scale,star:b.star}));
      bounds[name]={w,h,scale,poses,columns};
    }
    this.profiles.set(id,{photos,bounds});
  }
  setCharacter(id,name){
    const photos=this.allPhotos.characters[id];
    if(!photos||id===this.character)return;
    this.prepare(id,photos);this.character=id;this.name=name;this.identity='';this.heldClip=null;
    this.root.dataset.rider=id;
  }
  setPony(id){if(this.ponyId!==id){this.ponyId=id;this.identity='';this.wasResting=false;this.root.dataset.ponyId=id;}}
  draw(ctx,clip,index,alpha){
    if(alpha<=0)return;
    const profile=this.profiles.get(this.character||'demo'),image=profile.photos[clip],b=profile.bounds[clip];
    if(!image||!b)return;
    const origin=b.poses[index];ctx.globalAlpha=alpha;
    ctx.drawImage(image,index%b.columns*image.width/b.columns,Math.floor(index/b.columns)*image.height/2,b.w,b.h,origin.dx,origin.dy,b.w*b.scale,b.h*b.scale);
  }
  drawNative(pony,effect,now,image){
    const frames={hay:[0,2,3,3],carrot:[0,4,5,5],brush:[6,7,6,7],pet:[0,8,9,9],pad:[0,10,11,11],saddle:[11,12,13,13],bridle:[13,14,15,15]},active=effect&&now<effect.until;
    let pose;
    if(active){const p=actionPose(effect.action,(now-effect.started)/(effect.until-effect.started),this.reducedMotion),path=frames[effect.action]||frames.pet;pose={from:path[p.from],to:path[p.to],mix:p.mix};this.nativeHeld={pony:this.ponyId,image,pose:{from:path.at(-1),to:path.at(-1),mix:0},until:effect.until+1500};}
    else if(pony.tack?.bridle)pose={from:15,to:15,mix:0};else if(pony.tack?.saddle)pose={from:13,to:13,mix:0};else if(pony.tack?.pad)pose={from:11,to:11,mix:0};
    else if(this.nativeHeld?.pony===this.ponyId&&this.nativeHeld.image===image&&now<this.nativeHeld.until)pose=this.nativeHeld.pose;
    else pose=this.reducedMotion?{from:0,to:0,mix:0}:detailPose(cyclePose(now/7000,2));
    this.ctx.clearRect(0,0,1200,800);drawActor(this.ctx,actorAtlas(image,4,4),pose,620,704,530,{breath:this.reducedMotion?0:Math.sin(now*.0018)*.0015});
    this.canvas.dataset.clip=active?CLIPS[effect.action]:pony.tack?.bridle?'equipBridle':pony.tack?.saddle?'equipSaddle':pony.tack?.pad?'equipPad':'careIdle';this.canvas.dataset.frame=String(pose.from);this.canvas.dataset.nativeCoat=PONIES[this.ponyId].kind;
    this.canvas.setAttribute('aria-label',(this.name||'La cavalière')+' et '+PONIES[this.ponyId].name+(active?' : '+DESCRIPTIONS[effect.action]:', dans leur box.'));
  }
  drawRest(pony,effect,now,progress){
    const c=this.ctx,id=PONIES[this.ponyId].row,index=progress*3,from=Math.floor(index),to=Math.min(3,from+1),mix=ease(index-from);
    c.clearRect(0,0,1200,800);drawActor(c,this.restAtlas,{from:id*4+from,to:id*4+to,mix},680,704,530,{breath:this.reducedMotion?0:Math.sin(now*.0016)*.002});
    const sharp=this.allPhotos.characters[this.character]?.stableActions,image=sharp||this.allPhotos.characters[this.character]?.paddockMotion;
    if(image){const child=sharp?null:actorAtlas(image),approach=effect?.action==='rest'?clamp((now-effect.started)/900):1,x=540-105*ease(approach);
      const pose=approach<1&&!this.reducedMotion?walkingPose((540-x)/135,this.character==='emmy'?5:8):this.reducedMotion?{from:8,to:8,mix:0}:idlePose(now/1000);
      drawActor(c,sharp?actorAtlas(image,2,2,720):child,sharp?{from:0,to:0,mix:0}:pose,x,704,this.character==='emmy'?340:385,{flip:!sharp&&approach<1,breath:this.reducedMotion?0:Math.sin(now*.002)*.0015});
    }
    this.canvas.dataset.clip=progress>=.99?'lying':progress<=.01?'standing':'lying-down';this.canvas.dataset.frame=String(from);this.canvas.dataset.ponyId=this.ponyId;
    this.canvas.setAttribute('aria-label',PONIES[this.ponyId].name+(progress>=.99?' est couché et se repose.':' se couche ou se relève doucement.'));
  }
  drawSharp(pony,effect,now,image){
    const c=this.ctx,active=effect&&now<effect.until,action=active?effect.action:null,t=active?clamp((now-effect.started)/(effect.until-effect.started)):0;
    const row=PONIES[this.ponyId].row,equipment=pony.tack?.bridle?3:pony.tack?.saddle?2:pony.tack?.pad?1:0;
    const progress=active?Math.min(ease(t/.25),ease((1-t)/.2)):0,target=action==='hay'||action==='carrot'||action==='pet'?745:595,x=450+(target-450)*progress;
    const gesture=active&&t>.23&&t<.82,index=gesture?(action==='brush'?2:['pad','saddle','bridle'].includes(action)?3:1):0;
    c.clearRect(0,0,1200,800);
    drawActor(c,actorAtlas(this.allPhotos.ponyCareTack,4,3,720),{from:row*4+equipment,to:row*4+equipment,mix:0},690,704,530,{breath:this.reducedMotion?0:Math.sin(now*.0017)*.0015});
    const walking=active&&!gesture&&progress>.02&&progress<.98,motion=this.allPhotos.characters[this.character]?.paddockMotion;
    if(walking&&motion&&!this.reducedMotion)drawActor(c,actorAtlas(motion),detailPose(walkingPose((x-450)/135,this.character==='emmy'?5:8)),x,704,this.character==='emmy'?350:395,{flip:t>.8});
    else drawActor(c,actorAtlas(image,2,2,720),{from:index,to:index,mix:0},x,704,this.character==='emmy'?350:395,{breath:this.reducedMotion?0:Math.sin(now*.0018)*.0015,lean:gesture&&action==='brush'&&!this.reducedMotion?Math.sin(now*.006)*.006:0});
    if(gesture&&['hay','carrot'].includes(action)&&this.allPhotos.stableProps){const im=this.allPhotos.stableProps,w=im.width/4,h=im.height/2,n=action==='hay'?0:4;c.drawImage(im,n%4*w,Math.floor(n/4)*h,w,h,x+65,action==='hay'?425:440,75,55);}
    this.canvas.dataset.clip=active?CLIPS[action]:equipment===3?'equipBridle':equipment===2?'equipSaddle':equipment===1?'equipPad':'careIdle';this.canvas.dataset.frame=String(index);this.canvas.dataset.nativeCoat=PONIES[this.ponyId].kind;this.canvas.dataset.sharpCharacter='true';
    this.canvas.setAttribute('aria-label',(this.name||'La cavalière')+' et '+PONIES[this.ponyId].name+(active?' : '+DESCRIPTIONS[action]:', dans leur box.'));
  }
  render(pony,effect,now){
    if(now-this.lastStamp<1000/60-1)return;this.lastStamp=now;
    const active=effect&&now<effect.until;
    if(this.wasActive&&!active)this.completedAt=now;this.wasActive=active;
    if(this.lastPony!==pony){this.heldClip=null;this.lastPony=pony;this.identity='';this.wasResting=false;this.wakingAt=null;}
    if(pony.resting){this.wasResting=true;this.wakingAt=null;const progress=effect?.action==='rest'?ease(clamp(((now-effect.started)/(effect.until-effect.started)-.18)/.82)):1;this.drawRest(pony,effect,now,progress);return;}
    if(this.wasResting){this.wasResting=false;this.wakingAt=now;}
    if(this.wakingAt!==null&&this.wakingAt!==undefined&&now-this.wakingAt<1400){this.drawRest(pony,null,now,1-ease((now-this.wakingAt)/1400));return;}
    const sharp=this.allPhotos.characters[this.character]?.stableActions;
    if(sharp&&this.allPhotos.ponyCareTack){this.drawSharp(pony,effect,now,sharp);return;}
    const native=PONIES[this.ponyId].kind==='white'?this.photos.characters?.[this.character]?.whiteCare:PONIES[this.ponyId].kind==='unicorn'?this.photos.characters?.[this.character]?.unicornCare:null;
    if(native){this.drawNative(pony,effect,now,native);return;}
    let clip,pose;
    if(active){
      clip=CLIPS[effect.action];pose=actionPose(effect.action,(now-effect.started)/(effect.until-effect.started),this.reducedMotion);
      this.heldClip=clip;this.heldIndex=effect.action==='rest'?0:3;
    }else{
      const idle=this.profiles.get(this.character||'demo').photos.careIdle;
      clip=pony.tack?.bridle?'equipBridle':pony.tack?.saddle?'equipSaddle':pony.tack?.pad?'equipPad':idle&&(!this.heldClip||now-this.completedAt>1500)?'careIdle':this.heldClip||'carePet';
      const index=clip.startsWith('equip')?3:this.heldClip?this.heldIndex:0;
      pose=clip==='careIdle'?(this.reducedMotion?{from:0,to:0,mix:0}:idlePose(now/1000,true)):{from:index,to:index,mix:0};
    }
    const identity=(this.character||'demo')+':'+this.ponyId+':'+clip;
    if(identity!==this.identity){
      const previous=this.previous.getContext('2d');previous.clearRect(0,0,1200,800);previous.drawImage(this.canvas,0,0,1200,800);
      this.changedAt=this.identity?now:now-320;this.identity=identity;
    }
    const blend=this.reducedMotion?1:ease((now-this.changedAt)/(clip==='careIdle'?650:320));
    const breath=this.reducedMotion?0:Math.sin(now*.0018)*.0015;
    const key=identity+':'+pose.from+':'+pose.to+':'+pose.mix.toFixed(3)+':'+blend.toFixed(3)+':'+breath.toFixed(4);
    if(key===this.lastKey)return;this.lastKey=key;
    // Premultiplied additive blending preserves the opacity of overlapping cutouts.
    const c=this.workCtx;c.clearRect(0,0,1200,800);c.globalCompositeOperation='source-over';
    this.draw(c,clip,pose.from,1-pose.mix);c.globalCompositeOperation='lighter';this.draw(c,clip,pose.to,pose.mix);c.globalAlpha=1;c.globalCompositeOperation='source-over';
    const out=this.ctx;out.clearRect(0,0,1200,800);out.globalAlpha=1-blend;out.drawImage(this.previous,0,0);
    out.globalCompositeOperation='lighter';out.globalAlpha=blend;out.save();out.translate(0,704);out.scale(1,1+breath);out.drawImage(this.work,0,-704);out.restore();out.globalAlpha=1;out.globalCompositeOperation='source-over';
    this.canvas.dataset.clip=clip;this.canvas.dataset.frame=pose.mix<.5?pose.from:pose.to;
    this.canvas.dataset.blend=pose.mix.toFixed(3);
    this.canvas.setAttribute('aria-label',active?(this.name||'La cavalière')+' '+DESCRIPTIONS[effect.action]+'.':(this.name||'La cavalière')+' et son poney dans l’écurie.');
  }
}
