export const SHIFT_SECONDS = 180;
export const ROUNDS = [
  { id: 1, name: "Lunch Prep", description: "Learn the line with a steady stream of cabbage orders.", goals: [2, 5, 7] },
  { id: 2, name: "Lunch Rush", description: "Cabbage and mushroom tickets share a single steamer.", goals: [3, 6, 9] },
  { id: 3, name: "Last Call", description: "Serve mixed orders in waves. The final minute is the busiest.", goals: [3, 5, 7] }
];

const dock = (x, y) => ({x, y});
export const STATIONS = [
  { id: "cabbage", name: "Cabbage", x: 150, y: 109, labelY: 149, docks: [dock(150, 177)] },
  { id: "mushroom", name: "Mushroom", x: 318, y: 109, labelY: 149, docks: [dock(318, 177)] },
  { id: "steam", name: "Steamer", x: 700, y: 109, labelY: 149, docks: [dock(700, 177)] },
  { id: "chop", name: "Chop", x: 410, y: 247, labelY: 287, docks: [dock(410, 205), dock(410, 311)] },
  { id: "shelf", name: "Shared shelf", x: 554, y: 247, labelY: 287, docks: [dock(554, 205), dock(554, 311)] },
  { id: "bin", name: "Bin", x: 102, y: 425, labelY: 468, docks: [dock(102, 375)] },
  { id: "serve", name: "Serve", x: 282, y: 425, labelY: 468, docks: [dock(282, 375)] },
  { id: "wrap", name: "Fold", x: 734, y: 425, labelY: 468, docks: [dock(734, 375)] }
];
export const STATION = Object.fromEntries(STATIONS.map(s => [s.id, s]));
export const FILLINGS = {cabbage: "Cabbage", mushroom: "Mushroom"};
export function itemName(item) {
  if (!item) return "Empty hands";
  const name = FILLINGS[item.kind];
  return ({raw: name, chopped: "Chopped " + name.toLowerCase(), wrapped: name + " dumpling · raw", cooked: name + " dumpling · cooked", burnt: "Burnt dumpling"})[item.stage];
}

const walk = {left: 72, right: 888, top: 165, bottom: 383};
const island = {left: 321, right: 639, top: 213, bottom: 303};
const corners = [
  dock(island.left - 3, island.top - 3), dock(island.right + 3, island.top - 3),
  dock(island.left - 3, island.bottom + 3), dock(island.right + 3, island.bottom + 3)
];
const SPEED = 216;
const STEAM_SECONDS = 5.5;
const BURN_AFTER = 15;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const inIsland = (x, y) => x > island.left && x < island.right && y > island.top && y < island.bottom;
const emptySteamer = () => ({phase: "empty", kind: null, elapsed: 0, progress: 0});
const announce = (s, text, type = "note", who = 0) => s.events.push({text, type, who});

function clearSegment(a, b) {
  // Intersect the line segment with the open rectangle of the work island.
  let enter = 0, leave = 1;
  for (const [axis, lo, hi] of [["x", island.left, island.right], ["y", island.top, island.bottom]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 0.00001) {
      if (a[axis] <= lo || a[axis] >= hi) return true;
      continue;
    }
    const t1 = (lo - a[axis]) / delta, t2 = (hi - a[axis]) / delta;
    enter = Math.max(enter, Math.min(t1, t2));
    leave = Math.min(leave, Math.max(t1, t2));
  }
  return leave - enter <= 0.00001;
}

function route(start, finish) {
  if (clearSegment(start, finish)) return {cost: distance(start, finish), points: [finish]};
  const nodes = [start, ...corners, finish];
  const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), seen = new Set();
  costs[0] = 0;
  while (seen.size < nodes.length) {
    let current = -1;
    nodes.forEach((_, i) => {
      if (!seen.has(i) && (current === -1 || costs[i] < costs[current])) current = i;
    });
    if (current === nodes.length - 1 || !Number.isFinite(costs[current])) break;
    seen.add(current);
    nodes.forEach((point, i) => {
      if (seen.has(i) || !clearSegment(nodes[current], point)) return;
      const cost = costs[current] + distance(nodes[current], point);
      if (cost < costs[i]) { costs[i] = cost; previous[i] = current; }
    });
  }
  const points = [];
  for (let i = nodes.length - 1; i > 0; i = previous[i]) points.unshift(nodes[i]);
  return {cost: costs[nodes.length - 1], points};
}

