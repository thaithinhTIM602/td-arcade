import {ROUNDS, STATIONS, STATION, FILLINGS, createShift, advance, closestStation, sendToStation, useNearby, walkTo, itemName, starCount, guideStep} from "./kitchen.js";
import {drawIcon, drawWordmark} from "./kitchen-icons.js";

const $ = id => document.getElementById(id);
const dialog = $("overlay"), board = $("board"), surface = $("kitchen").getContext("2d");
const recordKey = "pleat-street-v1";
const defaults = {crew: 1, sound: true, learned: {}, best: {}};
let saved;
try {saved = {...defaults, ...JSON.parse(localStorage.getItem(recordKey) || "{}")};} catch {saved = defaults;}
if (saved.crew !== 2) saved.crew = 1;
if (!saved.learned || typeof saved.learned !== "object") saved.learned = {};
if (!saved.best || typeof saved.best !== "object") saved.best = {};
const persist = () => {try {localStorage.setItem(recordKey, JSON.stringify(saved));} catch {}};
let game = null, modal = "", lastFrame = 0, nextHud = 0, railKey = "", handsKey = "", lastSpoken = "";
let notice = null, shiftResults = {}, audio = null;
const heldKeys = new Set();
const buttons = new Map();
const clockText = seconds => {
  const n = Math.max(0, Math.ceil(seconds - 0.000001));
  return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");
};
const iconMarkup = (name, size=16) => '<canvas data-icon="'+name+'" width="'+size+'" height="'+size+'" aria-hidden="true"></canvas>';
const renderIcons = (root=document) => root.querySelectorAll("canvas[data-icon]").forEach(c=>drawIcon(c));
const number = value => value.toLocaleString("en-US");
const scoreKey = round => saved.crew + "-" + round;
const crewName = () => saved.crew === 2 ? "Local duo" : "Solo";

