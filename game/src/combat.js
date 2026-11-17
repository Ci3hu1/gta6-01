// Solmar Bay — on-foot combat. Mouse-aimed shooting and punching, bullets, muzzle
// sparks, and damage to police and cars. Shooting in public raises the wanted level.
import { dist } from './random.js';
import { addWanted } from './world.js';

const BULLET_SPEED = 720;
const BULLET_LIFE = 0.7;
const SHOOT_COOLDOWN = 0.22;

let cooldown = 0;

export function playerShoot(state, angle) {
  if (cooldown > 0) return 0;
  cooldown = SHOOT_COOLDOWN;
  const p = state.player;
  state.bullets.push({
    x: p.x + Math.cos(angle) * 20, y: p.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED,
    life: BULLET_LIFE, fromPlayer: true,
  });
  state.particles.push({ x: p.x + Math.cos(angle) * 24, y: p.y + Math.sin(angle) * 24, life: 0.12, color: '#ffe27a' });
  addWanted(state, 1, 'shots fired');
  return 16; // EVENT_SHOT
}

export function playerPunch(state) {
  const p = state.player;
  for (const ped of state.peds) {
    if (dist(ped.x, ped.y, p.x, p.y) < 40) {
      ped.panic = 3;
      ped.x += Math.cos(p.angle) * 60;
      ped.y += Math.sin(p.angle) * 60;
      addWanted(state, 1, 'assault reported');
      return 16;
    }
  }
  return 0;
}

export function updateBullets(state, dt) {
  if (cooldown > 0) cooldown -= dt;
  let events = 0;
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // Hit a police car.
    for (const car of state.police) {
      if (dist(b.x, b.y, car.x, car.y) < 26) {
        b.life = 0;
        car.speed *= 0.6;
        state.particles.push({ x: b.x, y: b.y, life: 0.3, color: '#ff6a4a' });
        state.kills += 1;
        addWanted(state, 1, 'officer down');
        events |= 16;
      }
    }
    // Hit a foot officer.
    for (const officer of state.officers) {
      if (dist(b.x, b.y, officer.x, officer.y) < 16) {
        b.life = 0;
        officer.x = -9999;
        state.kills += 1;
        addWanted(state, 1, 'officer down');
        events |= 16;
      }
    }
    // Hit a building: spark and stop.
    if (state.city.buildings.some((bd) => b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h)) {
      b.life = 0;
      state.particles.push({ x: b.x, y: b.y, life: 0.2, color: '#e8d24a' });
    }
  }
  state.officers = state.officers.filter((o) => o.x > -100);
  state.bullets = state.bullets.filter((b) => b.life > 0);
  return events;
}
