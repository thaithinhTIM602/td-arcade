import {GROUND, SKY_HEIGHT, newFlight, advance, flap, viewport} from "./flight.js";
import {paintIcon} from "./flight-icons.js";

const $=id=>document.getElementById(id);
const arena=$("arena"), canvas=$("sky"), ctx=canvas.getContext("2d"), sheet=$("sheet"), paper=$("sheet-paper");
const storeKey="dog-bird-air-mail.v1";
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
const phoneView=matchMedia("(max-width:600px) and (orientation:portrait)");
const icons=(root=document)=>root.querySelectorAll("canvas[data-icon]").forEach(c=>paintIcon(c));
const icon=(name,size=16)=>'<canvas data-icon="'+name+'" width="'+size+'" height="'+size+'" aria-hidden="true"></canvas>';
let settings={best:0, sound:true};
try{
  const data=JSON.parse(localStorage.getItem(storeKey)||"{}");
  settings={best:Number.isSafeInteger(data.best)&&data.best>0?data.best:0,sound:data.sound!==false};
}catch{}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(settings));}catch{}}
let run=null, view=null, modal="", pauseOrigin=false, previousFrame=null, clock=0, crashTime=0, newBest=false;
let audio=null, marks=[], lastScore=-1, lastGates=-1, lastLetters=-1;
function setupAudio() {
  if(!settings.sound)return;
  try {
    if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();
    if(audio.state==="suspended")audio.resume().catch(()=>{});
  }catch{}
}
function tone(freq,end,delay,duration,wave,volume) {
  if(!audio||!settings.sound||audio.state!=="running")return;
  try{
    const o=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime+delay;
    o.type=wave;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(end,at+duration);
    gain.gain.setValueAtTime(.00015,at);gain.gain.exponentialRampToValueAtTime(volume,at+.007);
    gain.gain.exponentialRampToValueAtTime(.00015,at+duration);
    o.connect(gain);gain.connect(audio.destination);o.start(at);o.stop(at+duration+.01);
  }catch{}
}
function sound(type) {
  if(type==="flap")tone(336,510,0,.08,"sine",.048);
  if(type==="gate"){tone(488,521,0,.11,"triangle",.06);tone(692,733,.07,.15,"triangle",.048);}
  if(type==="letter"){tone(738,834,0,.1,"sine",.065);tone(982,1104,.065,.16,"triangle",.046);}
  if(type==="crash"){tone(159,66,0,.21,"triangle",.09);tone(119,64,.06,.14,"sine",.045);}
  if(type==="open")tone(422,525,0,.1,"triangle",.04);
}
function refreshSettings() {
  $("top-best").textContent=String(settings.best);
  const b=document.querySelector(".sound");
  b.setAttribute("aria-label",settings.sound?"Mute sound":"Unmute sound");b.setAttribute("aria-pressed",String(settings.sound));
  b.querySelector("span").textContent=settings.sound?"Sound on":"Sound off";
  const c=b.querySelector("canvas");c.dataset.icon=settings.sound?"sound":"mute";paintIcon(c);
}
function stats(force=false) {
  if(force||run.score!==lastScore){lastScore=run.score;$("points").textContent=String(run.score);}
  if(force||run.gates!==lastGates){lastGates=run.gates;$("gates").textContent=String(run.gates);$("gate-unit").textContent=run.gates===1?"gate":"gates";}
  if(force||run.letters!==lastLetters){lastLetters=run.letters;$("letters").textContent=String(run.letters);$("letter-unit").textContent=run.letters===1?"letter":"letters";}
}
function resize() {
  if(!run)return;
  $("foot-note").textContent=phoneView.matches?"Tap Ⅱ to pause":"P or Esc to pause";
  const rect=arena.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  view=viewport(rect.width,rect.height);
  if(canvas.width!==Math.round(view.width)||canvas.height!==SKY_HEIGHT){
    canvas.width=Math.round(view.width);canvas.height=SKY_HEIGHT;
  }
  paint();
}
new ResizeObserver(resize).observe(arena);
function screenX(world){return view.birdX+(world-run.travel)*view.horizontal;}
function effects(e) {
  if(reduced.matches)return;
  if(e.type==="flap"){
    marks.push({kind:"wisp",x:e.travel-28,y:e.y+4,age:0,life:.35});
    return;
  }
  if(e.type==="gate"||e.type==="letter"){
    marks.push({kind:"point",x:e.travel+(e.type==="gate"?23:0),y:e.y-27,age:0,life:.63});
  }
  if(e.type==="crash"||e.type==="letter"){
    const quantity=e.type==="crash"?7:5;
    for(let i=0;i<quantity;i++){
      const angle=i/quantity*Math.PI*2+.35;
      marks.push({kind:e.type==="crash"?"feather":"spark",x:e.travel,y:e.y,age:0,life:.43+i*.015,
        vx:Math.cos(angle)*(27+i*4),vy:Math.sin(angle)*34-15});
    }
  }
}
function paintMarks() {
  ctx.save();
  for(const m of marks){
    const progress=m.age/m.life;
    let x=screenX(m.x),y=m.y;
    ctx.globalAlpha=Math.max(0,1-progress);
    if(m.kind==="point"){
      y-=22*progress;
      ctx.font='800 16px "Barlow Condensed", sans-serif';ctx.lineWidth=3;ctx.lineJoin="round";ctx.strokeStyle="#fff1c9";ctx.fillStyle="#294a59";
      ctx.strokeText("+1",Math.round(x),Math.round(y));ctx.fillText("+1",Math.round(x),Math.round(y));
    }else if(m.kind==="wisp"){
      ctx.fillStyle="#fff3cf";ctx.fillRect(Math.round(x)-3,Math.round(y+8*progress),7,2);
      ctx.fillRect(Math.round(x)-8,Math.round(y+8*progress)-3,4,2);
    }else{
      x+=m.vx*m.age;y+=m.vy*m.age+40*m.age*m.age;
      ctx.fillStyle=m.kind==="feather"?"#fff6dc":"#ffe396";ctx.fillRect(Math.round(x)-2,Math.round(y),5,2);
      ctx.fillRect(Math.round(x),Math.round(y)-2,2,5);
    }
  }
  ctx.restore();
}
function paint() {
  if(!run||!view)return;
  const art=window.AirArt;
  ctx.setTransform(canvas.width/view.width,0,0,1,0,0);ctx.imageSmoothingEnabled=false;
  ctx.save();
  const crashed=run.status==="crashed";
  if(crashed&&!reduced.matches&&crashTime<.16){
    const f=(1-crashTime/.16)*1.6;ctx.translate(Math.sin(crashTime*96)*f,Math.cos(crashTime*70)*f*.5);
  }
  const t=reduced.matches?0:clock;
  art.landscape(ctx,{width:view.width,height:SKY_HEIGHT,ground:GROUND,travel:run.travel*view.horizontal,time:t,reducedMotion:reduced.matches});
  for(const g of run.course){
    const x=screenX(g.x), width=g.width*view.horizontal;
    if(x+width<-40)continue;
    if(x-width>view.width+190)break;
    if(x-width/2<view.width&&x+width/2>0) {
      art.gate(ctx,{x,width,top:g.top,bottom:g.bottom,ground:GROUND,index:g.index,time:t});
    }
    const mx=screenX(g.mail.x);
    if(!g.mail.taken&&mx>-25&&mx<view.width+25) {
      art.letter(ctx,{x:mx,y:g.mail.y,scale:view.pupScale,time:t+g.index*.5});
    }
  }
  paintMarks();
  const ready=run.status==="ready",bob=ready&&!reduced.matches?Math.sin(clock*2.4)*2.5:0;
  const flapAge=ready?.78+.16*Math.sin(t*4):Math.min(1,run.sinceFlap/.32);
  const angle=crashed?Math.min(.78,run.angle+(reduced.matches?0:crashTime*.5)):run.angle;
  art.pup(ctx,{x:view.birdX,y:run.y+bob,scale:view.pupScale,angle,flap:flapAge,time:t,crashed});
  ctx.restore();
}
function consume() {
  for(const e of run.events.splice(0)){
    sound(e.type);effects(e);
    if(e.type==="gate"||e.type==="letter"){
      $("message").textContent=(e.type==="gate"?"Beacon cleared. ":"Letter collected. ")+"Score "+run.score+".";
    }
    if(e.type==="crash"){
      crashTime=0;newBest=run.score>settings.best;
      if(newBest){settings.best=run.score;save();refreshSettings();}
      $("pause-button").disabled=true;
    }
  }
  stats();
}
function flapNow() {
  if(!run||modal||run.status==="crashed")return;
  setupAudio();
  tick(performance.now());
  if(flap(run)){
    $("ready-cue").hidden=true;consume();
  }
}
function createRun(inMotion=false) {
  if(sheet.open)sheet.close();
  modal="";pauseOrigin=false;previousFrame=null;crashTime=0;clock=0;marks=[];newBest=false;
  run=newFlight((Date.now()^Math.floor(Math.random()*4294967296))>>>0);
  $("cover").hidden=true;$("flight").hidden=false;$("pause-button").hidden=false;$("pause-button").disabled=false;
  $("ready-cue").hidden=false;
  refreshSettings();stats(true);resize();arena.focus({preventScroll:true});setupAudio();
  if(inMotion)flapNow();else{$("message").textContent="Ready for takeoff. Tap or press Space to flap.";sound("open");}
}
function toTitle() {
  if(sheet.open)sheet.close();
  modal="";run=null;view=null;marks=[];previousFrame=null;
  $("flight").hidden=true;$("cover").hidden=false;$("pause-button").hidden=true;$("pause-button").disabled=false;
  $("foot-note").textContent="1 point per gate or letter";$("message").textContent="";refreshSettings();
  document.querySelector('[data-action="start"]').focus({preventScroll:true});
}
const closeButton='<button class="sheet-close" type="button" data-action="close" aria-label="Close">×</button>';
function heading(label,title,showClose=true) {
  return '<div class="sheet-top"><span class="sheet-label">'+label+'</span>'+(showClose?closeButton:'')+'</div><h2 id="sheet-title">'+title+'</h2>';
}
function actionButton(action,label,secondary=false) {
  return '<button type="button" class="'+(secondary?'secondary':'primary')+'" data-action="'+action+'">'+label+'</button>';
}
function openSheet(type,content,focus) {
  modal=type;previousFrame=null;paper.innerHTML=content;icons(paper);
  if(!sheet.open)sheet.showModal();
  paper.querySelector(focus)?.focus({preventScroll:true});
}
function resume() {
  if(sheet.open)sheet.close();
  modal="";previousFrame=run?performance.now():null;
  if(run)arena.focus({preventScroll:true});
}
function help() {
  if(run?.status==="crashed")return;
  pauseOrigin=modal==="pause";
  openSheet("help",heading("Pilot handbook","Flight guide")+
    '<div class="guide-row">'+icon("wing")+'<div><b>Flap to climb.</b> Tap or click the sky, or press <kbd>Space</kbd> or <kbd>↑</kbd>. Release between flaps. You glide down in between.</div></div>'+
    '<div class="guide-row">'+icon("beacon")+'<div><b>Clear the beacons.</b> Fly through an opening for 1 point. Hitting a beacon or the ground ends your flight.</div></div>'+
    '<div class="guide-row">'+icon("mail")+'<div><b>Collect the letters.</b> Each gold envelope adds 1 bonus point.</div></div>'+
    '<hr class="sheet-rule"><p>Pause with <kbd>P</kbd> or <kbd>Esc</kbd>. Your best score stays on this device.</p><div class="sheet-actions">'+actionButton("close",pauseOrigin?"Back to pause":run?"Back to flight":"Got it")+'</div>','[data-action="close"]:last-child');
}
function pause() {
  if(!run||run.status==="crashed")return;
  if(!modal&&!document.hidden)tick(performance.now());
  if(run.status==="crashed")return;
  openSheet("pause",heading("Air mail","Flight paused",false)+
    '<p>Your pup will stay right here until you resume.</p><div class="sheet-actions">'+actionButton("resume","Resume flight")+actionButton("guide","Flight guide",true)+'</div><hr class="sheet-rule"><button class="paper-link" data-action="home">Return to title</button>','[data-action="resume"]');
}
function results() {
  const cause=run.reason==="ground"?"Your pup touched down.":"Your pup clipped a beacon.";
  openSheet("results",heading("Flight log","Flight complete",false)+'<p>'+cause+'</p>'+
    '<div class="breakdown"><div><span>'+icon("beacon")+'Beacons cleared</span><b>'+run.gates+'</b></div><div><span>'+icon("mail")+'Letters collected</span><b>'+run.letters+'</b></div></div><div class="result-total"><span>Flight score</span><strong>'+run.score+'</strong></div>'+
    '<p class="result-record">'+(newBest?'New personal best!':'Personal best · '+settings.best)+'</p><div class="sheet-actions">'+actionButton("again","Fly again")+actionButton("home","Title screen",true)+'</div>','[data-action="again"]');
}
function closeSheet() {
  if(modal==="results")return;
  if(modal==="help"&&pauseOrigin){pauseOrigin=false;pause();return;}
  resume();
}
function toggleSound() {
  settings.sound=!settings.sound;save();setupAudio();sound("open");refreshSettings();
  if(run&&!modal&&run.status!=="crashed")arena.focus({preventScroll:true});
}
document.addEventListener("click",e=>{
  const b=e.target.closest("button[data-action]");if(!b)return;
  switch(b.dataset.action){
    case "start":createRun(false);break;
    case "again":createRun(true);break;
    case "home":toTitle();break;
    case "help":case "guide":help();break;
    case "pause":pause();break;
    case "close":closeSheet();break;
    case "resume":resume();break;
    case "sound":toggleSound();break;
  }
});
arena.addEventListener("pointerdown",e=>{
  if(!e.isPrimary||e.button!==0||modal)return;
  e.preventDefault();arena.focus({preventScroll:true});flapNow();
});
arena.addEventListener("click",e=>{if(e.detail===0)flapNow();});
sheet.addEventListener("cancel",e=>{e.preventDefault();closeSheet();});
sheet.addEventListener("click",e=>{
  if(e.target!==sheet)return;
  const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientY<r.top||e.clientX>r.right||e.clientY>r.bottom)closeSheet();
});
const flightKey=code=>code==="Space"||code==="ArrowUp";
window.addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const {code}=e;
  if(modal){
    if(modal==="results"&&(code==="KeyR"||code==="ArrowUp"||(code==="Space"&&e.target.closest('[data-action="again"]')))){
      e.preventDefault();if(!e.repeat)createRun(true);
    }else if(modal==="pause"&&code==="KeyP"){e.preventDefault();if(!e.repeat)resume();}
    return;
  }
  if(!run){
    if(flightKey(code)&&(!e.target.closest("button")||e.target.closest('[data-action="start"]'))){
      e.preventDefault();if(!e.repeat)createRun(true);
    }
    return;
  }
  if(code==="Escape"||code==="KeyP"){e.preventDefault();if(!e.repeat)pause();return;}
  if(flightKey(code)||(code==="Enter"&&e.target===arena)){
    if(e.target.closest("button")&&code==="Space")return;
    e.preventDefault();if(!e.repeat)flapNow();
  }
});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden&&run&&!modal&&run.status==="flying")pause();
  previousFrame=null;
});
function tick(time) {
  if(previousFrame!==null&&time<previousFrame)return;
  const dt=previousFrame===null?0:Math.min(.4,(time-previousFrame)/1000);
  previousFrame=time;clock+=dt;
  for(const m of marks)m.age+=dt;
  marks=marks.filter(m=>m.age<m.life);
  if(run.status==="flying"){advance(run,dt);consume();}
  if(run.status==="crashed")crashTime+=dt;
}
function frame(time) {
  if(run&&!modal){
    tick(time);paint();
    if(run.status==="crashed"&&crashTime>=.48)results();
  }else previousFrame=null;
  requestAnimationFrame(frame);
}
icons();refreshSettings();requestAnimationFrame(frame);