function enableAudio() {
  if (!saved.sound) return;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume().catch(()=>{});
  } catch {}
}
function playSound(event) {
  if (!saved.sound || !audio || audio.state !== "running") return;
  const notes = {
    pick: [459], work: [173, 191], prep: [512], steam: [235, 317], ready: [790, 990],
    serve: [523, 659, 784], part: [494, 622], clear: [244], burn: [148, 117], expired: [195, 164],
    ticket: [634], rush: [392, 523, 659], start: [392, 494, 587], end: [659, 523, 392], toggle: [530]
  }[event];
  if (!notes) return;
  try {
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator(), amp = audio.createGain(), time=audio.currentTime+i*.085;
      osc.type = event === "work" ? "square" : "triangle";
      osc.frequency.setValueAtTime(freq,time);
      amp.gain.setValueAtTime(.0001,time);
      amp.gain.exponentialRampToValueAtTime(event === "work" ? .024 : .066,time+.008);
      amp.gain.exponentialRampToValueAtTime(.0001,time+.13);
      osc.connect(amp);amp.connect(audio.destination);osc.start(time);osc.stop(time+.15);
    });
  } catch {}
}
function say(text) {
  if (text && text !== lastSpoken) {$("live").textContent = text;lastSpoken=text;}
}
function refreshSettings() {
  document.querySelectorAll("[data-crew]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.crew)===saved.crew)));
  document.querySelectorAll(".sound").forEach(b=>{
    b.setAttribute("aria-label",saved.sound?"Mute sound":"Unmute sound");
    b.setAttribute("aria-pressed",String(saved.sound));
    b.querySelector("span").textContent = saved.sound ? "Sound on" : "Sound off";
    const icon=b.querySelector("canvas");icon.dataset.icon = saved.sound ? "sound" : "mute";drawIcon(icon);
  });
}
function openDialog(name, html, focus) {
  heldKeys.clear(); modal=name; lastFrame=0;
  $("modal-interior").innerHTML=html;renderIcons($("modal-interior"));
  if (!dialog.open) dialog.showModal();
  const selected = focus && dialog.querySelector(focus);
  if (selected) selected.focus({preventScroll:true});
}
const closeBtn='<button type="button" class="xbutton" aria-label="Close" data-action="close">×</button>';
const modalHeading=(tag,title,close=true)=>'<div class="modal-top"><span class="modal-kicker">'+tag+'</span>'+(close?closeBtn:'')+'</div><h2 id="dialog-title">'+title+'</h2>';
const actionButton=(action,label,secondary=false)=>'<button class="arcade-button '+(secondary?'secondary':'primary')+'" data-action="'+action+'">'+label+'</button>';
function closeModal() {
  if (modal==="results" || modal==="practice-done") return;
  if (modal==="guide-from-pause") {pauseMenu();return;}
  if (modal==="rounds-from-results") {resultsMenu();return;}
  modal="";lastFrame=0;heldKeys.clear();
  if(dialog.open)dialog.close();
  if(game&&!game.finished)board.focus({preventScroll:true});
}
function toLobby() {
  if(dialog.open)dialog.close();modal="";game=null;notice=null;lastFrame=0;heldKeys.clear();
  $("service").hidden=true;$("lobby").hidden=false;window.scrollTo(0,0);refreshSettings();
  document.querySelector('[data-action="start"]').focus({preventScroll:true});
}
function chooseRounds() {
  const fromResult=game?.finished;
  const rows=ROUNDS.map(r=>{
    const best=saved.best[scoreKey(r.id)];
    const record=best?'<span class="round-best">Best '+number(best.score)+' pts · '+best.stars+'/3 stars</span>':'';
    return '<button class="round-choice" data-round="'+r.id+'"><span class="round-num">'+r.id+'</span><span><strong>'+r.name+'</strong><small>'+r.description+'</small>'+record+'</span></button>';
  }).join("");
  openDialog(fromResult?"rounds-from-results":"rounds",modalHeading(crewName()+" · 3 min each","Choose a round")+
    '<div class="round-list">'+rows+'</div><div class="rule"></div><button class="paper-link" data-action="practice">Play the untimed practice order</button>',"[data-round]");
}
function showGuide() {
  const fromPause=modal==="pause" || modal==="guide-from-pause";
  const steps=[["cabbage","Pick filling"],["chop","Chop"],["fold","Fold"],["steam","Steam"]];
  const recipe=steps.map(([ic,label])=>'<div class="recipe-step">'+iconMarkup(ic)+'<span>'+label+'</span></div>').join("");
  const keys = saved.crew===2
    ? '<div><strong>Chef 1</strong> &nbsp;<kbd>WASD</kbd> to move, <kbd>E</kbd> or <kbd>Space</kbd> to use.</div><div><strong>Chef 2</strong> &nbsp;<kbd>Arrows</kbd> to move, <kbd>Enter</kbd> to use.</div>'
    : '<div><strong>Keyboard</strong> &nbsp;<kbd>WASD</kbd> or <kbd>Arrows</kbd> to move. <kbd>Space</kbd> or <kbd>E</kbd> uses the closest station.</div>';
  openDialog(fromPause?"guide-from-pause":"guide",modalHeading("Kitchen handbook","How to play")+
    '<div class="recipe-steps">'+recipe+'</div><p>Collect the dumpling when the steamer rings, then bring it to <b>Serve</b>. You can prep the next filling while the first one steams.</p><p>Serve fills the oldest matching ticket first. A ticket with two fillings takes two deliveries. Faster service earns more points.</p><div class="rule"></div><div class="control-list"><div><strong>Click or tap</strong> any station to walk there and use it.'+(saved.crew===2?' This controls Chef 1.':'')+'</div>'+keys+'<div><strong>Shared shelf</strong> holds one item for either chef.</div><div><strong>Pause</strong> with <kbd>P</kbd> or <kbd>Esc</kbd>.</div></div><div class="modal-actions">'+actionButton("close",fromPause?"Back to pause menu":game?"Back to kitchen":"Got it")+'</div>', '.modal-actions button');
}
function pauseMenu() {
  if(!game || game.finished)return;
  const title=game.practice?"Practice paused":"Kitchen paused";
  openDialog("pause",modalHeading(game.practice?"Untimed practice":"Round "+game.round+" / 3",title,false)+
    '<p>'+ (game.practice?"Your practice order will be here when you return.":clockText(game.remaining)+" remains in "+ROUNDS[game.round-1].name+".")+'</p><div class="rule"></div><div class="modal-actions">'+actionButton("resume","Resume cooking")+actionButton("restart",game.practice?"Restart practice":"Retry this round",true)+actionButton("guide","How to play",true)+'<button class="paper-link" data-action="home">Return to title screen</button></div>','[data-action="resume"]');
}
function begin(round, resetRun=false) {
  if(resetRun)shiftResults={};
  if(dialog.open)dialog.close();modal="";heldKeys.clear();lastFrame=0;nextHud=0;notice=null;railKey="";handsKey="";lastSpoken="";
  game=createShift(round,saved.crew===2);
  $("lobby").hidden=true;$("service").hidden=false;
  $("shift-kicker").textContent=game.practice?"Untimed practice":"Round "+round+" / 3";
  $("shift-title").textContent=game.practice?"The first order":ROUNDS[round-1].name;
  $("skip-practice").hidden=!game.practice;
  $("input-hint").textContent=game.duo?"Chef 1 · WASD + E    /    Chef 2 · Arrows + Enter":"Click or tap a station · Keyboard controls";
  buttons.forEach((b,id)=>b.classList.toggle("unavailable",id==="mushroom"&&round<2));
  window.scrollTo(0,0);board.focus({preventScroll:true});playSound("start");
  if(!game.practice)notice={text:ROUNDS[round-1].description,type:"start",who:0,until:4.7};
  renderGame();refreshHud();say(game.practice?"Practice. Pick up cabbage from the green crate.":"Round "+round+". "+ROUNDS[round-1].name+". Three minutes.");
}
function saveResult() {
  if(game.practice) {saved.learned[saved.crew]=true;persist();return;}
  const result={score:game.score,stars:starCount(game),served:game.served};
  shiftResults[game.round]=result;
  const key=scoreKey(game.round),old=saved.best[key];
  if(!old||result.score>old.score||(result.score===old.score&&result.stars>old.stars))saved.best[key]=result;
  persist();
}
function resultsMenu() {
  if(!game)return;
  if(game.practice) {
    openDialog("practice-done",modalHeading("Untimed practice","First dumpling served!",false)+
      '<p>You’ve cooked an order from start to finish. Lunch Prep opens with cabbage dumplings and three minutes on the clock.</p><div class="rule"></div><div class="modal-actions">'+actionButton("first","Start round 1")+actionButton("restart","Practice again",true)+'<button class="paper-link" data-action="home">Title screen</button></div>','[data-action="first"]');
    return;
  }
  const r=ROUNDS[game.round-1],stars=starCount(game);
  const complete=game.round===3 && [1,2,3].every(n=>shiftResults[n]);
  const allScore=Object.values(shiftResults).reduce((total,item)=>total+item.score,0);
  const starNodes=[0,1,2].map(i=>'<span class="'+(i<stars?'':'unearned')+'">'+iconMarkup("star")+'</span>').join("");
  const again=actionButton("restart","Retry this round",game.round<3);
  const next=game.round<3?actionButton("next","Start round "+(game.round+1)):"";
  const receipt='<div class="receipt-lines"><div><span>Completed tickets</span><b>'+game.served+'</b></div><div><span>Time bonus included</span><b>'+number(game.tips)+' pts</b></div><div><span>Expired tickets</span><b>'+game.missed+'</b></div><div><span>Burnt batches</span><b>'+game.burned+'</b></div>'+(complete?'<div><span>All three rounds</span><b>'+number(allScore)+' pts</b></div>':'')+'</div>';
  openDialog("results",modalHeading("Round "+game.round+" / 3 · "+r.name,complete?"Kitchen closed":"Round complete",false)+
    '<div class="stars" aria-label="'+stars+' of 3 stars">'+starNodes+'</div><div class="receipt-total"><span>Round score</span><strong>'+number(game.score)+' pts</strong></div>'+receipt+
    '<p>Earn stars at '+r.goals.join(", ").replace(/, (\d+)$/,", and $1")+' completed tickets.</p><div class="action-row">'+next+again+'</div><div class="action-row"><button class="paper-link" data-action="rounds">Choose a round</button><button class="paper-link" data-action="home">Title screen</button></div>',game.round<3?'[data-action="next"]':'[data-action="restart"]');
}
function act(action) {
  if(action!=="sound")enableAudio();
  switch(action) {
    case "sound":saved.sound=!saved.sound;persist();enableAudio();playSound("toggle");refreshSettings();break;
    case "start":begin(saved.learned[saved.crew]?1:0,true);break;
    case "practice":begin(0,true);break;
    case "rounds":chooseRounds();break;
    case "guide":showGuide();break;
    case "pause":pauseMenu();break;
    case "resume":case "close":closeModal();break;
    case "home":toLobby();break;
    case "first":case "skip":saved.learned[saved.crew]=true;persist();begin(1,true);break;
    case "restart":if(game)begin(game.round);break;
    case "next":if(game&&game.round<3)begin(game.round+1);break;
  }
}
document.addEventListener("click",e=>{
  const button=e.target.closest("button");if(!button)return;
  if(button.dataset.crew){saved.crew=Number(button.dataset.crew);persist();refreshSettings();enableAudio();playSound("pick");return;}
  if(button.dataset.round){enableAudio();begin(Number(button.dataset.round),true);return;}
  if(button.dataset.action)act(button.dataset.action);
});
dialog.addEventListener("cancel",e=>{e.preventDefault();closeModal();});
dialog.addEventListener("click",e=>{
  if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)closeModal();}
});

