(function(){
'use strict';
const $=s=>document.querySelector(s);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const REDUCED=matchMedia('(prefers-reduced-motion:reduce)').matches;
function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ═════════ 소리 (모두 WebAudio 합성) ═════════ */
const A={c:null,m:null,mute:false,clk:0,rum:null,
  init(){
    if(this.c){try{this.c.resume()}catch(e){}return}
    try{
      const C=window.AudioContext||window.webkitAudioContext;this.c=new C();
      this.m=this.c.createGain();this.m.gain.value=this.mute?0:.8;this.m.connect(this.c.destination);
      const n=this.c.sampleRate*2,b=this.c.createBuffer(1,n,this.c.sampleRate),d=b.getChannelData(0);
      for(let i=0;i<n;i++)d[i]=Math.random()*2-1;this.nb=b;
    }catch(e){this.c=null}
  },
  setMute(v){this.mute=v;if(this.m)this.m.gain.value=v?0:.8},
  noise(dur,freq,q,vol,type,when){
    if(!this.c)return;const t=this.c.currentTime+(when||0),s=this.c.createBufferSource();s.buffer=this.nb;s.loop=true;
    const f=this.c.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q;
    const g=this.c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(this.m);s.start(t,Math.random());s.stop(t+dur+.05);
  },
  tone(freq,dur,vol,type,when,att){
    if(!this.c)return;const t=this.c.currentTime+(when||0),o=this.c.createOscillator(),g=this.c.createGain();
    o.type=type||'sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+(att||.01));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(this.m);o.start(t);o.stop(t+dur+.05);
  },
  rumble(on){
    if(!this.c)return;
    if(on&&!this.rum){
      const s=this.c.createBufferSource();s.buffer=this.nb;s.loop=true;const f=this.c.createBiquadFilter();f.type='lowpass';f.frequency.value=110;
      const g=this.c.createGain();g.gain.value=.0001;g.gain.linearRampToValueAtTime(.9,this.c.currentTime+1.2);
      s.connect(f);f.connect(g);g.connect(this.m);s.start();this.rum={s,g};
      const clack=()=>{this.noise(.1,150,1,.55,'lowpass');this.noise(.1,130,1,.45,'lowpass',.14)};
      clack();this.clk=setInterval(clack,640);
    }else if(!on&&this.rum){
      clearInterval(this.clk);const r=this.rum;this.rum=null;
      try{r.g.gain.cancelScheduledValues(this.c.currentTime);r.g.gain.setValueAtTime(.0001,this.c.currentTime);r.s.stop(this.c.currentTime+.05)}catch(e){}
    }
  },
  whistle(){[392,494,587].forEach(f=>{this.tone(f,2.4,.07,'triangle',0,.18);this.tone(f*1.005,2.4,.04,'sawtooth',0,.25)});this.noise(2.2,2600,1.5,.03,'bandpass')},
  grand(){this.tone(55,2.6,.6,'sine',0,.02);this.noise(.5,90,.8,.7,'lowpass');[73.4,110,146.8,220,293.7,349.2,440].forEach((f,i)=>this.tone(f,8,.09-i*.008,i<3?'sine':'triangle',.1+i*.12,1.6))},
  applause(d){for(let i=0;i<d*70;i++)this.noise(.03+Math.random()*.03,1400+Math.random()*2200,1.2,.05+Math.random()*.07,'bandpass',Math.random()*d)},
  tick(){this.noise(.03,3200,6,.18,'bandpass')},
  crack(){this.noise(.12,4200,2,.5,'highpass');this.noise(.2,900,3,.3,'bandpass',.02)},
  shatter(){this.noise(.5,5200,.8,.6,'highpass');for(let i=0;i<22;i++)this.tone(1800+Math.random()*4200,.5+Math.random()*.9,.05,'sine',Math.random()*.45)},
  ok(){[659,784,1047].forEach((f,i)=>this.tone(f,.9,.14,'triangle',i*.11))},
  bad(){this.tone(110,.28,.2,'sawtooth');this.tone(104,.28,.18,'sawtooth')},
  get(){[880,1175,1568].forEach((f,i)=>this.tone(f,1.1,.09,'sine',i*.07))},
  note(f,w){this.tone(f,1.4,.16,'triangle',w||0);this.tone(f*2,.9,.05,'sine',w||0)},
  bell(w){[220,277.2,329.6,440,554.4].forEach(f=>this.tone(f,4.5,.11,'sine',w||0,.005))}
};

/* ═════════ 그림 조각 ═════════ */
function gear(cx,cy,r,n){let d='';const ri=r*.8,h=r*.34,p=(rr,a)=>(cx+rr*Math.cos(a)).toFixed(1)+' '+(cy+rr*Math.sin(a)).toFixed(1);
  for(let i=0;i<n;i++){const a=i/n*6.2832,w=6.2832/n;d+=(i?'L':'M')+p(ri,a)+'L'+p(r,a+w*.15)+'L'+p(r,a+w*.45)+'L'+p(ri,a+w*.6)}
  return d+'Z M'+(cx+h)+' '+cy+'a'+h+' '+h+' 0 1 0 '+(-2*h)+' 0a'+h+' '+h+' 0 1 0 '+(2*h)+' 0Z'}
function spiral(cx,cy,r0,r1,turns){let d='';const N=turns*28;for(let i=0;i<=N;i++){const a=i/28*6.2832,r=r0+(r1-r0)*i/N;d+=(i?'L':'M')+(cx+r*Math.cos(a)).toFixed(1)+' '+(cy+r*Math.sin(a)).toFixed(1)}return d}
let uid=0;
function watchSVG(o){
  o=Object.assign({spring:1,gear:1,hand:1,glass:1,h:359.5,m:354,s:0},o||{});const u='w'+(uid++);const R=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  let nums='';R.forEach((r,i)=>{const a=(i*30-90)*Math.PI/180;nums+='<text x="'+(76*Math.cos(a)).toFixed(1)+'" y="'+(76*Math.sin(a)+4).toFixed(1)+'" text-anchor="middle" font-size="11" font-family="Nanum Myeongjo,serif" font-weight="800" fill="#2a1c12">'+r+'</text>'});
  let ticks='';for(let i=0;i<60;i++){const a=i*6*Math.PI/180;ticks+='<line x1="'+(88*Math.cos(a)).toFixed(1)+'" y1="'+(88*Math.sin(a)).toFixed(1)+'" x2="'+((i%5?85:83)*Math.cos(a)).toFixed(1)+'" y2="'+((i%5?85:83)*Math.sin(a)).toFixed(1)+'" stroke="#2a1c12" stroke-width="'+(i%5?.6:1.4)+'"/>'}
  return '<svg viewBox="-125 -160 250 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="회중시계">'
  +'<defs><radialGradient id="'+u+'b" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#f7e2a4"/><stop offset=".45" stop-color="#c79a4b"/><stop offset="1" stop-color="#6e4a1c"/></radialGradient>'
  +'<radialGradient id="'+u+'d" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#241710"/><stop offset="1" stop-color="#0e0906"/></radialGradient></defs>'
  +'<circle cx="0" cy="-128" r="17" fill="none" stroke="url(#'+u+'b)" stroke-width="6"/><rect x="-9" y="-116" width="18" height="16" rx="3" fill="url(#'+u+'b)"/>'
  +'<circle r="104" fill="url(#'+u+'b)"/><circle r="94" fill="#3a2610"/><circle r="91" fill="#efe2c4"/>'+ticks+nums
  +'<circle r="62" fill="url(#'+u+'d)" stroke="#c79a4b" stroke-width="2"/>'
  +(o.spring?'<g data-p="spring"><circle cx="-18" cy="18" r="27" fill="#1a110a" stroke="#8a6223" stroke-width="1.5"/><path d="'+spiral(-18,18,3,24,5)+'" fill="none" stroke="#e9c46a" stroke-width="2"/></g>':'<circle cx="-18" cy="18" r="27" fill="none" stroke="#6e4a1c" stroke-width="1" stroke-dasharray="3 4"/>')
  +(o.gear?'<g data-p="gear" fill-rule="evenodd"><path class="g1" d="'+gear(24,-18,24,14)+'" fill="#c79a4b" stroke="#6e4a1c"/><path class="g2" d="'+gear(30,30,15,10)+'" fill="#d9b566" stroke="#6e4a1c"/><path class="g3" d="'+gear(-26,-30,13,9)+'" fill="#b08238" stroke="#6e4a1c"/></g>':'<circle cx="24" cy="-18" r="24" fill="none" stroke="#6e4a1c" stroke-width="1" stroke-dasharray="3 4"/><circle cx="30" cy="30" r="15" fill="none" stroke="#6e4a1c" stroke-dasharray="3 4"/>')
  +(o.hand?'<g data-p="hand"><g class="hh" transform="rotate('+o.h+')"><path d="M-3 8L0 -46L3 8Z" fill="#1a110a" stroke="#f0cf7e" stroke-width=".8"/></g><g class="mh" transform="rotate('+o.m+')"><path d="M-2.2 10L0 -72L2.2 10Z" fill="#1a110a" stroke="#f0cf7e" stroke-width=".8"/></g><g class="sh" transform="rotate('+o.s+')"><line y1="16" y2="-80" stroke="#b3261e" stroke-width="1.3"/></g><circle r="5" fill="#f0cf7e" stroke="#6e4a1c"/></g>':'<circle r="5" fill="none" stroke="#6e4a1c" stroke-dasharray="2 3"/>')
  +(o.glass?'<g data-p="glass"><circle r="92" fill="#cfe6ff" opacity=".07"/><path d="M-70 -40A82 82 0 0 1 10 -80" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".28"/></g>':'')
  +'<g class="crack" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="bevel"><path d="M-6 -4L-30 -38L-22 -62L-48 -78"/><path d="M-6 -4L28 -22L44 -10L78 -34"/><path d="M-6 -4L8 34L-8 58L6 88"/><path d="M-6 -4L-44 12L-58 4L-88 22"/><path d="M28 -22L36 -52"/><path d="M8 34L40 48"/></g>'
  +'</svg>';
}
function umb(c){return '<path d="M4 20A16 16 0 0 1 36 20Q32 16 28 20Q24 16 20 20Q16 16 12 20Q8 16 4 20Z" fill="'+c+'"/><path d="M20 20V33q0 4 -4 4" fill="none" stroke="#3b2115" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="4" x2="20" y2="1.5" stroke="#3b2115" stroke-width="2"/>'}
const IC={
  case:'<svg viewBox="0 0 40 40"><circle cx="20" cy="7" r="4" fill="none" stroke="#c79a4b" stroke-width="2"/><circle cx="20" cy="23" r="14" fill="#c79a4b"/><circle cx="20" cy="23" r="10.5" fill="#120c09" stroke="#6e4a1c" stroke-dasharray="2 2"/></svg>',
  spring:'<svg viewBox="0 0 40 40"><path d="'+spiral(20,20,2,15,4)+'" fill="none" stroke="#e9c46a" stroke-width="2.4"/></svg>',
  gear:'<svg viewBox="0 0 40 40"><path fill-rule="evenodd" d="'+gear(20,20,16,10)+'" fill="#c79a4b" stroke="#6e4a1c"/></svg>',
  hand:'<svg viewBox="0 0 40 40"><path d="M18 30L20 4L22 30Z" fill="#f0cf7e" stroke="#6e4a1c"/><path d="M12 31L30 14L15 34Z" fill="#f0cf7e" stroke="#6e4a1c"/><circle cx="19" cy="30" r="3" fill="#6e4a1c"/></svg>',
  glass:'<svg viewBox="0 0 40 40"><path d="M6 12L26 4L36 22L20 36L9 28Z" fill="#cfe6ff" fill-opacity=".45" stroke="#eaf5ff" stroke-width="1.5"/><path d="M12 14L24 9" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
  diary:'<svg viewBox="0 0 40 40"><rect x="7" y="5" width="26" height="30" rx="2" fill="#5a3320"/><rect x="10" y="5" width="3" height="30" fill="#3b2115"/><rect x="17" y="12" width="12" height="2" fill="#c79a4b"/><rect x="17" y="17" width="9" height="2" fill="#c79a4b"/></svg>',
  photo:'<svg viewBox="0 0 40 40"><rect x="6" y="4" width="28" height="33" fill="#f4eedd" stroke="#6e4a1c"/><rect x="9" y="7" width="22" height="22" fill="#33415e"/><g transform="translate(11 8) scale(.45)">'+umb('#f2c230')+'</g></svg>',
  letter:'<svg viewBox="0 0 40 40"><rect x="4" y="9" width="32" height="23" fill="#f4eedd" stroke="#6e4a1c"/><path d="M4 9L20 22L36 9" fill="none" stroke="#6e4a1c"/><circle cx="20" cy="23" r="4" fill="#8b1c1c"/><g transform="translate(25 22) scale(.24)">'+umb('#f2c230')+'</g></svg>'
};
function photoArt(){return '<svg viewBox="0 0 240 240" role="img" aria-label="노란 우산을 든 윤정의 사진"><rect width="240" height="240" fill="#2c3a55"/><rect y="170" width="240" height="70" fill="#4a4338"/><rect x="0" y="166" width="240" height="6" fill="#d8c59c" opacity=".5"/>'
  +'<rect x="150" y="40" width="74" height="126" fill="#5e1a1c"/><rect x="158" y="62" width="24" height="34" fill="#ffd98a" opacity=".85"/><rect x="190" y="62" width="24" height="34" fill="#ffd98a" opacity=".85"/><text x="187" y="56" text-anchor="middle" font-size="9" fill="#f0cf7e" font-family="Nanum Myeongjo,serif">새벽역</text>'
  +'<path d="M72 118L62 206H128L118 118Z" fill="#2d5fa8"/><circle cx="95" cy="98" r="15" fill="#e9c9a8"/><path d="M79 96Q82 78 96 79Q112 80 111 100Q106 88 95 89Q84 88 79 96Z" fill="#2a1c12"/><path d="M78 114H112V126H104V150H96V126H78Z" fill="#c62f2b"/><rect x="118" y="150" width="20" height="11" rx="1" fill="#3f9a56" transform="rotate(-14 128 155)"/><line x1="110" y1="140" x2="124" y2="154" stroke="#2d5fa8" stroke-width="7" stroke-linecap="round"/>'
  +'<g transform="translate(22 16) scale(3.1)">'+umb('#f2c230')+'</g><line x1="84" y1="78" x2="84" y2="142" stroke="#3b2115" stroke-width="3"/>'
  +'<g stroke="#bcd0f0" stroke-width="1" opacity=".5"><line x1="20" y1="20" x2="16" y2="34"/><line x1="140" y1="10" x2="136" y2="24"/><line x1="200" y1="14" x2="196" y2="28"/><line x1="30" y1="120" x2="26" y2="134"/><line x1="142" y1="100" x2="138" y2="114"/><line x1="226" y1="110" x2="222" y2="124"/></g></svg>'}

/* ═════════ 캔버스 연출 ═════════ */
const cv=$('#fx'),cx=cv.getContext('2d');let W=0,H=0;
function resize(){const d=Math.min(window.devicePixelRatio||1,2);W=window.innerWidth;H=window.innerHeight;cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0)}
window.addEventListener('resize',resize);resize();
const FX={mode:'title',t0:performance.now(),zoom:1,zoomTo:1,flash:0,shards:[],frozen:false,done:null};
function setMode(m){FX.mode=m;FX.t0=performance.now();FX.zoom=FX.zoomTo=1}
const hills=(()=>{const r=mul(7),a=[];for(let L=0;L<3;L++){const p=[];for(let i=0;i<=40;i++)p.push(r());a.push(p)}return a})();
const starsBg=(()=>{const r=mul(21),a=[];for(let i=0;i<160;i++)a.push([r(),r()*.6,r()*1.3+.3,r()]);return a})();
const drops=(()=>{const r=mul(99),a=[];for(let i=0;i<220;i++)a.push([r(),r(),r()*.6+.4]);return a})();

function drawTrain(c,fx,y,h,t,moving){
  // 왼쪽이 진행 방향: 기관차 → 1호차 … 4호차
  const lw=h*3.9;let x=fx;
  // 전조등
  const g=c.createLinearGradient(x-h*7,0,x,0);g.addColorStop(0,'rgba(255,230,170,0)');g.addColorStop(1,'rgba(255,230,170,.32)');
  c.fillStyle=g;c.beginPath();c.moveTo(x,y-h*.55);c.lineTo(x-h*7,y-h*1.5);c.lineTo(x-h*7,y+h*.2);c.closePath();c.fill();
  // 증기
  const chx=x+h*.55,chy=y-h*1.05;
  for(let i=0;i<16;i++){const age=((moving?t*.35:0)+i/16)%1;const px=chx+age*h*(moving?9:1.2)+Math.sin(i*3.1)*h*.2,py=chy-age*h*(moving?2.4:3.2)-h*.1;c.fillStyle='rgba(190,200,220,'+((1-age)*.22).toFixed(3)+')';c.beginPath();c.arc(px,py,h*(.22+age*1.1),0,7);c.fill()}
  // 기관차
  c.fillStyle='#0c0b0d';c.fillRect(x,y-h*.72,h*2.5,h*.56);c.beginPath();c.arc(x+h*.05,y-h*.44,h*.28,0,7);c.fill();
  c.fillRect(x+h*.42,y-h*1.05,h*.24,h*.36);c.fillRect(x+h*1.3,y-h*.86,h*.36,h*.2);
  c.fillStyle='#3a1012';c.fillRect(x+h*2.5,y-h*.98,h*1.1,h*.82);c.fillStyle='#0c0b0d';c.fillRect(x+h*2.44,y-h*1.04,h*1.22,h*.1);
  c.fillStyle='#ffcf7a';c.fillRect(x+h*2.72,y-h*.84,h*.4,h*.3);
  c.fillStyle='#fff1c4';c.beginPath();c.arc(x-h*.06,y-h*.6,h*.09,0,7);c.fill();
  c.fillStyle='#0c0b0d';for(let i=0;i<4;i++){c.beginPath();c.arc(x+h*(.5+i*.75),y-h*.02,h*(i<3?.24:.16),0,7);c.fill()}
  c.fillRect(x-h*.1,y-h*.18,lw,h*.1);
  x+=lw+h*.12;
  for(let k=0;k<4;k++){
    const L=h*5.1;
    c.fillStyle='#16090a';c.fillRect(x,y-h*.2,L,h*.2);
    c.fillStyle='#5e1a1c';c.fillRect(x,y-h*.95,L,h*.78);
    c.fillStyle='#1a1215';c.beginPath();c.moveTo(x-h*.04,y-h*.95);c.quadraticCurveTo(x+L/2,y-h*1.16,x+L+h*.04,y-h*.95);c.closePath();c.fill();
    c.fillStyle='#d8b56a';c.fillRect(x,y-h*.42,L,h*.03);
    c.save();c.shadowColor='rgba(255,200,110,.9)';c.shadowBlur=h*.5;c.fillStyle='#ffd98a';
    for(let i=0;i<9;i++)c.fillRect(x+h*(.3+i*.52),y-h*.82,h*.34,h*.32);
    c.restore();
    c.fillStyle='#0c0b0d';[.5,1.1,4,4.6].forEach(q=>{c.beginPath();c.arc(x+h*q,y-h*.02,h*.13,0,7);c.fill()});
    x+=L+h*.14;
  }
  return x-fx;
}
function drawLand(t,o){
  const c=cx;
  const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#04060d');sky.addColorStop(.55,o.dawn?'#1c2444':'#101830');sky.addColorStop(1,o.dawn?'#4a3a4e':'#1d2740');
  c.fillStyle=sky;c.fillRect(0,0,W,H);
  c.save();
  if(FX.zoom!==1){const px=W*.46,py=H*.66;c.translate(px,py);c.scale(FX.zoom,FX.zoom);c.translate(-px,-py)}
  if(o.stars){for(const s of starsBg){const x=((s[0]+t*.004*o.stars)%1)*W,tw=.5+.5*Math.sin(t*1.3+s[3]*40);c.fillStyle='rgba(235,240,255,'+(.35+.6*tw*s[3]).toFixed(2)+')';c.beginPath();c.arc(x,s[1]*H,s[2],0,7);c.fill()}}
  // 달무리
  const mx=W*.8,my=H*.2,mg=c.createRadialGradient(mx,my,0,mx,my,H*.42);mg.addColorStop(0,'rgba(210,225,255,.5)');mg.addColorStop(.08,'rgba(190,210,250,.22)');mg.addColorStop(1,'rgba(160,190,240,0)');
  c.fillStyle=mg;c.fillRect(0,0,W,H);c.fillStyle='rgba(236,242,255,.9)';c.beginPath();c.arc(mx,my,H*.035,0,7);c.fill();
  // 고가교와 기차 (dy = 다리 윗면 높이)
  const bridge=dy=>{
    // 고가교
    const ph=H*.26;c.fillStyle='#06080f';c.fillRect(0,dy,W,H*.022);const n=Math.max(6,Math.round(W/170)),sp=W/n;
    for(let i=0;i<=n;i++){c.fillRect(i*sp-sp*.09,dy,sp*.18,ph)}
    c.beginPath();for(let i=0;i<n;i++){c.moveTo(i*sp+sp*.09,dy+sp*.5);c.lineTo(i*sp+sp*.09,dy+H*.02);c.lineTo(i*sp+sp*.91,dy+H*.02);c.lineTo(i*sp+sp*.91,dy+sp*.5);c.arc(i*sp+sp*.5,dy+sp*.5,sp*.41,0,Math.PI,true)}c.fill('evenodd');
    c.strokeStyle='rgba(120,140,190,.25)';c.lineWidth=1;c.beginPath();c.moveTo(0,dy);c.lineTo(W,dy);c.stroke();
    const h=Math.min(H*.055,W*.032);drawTrain(c,o.trainX(h),dy,h,t,o.moving);
  };
  // 산
  const cols=['#111a30','#0c1324','#080d19'],base=[.56,.64,.74],amp=[.2,.16,.12];
  for(let L=0;L<3;L++){c.fillStyle=cols[L];c.beginPath();c.moveTo(0,H);const p=hills[L];for(let i=0;i<=40;i++){c.lineTo(i/40*W,H*(base[L]-amp[L]*p[i]*(L===0?1:.8)))}c.lineTo(W,H);c.closePath();c.fill();if(L===1&&!o.low)bridge(H*.665)}
  // 침엽수 실루엣
  c.fillStyle='#04060c';const rr=mul(5);for(let i=0;i<14;i++){const x=(i<7?rr()*.26:.74+rr()*.26)*W,hh=H*(.16+rr()*.22),w=hh*.3;c.beginPath();c.moveTo(x,H-hh);c.lineTo(x+w,H);c.lineTo(x-w,H);c.closePath();c.fill()}
  if(o.low)bridge(H*o.low);   // 엔딩: 기차를 화면 아래쪽으로
  c.restore();
  if(o.rain){c.strokeStyle='rgba(180,200,240,.34)';c.lineWidth=1;c.beginPath();for(const d of drops){const sp=o.rain===2?0:(.9+d[2])*1.1;const y=((d[1]+t*sp)%1)*H,x=((d[0]-(o.rain===2?0:t*.08))%1+1)%1*W,l=10+d[2]*16;c.moveTo(x,y);c.lineTo(x-l*.18,y+l)}c.stroke()}
}
function arch(c,x,y,a){const fl=y+a*.62,sp=y-a*.12;c.moveTo(x-a,fl);c.lineTo(x-a,sp);c.arc(x,sp,a,Math.PI,0,false);c.lineTo(x+a,fl);c.closePath()}
const TUN={v:7.2,T0:8,T1:36};
function drawTunnel(t){
  const c=cx,p=t*TUN.v,R=Math.hypot(W,H)*.62;
  const bump=Math.pow(Math.max(0,Math.sin(t*9.8)),18)*4;
  const X=W/2+Math.sin(t*31)*1.6+Math.sin(t*17)*1.2,Y=H*.5+Math.sin(t*23)*1.3+bump;
  c.fillStyle='#020203';c.fillRect(0,0,W,H);
  const zEnd=TUN.T1-p,zIn=TUN.T0-p;
  // 터널 끝의 바깥 빛
  if(zEnd<40){const a=R/Math.max(zEnd,.05),g=c.createRadialGradient(X,Y,0,X,Y,Math.max(a*1.1,2));g.addColorStop(0,'#eef4ff');g.addColorStop(.5,'#8ea9dc');g.addColorStop(1,'#2a3a66');c.save();c.shadowColor='#bcd0ff';c.shadowBlur=Math.min(120,a*.8);c.fillStyle=g;c.beginPath();arch(c,X,Y,a);c.fill();c.restore()}
  const n0=Math.max(Math.ceil(p+.22),TUN.T0),n1=Math.min(Math.floor(p+44),TUN.T1);
  for(let n=n1;n>=n0;n--){
    const z=n-p,a=R/z,zf=z+1,af=(n+1>TUN.T1)?0:R/zf;
    const dl=Math.min(n%6,6-n%6),L=.06+.95*Math.exp(-dl*.95),fog=1/(1+z*.09),k=(n%2?.9:1)*fog;
    c.fillStyle='rgb('+Math.round((26+170*L)*k)+','+Math.round((20+118*L)*k)+','+Math.round((16+66*L)*k)+')';
    c.beginPath();arch(c,X,Y,a);if(n<TUN.T1)arch(c,X,Y,R/(z+1));c.fill('evenodd');
    // 침목과 자갈
    const fy=Y+a*.62,fy2=n<TUN.T1?Y+R/(z+1)*.62:fy;
    c.fillStyle='rgb('+Math.round(22*k+8)+','+Math.round(18*k+6)+','+Math.round(15*k+5)+')';
    c.beginPath();c.moveTo(X-a,fy);c.lineTo(X+a,fy);c.lineTo(X+R/(z+1),fy2);c.lineTo(X-R/(z+1),fy2);c.closePath();if(n<TUN.T1)c.fill();
    c.strokeStyle='rgba(70,52,38,'+(fog*.9).toFixed(2)+')';c.lineWidth=Math.max(1,a*.035);c.beginPath();c.moveTo(X-a*.42,fy);c.lineTo(X+a*.42,fy);c.stroke();
    if(n%6===0){const lx=X-a*.8,ly=Y-a*.5,lr=a*.5,g=c.createRadialGradient(lx,ly,0,lx,ly,lr);g.addColorStop(0,'rgba(255,236,190,'+Math.min(1,fog*1.6).toFixed(2)+')');g.addColorStop(.12,'rgba(255,196,110,'+(fog*.8).toFixed(2)+')');g.addColorStop(1,'rgba(255,170,80,0)');c.fillStyle=g;c.beginPath();c.arc(lx,ly,lr,0,7);c.fill()}
  }
  // 레일
  c.strokeStyle='rgba(200,205,220,.55)';c.lineWidth=2;[-.26,.26].forEach(s=>{const zn=Math.max(.3,zIn>0?.3:.3),a=R/zn;c.beginPath();c.moveTo(X+s*a,Y+a*.62);const zz=Math.max(zEnd,.3),af=R/Math.max(zz,40>zz?zz:40);c.lineTo(X+s*(zEnd<44?R/Math.max(zEnd,.3):0),Y+(zEnd<44?R/Math.max(zEnd,.3)*.62:0));c.stroke()});
  // 터널에 들어가기 전: 암벽과 입구
  if(zIn>.22){const a=R/zIn;const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#070a13');g.addColorStop(.5,'#141a26');g.addColorStop(1,'#0a0c12');c.fillStyle=g;c.beginPath();c.rect(0,0,W,H);arch(c,X,Y,a);c.fill('evenodd');
    c.strokeStyle='#39414f';c.lineWidth=Math.max(3,a*.13);c.beginPath();const fl=Y+a*.62,sp=Y-a*.12;c.moveTo(X-a*1.06,fl);c.lineTo(X-a*1.06,sp);c.arc(X,sp,a*1.06,Math.PI,0,false);c.lineTo(X+a*1.06,fl);c.stroke();
    c.fillStyle='#0b0d12';c.fillRect(0,fl,W,H-fl);c.strokeStyle='rgba(200,205,220,.5)';c.lineWidth=2;[-.26,.26].forEach(s=>{c.beginPath();c.moveTo(X+s*R/.3,Y+R/.3*.62);c.lineTo(X+s*a,fl);c.stroke()});
    c.strokeStyle='rgba(180,200,240,.3)';c.lineWidth=1;c.beginPath();for(const d of drops){const y=((d[1]+t*1.6)%1)*H,x=d[0]*W;c.moveTo(x,y);c.lineTo(x-3,y+18)}c.stroke();
  }
  const out=clamp(1-zEnd/5,0,1);if(out>0){c.fillStyle='rgba(214,228,255,'+(out*out).toFixed(3)+')';c.fillRect(0,0,W,H)}
  const vg=c.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,Math.hypot(W,H)*.6);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');c.fillStyle=vg;c.fillRect(0,0,W,H);
  if(zEnd<=.3&&FX.done){const d=FX.done;FX.done=null;d()}
}
function drawCab(t){
  const c=cx;c.fillStyle='#030202';c.fillRect(0,0,W,H);
  if(!FX.frozen){const g=c.createRadialGradient(W/2,H*1.1,0,W/2,H*1.1,H*.9);const f=.5+.08*Math.sin(t*7)+.05*Math.sin(t*13);g.addColorStop(0,'rgba(255,130,40,'+f.toFixed(2)+')');g.addColorStop(1,'rgba(255,90,20,0)');c.fillStyle=g;c.fillRect(0,0,W,H)}
}
function drawShards(dt){
  const c=cx;for(const s of FX.shards){
    s.age+=dt;const slow=s.age>.5?Math.max(0,1-(s.age-.5)/.9):1;s.x+=s.vx*dt*slow;s.y+=s.vy*dt*slow;s.r+=s.vr*dt*slow;
    c.save();c.translate(s.x,s.y);c.rotate(s.r);c.globalAlpha=s.a*(FX.fade!=null?FX.fade:1);c.shadowColor='#ffe29a';c.shadowBlur=14;c.fillStyle=s.c;c.beginPath();c.moveTo(-s.z,-s.z*.4);c.lineTo(s.z,0);c.lineTo(-s.z*.3,s.z*.8);c.closePath();c.fill();c.restore();
  }
}
let last=performance.now();
function loop(now){
  requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
  if(FX.mode==='off')return;const t=(now-FX.t0)/1000;
  FX.zoom+=(FX.zoomTo-FX.zoom)*Math.min(1,dt*.5);
  if(FX.mode==='title')drawLand(t,{rain:1,moving:true,trainX:h=>W*1.05-((t*W*.022)%(W*1.15+h*26))});
  else if(FX.mode==='tunnel')drawTunnel(t);
  else if(FX.mode==='land')drawLand(t,{rain:1,moving:true,trainX:h=>W*.3-t*W*.004});
  else if(FX.mode==='cab'){drawCab(t);drawShards(dt)}
  else if(FX.mode==='end'){const k=clamp(t/30,0,1);drawLand(t,{stars:1+k*3,dawn:t>14,moving:true,low:.9,trainX:h=>W*.34-t*W*.012})}
  if(FX.flash>0){cx.fillStyle='rgba(214,228,255,'+FX.flash.toFixed(3)+')';cx.fillRect(0,0,W,H);FX.flash=Math.max(0,FX.flash-dt*.55)}
}
requestAnimationFrame(loop);

