export class GameAudio {
  constructor(){
    try{this.enabled=localStorage.getItem('crins-audio')!=='off';}catch{this.enabled=true;}
    this.nodes=new Set();this.distance=0;this.beat=0;this.lastCue=null;
  }
  unlock(){
    if(!this.ctx){
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return false;
      try{this.ctx=new Context();}catch{return false;}
      this.master=this.ctx.createGain();this.master.gain.value=this.enabled?.32:0;this.master.connect(this.ctx.destination);
      this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate);
      const a=this.noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    return true;
  }
  toggle(){this.enabled=!this.enabled;this.unlock();if(this.master)this.master.gain.setTargetAtTime(this.enabled?.32:0,this.ctx.currentTime,.03);try{localStorage.setItem('crins-audio',this.enabled?'on':'off');}catch{}return this.enabled;}
  track(node,end){this.nodes.add(node);node.onended=()=>this.nodes.delete(node);node.stop(end);}
  noiseBurst(time,duration,volume,frequency=1500,q=.7){
    if(!this.ctx||!this.enabled)return;
    const s=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();s.buffer=this.noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=q;
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.003);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    s.connect(filter).connect(gain).connect(this.master);s.start(time,Math.random());this.track(s,time+duration+.02);
  }
  tone(time,frequency,duration,volume=.08,type='sine'){
    if(!this.ctx||!this.enabled)return;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g).connect(this.master);o.start(time);this.track(o,time+duration+.02);
  }
  countdown(number){if(!this.ctx||!this.enabled||number===this.lastCue)return;this.lastCue=number;this.tone(this.ctx.currentTime,number===0?1046:660,number===0?.32:.12,.1);}
  hoof(strong=false){
    if(!this.ctx||!this.enabled)return;
    const t=this.ctx.currentTime;this.noiseBurst(t,.065,strong?.20:.12,750,.65);this.noiseBurst(t+.055,.045,strong?.12:.07,1800,.9);this.tone(t,110,.055,strong?.12:.07,'triangle');
  }
  step(speed,dt){const length=speed>3?1.35:.5;this.distance+=Math.max(0,speed)*dt;if(this.distance>length){this.distance%=length;this.beat++;this.hoof();}}
  clear(){if(this.ctx)this.tone(this.ctx.currentTime,784,.12,.035);}
  snort(){if(this.ctx)this.noiseBurst(this.ctx.currentTime,.5,.09,450,.6);}
  applause(){
    if(!this.ctx||!this.enabled)return;
    const t=this.ctx.currentTime;
    for(let i=0;i<150;i++){
      const at=t+Math.random()*5.8,frequency=800+Math.random()*1600;
      this.noiseBurst(at,.05+Math.random()*.07,.025+Math.random()*.045,frequency,.55);
    }
    for(const [i,n] of [523.25,659.25,783.99,1046.5].entries())this.tone(t+i*.13,n,.7,.04,'triangle');
  }
  firework(){if(this.ctx)this.noiseBurst(this.ctx.currentTime,.24,.065,350,.6);}
  stop(){for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();this.distance=0;this.lastCue=null;}
}
