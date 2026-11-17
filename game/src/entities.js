// Solmar Bay — traffic, pedestrians and police. Traffic cars cruise the road grid,
// pedestrians stroll the sidewalks, police cars chase the player when wanted and set
// roadblocks at 3+ stars. All movement is plain steering toward waypoints.
import { CAR_LENGTH, CAR_MODELS, ROAD_SPACING, WORLD_H, WORLD_W } from './config.js';
import { dist, pick } from './random.js';
import { circleHitsBuilding, isRoad } from './world.js';

const PED_COLORS = ['#e8e8e8', '#e8b13a', '#c94a4a', '#4aa86e', '#3a86e8', '#a05c6e', '#e8d9a0'];

function roadPoint(random) {
  const vertical = random() < 0.5;
  const line = Math.floor(random() * 8) * ROAD_SPACING;
  if (vertical) return { x: line, y: random() * WORLD_H, angle: random() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
  return { x: random() * WORLD_W, y: line, angle: random() < 0.5 ? 0 : Math.PI };
}

export function spawnTraffic(state, count) {
  for (let i = 0; i < count; i += 1) {
    const p = roadPoint(state.random);
    state.cars.push({
      id: `car-${i}`, x: p.x, y: p.y, angle: p.angle, speed: 90 + state.random() * 70,
      model: Math.floor(state.random() * CAR_MODELS.length), traffic: true, police: false,
      driven: false, cruise: 90 + state.random() * 70, targetAngle: p.angle,
    });
  }
  // A parked car near the start so the first jack is easy.
  state.cars.push({ id: 'car-parked', x: 640, y: 1440, angle: 0, speed: 0, model: 0, traffic: false, police: false, driven: false, cruise: 0, targetAngle: 0 });
}

export function spawnPedestrians(state, count) {
  for (let i = 0; i < count; i += 1) {
    state.peds.push({
      x: 200 + state.random() * (WORLD_W - 400), y: 200 + state.random() * (WORLD_H - 400),
      angle: state.random() * Math.PI * 2, speed: 28 + state.random() * 30,
      color: pick(state.random, PED_COLORS), panic: 0, police: false,
    });
  }
}

export function spawnPolice(state) {
  const want = state.wanted <= 1 ? 1 : state.wanted <= 2 ? 2 : state.wanted <= 3 ? 3 : 4;
  while (state.police.length < want) {
    const p = state.player;
    const angle = state.random() * Math.PI * 2;
    const d = 420 + state.random() * 200;
    state.police.push({
      id: `pd-${state.police.length}`, x: Math.max(60, Math.min(WORLD_W - 60, p.x + Math.cos(angle) * d)),
      y: Math.max(60, Math.min(WORLD_H - 60, p.y + Math.sin(angle) * d)),
      angle: 0, speed: 0, model: 1, traffic: false, police: true, driven: false, cruise: 0, targetAngle: 0,
      siren: state.random() * 10,
    });
  }
  // Roadblocks at 3+ stars: police cars parked across the road ahead of the player.
  if (state.wanted >= 3 && state.roadblocks.length === 0) {
    for (let i = 0; i < 2; i += 1) {
      state.roadblocks.push({ x: state.player.x + 300 + i * 160, y: state.player.y - 120 + i * 240, angle: Math.PI / 2 });
    }
  }
  if (state.wanted < 3) state.roadblocks = [];
}

function steerToward(car, tx, ty, dt, topSpeed) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
  car.speed += (topSpeed - car.speed) * Math.min(1, dt * 0.8);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(30, Math.min(WORLD_W - 30, nx));
  car.y = Math.max(30, Math.min(WORLD_H - 30, ny));
}

