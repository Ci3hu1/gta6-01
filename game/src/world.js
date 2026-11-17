// Solmar Bay — the city and the game state. Builds the map (roads, blocks, named
// buildings, parks, beach, water), holds every entity, and advances one fixed step:
// player movement, driving, traffic, pedestrians, police, wanted level, missions,
// combat hooks and the day clock. No drawing and no sound here.
import { CAR_MODELS, COLORS, PLACES, PLAYER_RADIUS, PLAYER_SPEED, ROAD_SPACING, ROAD_W, WORLD_H, WORLD_W, WANTED_DECAY_SECONDS } from './config.js';
import { dist, pick } from './random.js';
import { MISSIONS, missionTarget, startMission } from './missions.js';
import { spawnTraffic, spawnPedestrians, updateTraffic, updatePedestrians, updatePolice, spawnPolice } from './entities.js';
import { updateBullets, playerShoot, playerPunch } from './combat.js';

export const EVENT_MISSION_DONE = 1;
export const EVENT_BUSTED = 2;
export const EVENT_WASTED = 4;
export const EVENT_WANTED_UP = 8;
export const EVENT_SHOT = 16;

const BUILDING_COLORS = ['#8a6f5c', '#5c7a8a', '#a05c6e', '#6e5c8a', '#7a8a5c', '#b07a3a'];
const NAMED_SPOTS = [
  { key: 'garage', w: 220, h: 130, color: '#c98a2a' },
  { key: 'bank', w: 200, h: 150, color: '#3a6ea8' },
  { key: 'market', w: 240, h: 140, color: '#a85c3a' },
  { key: 'hotel', w: 180, h: 160, color: '#c94a7a' },
  { key: 'cannery', w: 260, h: 140, color: '#5c7a6e' },
  { key: 'casino', w: 240, h: 160, color: '#8a3aa8' },
  { key: 'surf', w: 180, h: 120, color: '#3aa8a0' },
  { key: 'gym', w: 200, h: 130, color: '#a83a3a' },
  { key: 'motors', w: 220, h: 130, color: '#3a5ca8' },
];