/* ═════════ 화면 전환과 오프닝 ═════════ */
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id))}
let skipFlag=false,cur=null,curHard=false;
/* 화면을 눌러야 넘어가는 곳에 흰 세모를 띄우고, NUDGE_IDLE ms 동안 안 누르면 안내 글자를 띄운다 */
const NUDGE_IDLE=3000;
const Nudge={t:0,show(n){this.hide();n.classList.add('show');this.t=setTimeout(()=>n.classList.add('idle'),NUDGE_IDLE)},hide(){clearTimeout(this.t);document.querySelectorAll('.nudge').forEach(x=>x.classList.remove('show','idle'))}};
function wait(ms,hard){return new Promise((res,rej)=>{if(skipFlag)return rej('skip');const id=ms===Infinity?0:setTimeout(done,ms);function done(){clearTimeout(id);cur=null;skipFlag?rej('skip'):res()}cur=done;curHard=!!hard})}
const cap=$('#cap'),big=$('#big'),kick=$('#kicker'),iw=$('#iwatch');
async function line(label,text){
  cap.classList.remove('show');await wait(450,true);
  cap.firstElementChild.textContent=label||'';cap.querySelector('p').textContent=text;cap.classList.add('show');
  await wait(600,true);                 // 글자가 떠오르는 동안은 넘기지 않음
  Nudge.show($('#nudge'));
  try{await wait(Infinity)}finally{Nudge.hide()}   // 화면을 누를 때까지 기다림
}
async function runIntro(){
  skipFlag=false;show('intro');const I=$('#intro');I.classList.remove('wide');big.classList.remove('show');kick.classList.remove('show');cap.classList.remove('show');iw.className='';
  big.querySelector('h2').innerHTML=[...'시간이 멈춘 열차'].map((ch,i)=>'<span style="transition-delay:'+(i*.16)+'s">'+(ch===' '?'&nbsp;':ch)+'</span>').join('');
  FX.shards=[];FX.fade=null;FX.frozen=false;
  try{
    A.rumble(true);
    if(!REDUCED){
      setMode('tunnel');
      await new Promise((res,rej)=>{FX.done=res;cur=()=>{cur=null;skipFlag?rej('skip'):0};curHard=true});
      A.whistle();
    }
    setMode('land');FX.flash=1;I.classList.add('wide');
    await wait(2600,true);
    kick.textContent='2026년 12월 31일 · 밤 11시 59분';kick.classList.add('show');
    await wait(2200,true);
    A.grand();big.classList.add('show');
    await wait(7200);
    big.classList.remove('show');kick.classList.remove('show');FX.zoomTo=1.7;
    await wait(1600,true);
    await line('','덜컹, 덜컹. 규칙적으로 흔들리는 객실. 창밖에는 비가 내리고 있다.');
    await line('안내 방송','“승객 여러분, 잠시 안내 말씀드리겠습니다.”');
    await line('안내 방송','“오늘은 지난 40년간 이 열차와 함께해 온 한시원 기관사님의 마지막 운행일입니다.”');
    await line('안내 방송','“오랜 시간 다른 사람들의 목적지를 향해 달려오신 기관사님께서, 이제는 자신만을 위한 새로운 길을 걸어가실 수 있도록 따뜻한 박수 부탁드립니다.”',7500);
    A.applause(4.5);
    await line('','객실에 박수 소리가 번진다.',4200);
    cap.classList.remove('show');await wait(500,true);
    setMode('cab');iw.innerHTML=watchSVG();iw.classList.add('show');
    await line('기관실','박수 소리가 들려오지만, 기관사는 창밖을 바라보며 어두운 표정을 짓는다.');
    for(let i=0;i<4;i++){A.tick();await wait(1000,true)}
    await line('기관실','주머니에서 꺼낸 오래된 회중시계. 바늘은 11시 59분을 가리키고 있다.');
    iw.classList.add('grip');
    await line('기관실','그는 슬픔을 이기지 못하고, 시계를 세게 쥔다.',3000);
    A.crack();iw.classList.add('cracked');
    await wait(900,true);A.crack();await wait(500,true);
    // 산산조각
    A.shatter();A.rumble(false);iw.classList.remove('grip');iw.classList.add('gone');FX.frozen=true;
    const r=iw.getBoundingClientRect(),ox=r.left+r.width/2,oy=r.top+r.height*.55;
    for(let i=0;i<170;i++){const a=Math.random()*6.283,v=(180+Math.random()*900)*(H/800);FX.shards.push({x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:Math.random()*6,vr:(Math.random()-.5)*14,z:3+Math.random()*9,a:.6+Math.random()*.4,age:0,c:['#f0cf7e','#fff3cf','#c79a4b','#e9c46a'][i%4]})}
    cap.classList.remove('show');
    await wait(2600,true);
    await line('','금빛 파편이 객실 곳곳으로 흩어진다.',3400);
    await line('','열차의 모든 소리가 끊긴다.',3200);
    for(let i=20;i>=0;i--){FX.fade=i/20;await wait(60,true)}
    await line('','그리고, 시간이 멈췄다.',3600);
    cap.classList.remove('show');await wait(900,true);
  }catch(e){if(e!=='skip')throw e}
  A.rumble(false);FX.done=null;startGame();
}
$('#intro').addEventListener('click',e=>{if(e.target.id==='skip')return;if(cur&&!curHard)cur()});
$('#skip').addEventListener('click',()=>{skipFlag=true;if(cur)cur()});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('#modal').classList.contains('on'))closeModal();
  if((e.key==='Enter'||e.key===' ')){
    if($('#voice').classList.contains('on')){e.preventDefault();$('#voice').click()}
    else if($('#intro').classList.contains('on')&&document.activeElement.id!=='skip'&&cur&&!curHard){e.preventDefault();cur()}
    else if(document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('hot')){e.preventDefault();document.activeElement.dispatchEvent(new MouseEvent('click',{bubbles:true}))}
  }
});
$('#board').addEventListener('click',()=>{A.init();A.tick();runIntro()});