export function sendToStation(s, id, playerId = 1) {
  const p = s.players[playerId - 1], station = STATION[id];
  if (!p || !station || s.finished || p.work) return;
  const paths = station.docks.map(pt => route(p, pt)).sort((a, b) => a.cost - b.cost);
  p.route = paths[0].points.slice(); p.target = id;
}

export function walkTo(s, x, y, playerId = 1) {
  const p = s.players[playerId - 1];
  if (!p || p.work || s.finished) return;
  const pt = dock(clamp(x, walk.left, walk.right), clamp(y, walk.top, walk.bottom));
  if (inIsland(pt.x, pt.y)) return;
  p.target = null; p.route = route(p, pt).points;
}

export function closestStation(p) {
  let best = null, min = 81;
  for (const station of STATIONS) {
    for (const pt of station.docks) {
      const d = distance(p, pt);
      if (d < min && clearSegment(p, pt)) { min = d; best = station; }
    }
  }
  return best;
}

function chef(id, x, y) {
  return {id, x, y, facing: "down", moving: false, held: null, work: null, route: [], target: null};
}

function orderDishes(round, serial) {
  const c = "cabbage", m = "mushroom";
  if (round <= 1) return [c];
  if (round === 2) return [[c], [m], [m], [c], [m], [c], [c], [m]][(serial - 1) % 8].slice();
  return [[c, m], [m], [c], [m, c], [c], [m], [m, c], [m], [c]][(serial - 1) % 9].slice();
}

function addOrder(s) {
  s.ticketNo += 1;
  const dishes = orderDishes(s.round, s.ticketNo);
  const patience = s.practice ? Infinity : (s.round === 1 ? 66 : s.round === 2 ? 55 : 51) + (dishes.length - 1) * 25;
  s.orders.push({id: s.ticketNo, dishes, delivered: dishes.map(() => false), patience, left: patience});
}

export function createShift(round = 1, duo = false) {
  const s = {round, duo, practice: round === 0, elapsed: 0, remaining: SHIFT_SECONDS, score: 0, served: 0, dishes: 0,
    missed: 0, burned: 0, tips: 0, finished: false, orders: [], ticketNo: 0, wave: 0, nextArrival: round <= 1 ? 20 : 15,
    steamer: emptySteamer(), shelf: null, events: [], players: [chef(1, duo ? 254 : 228, 244)]};
  if (duo) s.players.push(chef(2, 723, 271));
  addOrder(s);
  if (round >= 2) addOrder(s);
  return s;
}

export function starCount(s) {
  if (s.practice) return 0;
  return ROUNDS[s.round - 1].goals.filter(n => s.served >= n).length;
}

function serve(s, p) {
  const food = p.held;
  if (!food || food.stage !== "cooked") return announce(s, "Bring a steamed dumpling to the serving counter.", "note", p.id);
  const ticket = s.orders.find(o => o.dishes.some((k, i) => k === food.kind && !o.delivered[i]));
  if (!ticket) return announce(s, "No ticket needs " + food.kind + " right now. Save it on the shelf.", "note", p.id);
  const i = ticket.dishes.findIndex((k, idx) => k === food.kind && !ticket.delivered[idx]);
  ticket.delivered[i] = true;
  p.held = null; s.dishes += 1;
  if (ticket.delivered.every(Boolean)) {
    s.served += 1;
    const tip = s.practice ? 0 : Math.round(40 * ticket.dishes.length * ticket.left / ticket.patience);
    const amount = 100 * ticket.dishes.length + tip;
    if (!s.practice) {s.score += amount; s.tips += tip;}
    s.orders = s.orders.filter(o => o !== ticket);
    announce(s, s.practice ? "Practice order served!" : "Ticket served! +" + amount + " points", "serve", p.id);
    if (s.practice) s.finished = true;
    else if (s.orders.length === 0) s.nextArrival = Math.min(s.nextArrival, 2);
  } else {
    const missing = ticket.dishes.find((_, idx) => !ticket.delivered[idx]);
    announce(s, "Delivered! This ticket still needs " + missing + ".", "part", p.id);
  }
}

function useSteamer(s, p) {
  const basket = s.steamer;
  if (basket.phase === "burnt") {
    s.steamer = emptySteamer(); return announce(s, "Burnt batch cleared. Steamer is free.", "clear", p.id);
  }
  if (basket.phase === "ready" && !p.held) {
    p.held = {kind: basket.kind, stage: "cooked"}; s.steamer = emptySteamer();
    return announce(s, "Steamed dumpling ready to serve.", "pick", p.id);
  }
  if (basket.phase === "ready") return announce(s, "Free your hands to collect the cooked dumpling.", "note", p.id);
  if (basket.phase === "cooking") return announce(s, "Still steaming. Watch the meter above the basket.", "note", p.id);
  if (p.held?.stage !== "wrapped") return announce(s, "Bring a folded dumpling to steam.", "note", p.id);
  s.steamer = {phase: "cooking", kind: p.held.kind, elapsed: 0, progress: 0}; p.held = null;
  announce(s, "Basket steaming. You can prep the next filling.", "steam", p.id);
}