export function isRoad(x, y) {
  const rx = ((x % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING;
  const ry = ((y % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING;
  return rx < ROAD_W / 2 + 24 || rx > ROAD_SPACING - ROAD_W / 2 - 24 || ry < ROAD_W / 2 + 24 || ry > ROAD_SPACING - ROAD_W / 2 - 24;
}

export function buildCity(random) {
  const buildings = [];
  // City blocks between roads: one building per block, with named landmarks placed first.
  for (const spot of NAMED_SPOTS) {
    const place = PLACES[spot.key];
    buildings.push({ x: place.x - spot.w / 2, y: place.y - spot.h / 2, w: spot.w, h: spot.h, color: spot.color, name: place.label, named: spot.key });
  }
  for (let bx = 0; bx < 8; bx += 1) {
    for (let by = 0; by < 6; by += 1) {
      const cx = bx * ROAD_SPACING + 200;
      const cy = by * ROAD_SPACING + 200;
      if (buildings.some((b) => dist(b.x + b.w / 2, b.y + b.h / 2, cx, cy) < 260)) continue;
      if (random() < 0.18) continue; // park / empty lot
      const w = 130 + random() * 110;
      const h = 110 + random() * 100;
      buildings.push({ x: cx - w / 2, y: cy - h / 2, w, h, color: pick(random, BUILDING_COLORS), name: '', named: '' });
    }
  }
  const parks = [];
  for (let i = 0; i < 6; i += 1) parks.push({ x: 200 + Math.floor(random() * 7) * 400, y: 200 + Math.floor(random() * 5) * 400, r: 90 + random() * 50 });
  return { buildings, parks };
}

export function circleHitsBuilding(buildings, x, y, r) {
  for (const b of buildings) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

export function resolveCircle(buildings, x, y, r) {
  const b = circleHitsBuilding(buildings, x, y, r);
  if (!b) return { x, y, hit: false };
  const cx = Math.max(b.x, Math.min(x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(y, b.y + b.h));
  let dx = x - cx;
  let dy = y - cy;
  if (dx === 0 && dy === 0) { dx = 0; dy = -1; }
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: cx + (dx / len) * (r + 1), y: cy + (dy / len) * (r + 1), hit: true };
}

export function createGame(random) {
  const city = buildCity(random);
  const state = {
    random, city,
    player: { x: 520, y: 1400, angle: -Math.PI / 2, health: 100, armor: 0, onFoot: true, speed: 0, car: null, invuln: 0 },
    cars: [], peds: [], police: [], officers: [], bullets: [], particles: [],
    money: 120, wanted: 0, wantedTimer: 0, day: 1, clockMin: 8 * 60 + 7,
    missionIndex: 0, mission: null, missionTimer: 0, missionDone: 0,
    upgrades: { speed: 0, armor: 0 },
    radio: { text: 'SOLMAR FM — good morning, Solmar Bay. Traffic light on the Strip.', timer: 8 },
    elapsed: 0, kills: 0, carsStolen: 0, gameOver: '', victory: false,
    cam: { x: 520, y: 1400 }, hornTimer: 0, roadblocks: [],
  };
  spawnTraffic(state, 14);
  spawnPedestrians(state, 26);
  startMission(state, 0);
  return state;
}

export function resetGame(state) {
  const fresh = createGame(state.random);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
}

export function addWanted(state, amount, reason) {
  const before = state.wanted;
  state.wanted = Math.max(0, Math.min(5, state.wanted + amount));
  state.wantedTimer = 0;
  if (state.wanted > before) {
    state.radio.text = `SOLMAR PD dispatch: ${state.wanted} star${state.wanted > 1 ? 's' : ''} — ${reason}. All units respond.`;
    state.radio.timer = 6;
    spawnPolice(state);
    return EVENT_WANTED_UP;
  }
  return 0;
}

export function nearestCar(state, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.police) continue;
    const d = dist(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(state, car) {
  state.player.onFoot = false;
  state.player.car = car;
  car.driven = true;
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.angle = car.angle;
  state.player.speed = 0;
}

export function exitCar(state) {
  const car = state.player.car;
  if (!car) return;
  car.driven = false;
  state.player.onFoot = true;
  state.player.car = null;
  state.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
  state.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
  state.player.speed = 0;
}

function tryJackCar(state) {
  const car = nearestCar(state, state.player.x, state.player.y, 70);
  if (!car) return 0;
  enterCar(state, car);
  state.carsStolen += 1;
  return addWanted(state, 1, 'vehicle theft reported');
}

function driveCar(state, car, axes, dt) {
  const model = CAR_MODELS[car.model];
  const top = model.top + state.upgrades.speed * 45;
  const accel = model.accel + state.upgrades.speed * 30;
  if (axes.y < 0) car.speed += accel * dt;
  else if (axes.y > 0) car.speed -= accel * 0.7 * dt;
  else car.speed *= Math.pow(0.4, dt);
  if (state.hornTimer > 0) { /* handbrake on Space handled by caller via punch flag */ }
  car.speed = Math.max(-120, Math.min(top, car.speed));
  const steer = axes.x * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * 2.4 * dt * (Math.abs(car.speed) > 5 ? 1 : 0);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = circleHitsBuilding(state.city.buildings, nx, ny, 22);
  if (hit) {
    if (Math.abs(car.speed) > 140) {
      state.player.health -= 4;
      state.particles.push({ x: car.x, y: car.y, life: 0.4, color: '#e8d24a' });
    }
    car.speed *= -0.25;
  } else {
    car.x = Math.max(30, Math.min(WORLD_W - 30, nx));
    car.y = Math.max(30, Math.min(WORLD_H - 30, ny));
  }
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.angle = car.angle;
  state.player.speed = car.speed;
}

function updatePlayerOnFoot(state, axes, aimAngle, dt) {
  const p = state.player;
  const len = Math.hypot(axes.x, axes.y) || 1;
  const nx = p.x + (axes.x / len) * PLAYER_SPEED * dt * (axes.x || axes.y ? 1 : 0);
  const ny = p.y + (axes.y / len) * PLAYER_SPEED * dt * (axes.x || axes.y ? 1 : 0);
  const resolved = resolveCircle(state.city.buildings, nx, ny, PLAYER_RADIUS);
  p.x = Math.max(20, Math.min(WORLD_W - 20, resolved.x));
  p.y = Math.max(20, Math.min(WORLD_H - 20, resolved.y));
  p.angle = aimAngle;
  p.speed = (axes.x || axes.y) ? PLAYER_SPEED : 0;
}

/** One fixed step. `actions` are this frame's one-shot flags (see input.js). Returns event flags for the caller (sound / screens). */
export function stepGame(state, input, dt, actions = 0) {
  let events = 0;
  state.elapsed += dt;
  state.clockMin += dt * 0.6; // a game hour every ~100 real seconds
  if (state.clockMin >= 24 * 60) { state.clockMin -= 24 * 60; }
  if (state.player.invuln > 0) state.player.invuln -= dt;
  if (state.radio.timer > 0) state.radio.timer -= dt;
  if (state.hornTimer > 0) state.hornTimer -= dt;

  const axes = input.axes();
  const mouse = input.mouse();
  // Aim: mouse position on screen -> world angle from the player.
  const worldAim = Math.atan2(
    (state.cam.y + (mouse.y - 400)) - state.player.y,
    (state.cam.x + (mouse.x - 640)) - state.player.x,
  );

  if (state.player.onFoot) updatePlayerOnFoot(state, axes, worldAim, dt);
  else if (state.player.car) {
    if (input.held('Space')) state.player.car.speed *= Math.pow(0.05, dt);
    driveCar(state, state.player.car, axes, dt);
  }

  // One-shot actions (taken once per frame by the caller).
  if (actions & 4) { // E interact / jack / exit
    if (state.player.onFoot) events |= tryJackCar(state);
    else exitCar(state);
  }
  if (actions & 16) { // H horn
    state.hornTimer = 0.5;
    state.radio.text = 'Horn! Pedestrians scatter on the Strip.';
    state.radio.timer = 3;
  }
  if (mouse.down && state.player.onFoot) events |= playerShoot(state, worldAim);
  if (actions & 8 && state.player.onFoot) events |= playerPunch(state);

  updateTraffic(state, dt);
  updatePedestrians(state, dt);
  updatePolice(state, dt);
  events |= updateBullets(state, dt);

  // Wanted decay when no police can see the player.
  if (state.wanted > 0) {
    state.wantedTimer += dt;
    const seen = state.police.some((c) => dist(c.x, c.y, state.player.x, state.player.y) < 500);
    if (!seen && state.wantedTimer > WANTED_DECAY_SECONDS) {
      state.wanted -= 1;
      state.wantedTimer = 0;
      state.radio.text = state.wanted === 0 ? 'SOLMAR PD dispatch: suspect lost. All units stand down.' : `Heat cooling off — ${state.wanted} star${state.wanted > 1 ? 's' : ''} left. Lay low.`;
      state.radio.timer = 5;
    }
  }

  // Mission timer + objectives.
  if (state.mission) {
    if (state.mission.timer > 0) {
      state.mission.timer -= dt;
      if (state.mission.timer <= 0) {
        state.radio.text = `Mission failed — ${state.mission.title}. Talk to Mara at the Marina to retry.`;
        state.radio.timer = 6;
        startMission(state, state.missionIndex); // retry same mission
      }
    }
    const target = missionTarget(state);
    if (target && dist(state.player.x, state.player.y, target.x, target.y) < 70) {
      events |= completeMission(state);
    }
  }

  // Busted: a police car touches the player on foot at low speed, or an officer is adjacent.
  if (state.wanted >= 3 && state.player.onFoot) {
    const near = state.police.some((c) => dist(c.x, c.y, state.player.x, state.player.y) < 34 && Math.abs(c.speed) < 60);
    if (near) { state.gameOver = 'busted'; return events | EVENT_BUSTED; }
  }
  if (state.player.health <= 0) { state.gameOver = 'wasted'; return events | EVENT_WASTED; }

  // Camera follows the player, clamped to the world.
  state.cam.x = Math.max(640, Math.min(WORLD_W - 640, state.player.x));
  state.cam.y = Math.max(400, Math.min(WORLD_H - 400, state.player.y));

  for (const pt of state.particles) pt.life -= dt;
  state.particles = state.particles.filter((p) => p.life > 0);
  return events;
}

export function completeMission(state) {
  const m = state.mission;
  if (!m) return 0;
  state.money += m.reward;
  state.missionDone += 1;
  state.radio.text = `Mission complete — ${m.title}. +$${m.reward}. ${m.completeText}`;
  state.radio.timer = 6;
  if (state.missionIndex >= MISSIONS.length - 1) {
    state.victory = true;
    state.mission = null;
    return EVENT_MISSION_DONE;
  }
  startMission(state, state.missionIndex + 1);
  return EVENT_MISSION_DONE;
}

export function buyUpgrade(state, kind) {
  const costs = { speed: 400, armor: 350, repair: 120 };
  const cost = costs[kind];
  if (state.money < cost) return false;
  if (kind === 'speed' && state.upgrades.speed >= 3) return false;
  if (kind === 'armor' && state.upgrades.armor >= 3) return false;
  if (kind === 'repair' && state.player.health >= 100) return false;
  state.money -= cost;
  if (kind === 'speed') state.upgrades.speed += 1;
  else if (kind === 'armor') { state.upgrades.armor += 1; state.player.armor = Math.min(100, state.player.armor + 50); }
  else state.player.health = 100;
  state.radio.text = kind === 'repair' ? "Benny's Garage: patched up, good as new." : `Benny's Garage: upgrade fitted — ${kind} level ${state.upgrades[kind]}.`;
  state.radio.timer = 5;
  return true;
}

export function garageNear(state) {
  return dist(state.player.x, state.player.y, PLACES.garage.x, PLACES.garage.y) < 220;
}