/* ═════════ 게임 상태 ═════════ */
const fresh=()=>({car:4,reached:4,flags:{},inv:[],notes:[],seen:{},hints:{},started:false});
let S=fresh();
const ITEMS={
  case:{n:'빈 회중시계 케이스',ic:IC.case,view:()=>'<div style="width:180px;margin:0 auto 10px">'+watchSVG({spring:has('spring')&&S.flags.fixed,gear:S.flags.fixed,hand:S.flags.fixed,glass:S.flags.fixed})+'</div><p>어느새 주머니에 들어와 있던 시계 케이스. 이것을 지닌 사람만 멈춘 시간 속에서 움직일 수 있는 듯하다.</p><p>'+(S.flags.fixed?'네 개의 부품이 모두 제자리를 찾았다.':'속이 비어 있다. 흩어진 부품 네 개를 찾아야 한다. (현재 '+partCount()+'/4)')+'</p>'},
  diary1:{n:'일기 · 1985년 4월',ic:IC.diary,view:()=>'<div class="hand">1985년 4월.\n오늘 새벽역에서 한 여자를 만났다.\n노란 우산을 쓰고 있던 그녀는 내게 웃으며 인사했다.\n이름은 윤정이라고 했다.\n이상하게도 그 미소가 오래 기억에 남는다.</div>'},
  spring:{n:'태엽',ic:IC.spring,part:1,view:()=>'<p>회중시계의 첫 번째 부품. 금빛 태엽이 손끝에서 희미하게 떨린다.</p>'},
  photo:{n:'윤정의 사진',ic:IC.photo,view:()=>'<div class="flip" id="flip"><div><div class="f">'+photoArt()+'</div><div class="bk">“우산, 코트, 목도리, 기차표. 그날의 널 기억해.”</div></div></div><div class="acts"><button class="btn ghost" type="button" id="flipb">뒷면 보기</button></div>',after:b=>{b.querySelector('#flipb').onclick=e=>{const f=b.querySelector('#flip');f.classList.toggle('back');e.target.textContent=f.classList.contains('back')?'앞면 보기':'뒷면 보기'}}},
  gear:{n:'톱니바퀴',ic:IC.gear,part:1,view:()=>'<p>회중시계의 두 번째 부품. 오르골 안쪽에서 멜로디와 함께 굴러 나왔다.</p>'},
  diary3:{n:'일기 · 3월 14일',ic:IC.diary,view:()=>'<div class="hand">3월 14일.\n윤정이 세상을 떠났다.\n그날 이후 새벽역에는 더 이상 노란 우산이 보이지 않는다.\n하지만 나는 여전히 매일 자정 그곳에 열차를 세운다.\n언젠가 다시 그녀가 서 있을 것만 같아서.</div>'},
  hand:{n:'시계바늘',ic:IC.hand,part:1,view:()=>'<p>회중시계의 세 번째 부품. 별빛을 머금은 듯 차갑게 빛난다.</p>'},
  diary4:{n:'일기 · 12월 31일',ic:IC.diary,view:()=>'<div class="hand">12월 31일.\n오늘이 마지막 운행이다.\n이제 이 열차를 떠나야 한다.\n사람들은 새로운 시작이라고 말하지만, 내게는 마지막 남은 약속마저 끝나는 날이다.\n윤정이 기다리던 새벽역.\n나는 아직 그곳을 떠날 준비가 되지 않았다.</div>'},
  glass:{n:'유리조각',ic:IC.glass,part:1,view:()=>'<p>회중시계의 네 번째 부품. 깨진 시계 유리의 마지막 조각이다.</p>'},
  letter:{n:'봉인된 편지',ic:IC.letter,view:()=>'<div style="width:200px;margin:0 auto 10px">'+IC.letter+'</div><p>노란 우산 그림이 그려진 편지. 겉봉에는 <b>한시원에게</b>라고 적혀 있다.</p><p>'+(S.flags.given?'편지는 주인에게 돌아갔다.':'봉인이 단단해서 열리지 않는다. 받을 사람의 손에 닿아야 할 것 같다.')+'</p>'}
};
const DESC={case:'어느새 주머니에 들어온 빈 케이스',spring:'시계를 움직이는 금빛 태엽',photo:'노란 우산을 든 윤정. 뒷면에 글씨가 있다',gear:'오르골에서 나온 작은 톱니바퀴',hand:'별빛을 머금은 시계바늘',glass:'깨진 시계 유리의 마지막 조각',letter:'“한시원에게”. 단단히 봉인되어 있다'};
const DOCS=['diary1','diary3','diary4'];
const has=id=>S.inv.includes(id);
const partCount=()=>S.inv.filter(i=>ITEMS[i].part).length;
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2400)}
function say(t){const e=$('#say');e.textContent=t}
function addItem(id,quiet){if(has(id))return;S.inv.push(id);renderSide(id);if(!quiet){A.get();toast((DOCS.includes(id)?'기관사의 일기 · ':'소지품 획득 · ')+ITEMS[id].n)}}
function renderSide(newId){
  const inv=S.inv.filter(i=>!DOCS.includes(i)),docs=S.inv.filter(i=>DOCS.includes(i));
  const I=$('#items');I.innerHTML=inv.length?'':'<div class="empty">아직 아무것도 없다</div>';
  inv.forEach(id=>{const it=ITEMS[id],e=el('button','item'+(id===newId?' new':''),it.ic+'<span><b>'+it.n+'</b>'+DESC[id]+'</span>');e.type='button';e.onclick=()=>showItem(id);I.append(e)});
  $('#parts').textContent='시계 부품 '+partCount()+' / 4';
  $('#pslots').innerHTML=['spring','gear','hand','glass'].map(p=>'<span class="'+(has(p)?'on':'')+'" title="'+ITEMS[p].n+(has(p)?'':' (아직 못 찾음)')+'">'+IC[p]+'</span>').join('');
  const D=$('#docs');D.innerHTML=docs.length?'':'<div class="empty">아직 주운 기록이 없다</div>';
  docs.forEach(id=>{const e=el('button','docbtn'+(id===newId?' new':''),ITEMS[id].n+'<span>읽기</span>');e.type='button';e.onclick=()=>showItem(id);D.append(e)});
  $('#docCount').textContent=docs.length+' / 3장';
  const N=$('#notes');N.innerHTML=S.notes.length?'':'<div class="empty">물건을 살펴보면 여기에 모여요</div>';
  S.notes.forEach(k=>{const c=+k.split(':')[0],id=k.split(':')[1],m=meta(c,id);if(!m)return;const e=el('button','docbtn',m.label+'<span>'+CARS[c].n+'</span>');e.type='button';e.onclick=()=>openSpot(c,id);N.append(e)});
}
function showItem(id,got){const it=ITEMS[id];const b=openModal({k:got?'획득':'소지품',title:it.n,html:it.view()});if(it.after)it.after(b)}