board.tabIndex=-1;
for(const station of STATIONS) {
  const b=document.createElement("button");
  b.type="button";b.className="station";b.dataset.station=station.id;
  b.setAttribute("aria-label","Use "+station.name+" station");b.title="Go to "+station.name;
  b.style.left=(station.x/960*100)+"%";b.style.top=((station.labelY/512*100)-8)+"%";
  const label=document.createElement("span");label.className="station-name";label.textContent=station.name;b.append(label);
  b.addEventListener("click",()=>{
    if(!game||modal||game.finished)return;
    enableAudio();sendToStation(game,station.id);board.focus({preventScroll:true});nextHud=0;
  });
  $("stations").append(b);buttons.set(station.id,b);
}
board.addEventListener("click",e=>{
  if(e.target.closest("button")||!game||modal||game.finished)return;
  const r=board.getBoundingClientRect();walkTo(game,(e.clientX-r.left)/r.width*960,(e.clientY-r.top)/r.height*512);
  board.focus({preventScroll:true});
});
const moveCodes=new Set(["KeyW","KeyA","KeyS","KeyD","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]);
window.addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||!game)return;
  if(modal){if(modal==="pause"&&e.code==="KeyP"&&!e.repeat){e.preventDefault();closeModal();}return;}
  if(game.finished)return;
  if(e.code==="Escape"||e.code==="KeyP"){e.preventDefault();if(!e.repeat)pauseMenu();return;}
  if(e.target.closest?.("button")&&(e.code==="Enter"||e.code==="Space"))return;
  if(moveCodes.has(e.code)){e.preventDefault();heldKeys.add(e.code);return;}
  let id=0;
  if(e.code==="Space"||e.code==="KeyE")id=1;
  else if(e.code==="Enter"||e.code==="NumpadEnter")id=game.duo?2:1;
  if(id) {e.preventDefault();if(!e.repeat){enableAudio();useNearby(game,id);nextHud=0;}}
});
window.addEventListener("keyup",e=>heldKeys.delete(e.code));
window.addEventListener("blur",()=>heldKeys.clear());
document.addEventListener("visibilitychange",()=>{if(document.hidden){heldKeys.clear();if(game&&!modal&&!game.finished)pauseMenu();}});
function movement() {
  const axis=(...keys)=>keys.some(k=>heldKeys.has(k))?1:0;
  const arrows={x:axis("ArrowRight")-axis("ArrowLeft"),y:axis("ArrowDown")-axis("ArrowUp")};
  if(game.duo)return [{x:axis("KeyD")-axis("KeyA"),y:axis("KeyS")-axis("KeyW")},arrows];
  return [{x:axis("KeyD","ArrowRight")-axis("KeyA","ArrowLeft"),y:axis("KeyS","ArrowDown")-axis("KeyW","ArrowUp")}];
}