function prepare(s, p, type) {
  const chopping = type === "chop";
  const expected = chopping ? "raw" : "chopped";
  if (p.held?.stage !== expected) return announce(s, chopping ? "Pick up a fresh filling before chopping." : "Bring chopped filling to fold it into a wrapper.", "note", p.id);
  if (s.players.some(other => other !== p && other.work?.type === type)) return announce(s, "The other chef is using this station.", "note", p.id);
  const time = chopping ? 1.5 : 1.2;
  p.work = {type, progress: 0, elapsed: 0, duration: time};
  announce(s, chopping ? "Chopping filling…" : "Folding dumpling…", "work", p.id);
}

function useStation(s, p, id) {
  if (s.finished || p.work) return;
  if (id === "cabbage" || id === "mushroom") {
    if (id === "mushroom" && s.round < 2) return announce(s, "Mushrooms arrive in round 2. Grab cabbage for this shift.", "note", p.id);
    if (p.held) return announce(s, "Your hands are full. Set an item on the shared shelf to free them.", "note", p.id);
    p.held = {kind: id, stage: "raw"}; return announce(s, FILLINGS[id] + " picked up.", "pick", p.id);
  }
  if (id === "steam") return useSteamer(s, p);
  if (id === "chop" || id === "wrap") return prepare(s, p, id);
  if (id === "serve") return serve(s, p);
  if (id === "shelf") {
    if (p.held && s.shelf) return announce(s, "Shelf is full. Come back with empty hands to collect.", "note", p.id);
    if (!p.held && !s.shelf) return announce(s, "Leave an item here for later or for the other chef.", "note", p.id);
    [p.held, s.shelf] = [s.shelf, p.held];
    return announce(s, p.held ? "Item collected from shelf." : "Item left on shared shelf.", "pick", p.id);
  }
  if (id === "bin") {
    if (!p.held) return announce(s, "Bring an unwanted item here to discard it.", "note", p.id);
    p.held = null; announce(s, "Item discarded.", "clear", p.id);
  }
}

export function useNearby(s, playerId = 1) {
  const p = s.players[playerId - 1];
  if (!p || s.finished || p.work) return;
  const station = closestStation(p);
  p.route = []; p.target = null;
  if (!station) return announce(s, "Step closer to a labeled station to use it.", "note", p.id);
  useStation(s, p, station.id);
}

function face(p, dx, dy) {
  if (!dx && !dy) return;
  p.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
}

function stepChef(s, p, input, dt) {
  p.moving = false;
  if (p.work) {
    p.work.elapsed = Math.min(p.work.duration, p.work.elapsed + dt);
    p.work.progress = p.work.elapsed / p.work.duration;
    if (p.work.progress >= 1) {
      const chopped = p.work.type === "chop";
      p.held.stage = chopped ? "chopped" : "wrapped"; p.work = null;
      announce(s, chopped ? "Filling chopped. Take it to Fold." : "Folded! Take it to the steamer.", "prep", p.id);
    }
    return;
  }
  if (input && (input.x || input.y)) {
    p.route = []; p.target = null;
    const len = Math.hypot(input.x, input.y);
    const dx = input.x / len, dy = input.y / len;
    const x = clamp(p.x + dx * SPEED * dt, walk.left, walk.right);
    const y = clamp(p.y + dy * SPEED * dt, walk.top, walk.bottom);
    const lastX = p.x, lastY = p.y;
    if (!inIsland(x, p.y)) p.x = x;
    if (!inIsland(p.x, y)) p.y = y;
    face(p, dx, dy); p.moving = distance(p, {x: lastX, y: lastY}) > 0.01;
    return;
  }
  if (!p.route.length) return;
  let budget = SPEED * dt;
  while (budget > 0 && p.route.length) {
    const pt = p.route[0], dx = pt.x - p.x, dy = pt.y - p.y, length = Math.hypot(dx, dy);
    face(p, dx, dy); p.moving = true;
    if (length <= budget) {
      p.x = pt.x; p.y = pt.y; budget -= length; p.route.shift();
    } else {
      p.x += dx / length * budget; p.y += dy / length * budget; budget = 0;
    }
  }
  if (!p.route.length && p.target) {
    const station = STATION[p.target]; p.target = null;
    face(p, station.x - p.x, station.y - p.y);
    useStation(s, p, station.id);
  }
}