/* ═════════ 모달 ═════════ */
let lastFocus=null;
function openModal(o){
  const m=$('#modal');lastFocus=document.activeElement;m.innerHTML='';
  const p=el('div','panel'+(o.wide?' wide':''));
  p.innerHTML='<button class="x" type="button" aria-label="닫기">×</button><p class="k">'+(o.k||'')+'</p><h3>'+o.title+'</h3><div class="body">'+(o.html||'')+'</div>';
  p.querySelector('.x').onclick=closeModal;m.append(p);
  /* 힌트는 '힌트 보기'를 눌러야 보인다. 한 번 본 힌트는 같은 퍼즐을 다시 열어도 보인다 */
  p.querySelectorAll('.hint').forEach(h=>{const key=o.title;S.hints=S.hints||{};if(S.hints[key])return;h.hidden=true;
    const bt=el('button','btn ghost hbtn','힌트 보기');bt.type='button';
    bt.onclick=()=>{S.hints[key]=1;h.hidden=false;h.classList.add('reveal');bt.remove();A.tick()};h.before(bt)});m.classList.add('on');m.onclick=e=>{if(e.target===m)closeModal()};
  p.querySelector('.x').focus();return p.querySelector('.body');
}
function closeModal(){$('#modal').classList.remove('on');if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}}
function lock(n,sep){
  const v=Array(n).fill(0),e=el('div','lock');
  v.forEach((_,i)=>{const w=el('div','wheel','<button type="button" aria-label="'+(i+1)+'번째 숫자 올리기">▲</button><output id="dg'+i+'">0</output><button type="button" aria-label="'+(i+1)+'번째 숫자 내리기">▼</button>');
    const o=w.children[1];w.children[0].onclick=()=>{v[i]=(v[i]+1)%10;o.textContent=v[i];A.tick()};w.children[2].onclick=()=>{v[i]=(v[i]+9)%10;o.textContent=v[i];A.tick()};
    e.append(w);if(sep&&sep.at===i+1)e.append(el('span','sep',sep.ch))});
  return {e,get:()=>v.join('')};
}
function puzzle(o){
  const b=openModal({k:o.k||'퍼즐',title:o.title,html:(o.art||'')+'<p>'+o.desc+'</p><div class="hint"><b>힌트</b>'+o.hint+'</div>'});
  const L=lock(o.n,o.sep);b.append(L.e);
  const msg=el('p','msg','');const acts=el('div','acts','<button class="btn" type="button">'+(o.btn||'열기')+'</button>');b.append(acts,msg);
  acts.firstChild.onclick=()=>{if(L.get()===o.answer){A.ok();closeModal();o.ok()}else{A.bad();L.e.classList.remove('shake');void L.e.offsetWidth;L.e.classList.add('shake');msg.textContent=o.wrong||'꿈쩍도 하지 않는다. 숫자가 틀린 것 같다.'}};
}
function speak(lines,label){return new Promise(res=>{
  const v=$('#voice'),p=v.querySelector('p');let i=0;v.querySelector('small').textContent=label||'';
  const nd=$('#vnudge');
  const next=()=>{if(i>=lines.length){Nudge.hide();v.classList.remove('on');v.onclick=null;return res()}p.remove();p.innerHTML=lines[i++];v.insertBefore(p,nd);Nudge.show(nd)};
  v.classList.add('on');v.onclick=next;next();
})}

/* ═════════ 객실 그림 ═════════ */
const DEFS='<defs>'
 +'<linearGradient id="gNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050812"/><stop offset="1" stop-color="#1b2745"/></linearGradient>'
 +'<linearGradient id="gBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc9c"/><stop offset=".5" stop-color="#c79a4b"/><stop offset="1" stop-color="#7a5524"/></linearGradient>'
 +'<linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>'
 +'<radialGradient id="gLamp"><stop offset="0" stop-color="#ffe6a8" stop-opacity=".75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>'
 +'<linearGradient id="gWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>'
 +'<pattern id="pDia" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="26" height="26" fill="none"/><rect x="11" y="11" width="4" height="4" fill="#fff" opacity=".13"/></pattern>'
 +'<pattern id="pRug" width="60" height="40" patternUnits="userSpaceOnUse"><path d="M0 20L30 0L60 20L30 40Z" fill="none" stroke="#f0cf7e" stroke-opacity=".14" stroke-width="2"/></pattern>'
 +'</defs>';