function tickets() {
  const orders=game.orders,key=orders.map(o=>o.id+"-"+o.delivered.map(Number).join("")).join(",");
  if(key!==railKey||!$("orders").childNodes.length) {
    railKey=key;
    $("orders").innerHTML=orders.length?orders.map(o=>{
      const dishes=o.dishes.map((k,i)=>'<span class="ticket-dish '+(o.delivered[i]?'done':'')+'">'+iconMarkup(k)+'<span>'+FILLINGS[k]+(o.delivered[i]?' ✓':'')+'</span></span>').join('<span aria-hidden="true">+</span>');
      return '<div class="ticket"><span class="ticket-id">#'+String(o.id).padStart(2,"0")+'</span>'+dishes+'<div class="meter"><i></i></div></div>';
    }).join(""):'<span class="waiting">Waiting for the next order…</span>';
    renderIcons($("orders"));
  }
  [...$("orders").querySelectorAll(".ticket")].forEach((node,i)=>{
    const o=orders[i],fraction=game.practice?1:o.left/o.patience;
    node.querySelector(".meter i").style.transform='scaleX('+Math.max(0,fraction)+')';
    node.classList.toggle("hurry",fraction<.28);
    node.title=game.practice?"Practice ticket":Math.ceil(o.left)+" seconds left";
  });
}
function renderHands() {
  const entries=game.players.map(p=>itemName(p.held));
  const key=entries.join("|");
  if(key===handsKey)return;
  handsKey=key;
  $("hands").innerHTML=entries.map((entry,i)=>'<span class="hand p'+(i+1)+'"><strong>'+(game.duo?"Chef "+(i+1):"Chef")+'</strong> '+entry+'</span>').join("");
}
function suggestedTask() {
  const step=guideStep(game);
  if(game.practice)return {label:"Practice · "+step.n+" / 6",text:step.text,id:step.id,n:step.n};
  const p=game.players[0];
  if(p.held?.stage==="raw")return {label:"Next station",text:"Bring the filling to Chop on the middle counter."};
  if(p.held?.stage==="chopped")return {label:"Next station",text:"Bring the chopped filling to Fold."};
  if(p.held?.stage==="wrapped")return {label:"Next station",text:"Cook the folded dumpling in the steamer."};
  if(p.held?.stage==="cooked")return {label:"Next station",text:"Deliver the cooked dumpling at Serve."};
  if(game.steamer.phase==="ready"||game.steamer.phase==="burnt")return {label:"Steamer",text:step.text};
  if(game.steamer.phase==="cooking")return {label:"Kitchen",text:"Dumpling steaming. You can prep the next order."};
  if(game.shelf)return {label:"Shared shelf",text:"Pick up the saved item or start a new filling."};
  return {label:game.round===3&&game.remaining<=60?"Final rush":"Kitchen",text:"Choose a filling that matches a ticket on the rail."};
}
function refreshHud() {
  $("clock").textContent=game.practice?"∞":clockText(game.remaining);
  const finalRush=game.round===3 && game.remaining<=60;
  $("service").classList.toggle("final-rush",finalRush);
  $("clock-label").textContent=game.practice?"Untimed":finalRush?"Final rush":"Time";
  $("clock").parentElement.parentElement.classList.toggle("low",!game.practice&&game.remaining<=30);
  $("served").textContent=game.served;$("score").textContent=number(game.score);
  tickets();renderHands();
  const task=suggestedTask(),note=notice&&notice.until>=game.elapsed?notice:null;
  const showNotice=note&&(!game.practice||note.type==="note"||note.type==="clear");
  $("tip-label").textContent=showNotice?(note.who&&game.duo?"Chef "+note.who:note.type==="rush"?"Final rush":"Kitchen"):task.label;
  $("tip-text").textContent=showNotice?note.text:task.text;
  const current=game.practice?task.id:null,near=closestStation(game.players[0])?.id;
  buttons.forEach((button,id)=>{
    button.classList.toggle("guided",id===current);
    button.classList.toggle("chosen",game.players[0].target===id&&id!==current);
    button.classList.toggle("near",id===near);
  });
  const b=game.steamer,m=$("basket-meter");
  m.hidden=b.phase==="empty";
  if(!m.hidden) {
    m.className="basket-meter "+b.phase;
    m.querySelector("span").textContent=b.phase==="cooking"?"Steaming":b.phase==="ready"?"Ready!":"Burnt";
    m.querySelector("i").style.transform="scaleX("+Math.max(0,b.progress)+")";
  }
  if(game.practice&&!showNotice)say("Step "+task.n+". "+task.text);
}
function workBadges() {
  const area=$("actions-meter");
  game.players.forEach(p=>{
    let tag=area.querySelector('[data-player="'+p.id+'"]');
    if(!tag){tag=document.createElement("div");tag.dataset.player=p.id;tag.innerHTML='<span class="player-badge p'+p.id+'">P'+p.id+'</span><span class="work-meter"><i></i></span>';area.append(tag);}
    const badge=tag.firstElementChild,meter=tag.lastElementChild;
    badge.style.display=game.duo?"block":"none";badge.style.left=(p.x/9.6)+"%";badge.style.top=((p.y-69)/5.12)+"%";
    meter.style.display=p.work?'block':'none';
    if(p.work){meter.style.left=(p.x/9.6)+"%";meter.style.top=((p.y-(game.duo?82:67))/5.12)+"%";meter.firstElementChild.style.transform="scaleX("+p.work.progress+")";}
  });
  if(!game.duo)area.querySelector('[data-player="2"]')?.remove();
}
function renderGame() {
  surface.imageSmoothingEnabled=false;
  window.KitchenArt.draw(surface,game,game.elapsed);
  workBadges();
}
function consumeEvents() {
  for(const e of game.events.splice(0)) {
    playSound(e.type);
    if(e.type==="ticket"&&notice&&notice.until>game.elapsed)continue;
    notice={...e,until:game.elapsed+(e.type==="rush"?5:e.type==="note"?3.3:2.2)};
    if(!game.practice||e.type==="note")say(e.text);
    nextHud=0;
  }
}
function frame(timestamp) {
  if(game&&!modal) {
    const delta=lastFrame?Math.max(0,(timestamp-lastFrame)/1000):0;
    lastFrame=timestamp;
    advance(game,delta,movement());consumeEvents();renderGame();
    if(timestamp>=nextHud){refreshHud();nextHud=timestamp+95;}
    if(game.finished){refreshHud();saveResult();playSound("end");resultsMenu();}
  } else lastFrame=0;
  requestAnimationFrame(frame);
}
drawWordmark($("wordmark"));renderIcons();refreshSettings();requestAnimationFrame(frame);