export function updateTraffic(state, dt) {
  for (const car of state.cars) {
    if (car.driven) continue;
    if (!car.traffic) continue;
    // Follow the road grid: head along the current road, turn at intersections.
    const onV = Math.abs(((car.x % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING) < 60;
    const onH = Math.abs(((car.y % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING) < 60;
    if ((onV || onH) && state.random() < dt * 0.25) {
      car.targetAngle = pick(state.random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    }
    const tx = car.x + Math.cos(car.targetAngle) * 200;
    const ty = car.y + Math.sin(car.targetAngle) * 200;
    steerToward(car, tx, ty, dt, car.cruise);
    // Keep traffic cars out of buildings: nudge back onto the road.
    if (circleHitsBuilding(state.city.buildings, car.x, car.y, 20)) {
      car.targetAngle += Math.PI / 2;
      car.x -= Math.cos(car.angle) * 30;
      car.y -= Math.sin(car.angle) * 30;
    }
    // Gentle separation so traffic does not stack.
    for (const other of state.cars) {
      if (other === car || other.driven) continue;
      const d = dist(car.x, car.y, other.x, other.y);
      if (d > 0 && d < 50) {
        car.x += ((car.x - other.x) / d) * 20 * dt;
        car.y += ((car.y - other.y) / d) * 20 * dt;
      }
    }
  }
}

export function updatePedestrians(state, dt) {
  for (const ped of state.peds) {
    if (ped.panic > 0) ped.panic -= dt;
    const playerNear = dist(ped.x, ped.y, state.player.x, state.player.y) < 160;
    const speed = ped.panic > 0 || (playerNear && state.wanted > 0) ? ped.speed * 2.4 : ped.speed;
    if (state.random() < dt * 0.2) ped.angle += (state.random() - 0.5) * 1.6;
    let nx = ped.x + Math.cos(ped.angle) * speed * dt;
    let ny = ped.y + Math.sin(ped.angle) * speed * dt;
    if (circleHitsBuilding(state.city.buildings, nx, ny, 10) || nx < 20 || ny < 20 || nx > WORLD_W - 20 || ny > WORLD_H - 20) {
      ped.angle += Math.PI * 0.7;
      nx = ped.x;
      ny = ped.y;
    }
    ped.x = nx;
    ped.y = ny;
    // A speeding car scares pedestrians (and can hit them: that raises the heat).
    for (const car of [...state.cars, ...state.police]) {
      if (car.driven && Math.abs(car.speed) > 120 && dist(ped.x, ped.y, car.x, car.y) < 26) {
        ped.panic = 2;
        ped.x += (ped.x - car.x) * 0.2;
        ped.y += (ped.y - car.y) * 0.2;
      }
    }
  }
}

export function updatePolice(state, dt) {
  if (state.wanted === 0) {
    // No heat: police cruise away and despawn.
    for (const car of state.police) {
      car.speed = Math.max(0, car.speed - 200 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
    }
    state.police = state.police.filter((c) => dist(c.x, c.y, state.player.x, state.player.y) < 900);
    return;
  }
  spawnPolice(state);
  const top = 300 + state.wanted * 22;
  for (const car of state.police) {
    car.siren += dt;
    steerToward(car, state.player.x, state.player.y, dt, top);
    // Ram: a police car that touches the player's car damages it and slows it.
    if (state.player.car && dist(car.x, car.y, state.player.x, state.player.y) < CAR_LENGTH) {
      state.player.car.speed *= 0.94;
      if (Math.abs(car.speed) > 100 && state.player.invuln <= 0) {
        state.player.health -= 2;
        state.player.invuln = 0.5;
      }
    }
  }
  // Foot officers appear at 2+ stars near the player.
  if (state.wanted >= 2 && state.officers.length < state.wanted - 1) {
    state.officers.push({ x: state.player.x + 200, y: state.player.y + 150, angle: 0, speed: 120, color: '#1a3a6e', panic: 0, police: true });
  }
  for (const officer of state.officers) {
    const want = Math.atan2(state.player.y - officer.y, state.player.x - officer.x);
    officer.angle = want;
    officer.x += Math.cos(want) * officer.speed * dt;
    officer.y += Math.sin(want) * officer.speed * dt;
  }
}