function rainWin(seed,w,h){const r=mul(seed);let s='<path d="M0 '+(h*.78)+'Q'+(w*.3)+' '+(h*.6)+' '+(w*.55)+' '+(h*.74)+'T'+w+' '+(h*.66)+'V'+h+'H0Z" fill="#070b16"/>';for(let i=0;i<46;i++){const x=r()*w,y=r()*h,l=5+r()*9;s+='<path d="M'+x.toFixed(0)+' '+y.toFixed(0)+'q-2 '+(l*.6).toFixed(0)+' 0 '+l.toFixed(0)+'q2 -'+(l*.4).toFixed(0)+' 0 -'+l.toFixed(0)+'Z" fill="#cfe0ff" opacity="'+(.35+r()*.5).toFixed(2)+'"/>'}return s}
const CONS=[[[60,70],[150,50],[190,130],[90,170]],[[40,60],[92,104],[142,66],[186,122],[132,184],[66,204]],[[72,62],[184,112],[102,204]]];
function starWin(i,sc){const p=CONS[i];let s='<polyline points="'+p.map(q=>q.join(',')).join(' ')+(i!==1?' '+p[0].join(','):'')+'" fill="none" stroke="#9db8e8" stroke-width="'+(1.2/(sc||1))+'" stroke-dasharray="4 5" opacity=".6"/>';p.forEach(q=>{s+='<path transform="translate('+q[0]+' '+q[1]+')" d="M0 -11Q1.5 -1.5 11 0Q1.5 1.5 0 11Q-1.5 1.5 -11 0Q-1.5 -1.5 0 -11Z" fill="#fff6d8"/><circle cx="'+q[0]+'" cy="'+q[1]+'" r="14" fill="#fff6d8" opacity=".12"/>'});return s}
function win(x,inner,id,label){const y=215,w=250,h=255;return '<g'+(id?' class="hot" data-id="'+id+'" tabindex="0" role="button" aria-label="'+label+'"':'')+'><rect x="'+(x-16)+'" y="'+(y-16)+'" width="'+(w+32)+'" height="'+(h+32)+'" rx="20" fill="url(#gBrass)"/><rect x="'+(x-9)+'" y="'+(y-9)+'" width="'+(w+18)+'" height="'+(h+18)+'" rx="14" fill="#24130b"/><svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><rect width="'+w+'" height="'+h+'" fill="url(#gNight)"/>'+inner+'</svg><path d="M'+(x+10)+' '+(y+h-14)+'L'+(x+84)+' '+(y+8)+'h34L'+(x+44)+' '+(y+h-14)+'Z" fill="#fff" opacity=".045"/></g>'}
function curtain(x,c){return '<path d="M'+(x-16)+' 196h60q-6 120 -44 150q20 60 -16 142Z" fill="'+c+'"/><path d="M'+(x+266)+' 196h-60q6 120 44 150q-20 60 16 142Z" fill="'+c+'"/><rect x="'+(x-26)+'" y="188" width="302" height="10" rx="5" fill="url(#gBrass)"/>'}
function seat(x,w,c){return '<g><rect x="'+x+'" y="512" width="'+w+'" height="150" rx="18" fill="'+c+'"/><rect x="'+x+'" y="512" width="'+w+'" height="150" rx="18" fill="url(#pDia)"/><rect x="'+(x-8)+'" y="650" width="'+(w+16)+'" height="46" rx="10" fill="'+c+'"/><rect x="'+(x-8)+'" y="650" width="'+(w+16)+'" height="46" rx="10" fill="#000" opacity=".2"/><rect x="'+(x-12)+'" y="690" width="'+(w+24)+'" height="34" fill="#2a160d"/><rect x="'+(x-12)+'" y="690" width="'+(w+24)+'" height="5" fill="url(#gBrass)"/><rect x="'+(x-6)+'" y="506" width="'+(w+12)+'" height="10" rx="5" fill="url(#gBrass)"/></g>'}
function door(to,open){return '<g class="hot" data-id="door" tabindex="0" role="button" aria-label="'+to+'로 가는 문"><rect x="56" y="186" width="188" height="540" rx="8" fill="#1c0f08"/><rect x="66" y="196" width="168" height="530" rx="4" fill="'+(open?'#7a4a2b':'#4a2a1a')+'"/><rect x="66" y="196" width="168" height="530" fill="url(#gWood)"/><rect x="92" y="230" width="116" height="170" rx="58" fill="'+(open?'#ffd98a':'#0a0f1c')+'" stroke="url(#gBrass)" stroke-width="6"/>'+(open?'<circle cx="150" cy="315" r="130" fill="url(#gLamp)"/>':'')+'<rect x="92" y="440" width="116" height="110" rx="4" fill="none" stroke="#2a160d" stroke-width="4"/><rect x="92" y="574" width="116" height="110" rx="4" fill="none" stroke="#2a160d" stroke-width="4"/><circle cx="216" cy="470" r="10" fill="url(#gBrass)"/><rect x="88" y="140" width="124" height="38" rx="4" fill="#120c09" stroke="url(#gBrass)" stroke-width="2"/><text x="150" y="166" text-anchor="middle" font-size="19" font-weight="800" fill="#f0cf7e">◀ '+to+'</text></g>'}
function lamps(xs){return xs.map(x=>'<circle cx="'+x+'" cy="118" r="150" fill="url(#gLamp)" opacity=".55"/><path d="M'+(x-34)+' 96h68l-12 26h-44Z" fill="url(#gBrass)"/><ellipse cx="'+x+'" cy="124" rx="24" ry="12" fill="#fff0c2"/>').join('')}
function shell(c,body){
  return '<svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+c.label+'">'+DEFS
  +'<rect width="1600" height="900" fill="'+c.wall+'"/>'
  +Array.from({length:17},(_,i)=>'<rect x="'+(i*100)+'" y="130" width="100" height="600" fill="url(#gWood)"/>').join('')
  +'<path d="M0 0H1600V112Q800 62 0 112Z" fill="'+c.ceil+'"/><path d="M0 112Q800 62 1600 112V134Q800 84 0 134Z" fill="'+c.trim+'"/><path d="M0 132Q800 82 1600 132" fill="none" stroke="url(#gBrass)" stroke-width="3"/>'
  +'<rect y="596" width="1600" height="134" fill="'+c.dado+'"/><rect y="592" width="1600" height="8" fill="url(#gBrass)"/>'
  +Array.from({length:8},(_,i)=>'<rect x="'+(20+i*200)+'" y="614" width="160" height="96" rx="4" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="3"/>').join('')
  +'<rect y="726" width="1600" height="174" fill="'+c.floor+'"/><rect y="726" width="1600" height="174" fill="url(#pRug)"/><rect y="726" width="1600" height="70" fill="url(#gFloor)"/>'
  +lamps(c.lamps||[420,800,1180])+body+'</svg>';
}
const T4={label:'4호차 객실',wall:'#5a3320',ceil:'#d9c9a3',trim:'#3b2115',dado:'#3b2115',floor:'#4a1719'};
const SCENES={
 4:()=>shell(T4,
   door('3호차',S.flags.clock&&S.flags.case4)
  +curtain(330,'#6b1d1f')+win(330,rainWin(11,250,255),'window','창밖')
  +curtain(720,'#6b1d1f')+win(720,rainWin(12,250,255))
  +curtain(1110,'#6b1d1f')+win(1110,rainWin(13,250,255))
  // 벽시계
  +'<g class="hot" data-id="clock" tabindex="0" role="button" aria-label="벽시계"><path d="M610 250q40 -46 80 0v250q-40 30 -80 0Z" fill="#2a160d" stroke="url(#gBrass)" stroke-width="3"/><circle cx="650" cy="296" r="38" fill="#efe2c4" stroke="url(#gBrass)" stroke-width="5"/>'+Array.from({length:12},(_,i)=>{const a=i*30*Math.PI/180;return '<line x1="'+(650+30*Math.sin(a)).toFixed(1)+'" y1="'+(296-30*Math.cos(a)).toFixed(1)+'" x2="'+(650+34*Math.sin(a)).toFixed(1)+'" y2="'+(296-34*Math.cos(a)).toFixed(1)+'" stroke="#2a1c12" stroke-width="2"/>'}).join('')+(S.flags.clock?'<line x1="650" y1="296" x2="649.7" y2="276" stroke="#2a1c12" stroke-width="4"/><line x1="650" y1="296" x2="647" y2="266" stroke="#2a1c12" stroke-width="2.5"/>':'')+'<circle cx="650" cy="296" r="3.5" fill="#2a1c12"/><rect x="628" y="350" width="44" height="130" rx="4" fill="#120c09" stroke="#6e4a1c"/><line x1="656" y1="350" x2="662" y2="440" stroke="url(#gBrass)" stroke-width="3"/><circle cx="662" cy="448" r="14" fill="url(#gBrass)"/></g>'
  +seat(300,310,'#1e5557')+seat(690,310,'#1e5557')+seat(1080,310,'#1e5557')+seat(1450,200,'#1e5557')
  // 멈춘 승객
  +'<g class="hot" data-id="passenger" tabindex="0" role="button" aria-label="멈춘 승객"><path d="M1196 560q54 -30 108 0l14 130h-136Z" fill="#232b3d"/><circle cx="1250" cy="520" r="34" fill="#39445c"/><path d="M1208 508q42 -52 84 0Z" fill="#161b29"/><rect x="1202" y="504" width="96" height="8" rx="4" fill="#161b29"/><path d="M1206 590q-40 10 -4 -60l22 8q-14 30 6 40Z" fill="#232b3d"/><path d="M1294 590q40 10 8 -62l-22 8q14 30 -8 40Z" fill="#232b3d"/><ellipse cx="1212" cy="524" rx="12" ry="16" fill="#39445c" transform="rotate(24 1212 524)"/><ellipse cx="1290" cy="522" rx="12" ry="16" fill="#39445c" transform="rotate(-24 1290 522)"/><rect x="1282" y="538" width="18" height="9" rx="2" fill="url(#gBrass)" transform="rotate(-24 1290 542)"/></g>'
  // 신문
  +'<g class="hot" data-id="news" tabindex="0" role="button" aria-label="좌석 위 신문"><path d="M800 628l150 -14l10 44l-150 14Z" fill="#e6dcc3" stroke="#2a1c12"/><path d="M812 634l70 -6" stroke="#2a1c12" stroke-width="6"/><path d="M814 648l126 -12M816 658l126 -12" stroke="#2a1c12" stroke-width="2" opacity=".6"/><circle cx="914" cy="630" r="10" fill="none" stroke="#b3261e" stroke-width="2.5"/></g>'
  // 여행가방
  +'<g class="hot" data-id="suitcase" tabindex="0" role="button" aria-label="여행가방"><path d="M444 716v-16q0 -14 14 -14h44q14 0 14 14v16" fill="none" stroke="#2a160d" stroke-width="9"/><rect x="380" y="716" width="200" height="130" rx="12" fill="#6b3a22"/><rect x="380" y="716" width="200" height="130" rx="12" fill="url(#gWood)"/><rect x="408" y="716" width="18" height="130" fill="#3b2115"/><rect x="534" y="716" width="18" height="130" fill="#3b2115"/><rect x="456" y="740" width="48" height="26" rx="4" fill="url(#gBrass)"/><text x="480" y="759" text-anchor="middle" font-size="14" font-family="Special Elite,monospace" fill="#2a1c12">'+(S.flags.case4?'OPEN':'0000')+'</text></g>'
 ),
 3:()=>shell({label:'3호차 식당칸',wall:'#6b1d1f',ceil:'#e2d2ac',trim:'#3a0e10',dado:'#4a2a1a',floor:'#1d3b3c',lamps:[455,845,1235]},
   door('2호차',S.flags.reg&&S.flags.mbox)
  +win(330,rainWin(31,250,255))+win(720,rainWin(32,250,255))+win(1110,rainWin(33,250,255))
  // 메뉴판
  +'<g class="hot" data-id="menu" tabindex="0" role="button" aria-label="메뉴판"><rect x="606" y="250" width="92" height="150" rx="4" fill="#5a3320" stroke="url(#gBrass)" stroke-width="3"/><rect x="616" y="260" width="72" height="130" fill="#1d241f"/><text x="652" y="284" text-anchor="middle" font-size="15" fill="#e8e2cf" font-family="Nanum Pen Script,cursive">MENU</text><path d="M626 304h52M626 324h52M626 344h40M626 364h46" stroke="#e8e2cf" stroke-width="2" opacity=".7"/></g>'
  // 식탁
  +[330,720,1110].map(x=>'<g><rect x="'+(x+110)+'" y="500" width="8" height="70" fill="url(#gBrass)"/><path d="M'+(x+84)+' 500h60l-14 -40h-32Z" fill="#f2d7a0"/><circle cx="'+(x+114)+'" cy="486" r="90" fill="url(#gLamp)" opacity=".8"/><path d="M'+(x-30)+' 580h310l26 130h-362Z" fill="#f2ece0"/><path d="M'+(x-30)+' 580h310l6 30h-322Z" fill="#fff" opacity=".5"/><path d="M'+(x-56)+' 710h362v14h-362Z" fill="#cfc6b4"/></g>').join('')
  // 영수증
  +'<g class="hot" data-id="receipt" tabindex="0" role="button" aria-label="식탁 위 영수증"><path d="M380 590h62v70l-10 -6l-10 6l-11 -6l-10 6l-11 -6l-10 6Z" fill="#fffdf6" stroke="#8d7a5c" transform="rotate(-8 410 620)"/><path d="M388 606h44M388 620h44M388 634h30" stroke="#6b4a2c" stroke-width="2.5" transform="rotate(-8 410 620)"/><ellipse cx="520" cy="622" rx="34" ry="10" fill="#d8cdb6"/><path d="M498 600h44v18q-22 14 -44 0Z" fill="#fff"/></g>'
  // 오르골
  +'<g class="hot" data-id="musicbox" tabindex="0" role="button" aria-label="오르골"><ellipse cx="846" cy="652" rx="78" ry="14" fill="#e9e2d0"/><rect x="786" y="596" width="120" height="52" rx="8" fill="#5a2a3a"/><rect x="786" y="596" width="120" height="52" rx="8" fill="url(#gWood)"/><rect x="786" y="590" width="120" height="14" rx="6" fill="url(#gBrass)"/>'+(S.flags.mbox?'<path d="M790 592l14 -64h92l14 64Z" fill="#3a1826" stroke="url(#gBrass)" stroke-width="2"/><circle cx="846" cy="566" r="12" fill="#f0cf7e" opacity=".5"/>':'')+'<circle cx="812" cy="624" r="7" fill="#c62f2b"/><circle cx="834" cy="624" r="7" fill="#3f9a56"/><circle cx="858" cy="624" r="7" fill="#f2c230"/><circle cx="880" cy="624" r="7" fill="#2d5fa8"/><path d="M906 618h16v-12" fill="none" stroke="url(#gBrass)" stroke-width="5"/></g>'
  // 계산대
  +'<g><rect x="1386" y="560" width="214" height="170" fill="#3b2115"/><rect x="1386" y="552" width="214" height="14" fill="url(#gBrass)"/></g>'
  +'<g class="hot" data-id="register" tabindex="0" role="button" aria-label="금전등록기"><path d="M1420 552v-60q0 -14 14 -14h112q14 0 14 14v60Z" fill="#8a6223"/><path d="M1420 552v-60q0 -14 14 -14h112q14 0 14 14v60Z" fill="url(#gWood)"/><rect x="1440" y="430" width="100" height="52" rx="6" fill="url(#gBrass)"/><rect x="1450" y="440" width="80" height="30" fill="#120c09"/><text x="1490" y="462" text-anchor="middle" font-size="19" font-family="Special Elite,monospace" fill="#f0cf7e">'+(S.flags.reg?'9000':'----')+'</text>'+[0,1,2,3].map(i=>'<circle cx="'+(1448+i*28)+'" cy="508" r="9" fill="#efe2c4" stroke="#2a1c12"/><circle cx="'+(1448+i*28)+'" cy="534" r="9" fill="#efe2c4" stroke="#2a1c12"/>').join('')+(S.flags.reg?'<rect x="1414" y="552" width="152" height="22" fill="#2a160d" stroke="url(#gBrass)"/>':'')+'</g>'
 ),
 2:()=>shell({label:'2호차 객실',wall:'#23344d',ceil:'#b9c2cf',trim:'#121c2c',dado:'#1a2638',floor:'#2a1f3a',lamps:[]},
   door('1호차',S.flags.trunk&&S.flags.sbox)
  +win(330,starWin(0),'stars','별이 보이는 창')+win(720,starWin(1),'stars','별이 보이는 창')+win(1110,starWin(2),'stars','별이 보이는 창')
  // 달력
  +'<g class="hot" data-id="calendar" tabindex="0" role="button" aria-label="벽 달력"><rect x="604" y="250" width="96" height="124" fill="#f6f1e4" stroke="#2a1c12"/><rect x="604" y="250" width="96" height="30" fill="#6b1d1f"/><text x="652" y="272" text-anchor="middle" font-size="18" font-weight="800" fill="#fde9c0">3월</text>'+Array.from({length:20},(_,i)=>'<rect x="'+(612+(i%5)*17)+'" y="'+(290+Math.floor(i/5)*19)+'" width="11" height="11" fill="#2a1c12" opacity=".22"/>').join('')+'<circle cx="634.5" cy="295.5" r="9" fill="none" stroke="#b3261e" stroke-width="2.5"/><circle cx="651.5" cy="333.5" r="9" fill="none" stroke="#b3261e" stroke-width="2.5"/><circle cx="668.5" cy="352.5" r="9" fill="none" stroke="#b3261e" stroke-width="2.5"/><circle cx="652" cy="246" r="5" fill="url(#gBrass)"/></g>'
  +seat(300,310,'#3c3566')+seat(690,310,'#3c3566')+seat(1080,310,'#3c3566')
  // 그림책
  +'<g class="hot" data-id="book" tabindex="0" role="button" aria-label="좌석 위 그림책"><path d="M400 640l72 -12l72 12v40l-72 -10l-72 10Z" fill="#f4eedd" stroke="#2a1c12"/><path d="M472 628v42" stroke="#2a1c12"/><path d="M414 648l44 -7M414 660l44 -7" stroke="#2b5b8a" stroke-width="3"/><path transform="translate(508 652) scale(.8)" d="M0 -11Q1.5 -1.5 11 0Q1.5 1.5 0 11Q-1.5 1.5 -11 0Q-1.5 -1.5 0 -11Z" fill="#f2c230"/></g>'
  // 트렁크
  +'<g class="hot" data-id="trunk" tabindex="0" role="button" aria-label="낡은 트렁크"><rect x="820" y="726" width="250" height="126" rx="10" fill="#4a2a1a"/><rect x="820" y="726" width="250" height="126" rx="10" fill="url(#gWood)"/><rect x="820" y="'+(S.flags.trunk?700:770)+'" width="250" height="10" fill="url(#gBrass)"/>'+(S.flags.trunk?'<path d="M820 726l20 -60h210l20 60Z" fill="#3b2115" stroke="url(#gBrass)" stroke-width="2"/>':'')+'<rect x="850" y="726" width="16" height="126" fill="#2a160d"/><rect x="1024" y="726" width="16" height="126" fill="#2a160d"/><rect x="916" y="752" width="58" height="30" rx="4" fill="url(#gBrass)"/><text x="945" y="773" text-anchor="middle" font-size="15" font-family="Special Elite,monospace" fill="#2a1c12">'+(S.flags.trunk?'0314':'0000')+'</text></g>'
  // 별 상자
  +'<g><rect x="1440" y="600" width="130" height="126" fill="#121c2c"/><rect x="1430" y="592" width="150" height="12" fill="url(#gBrass)"/></g>'
  +'<g class="hot" data-id="starbox" tabindex="0" role="button" aria-label="별이 새겨진 놋쇠 상자"><rect x="1456" y="530" width="98" height="62" rx="6" fill="url(#gBrass)"/><rect x="1456" y="530" width="98" height="18" rx="6" fill="#7a5524" opacity=".5"/>'+[1478,1505,1532].map(x=>'<path transform="translate('+x+' 568) scale(.75)" d="M0 -11Q1.5 -1.5 11 0Q1.5 1.5 0 11Q-1.5 1.5 -11 0Q-1.5 -1.5 0 -11Z" fill="#2a1c12"/>').join('')+(S.flags.sbox?'<path d="M1456 532l8 -34h82l8 34Z" fill="#7a5524" stroke="#f3dc9c"/>':'')+'</g>'
 ),
 1:()=>shell({label:'1호차 승무원칸',wall:'#3d4a3c',ceil:'#cfc8ae',trim:'#232b22',dado:'#262e25',floor:'#3b2115',lamps:[520,1060]},
  // 기관실 문
   '<g class="hot" data-id="door" tabindex="0" role="button" aria-label="기관실 연결문"><rect x="56" y="186" width="188" height="540" rx="8" fill="#0d100d"/><rect x="66" y="196" width="168" height="530" rx="4" fill="'+(S.flags.cabdoor?'#55604f':'#2c342b')+'"/><circle cx="150" cy="300" r="52" fill="'+(S.flags.cabdoor?'#ffb060':'#0a0f1c')+'" stroke="url(#gBrass)" stroke-width="7"/>'+(S.flags.cabdoor?'<circle cx="150" cy="300" r="140" fill="url(#gLamp)"/>':'')+Array.from({length:10},(_,i)=>'<circle cx="'+(78+(i%2)*144)+'" cy="'+(220+Math.floor(i/2)*120)+'" r="4" fill="#8d9a86"/>').join('')+'<rect x="100" y="420" width="100" height="96" rx="4" fill="#f6f1e4" stroke="url(#gBrass)" stroke-width="3"/><rect x="100" y="420" width="100" height="24" fill="#6b1d1f"/><text x="150" y="438" text-anchor="middle" font-size="14" font-weight="800" fill="#fde9c0">잠금</text><text x="150" y="494" text-anchor="middle" font-size="40" font-family="Special Elite,monospace" fill="#2a1c12">??</text><rect x="80" y="140" width="140" height="38" rx="4" fill="#120c09" stroke="url(#gBrass)" stroke-width="2"/><text x="150" y="166" text-anchor="middle" font-size="19" font-weight="800" fill="#f0cf7e">◀ 기관실</text></g>'
  +'<g class="hot" data-id="plaque" tabindex="0" role="button" aria-label="문 옆 명판"><rect x="270" y="400" width="92" height="64" rx="4" fill="url(#gBrass)"/><path d="M282 420h68M282 434h68M282 448h44" stroke="#2a1c12" stroke-width="3"/></g>'
  // 운행 안내문
  +'<g class="hot" data-id="notice" tabindex="0" role="button" aria-label="운행 안내문"><rect x="410" y="220" width="170" height="230" fill="#f6f1e4" stroke="#2a1c12" stroke-width="2"/><rect x="410" y="220" width="170" height="40" fill="#6b1d1f"/><text x="495" y="247" text-anchor="middle" font-size="19" font-weight="800" fill="#fde9c0">운행 안내</text><path d="M426 284h138M426 304h138M426 324h100M426 360h138M426 380h138M426 400h80" stroke="#2a1c12" stroke-width="3" opacity=".55"/><circle cx="495" cy="216" r="6" fill="#b3261e"/></g>'
  +win(660,rainWin(41,250,255))
  // 기록 보관함
  +'<g class="hot" data-id="cabinet" tabindex="0" role="button" aria-label="기록 보관함"><rect x="990" y="330" width="190" height="396" rx="6" fill="#55604f"/><rect x="990" y="330" width="190" height="396" rx="6" fill="url(#gWood)"/>'+[0,1,2].map(i=>'<rect x="1004" y="'+(346+i*126)+'" width="162" height="112" rx="4" fill="'+(S.flags.cab&&i===0?'#161b15':'#48523f')+'" stroke="#232b22" stroke-width="3"/><rect x="1060" y="'+(388+i*126)+'" width="50" height="12" rx="6" fill="url(#gBrass)"/>').join('')+'<rect x="1050" y="352" width="70" height="26" rx="3" fill="#f6f1e4"/><text x="1085" y="371" text-anchor="middle" font-size="15" font-weight="800" fill="#2a1c12">운행 기록</text></g>'
  // 물품 보관함
  +'<g class="hot" data-id="locker" tabindex="0" role="button" aria-label="물품 보관함"><rect x="1240" y="250" width="320" height="476" rx="6" fill="#4a2a1a"/><rect x="1240" y="250" width="320" height="476" fill="url(#gWood)"/><rect x="1330" y="262" width="140" height="30" rx="3" fill="#120c09" stroke="url(#gBrass)"/><text x="1400" y="284" text-anchor="middle" font-size="17" font-weight="800" fill="#f0cf7e">물품 보관함</text>'+Array.from({length:9},(_,i)=>{const x=1256+(i%3)*98,y=306+Math.floor(i/3)*136;return '<rect x="'+x+'" y="'+y+'" width="90" height="126" rx="3" fill="#1c110a"/><rect x="'+(x+12)+'" y="'+(y+70+(i*7)%20)+'" width="'+(40+(i*13)%26)+'" height="'+(34-(i*7)%20+20)+'" fill="'+['#e6dcc3','#6b1d1f','#1e5557','#c79a4b','#e6dcc3','#33415e','#e6dcc3','#5a3320','#e6dcc3'][i]+'" opacity=".85"/>'}).join('')+'</g>'
 ),
 0:()=>'<svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="기관실">'+DEFS
  +'<radialGradient id="gFire"><stop offset="0" stop-color="#ffd27a"/><stop offset=".4" stop-color="#ff7a1f"/><stop offset="1" stop-color="#7a1c05" stop-opacity="0"/></radialGradient>'
  +'<rect width="1600" height="900" fill="#1a211b"/><rect width="1600" height="900" fill="url(#gFloor)" transform="rotate(180 800 450)"/>'
  +Array.from({length:32},(_,i)=>'<circle cx="'+(30+i*50)+'" cy="40" r="6" fill="#3d4a3c"/><circle cx="'+(30+i*50)+'" cy="700" r="6" fill="#3d4a3c"/>').join('')
  +'<rect y="726" width="1600" height="174" fill="#0e0f0d"/>'+Array.from({length:20},(_,i)=>'<path d="M'+(i*84)+' 726l40 174" stroke="#2a2f29" stroke-width="3"/>').join('')
  // 전방 창
  +'<rect x="70" y="150" width="330" height="300" rx="20" fill="url(#gBrass)"/><rect x="86" y="166" width="298" height="268" rx="12" fill="url(#gNight)"/><svg x="86" y="166" width="298" height="268" viewBox="0 0 298 268">'+rainWin(51,298,268)+'</svg>'
  // 기관사
  +'<g class="hot" data-id="engineer" tabindex="0" role="button" aria-label="한시원 기관사"><path d="M330 430q70 -40 140 0l30 300h-200Z" fill="#141c2b"/><path d="M356 430l44 60l44 -60" fill="none" stroke="#c79a4b" stroke-width="3"/><circle cx="400" cy="372" r="46" fill="#4a5568"/><path d="M350 356q50 -62 100 0Z" fill="#0c111c"/><rect x="336" y="350" width="112" height="12" rx="6" fill="#0c111c"/><circle cx="400" cy="336" r="7" fill="url(#gBrass)"/><path d="M468 470q40 100 10 190l-26 -6q14 -90 -8 -160Z" fill="#141c2b"/><ellipse cx="466" cy="668" rx="16" ry="20" fill="#4a5568"/>'+(S.flags.given?'<rect x="446" y="660" width="46" height="30" fill="#f4eedd" stroke="#6e4a1c" transform="rotate(-12 468 676)"/>':'<path d="M468 688q6 40 -8 62" fill="none" stroke="url(#gBrass)" stroke-width="3" stroke-dasharray="5 4"/>')+'</g>'
  // 계기
  +'<g class="hot" data-id="gauges" tabindex="0" role="button" aria-label="계기판"><path d="M620 300h520M700 300v-130h360v130M880 170v-80" fill="none" stroke="#7a5524" stroke-width="14"/>'+[[660,300,54],[800,210,44],[960,210,44],[1100,300,54],[880,330,66]].map((g,i)=>'<circle cx="'+g[0]+'" cy="'+g[1]+'" r="'+g[2]+'" fill="url(#gBrass)"/><circle cx="'+g[0]+'" cy="'+g[1]+'" r="'+(g[2]-9)+'" fill="#efe2c4"/>'+Array.from({length:9},(_,k)=>{const a=(-120+k*30)*Math.PI/180;return '<line x1="'+(g[0]+(g[2]-14)*Math.sin(a)).toFixed(1)+'" y1="'+(g[1]-(g[2]-14)*Math.cos(a)).toFixed(1)+'" x2="'+(g[0]+(g[2]-20)*Math.sin(a)).toFixed(1)+'" y2="'+(g[1]-(g[2]-20)*Math.cos(a)).toFixed(1)+'" stroke="#2a1c12" stroke-width="2"/>'}).join('')+'<line x1="'+g[0]+'" y1="'+g[1]+'" x2="'+(g[0]+(g[2]-18)*Math.sin((i*47-60)*Math.PI/180)).toFixed(1)+'" y2="'+(g[1]-(g[2]-18)*Math.cos((i*47-60)*Math.PI/180)).toFixed(1)+'" stroke="#b3261e" stroke-width="3"/><circle cx="'+g[0]+'" cy="'+g[1]+'" r="5" fill="#2a1c12"/>').join('')+'</g>'
  // 화실
  +'<circle cx="880" cy="760" r="260" fill="url(#gFire)" opacity=".5"/><path d="M770 726v-110q110 -90 220 0v110Z" fill="#0b0b0a" stroke="#3d4a3c" stroke-width="10"/><path d="M800 726v-90q80 -66 160 0v90Z" fill="url(#gFire)"/><path d="M830 726q10 -70 34 -50q6 -50 30 -10q20 -30 30 60Z" fill="#ffe6a8" opacity=".8"/>'
  // 작업대와 시계
  +'<rect x="1160" y="560" width="300" height="20" fill="#5a3320"/><rect x="1180" y="580" width="16" height="146" fill="#3b2115"/><rect x="1424" y="580" width="16" height="146" fill="#3b2115"/>'
  +'<g class="hot" data-id="bench" tabindex="0" role="button" aria-label="작업대 위 회중시계 케이스"><path d="M1226 560l20 -16h130l20 16Z" fill="#6b1d1f"/><circle cx="1310" cy="516" r="40" fill="url(#gBrass)"/><circle cx="1310" cy="516" r="31" fill="'+(S.flags.fixed?'#efe2c4':'#120c09')+'"/>'+(S.flags.fixed?'<line x1="1310" y1="516" x2="1310" y2="494" stroke="#2a1c12" stroke-width="3"/><line x1="1310" y1="516" x2="1307" y2="490" stroke="#2a1c12" stroke-width="2"/><circle cx="1310" cy="516" r="60" fill="url(#gLamp)"/>':'<circle cx="1310" cy="516" r="22" fill="none" stroke="#6e4a1c" stroke-dasharray="3 4"/>')+'<circle cx="1310" cy="470" r="8" fill="none" stroke="url(#gBrass)" stroke-width="4"/></g>'
  // 출발 레버
  +'<g class="hot" data-id="lever" tabindex="0" role="button" aria-label="출발 레버"><rect x="1490" y="300" width="70" height="330" rx="10" fill="#0b0b0a" stroke="#3d4a3c" stroke-width="6"/><rect x="1518" y="330" width="14" height="270" rx="7" fill="#232b22"/><rect x="1470" y="340" width="110" height="26" rx="13" fill="'+(S.flags.given?'#e0362c':'#5a2420')+'"/>'+(S.flags.given?'<circle cx="1525" cy="353" r="90" fill="url(#gLamp)"/>':'')+'<text x="1525" y="290" text-anchor="middle" font-size="19" font-weight="800" fill="'+(S.flags.given?'#f0cf7e':'#6e6a55')+'">출발</text></g>'
  +'</svg>'
};
const CARS={
 4:{n:'4호차',kind:'객실칸',sub:'멈춰버린 시간',goal:'열차에 무슨 일이 생겼는지 확인하고 3호차로 이동하기'},
 3:{n:'3호차',kind:'식당칸',sub:'두 사람의 추억',goal:'두 사람의 관계를 알아내고 두 번째 시계 부품 찾기'},
 2:{n:'2호차',kind:'객실칸',sub:'돌아오지 않는 사람',goal:'윤정에게 무슨 일이 있었는지, 기관사가 왜 슬퍼하는지 알아내기'},
 1:{n:'1호차',kind:'승무원칸',sub:'마지막 운행의 진실',goal:'기관사가 슬퍼한 이유를 알아내고 마지막 편지 찾기'},
 0:{n:'기관실',kind:'운전실',sub:'다시 흐르는 시간',goal:'회중시계를 고치고, 멈춘 열차를 다시 출발시키기'}
};
const ORDER=[4,3,2,1,0];
const F=k=>()=>!!S.flags[k];
/* 칸마다 살펴볼 곳: lock은 퍼즐, clue는 단서 수첩에 기록, look은 그냥 보기, door는 다음 칸 */
const SPOTS={
 4:[{id:'clock',label:'벽시계',type:'lock',done:F('clock')},{id:'suitcase',label:'여행가방',type:'lock',done:F('case4')},{id:'news',label:'좌석 위 신문',type:'clue'},{id:'passenger',label:'멈춘 승객',type:'clue'},{id:'window',label:'창밖',type:'look'},{id:'door',label:'3호차 연결문',type:'door',done:()=>!!(S.flags.clock&&S.flags.case4)}],
 3:[{id:'register',label:'금전등록기',type:'lock',done:F('reg')},{id:'musicbox',label:'추억의 오르골',type:'lock',done:F('mbox')},{id:'menu',label:'메뉴판',type:'clue'},{id:'receipt',label:'식탁 위 영수증',type:'clue'},{id:'door',label:'2호차 연결문',type:'door',done:()=>!!(S.flags.reg&&S.flags.mbox)}],
 2:[{id:'trunk',label:'낡은 트렁크',type:'lock',done:F('trunk')},{id:'starbox',label:'별이 새겨진 상자',type:'lock',done:F('sbox')},{id:'calendar',label:'벽 달력',type:'clue'},{id:'book',label:'그림책',type:'clue'},{id:'stars',label:'창밖의 별자리',type:'clue'},{id:'door',label:'1호차 연결문',type:'door',done:()=>!!(S.flags.trunk&&S.flags.sbox)}],
 1:[{id:'cabinet',label:'기록 보관함',type:'lock',done:F('cab')},{id:'locker',label:'물품 보관함',type:'lock',done:F('letter')},{id:'door',label:'기관실 연결문',type:'lock',done:F('cabdoor')},{id:'notice',label:'운행 안내문',type:'clue'},{id:'plaque',label:'문 옆 명판',type:'clue'}],
 0:[{id:'bench',label:'회중시계 고치기',type:'lock',done:F('fixed')},{id:'engineer',label:'한시원 기관사',type:'lock',done:F('given')},{id:'gauges',label:'계기판',type:'look'},{id:'lever',label:'출발 레버',type:'door',done:F('given')}]
};
const meta=(c,id)=>SPOTS[c].find(m=>m.id===id);
const locksOf=c=>SPOTS[c].filter(m=>m.type==='lock');
const carDone=c=>locksOf(c).every(m=>m.done());
function spotState(c,m){if(m.type==='lock')return m.done()?'solved':'lock';if(m.type==='door'&&m.done())return 'solved';return S.seen[c+':'+m.id]?'seen':''}
function openSpot(c,id){
  const m=meta(c,id);if(!m)return;A.init();const k=c+':'+id;S.seen[k]=1;
  if(m.type==='clue'&&!S.notes.includes(k)){S.notes.push(k);setTimeout(()=>toast('단서 수첩에 기록 · '+m.label),50)}
  const f=ON[c]&&ON[c][id];if(f)f();
  if(c===S.car&&$('#game').classList.contains('on'))renderSpots();renderSide();
}
function render(){
  const c=CARS[S.car];
  $('#eyebrow').textContent=c.n+' · '+c.kind;$('#ctitle').textContent=c.sub;$('#goal').textContent=c.goal;
  $('#train').innerHTML=ORDER.map((k,i)=>{const C=CARS[k],open=k>=S.reached;return (i?'<span class="coupler" aria-hidden="true"></span>':'')+'<button type="button" class="car'+(k===0?' engine':'')+(k===S.car?' current':'')+(open?' lit':'')+(open&&carDone(k)?' done':'')+'" data-car="'+k+'"'+(open?'':' disabled')+' aria-current="'+(k===S.car)+'"><b>'+C.n+'</b><span>'+(open?C.kind:'잠김')+'</span></button>'}).join('');
  $('#scene').innerHTML=SCENES[S.car]();
  renderSpots();renderSide();
}
function renderSpots(){
  const L=locksOf(S.car),lc=$('#lockcount');
  lc.innerHTML='퍼즐 '+L.map(m=>'<i class="'+(m.done()?'on':'')+'"></i>').join('');
  lc.setAttribute('aria-label','이 칸의 퍼즐 '+L.filter(m=>m.done()).length+' / '+L.length+'개 풀림');
  $('#spots').innerHTML=SPOTS[S.car].map(m=>'<button type="button" class="chip '+(m.type==='lock'?'puz ':'')+spotState(S.car,m)+'" data-spot="'+m.id+'"><span class="k" aria-hidden="true"></span>'+m.label+'</button>').join('');
  $('#next').innerHTML=(carDone(S.car)&&S.car!==0)?'<div class="nextbar"><span>이 칸의 퍼즐을 모두 풀었다. 앞 칸으로 가는 문이 열려 있다.</span><button class="btn" type="button" data-go="'+(S.car-1)+'">'+CARS[S.car-1].n+'(으)로 이동</button></div>':'';
}
async function enterCar(c){
  S.car=c;S.reached=Math.min(S.reached,c);closeModal();render();
  try{$('#game').scrollTo({top:0,behavior:REDUCED?'auto':'smooth'})}catch(e){}
  const k=$('#card');k.firstElementChild.textContent=CARS[c].n;k.lastElementChild.textContent=CARS[c].sub;k.classList.add('show');
  say({4:'객실 안의 모든 것이 멈춰 있다. 눈에 띄는 것을 눌러 살펴보자.',3:'식당칸이다. 식탁 위에 누군가의 흔적이 남아 있다.',2:'조명이 꺼진 객실. 창밖으로 별이 또렷하게 보인다.',1:'승무원이 쓰는 칸이다. 기관실로 이어지는 철문이 보인다.',0:'기관실. 기관사가 창밖을 바라본 채 멈춰 있다.'}[c]);
  setTimeout(()=>k.classList.remove('show'),REDUCED?900:2200);
  if(c===4&&!S.flags.woke){
    S.flags.woke=1;
    await new Promise(r=>setTimeout(r,REDUCED?900:2300));
    await speak(['눈을 뜬다. 열차가 멈춰 있다.<br>박수를 치던 사람들도, 창밖의 빗방울도 그대로 굳어 있다.','주머니가 묵직하다.<br>꺼내 보니 속이 텅 빈 회중시계 케이스가 들어 있다.','멈춘 열차 안에서 움직일 수 있는 사람은 나뿐이다.<br>아마도, 이 케이스 때문에.']);
    addItem('case');
  }
}
function startGame(){FX.mode='off';cx.clearRect(0,0,W,H);S.started=true;show('game');enterCar(S.car)}
const locked=()=>{A.bad();say('문이 움직이지 않는다. 이 객실에서 아직 풀지 못한 것이 남아 있다.')};

