export const SKY_HEIGHT = 540;
export const GROUND = 505;
export const STEP = 1 / 120;
export const BODY_X = 15;
export const BODY_Y = 9;
const GRAVITY = 865;
const FLAP_SPEED = -278;
const MAX_FALL = 402;
const FIRST_GATE = 343;
const LOOKAHEAD = 2120;
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

function nextRandom(s) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function addGate(s) {
  const index = s.generated++;
  const difficulty = Math.min(1, index / 22);
  const gap = index === 0 ? 198 : 185 - 40 * difficulty + nextRandom(s) * 6;
  const width = 49 + Math.round(nextRandom(s) * 6);
  const last = s.course[s.course.length - 1];
  const x = last ? last.x + 308 + nextRandom(s) * 32 + difficulty * 12 : FIRST_GATE;
  const safeMin = 51 + gap / 2, safeMax = GROUND - 38 - gap / 2;
  const shift = (nextRandom(s) * 2 - 1) * (73 + 37 * difficulty);
  const middle = last ? clamp(last.middle + shift, safeMin, safeMax) : 250;
  const mailY = index === 0 ? middle - 3 : middle + (nextRandom(s) * 2 - 1) * gap * .22;
  const mailX = x - width / 2 - (index === 0 ? 79 : 60 + nextRandom(s) * 43);
  s.course.push({index, x, width, middle, top: middle - gap / 2, bottom: middle + gap / 2, passed: false,
    mail: {x: mailX, y: mailY, taken: false}});
}
function fillCourse(s) {
  while (!s.course.length || s.course[s.course.length - 1].x < s.travel + LOOKAHEAD) addGate(s);
  while (s.course.length > 1 && s.course[0].x < s.travel - 750) s.course.shift();
}

export function newFlight(seed = Date.now() >>> 0) {
  const s = {seed: seed >>> 0, status:"ready", y:258, velocity:0, travel:0, elapsed:0, sinceFlap:1, angle:0,
    score:0, gates:0, letters:0, generated:0, course:[], events:[], carry:0, reason:null};
  fillCourse(s); return s;
}
export function flap(s) {
  if (s.status === "crashed") return false;
  s.status = "flying"; s.velocity = FLAP_SPEED; s.sinceFlap = 0;
  s.events.push({type:"flap", y:s.y, travel:s.travel}); return true;
}
function crash(s, reason) {
  s.status = "crashed"; s.reason = reason; s.carry = 0;
  s.events.push({type:"crash", reason, y:s.y, travel:s.travel});
}
export function intersectsGate(s, gate) {
  const dx = Math.max(0, Math.abs(gate.x-s.travel) - gate.width/2);
  if (dx >= BODY_X) return false;
  // The solid torso hits. The wing tips, tail, scarf and ears can brush a beacon.
  const halfHeight = BODY_Y * Math.sqrt(1 - (dx/BODY_X)**2);
  return s.y - halfHeight < gate.top - 1 || s.y + halfHeight > gate.bottom + 1;
}
function physics(s, dt) {
  s.elapsed += dt; s.sinceFlap += dt;
  const speed = Math.min(209, 151 + s.gates * 2.8);
  s.travel += speed * dt;
  s.velocity = Math.min(MAX_FALL, s.velocity + GRAVITY * dt);
  s.y += s.velocity * dt;
  if (s.y < 13) {s.y = 13; s.velocity = Math.max(0, s.velocity);}
  const aim = clamp(s.velocity / 650, -.35, .65);
  s.angle += (aim - s.angle) * Math.min(1, 9.5 * dt);
  if (s.y + BODY_Y >= GROUND) {s.y = GROUND - BODY_Y; crash(s, "ground"); return;}
  for (const gate of s.course) {
    if (gate.passed) continue;
    const dx = gate.x - s.travel;
    if (dx > 184) break;
    if (intersectsGate(s, gate)) {crash(s,"beacon"); return;}
    const mail = gate.mail;
    if (!mail.taken && ((mail.x-s.travel)/29)**2 + ((mail.y-s.y)/22)**2 <= 1) {
      mail.taken = true; s.letters++; s.score++;
      s.events.push({type:"letter", y:mail.y, travel:mail.x});
    }
    if (dx < -(gate.width/2 + BODY_X)) {
      gate.passed = true; s.gates++; s.score++;
      s.events.push({type:"gate", y:s.y, travel:s.travel});
    }
  }
  fillCourse(s);
}
export function advance(s, dt) {
  if (s.status !== "flying" || !Number.isFinite(dt) || dt <= 0) return;
  s.carry += dt;
  while (s.carry + 1e-10 >= STEP && s.status === "flying") {
    s.carry -= STEP; physics(s, STEP);
  }
}

export function viewport(cssWidth, cssHeight) {
  const width = Math.max(1,cssWidth) * SKY_HEIGHT / Math.max(1,cssHeight);
  const horizontal = clamp(width / 800, .4, 1);
  return {width, height:SKY_HEIGHT, horizontal, birdX:Math.min(260,width*.24), pupScale:Math.min(1,horizontal+.24)};
}
