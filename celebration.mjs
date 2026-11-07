const COLORS=['#ff667e','#ffac4d','#ffe877','#92d783','#67d7df','#7c9cff','#c997ee'];
export class Celebration {
  constructor(canvas,{reducedMotion=false}={}){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.reduced=reducedMotion;this.started=null;this.lastBurst=-1;}
  start(now){this.started=now;this.lastBurst=-1;this.canvas.hidden=false;this.canvas.setAttribute('aria-label','Victoire ! Le feu d’artifice dessine un arc-en-ciel.');}
  stop(){this.started=null;this.canvas.hidden=true;this.ctx.clearRect(0,0,1200,700);}
  render(now){
    if(this.started===null)return false;
    const t=(now-this.started)/1000,c=this.ctx;c.clearRect(0,0,1200,700);
    this.canvas.dataset.rainbow=this.reduced||t>=3.8?'complete':'forming';
    c.globalCompositeOperation='lighter';
    for(let color=0;color<7;color++){
      const radius=425-color*13,progress=this.reduced?1:Math.max(0,Math.min(1,(t-color*.13)/3));
      if(!progress)continue;
      c.strokeStyle=COLORS[color];c.lineWidth=this.reduced?5:4;c.shadowColor=COLORS[color];c.shadowBlur=this.reduced?0:12;c.globalAlpha=.7;
      c.beginPath();c.ellipse(600,500,radius,radius*.76,0,Math.PI,Math.PI+Math.PI*progress);c.stroke();
      if(!this.reduced)for(let j=0;j<48;j++){
        const f=j/47;if(f>progress)continue;
        const angle=Math.PI+f*Math.PI,age=(t-color*.13-f*3)%2;
        if(age<0||age>1.3)continue;
        for(let k=0;k<3;k++){
          const a=j*2.399+k*2.1,spread=age*(13+k*9),x=600+Math.cos(angle)*radius+Math.cos(a)*spread,y=500+Math.sin(angle)*radius*.76+Math.sin(a)*spread+age*age*16;
          c.globalAlpha=(1-age/1.3)*.8;c.fillStyle=COLORS[color];c.beginPath();c.arc(x,y,1.3+k*.35,0,Math.PI*2);c.fill();
        }
      }
    }
    if(!this.reduced&&t<3.7)for(let i=0;i<7;i++){
      const flight=t-i*.19;if(flight<0||flight>1)continue;
      const x=230+i*123,y=690-flight*400;c.strokeStyle=COLORS[i];c.globalAlpha=1-flight*.7;c.lineWidth=2;c.beginPath();c.moveTo(x,y+42);c.lineTo(x,y);c.stroke();
    }
    c.globalAlpha=1;c.shadowBlur=0;c.globalCompositeOperation='source-over';
    const burst=Math.floor(t*2);if(burst!==this.lastBurst&&t<4&&!this.reduced){this.lastBurst=burst;return true;}return false;
  }
}