const ON={
 4:{
  window(){say('창밖의 빗방울이 공중에 멈춰 있다. 떨어지지도, 흐르지도 않는다.')},
  passenger(){openModal({k:'단서',title:'멈춘 승객',html:'<p>박수를 치던 승객. 두 손이 맞닿기 직전에 그대로 굳어 있다. 숨소리도 들리지 않는다.</p><p>손목시계의 바늘은 <b>11시 59분</b>에 멈춰 있다. 초침도 움직이지 않는다.</p>'});},
  news(){openModal({k:'단서',title:'좌석 위의 신문',html:'<div class="news"><p class="dl">2026년 12월 31일 목요일</p><h4>40년의 운행, 오늘 마지막 열차를 달리다</h4><p><b>한시원 기관사, 오늘 밤 마지막 운행</b></p><p>1963년 개통한 새벽선의 야간열차를 40년 동안 몰아 온 한시원 기관사가 오늘 마지막 운행을 마친다. 1985년 견습 기관사로 철도에 들어온 그는 이듬해 처음으로 직접 열차를 몰았고, 2026년 12월 31일을 끝으로 은퇴한다.</p><p>철도 관계자는 “오랜 세월 승객들의 안전을 위해 헌신한 기관사에게 감사드린다”고 전했다.</p></div><p class="pencil">“모든 여정에는 시작과 끝이 있다.”</p>'});},
  clock(){
    if(S.flags.clock)return say('벽시계는 11시 59분을 가리킨 채 멈춰 있다. 아래 칸은 이미 열려 있다.');
    puzzle({title:'벽시계',desc:'바늘이 빠져 있는 벽시계. 추 아래 작은 칸이 잠겨 있고, 숫자판 네 개가 달려 있다.',hint:'마지막 순간을 기억하라.',n:4,answer:'1159',wrong:'칸은 꿈쩍도 하지 않는다.',ok(){S.flags.clock=1;render();addItem('diary1');say('벽시계 아래 칸이 열리고, 낡은 일기장이 나왔다.');showItem('diary1',1)}});
  },
  suitcase(){
    if(S.flags.case4)return say('여행가방은 열려 있다. 안에는 더 이상 아무것도 없다.');
    puzzle({title:'여행가방',desc:'낡은 가죽 여행가방. 네 자리 자물쇠로 잠겨 있다. 손잡이에 “한시원”이라는 이름표가 달려 있다.',hint:'그가 처음으로 직접 열차를 몬 해. 신문을 다시 읽어 보자.',n:4,answer:'1986',ok(){S.flags.case4=1;render();addItem('spring');say('가방 안쪽 주머니에서 금빛 태엽이 나왔다. 3호차로 가는 문에서 딸깍 소리가 난다.');showItem('spring',1)}});
  },
  door(){S.flags.clock&&S.flags.case4?enterCar(3):locked()}
 },
 3:{
  menu(){openModal({k:'단서',title:'메뉴판',html:'<div class="menu"><div><span>커피</span><span>2,500원</span></div><div><span>조각 케이크</span><span>4,000원</span></div><div><span>홍차</span><span>3,000원</span></div></div>'});},
  receipt(){openModal({k:'단서',title:'식탁 위의 영수증',html:'<div class="rcpt"><p style="text-align:center;margin:0 0 8px">새벽 식당칸<br>1985. 4.</p><div><span>커피</span><span>× 2</span></div><div><span>조각 케이크</span><span>× 1</span></div><p style="margin:10px 0 0;border-top:1px dashed #2a1c12;padding-top:6px">합계 ……</p></div><p>오래된 영수증이다. 끝부분이 찢겨 나갔다. 두 사람이 마주 앉았던 자리 같다.</p>'});},
  register(){
    if(S.flags.reg)return say('금전등록기 서랍은 열려 있다. 표시창에 9000이 떠 있다.');
    puzzle({title:'금전등록기',desc:'오래된 금전등록기. 네 자리 숫자를 누르는 자판이 달려 있다.',hint:'그날 두 사람이 먹은 것의 값. 메뉴판과 영수증을 함께 보자.',n:4,answer:'9000',btn:'계산하기',wrong:'땡. 금액이 맞지 않는다.',ok(){S.flags.reg=1;render();addItem('photo');say('서랍이 열리고, 지폐 대신 사진 한 장이 들어 있다. 뒷면에 글씨가 보인다.');showItem('photo',1)}});
  },
  musicbox(){
    if(S.flags.mbox)return say('오르골은 열려 있다. 멜로디는 한 음에서 멈춘 채 울리지 않는다.');
    const b=openModal({k:'퍼즐',title:'추억의 오르골',html:'<p>뚜껑이 잠긴 오르골. 색이 다른 버튼 네 개가 달려 있다. 정해진 순서대로 눌러야 열릴 것 같다.</p><div class="hint"><b>힌트</b>'+(has('photo')?'사진 뒷면에 적힌 물건의 순서, 그리고 앞면에서 그 물건들의 색.':'순서를 알려 줄 단서가 아직 없다. 이 객실을 더 살펴보자.')+'</div><div class="mbox"></div><div class="dots"><i></i><i></i><i></i><i></i></div><p class="msg"></p>'});
    const seq=[],ans='ybrg',box=b.querySelector('.mbox'),dots=b.querySelectorAll('.dots i'),msg=b.querySelector('.msg');
    [['r','#c62f2b','빨강',392],['g','#3f9a56','초록',523],['y','#f2c230','노랑',330],['b','#2d5fa8','파랑',440]].forEach(q=>{const bt=el('button');bt.type='button';bt.style.background=q[1];bt.setAttribute('aria-label',q[2]+' 버튼');bt.id='mb-'+q[0];
      bt.onclick=()=>{A.note(q[3]);seq.push(q[0]);dots.forEach((d,i)=>d.classList.toggle('on',i<seq.length));msg.textContent='';
        if(seq.length===4){if(seq.join('')===ans){[330,440,392,523,659,523,659,784].forEach((f,i)=>A.note(f,.5+i*.22));S.flags.mbox=1;setTimeout(()=>{closeModal();render();addItem('gear');say('오르골이 열리며 짧은 멜로디가 흐르다 멈춘다. 안에서 톱니바퀴가 나왔다.');showItem('gear',1)},700)}
          else{A.bad();seq.length=0;setTimeout(()=>dots.forEach(d=>d.classList.remove('on')),300);msg.textContent='오르골은 열리지 않는다. 순서가 다르다.';box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake')}}};
      box.append(bt)});
  },
  door(){S.flags.reg&&S.flags.mbox?enterCar(2):locked()}
 },
 2:{
  calendar(){const mk={2:'점검',14:'U',21:'교대',27:'정비'};let g='<div class="mcal"><div class="h">3월</div>'+'일월화수목금토'.split('').map(d=>'<span class="w">'+d+'</span>').join('')+'<span></span>'.repeat(6);
    for(let d=1;d<=31;d++){const m=mk[d];g+='<span class="'+(m?'o':'')+'">'+d+(m==='U'?'<svg viewBox="0 0 40 40" width="18" height="18" aria-label="노란 우산 그림">'+umb('#f2c230')+'</svg>':m?'<small>'+m+'</small>':'')+'</span>'}
    openModal({k:'단서',title:'벽 달력',html:g+'</div><p style="margin-top:12px">3월에서 넘어가지 않은 달력. 날짜 몇 개에 붉은 동그라미가 쳐 있다. 한 칸에만 글씨 대신 작은 그림이 그려져 있다.</p>'});},
  trunk(){
    if(S.flags.trunk)return say('트렁크는 열려 있다. 일기장이 있던 자리만 남아 있다.');
    puzzle({title:'낡은 트렁크',desc:'좌석 아래 밀어 넣어 둔 트렁크. 네 자리 자물쇠가 달려 있다. 오랫동안 아무도 열지 않은 것 같다.',hint:'잊을 수 없는 날. 그녀를 떠올리게 하는 것이 그려진 날을 월 두 자리, 일 두 자리로.',n:4,answer:'0314',ok(){S.flags.trunk=1;render();addItem('diary3');say('트렁크 안에서 기관사의 일기가 나왔다.');showItem('diary3',1)}});
  },
  book(){openModal({k:'단서',title:'그림책',wide:1,html:'<div class="book"><div><p><b>별 세는 밤</b></p><p>창밖의 별자리마다 별이 몇 개씩 모여 있는지 세어 보세요.</p></div><div><p style="font-size:13px;color:#7a5530">마지막 장, 아이의 낙서</p><p class="kid">“시간이 흘러야 별도 움직이고, 새로운 별도 볼 수 있대요!”</p></div></div>'});},
  stars(){openModal({k:'살펴보기',title:'창밖의 별자리',wide:1,html:'<div class="starview"><svg viewBox="0 0 780 260">'+[0,1,2].map(i=>'<g transform="translate('+(i*260+5)+' 0)">'+starWin(i)+'</g>').join('')+'</svg></div><p style="margin-top:12px">세 개의 창에 별자리가 하나씩 걸려 있다. 별들도 제자리에 멈춰 있다.</p>'})},
  starbox(){
    if(S.flags.sbox)return say('놋쇠 상자는 열려 있다.');
    puzzle({title:'별이 새겨진 놋쇠 상자',desc:'뚜껑에 별 세 개가 새겨진 작은 상자. 세 자리 자물쇠로 잠겨 있다.',hint:'그림책의 말대로 별을 세어, 왼쪽 창부터 읽어 보자.',n:3,answer:'463',ok(){S.flags.sbox=1;render();addItem('hand');say('상자 안에 시계바늘이 가지런히 놓여 있다.');showItem('hand',1)}});
  },
  door(){S.flags.trunk&&S.flags.sbox?enterCar(1):locked()}
 },
 1:{
  notice(){openModal({k:'단서',title:'운행 안내문',html:'<div class="news"><h4>운행 안내</h4><p>오늘 밤 이 열차는 한시원 기관사의 <b>마지막 운행</b>입니다.</p><p>종착역: 새벽역 · 도착 예정 24:00</p><p>40년간의 운행 기록은 기록 보관함에 보관되어 있습니다.</p></div>'});},
  plaque(){openModal({k:'단서',title:'문 옆 명판',html:'<p><b>기관실</b> · 관계자 외 출입 금지</p><p>문에는 날짜를 맞추는 달력식 잠금장치가 달려 있다.</p><p class="pencil">“여정이 끝난 다음 장에서 이 문이 열린다.”</p>'});},
  cabinet(){
    if(S.flags.cab)return say('기록 보관함은 비어 있다.');
    puzzle({title:'기록 보관함',desc:'운행 기록이 들어 있는 철제 보관함. 네 자리 자물쇠 옆에 ‘마지막 장’이라는 글귀가 새겨져 있다.',hint:'마지막 운행은 언제였을까. 이 열차의 다른 칸에 그 날짜가 적혀 있었다.',n:4,answer:'1231',ok(){S.flags.cab=1;render();addItem('diary4');addItem('glass');say('보관함에서 마지막 일기와 유리조각이 나왔다.');showItem('diary4',1)}});
  },
  locker(){
    if(S.flags.letter)return say('물품 보관함에는 주인을 기다리는 물건들만 남아 있다.');
    const shapes={umb:c=>umb(c),star:c=>'<path transform="translate(20 20) scale(1.4)" d="M0 -11Q1.5 -1.5 11 0Q1.5 1.5 0 11Q-1.5 1.5 -11 0Q-1.5 -1.5 0 -11Z" fill="'+c+'"/>',moon:c=>'<path d="M26 6A15 15 0 1 0 34 30A12 12 0 1 1 26 6Z" fill="'+c+'"/>',heart:c=>'<path d="M20 34L6 19Q2 8 12 7Q18 7 20 13Q22 7 28 7Q38 8 34 19Z" fill="'+c+'"/>',train:c=>'<rect x="6" y="12" width="28" height="16" rx="3" fill="'+c+'"/><circle cx="12" cy="31" r="4" fill="#2a1c12"/><circle cx="28" cy="31" r="4" fill="#2a1c12"/><rect x="10" y="15" width="8" height="6" fill="#fff"/>',flower:c=>[0,72,144,216,288].map(a=>'<circle cx="20" cy="11" r="6" fill="'+c+'" transform="rotate('+a+' 20 20)"/>').join('')+'<circle cx="20" cy="20" r="4" fill="#f2c230"/>'};
    const L=[['umb','#c62f2b','빨간 우산이 그려진 엽서.','새벽역 역무실'],['star','#f2c230','별이 그려진 봉투. 아이 글씨다.','기관사 할아버지께'],['train','#6b1d1f','기차 스티커가 붙은 소포 꼬리표.','4호차 7번 좌석 손님'],['umb','#f2c230','노란 우산이 그려진 엽서.','한시운'],['flower','#d77aa0','꽃이 그려진 축하 카드.','김도윤 차장'],['umb','#2d5fa8','파란 우산이 그려진 편지.','분실물 센터'],['heart','#c62f2b','하트가 그려진 쪽지.','(비어 있음)'],['umb','#f2c230','노란 우산이 그려진 편지. 단단히 봉인되어 있다.','한시원',1],['umb','#f2c230','노란 우산이 그려진 봉투.','새벽역 역장'],['star','#2d5fa8','파란 별 도장이 찍힌 봉투.','윤정'],['train','#1e5557','초록 기차가 그려진 승차권 봉투.','한시원 기관사 귀하 (반송)'],['moon','#cfd8e8','은빛 달이 그려진 초대장.','기관실 승무원 일동']];
    const b=openModal({k:'퍼즐',title:'물품 보관함',wide:1,html:'<p>주인을 찾지 못한 편지와 엽서가 잔뜩 쌓여 있다. 이 가운데 기관사 앞으로 온 것이 있을지도 모른다.</p><div class="hint"><b>힌트</b>일기 속 그녀는 늘 무엇을 쓰고 있었나. 그리고 받는 사람의 이름을 정확히.</div><div class="lost" style="margin-top:14px"></div><p class="msg"></p>'});
    const g=b.querySelector('.lost'),msg=b.querySelector('.msg');
    L.forEach((q,i)=>{const bt=el('button','', '<svg viewBox="0 0 80 60"><rect x="2" y="2" width="76" height="56" fill="#fffdf6" stroke="#8d7a5c"/><path d="M2 2L40 30L78 2" fill="none" stroke="#c9bfa6"/><g transform="translate(44 22) scale(.8)">'+shapes[q[0]](q[1])+'</g><path d="M8 40h26M8 48h18" stroke="#8d7a5c" stroke-width="2"/></svg>');bt.type='button';bt.id='lost'+i;bt.setAttribute('aria-label','우편물 '+(i+1));
      bt.onclick=()=>{A.tick();g.querySelectorAll('button').forEach(x=>x.classList.toggle('sel',x===bt));
        msg.innerHTML=q[2]+'<br>받는 사람: <b>'+q[3]+'</b><br><button class="btn" type="button" id="take" style="margin-top:8px">이 편지를 챙긴다</button>';
        msg.querySelector('#take').onclick=()=>{if(q[4]){A.ok();S.flags.letter=1;closeModal();render();addItem('letter');say('노란 우산이 그려진 편지. 겉봉에 “한시원에게”라고 적혀 있다.');showItem('letter',1)}else{A.bad();msg.textContent='이 편지는 아닌 것 같다. 다시 찾아보자.'}}};g.append(bt)});
  },
  door(){
    if(S.flags.cabdoor)return enterCar(0);
    if(!(S.flags.cab&&S.flags.letter)){A.bad();return say('기관실로 가기 전에, 이 객실에서 찾아야 할 것이 아직 남아 있다.')}
    let y=2026,m=12;
    const b=openModal({k:'퍼즐',title:'기관사 연결문',html:'<p>철문에 달력식 잠금장치가 달려 있다. 날짜 하나를 고르면 문이 반응한다.</p><div class="hint"><b>힌트</b>4호차 신문 귀퉁이의 연필 글씨를 떠올려 보자. 끝이 있으면, 그다음이 있다.</div><div class="cal" style="margin-top:14px"><header><button type="button" id="calp" aria-label="이전 달">‹</button><span id="calt"></span><button type="button" id="caln" aria-label="다음 달">›</button></header><div class="g"></div></div><p class="msg"></p>'});
    const g=b.querySelector('.g'),msg=b.querySelector('.msg');
    const draw=()=>{b.querySelector('#calt').textContent=y+'년 '+m+'월';g.innerHTML='';'일월화수목금토'.split('').forEach(d=>g.append(el('span','',d)));
      const first=new Date(y,m-1,1).getDay(),days=new Date(y,m,0).getDate();for(let i=0;i<first;i++)g.append(el('span','',''));
      for(let d=1;d<=days;d++){const bt=el('button',(y===2026&&m===12&&d===31)?'mk':'',String(d));bt.type='button';bt.id='day'+d;
        bt.onclick=()=>{if(m===1&&d===1&&y===2027){A.ok();S.flags.cabdoor=1;closeModal();render();say('1월 1일. 잠금장치가 풀리고, 철문 너머로 불빛이 새어 나온다.');setTimeout(()=>enterCar(0),1400)}
          else{A.bad();msg.textContent=(m===12&&d===31&&y===2026)?'12월 31일. 문은 이미 이 날짜에 멈춰 있다.':'문은 움직이지 않는다. 이 날이 아니다.'}};g.append(bt)}};
    b.querySelector('#calp').onclick=()=>{if(y===2026&&m===1)return;m--;if(m<1){m=12;y--}A.tick();draw()};
    b.querySelector('#caln').onclick=()=>{if(y===2027&&m===12)return;m++;if(m>12){m=1;y++}A.tick();draw()};draw();
  }
 },
 0:{
  gauges(){say('압력계의 바늘이 모두 제자리에 멈춰 있다. 화실의 불꽃도 흔들리지 않는다.')},
  bench(){
    if(S.flags.fixed)return say('회중시계가 작업대 위에서 조용히 빛나고 있다. 초침은 아직 움직이지 않는다.');
    const placed={},names={spring:'태엽',gear:'톱니바퀴',hand:'시계바늘',glass:'유리조각'};
    const b=openModal({k:'최종 퍼즐',title:'회중시계 고치기',wide:1,html:'<p>빈 케이스를 작업대에 올려놓았다. 모아 온 부품을 눌러 제자리에 끼워 넣자.</p><div class="bench"><div class="w"></div><div class="tray"></div></div><p class="msg"></p>'});
    const w=b.querySelector('.w'),tray=b.querySelector('.tray'),msg=b.querySelector('.msg');
    const draw=()=>{w.innerHTML=watchSVG({spring:placed.spring,gear:placed.gear,hand:placed.hand,glass:placed.glass})};draw();
    ['spring','gear','hand','glass'].forEach(id=>{const bt=el('button','',IC[id]+'<span>'+names[id]+'</span>');bt.type='button';bt.id='part-'+id;
      bt.onclick=()=>{
        if(id==='hand'&&!(placed.spring&&placed.gear)){A.bad();return msg.textContent='바늘을 걸 축이 아직 돌지 않는다. 안쪽 부품부터 넣어야 한다.'}
        if(id==='glass'&&!placed.hand){A.bad();return msg.textContent='유리는 맨 마지막에 덮어야 한다.'}
        placed[id]=1;bt.disabled=true;A.tick();A.note(523+Object.keys(placed).length*110);msg.textContent=names[id]+'을(를) 끼웠다.';draw();
        if(Object.keys(placed).length===4){S.flags.fixed=1;A.ok();setTimeout(()=>{closeModal();render();openModal({k:'회중시계',title:'시계가 제 모습을 되찾았다',html:'<div style="width:200px;margin:0 auto 12px">'+watchSVG()+'</div><p>네 개의 부품이 모두 제자리를 찾았다. 그런데 초침은 아직 움직이지 않는다.</p><p style="text-align:center;font-weight:700;color:var(--maroon)">봉인된 편지를 기관사에게 전달하십시오.</p>'});say('봉인된 편지를 기관사에게 전달하십시오.')},900)}
      };tray.append(bt)});
  },
  engineer(){
    if(S.flags.given)return say('기관사의 손에 편지가 들려 있다. 이제 출발 레버를 당길 차례다.');
    if(!S.flags.fixed)return say('한시원 기관사. 창밖을 바라본 채 멈춰 있다. 손에는 끊어진 시곗줄만 남아 있다.');
    const b=openModal({k:'기관실',title:'한시원 기관사',html:'<p>창밖을 바라보는 기관사의 손이 반쯤 펴져 있다. 무언가를 놓친 사람의 손이다.</p><div class="acts"><button class="btn" type="button" id="give">봉인된 편지를 건넨다</button></div>'});
    b.querySelector('#give').onclick=async()=>{
      closeModal();A.get();
      await speak(['편지가 그의 손에 닿는 순간, 봉인이 스르르 풀린다.']);
      A.bell();
      await speak(['“시원 씨, 우리의 시간이 끝나는 건 아니에요.<br>우리가 함께했던 순간은 언제나 당신 안에 남아 있을 테니까요.”','“이제 당신만을 위한 새로운 길을 걸어가 주세요.”'],'윤정의 목소리');
      S.flags.given=1;render();A.tick();setTimeout(()=>A.tick(),1000);
      await speak(['회중시계의 초침이 움직이기 시작한다.<br>출발 레버에 불이 들어온다.']);
      say('출발 레버가 활성화되었다. 레버를 당기자.');
    };
  },
  lever(){
    if(!S.flags.given){A.bad();return say('레버가 굳어 있다. 시간이 멈춘 동안에는 움직이지 않는다.')}
    runEnding();
  }
 }
};
$('#scene').addEventListener('click',e=>{const h=e.target.closest('.hot');if(!h)return;hideTag();openSpot(S.car,h.dataset.id)});
$('#game').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.car!==undefined){const k=+d.car;if(k>=S.reached&&k!==S.car){A.init();enterCar(k)}return}
  if(d.go!==undefined){A.init();enterCar(+d.go);return}
  if(d.spot)openSpot(S.car,d.spot);
});
const tagEl=$('#tag'),wrapEl=$('#sceneWrap');
function showTag(h){const m=meta(S.car,h.dataset.id);if(!m)return;const r=h.getBoundingClientRect(),p=wrapEl.getBoundingClientRect();tagEl.textContent=m.label;
  const y=r.top-p.top-8,below=y<34;tagEl.classList.toggle('below',below);tagEl.style.left=clamp(r.left+r.width/2-p.left,64,p.width-64)+'px';tagEl.style.top=(below?Math.min(r.bottom-p.top+8,p.height-34):y)+'px';tagEl.classList.add('show')}