function stepBasket(s, dt) {
  const b = s.steamer;
  if (b.phase !== "cooking" && b.phase !== "ready") return;
  b.elapsed += dt;
  if (b.phase === "cooking") {
    b.progress = Math.min(1, b.elapsed / STEAM_SECONDS);
    if (b.elapsed >= STEAM_SECONDS) {
      b.phase = "ready"; b.elapsed = 0; b.progress = 1;
      announce(s, "Steamer ready! Collect the dumpling.", "ready");
    }
  } else if (!s.practice) {
    b.progress = Math.max(0, 1 - b.elapsed / BURN_AFTER);
    if (b.elapsed >= BURN_AFTER) {
      b.phase = "burnt"; s.burned += 1;
      announce(s, "Batch burnt. Use the steamer to clear it.", "burn");
    }
  }
}

function stepOrders(s, dt) {
  for (const o of s.orders) o.left = Math.max(0, o.left - dt);
  const expired = s.orders.filter(o => o.left === 0).length;
  if (expired) {
    s.missed += expired; s.orders = s.orders.filter(o => o.left > 0);
    announce(s, expired === 1 ? "A ticket expired." : "Two or more tickets expired.", "expired");
  }
  s.nextArrival -= dt;
  if (s.nextArrival > 0) return;
  const cap = s.round === 1 ? 3 : s.round === 2 ? 4 : 5;
  if (s.orders.length >= cap) { s.nextArrival = 1; return; }
  s.wave += 1;
  const busy = s.round === 3 && s.remaining <= 60;
  const count = s.round === 3 && (busy || s.wave % 2 === 0) ? 2 : 1;
  for (let i = 0; i < count && s.orders.length < cap; i++) addOrder(s);
  s.nextArrival = s.round === 1 ? 20 : s.round === 2 ? 13 : busy ? 11 : 17;
  announce(s, "New order on the rail.", "ticket");
}

export function advance(s, elapsed, inputs = []) {
  if (!Number.isFinite(elapsed) || elapsed <= 0 || s.finished) return;
  let left = s.practice ? elapsed : Math.min(elapsed, s.remaining);
  while (left > 0.000001 && !s.finished) {
    const dt = Math.min(left, 0.05); left -= dt;
    const before = s.remaining;
    s.elapsed += dt;
    if (!s.practice) s.remaining = Math.max(0, SHIFT_SECONDS - s.elapsed);
    stepBasket(s, dt);
    s.players.forEach((p, i) => stepChef(s, p, inputs[i], dt));
    if (!s.practice && s.remaining > 0.000001) {
      stepOrders(s, dt);
      if (s.round === 3 && before > 60 && s.remaining <= 60) announce(s, "Final rush! Orders now arrive in pairs.", "rush");
    }
    if (!s.practice && s.remaining < 0.000001) {s.remaining = 0; s.finished = true;}
  }
}

export function guideStep(s) {
  if (s.steamer.phase === "burnt") return {id: "steam", n: 5, text: "Clear the burnt batch from the steamer."};
  const cooked = s.players.find(p => p.held?.stage === "cooked");
  if (cooked) return {id: "serve", n: 6, text: "Take the cooked dumpling to Serve."};
  if (s.steamer.phase === "ready") {
    if (s.players.every(p => p.held)) return {id: s.shelf ? "bin" : "shelf", n: 5, text: "Free one chef’s hands, then collect the dumpling."};
    return {id: "steam", n: 5, text: "Use the steamer again to collect your dumpling."};
  }
  if (s.steamer.phase === "cooking") return {id: "steam", n: 5, text: "Watch the steamer. Collect the dumpling when it’s ready."};
  for (const [stage, id, n, text] of [
    ["wrapped", "steam", 4, "Put the folded dumpling in the steamer."],
    ["chopped", "wrap", 3, "Bring the chopped cabbage to Fold."],
    ["raw", "chop", 2, "Bring the cabbage to Chop on the middle counter."]
  ]) {
    if (s.players.some(p => p.held?.stage === stage)) return {id, n, text};
  }
  if (s.shelf) return {id: "shelf", n: 1, text: "Pick up the item you left on the shared shelf."};
  return {id: "cabbage", n: 1, text: "Pick up cabbage from the green crate."};
}
