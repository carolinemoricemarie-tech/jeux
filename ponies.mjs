export const PONIES={
  noisette:{name:'Noisette',kind:'bay',row:0,coat:'#ad704b',light:'#c18c64',mane:'#654231',saddle:'#d8918d'},
  nuage:{name:'Nuage',kind:'white',row:1,coat:'#eeeeea',light:'#fffdf5',mane:'#a9adb0',saddle:'#b5a1ca'},
  etoile:{name:'Étoile',kind:'unicorn',row:2,coat:'#f0d2df',light:'#fff9fd',mane:'#eeb6cc',saddle:'#c397d1'}
};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function coatPixel(r,g,b,kind,paired=false){
  if(kind==='bay')return[r,g,b];
  const mask=smooth(.96,1.03,r/Math.max(1,g))*smooth(.96,1.06,r/Math.max(1,b))*smooth(28,65,r);
  const light=Math.pow((r*.299+g*.587+b*.114)/255,.5);
  const color=kind==='white'?[120+light*130,122+light*128,121+light*125]:[195+light*60,150+light*95,180+light*75];
  return color.map((v,i)=>Math.round([r,g,b][i]*(1-mask)+Math.min(255,v)*mask));
}
export function childProtection(pixels,width,height,columns,character){
  // Locate the sage/mauve shirt in each pose. Its position registers a head
  // protection ellipse and the nearby hands, so coat changes never alter faces.
  const protectedPixels=new Uint8Array(width*height),cw=Math.floor(width/columns),ch=Math.floor(height/2);
  for(let cell=0;cell<columns*2;cell++){
    const ox=cell%columns*cw,oy=Math.floor(cell/columns)*ch,shirt=new Uint8Array(cw*ch),count=new Uint32Array(cw);
    const source=(x,y)=>((oy+y)*width+ox+x)*4;
    for(let y=Math.floor(ch*.18);y<ch*.72;y++)for(let x=Math.floor(cw*.16);x<cw*.76;x++){
      const k=source(x,y),r=pixels[k],g=pixels[k+1],b=pixels[k+2];
      const cloth=character==='louane'?r>130&&g>100&&r>g*1.06&&b>g*1.09&&b>r*.9:g>105&&g>r*1.03&&g>b*1.06;
      if(pixels[k+3]>80&&cloth){shirt[y*cw+x]=1;count[x]++;}
    }
    let center=Math.floor(cw*.4);for(let x=Math.floor(cw*.2);x<cw*.58;x++)if(count[x]>count[center])center=x;
    let top=ch*.34;
    outer:for(let y=Math.floor(ch*.18);y<ch*.6;y++)for(let x=Math.max(0,center-Math.ceil(cw*.025));x<Math.min(cw,center+cw*.025);x++)if(shirt[y*cw+x]){top=y;break outer;}
    let faceX=0,faceY=0,faceWeight=0;
    for(let y=Math.max(0,Math.floor(top-ch*.22));y<top;y++)for(let x=Math.max(0,Math.floor(center-cw*.16));x<Math.min(cw,center+cw*.18);x++){
      const k=source(x,y),r=pixels[k],g=pixels[k+1],b=pixels[k+2];
      if(pixels[k+3]>80&&g>110&&b>70&&r>g*1.1&&r<g*1.6&&r>b*1.15&&r<b*2){faceX+=x;faceY+=y;faceWeight++;}
    }
    faceX=faceWeight>8?faceX/faceWeight:center;faceY=faceWeight>8?faceY/faceWeight:top-ch*.075;
    const distances=new Uint16Array(cw*ch);distances.fill(2048);
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=y*cw+x;distances[i]=shirt[i]?0:Math.min(distances[i],x?distances[i-1]+1:2048,y?distances[i-cw]+1:2048);}
    for(let y=ch-1;y>=0;y--)for(let x=cw-1;x>=0;x--){const i=y*cw+x;distances[i]=Math.min(distances[i],x<cw-1?distances[i+1]+1:2048,y<ch-1?distances[i+cw]+1:2048);}
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
      const k=source(x,y),r=pixels[k],g=pixels[k+1],b=pixels[k+2];
      const head=((x-faceX)/(cw*.11))**2+((y-faceY)/(ch*.14))**2<1;
      const neutralClothes=r<g*1.28&&r<Math.max(1,b)*1.6;
      const body=Math.abs(x-faceX)<cw*(y>ch*.85?.14:.095)&&y>=top&&neutralClothes;
      const hands=distances[y*cw+x]<cw*.09&&r>g*1.05&&r<g*1.43&&r<Math.max(1,b)*1.85&&g>110;
      if(head||body||hands||shirt[y*cw+x])protectedPixels[(oy+y)*width+ox+x]=1;
    }
  }
  return protectedPixels;
}
const tinted=new WeakMap();
export function coatImage(image,kind,paired=false,personMask=null){
  if(kind==='bay')return image;
  let variants=tinted.get(image);if(!variants)tinted.set(image,variants=new Map());
  const key=kind+':'+paired+':'+!!personMask;if(variants.has(key))return variants.get(key);
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  const pixels=c.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
  let protection;
  if(personMask){const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;const mc=mask.getContext('2d',{willReadFrequently:true});mc.drawImage(personMask,0,0,mask.width,mask.height);protection=mc.getImageData(0,0,mask.width,mask.height).data;}
  else if(paired)protection=childProtection(d,canvas.width,canvas.height,image.width>image.height*1.6?4:2,image.characterId);
  for(let k=0;k<d.length;k+=4){
    const weight=personMask?1-protection[k]/255:protection?.[k/4]?0:1;
    if(d[k+3]<40||weight===0)continue;
    const rgb=coatPixel(d[k],d[k+1],d[k+2],kind,paired);
    for(let channel=0;channel<3;channel++)d[k+channel]=Math.round(d[k+channel]*(1-weight)+rgb[channel]*weight);
  }
  c.putImageData(pixels,0,0);variants.set(key,canvas);return canvas;
}