function hideTag(){tagEl.classList.remove('show')}
$('#scene').addEventListener('mouseover',e=>{const h=e.target.closest('.hot');h?showTag(h):hideTag()});
$('#scene').addEventListener('mouseleave',hideTag);
$('#scene').addEventListener('focusin',e=>{const h=e.target.closest('.hot');if(h)showTag(h)});
$('#scene').addEventListener('focusout',hideTag);
$('#bSound').onclick=e=>{A.init();A.setMute(!A.mute);e.currentTarget.setAttribute('aria-pressed',!A.mute);e.currentTarget.textContent=A.mute?'소리 꺼짐':'소리 켜짐'};
$('#bReset').onclick=()=>{const b=openModal({k:'처음부터',title:'처음부터 다시 탈까요?',html:'<p>지금까지 푼 퍼즐과 모은 단서, 소지품이 모두 사라집니다.</p><div class="acts"><button class="btn" type="button" id="cfYes">다시 시작</button><button class="btn ghost" type="button" id="cfNo">취소</button></div>'});b.querySelector('#cfYes').onclick=resetAll;b.querySelector('#cfNo').onclick=closeModal};
function resetAll(){endRun++;A.rumble(false);S=fresh();closeModal();$('#eend').classList.remove('on');$('#eline').innerHTML='';setMode('title');show('title')}

/* ═════════ 엔딩 ═════════ */
let endRun=0;
async function runEnding(){
  const run=++endRun;closeModal();show('ending');setMode('end');A.init();
  const ew=$('#ewatch'),ln=$('#eline'),ee=$('#eend');ee.classList.remove('on');ew.innerHTML=watchSVG({s:300});ew.style.display='';
  const sh=ew.querySelector('.sh'),mh=ew.querySelector('.mh'),hh=ew.querySelector('.hh');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const tell=async(h,ms)=>{ln.style.opacity=0;await sleep(600);if(run!==endRun)return;ln.innerHTML=h;ln.style.opacity=1;await sleep(ms)};
  A.noise(.5,120,1,.8,'lowpass');
  (async()=>{for(let i=0;i<=10;i++){if(run!==endRun)return;sh.setAttribute('transform','rotate('+(300+i*6)+')');A.tick();if(i===10){mh.setAttribute('transform','rotate(360)');hh.setAttribute('transform','rotate(360)');A.bell();A.bell(1.6);A.bell(3.2)}await sleep(1000)}
    let s=0;while(run===endRun&&$('#ending').classList.contains('on')){s++;sh.setAttribute('transform','rotate('+(s*6)+')');mh.setAttribute('transform','rotate('+(s*.1)+')');await sleep(1000)}})();
  await tell('레버가 내려간다.<br>공중에 멈춰 있던 빗방울이 떨어진다.',4200);
  await tell('초침이 한 칸, 또 한 칸 움직인다.',4200);
  if(run!==endRun)return;A.rumble(true);A.whistle();
  await tell('2027년 1월 1일, 0시 0분.<br>열차가 다시 달린다.',5200);
  await tell('창밖의 별이 천천히 자리를 옮긴다.',4200);
  await tell('<span class="kid">“시간이 흘러야 별도 움직이고,<br>새로운 별도 볼 수 있대요!”</span><small>2호차 그림책 마지막 장의 낙서</small>',6500);
  if(run!==endRun)return;ln.style.opacity=0;await sleep(900);ln.innerHTML='';ee.classList.add('on');
  setTimeout(()=>{if(run===endRun)A.rumble(false)},9000);
}
$('#again').onclick=resetAll;

/* ═════════ 시작 ═════════ */
function start(d){if(d&&d.started&&d.flags){S=Object.assign(fresh(),d);startGame()}}
try{if(window.claude&&window.claude.hot){window.claude.hot.snapshot(()=>S);window.claude.hot.ready?window.claude.hot.ready(start):start(window.claude.hot.data||{})}}catch(e){}
window.__game={S:()=>S,skip:()=>{skipFlag=true;if(cur)cur()}};
})();