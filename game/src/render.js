// Solmar Bay — drawing only: the city, cars, people, police, effects, the HUD with
// its minimap, and every menu screen. The 1280x800 view follows the player with a
// camera; the world is drawn in world coordinates, the HUD in screen coordinates.
import { CAR_MODELS, COLORS, FONT, PLACES, ROAD_SPACING, ROAD_W, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './config.js';
import { missionLabel, missionTarget, STORY_INTRO } from './missions.js';
import { dist } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const MINIMAP = { x: VIEW_W - 220, y: 86, w: 200, h: 150 };

function clockText(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(1280 * ratio);
    canvas.height = Math.round(800 * ratio);
    canvas.style.width = '1280px';
    canvas.style.height = '800px';
  }

  function text(value, x, y, size, color, align, bold) {
    ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function panel(x, y, w, h, fill) {
    ctx.fillStyle = fill || 'rgba(12,16,24,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(232,210,74,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  function drawCarShape(x, y, angle, color, isPolice, sirenOn) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-24, -13, 48, 26);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-23, -12, 46, 24, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,45,0.9)';
    ctx.fillRect(-6, -10, 16, 20);
    ctx.fillStyle = '#ffe27a';
    ctx.fillRect(21, -9, 3, 5);
    ctx.fillRect(21, 4, 3, 5);
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(-23, -9, 3, 5);
    ctx.fillRect(-23, 4, 3, 5);
    if (isPolice) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -12, 8, 24);
      ctx.fillStyle = sirenOn ? '#ff3b30' : '#2f7fff';
      ctx.fillRect(-8, -12, 6, 6);
      ctx.fillStyle = sirenOn ? '#2f7fff' : '#ff3b30';
      ctx.fillRect(2, -12, 6, 6);
    }
    ctx.restore();
  }

  function drawWorld(state) {
    const cam = state.cam;
    const ox = cam.x - VIEW_W / 2;
    const oy = cam.y - VIEW_H / 2;
    ctx.save();
    ctx.translate(-ox, -oy);
    // Ground, beach (south) and water.
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(ox - 40, oy - 40, VIEW_W + 80, VIEW_H + 80);
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(0, 2280, WORLD_W, 120);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, 2360, WORLD_W, 40);
    // Parks.
    for (const park of state.city.parks) {
      ctx.fillStyle = COLORS.park;
      ctx.beginPath();
      ctx.arc(park.x, park.y, park.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7a3a';
      ctx.beginPath();
      ctx.arc(park.x - 30, park.y - 20, 16, 0, Math.PI * 2);
      ctx.arc(park.x + 40, park.y + 30, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    // Roads.
    ctx.fillStyle = COLORS.road;
    for (let x = 0; x <= WORLD_W; x += ROAD_SPACING) ctx.fillRect(x - ROAD_W / 2, 0, ROAD_W, WORLD_H);
    for (let y = 0; y <= WORLD_H; y += ROAD_SPACING) ctx.fillRect(0, y - ROAD_W / 2, WORLD_W, ROAD_W);
    // Centre dashes.
    ctx.fillStyle = COLORS.roadLine;
    for (let x = 0; x <= WORLD_W; x += ROAD_SPACING) {
      for (let y = 0; y < WORLD_H; y += 56) ctx.fillRect(x - 2, y, 4, 26);
    }
    for (let y = 0; y <= WORLD_H; y += ROAD_SPACING) {
      for (let x = 0; x < WORLD_W; x += 56) ctx.fillRect(x, y - 2, 26, 4);
    }
    // District labels on the ground.
    ctx.font = `700 26px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.textAlign = 'center';
    ctx.fillText('PALM HEIGHTS', 800, 620);
    ctx.fillText('NEON STRIP', 2000, 1020);
    ctx.fillText('OLD MARKET', 1200, 1420);
    // Buildings.
    for (const b of state.city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(b.x, b.y, b.w, 10);
      // Windows.
      ctx.fillStyle = 'rgba(255,230,140,0.75)';
      for (let wx = b.x + 16; wx < b.x + b.w - 14; wx += 30) {
        for (let wy = b.y + 22; wy < b.y + b.h - 14; wy += 30) ctx.fillRect(wx, wy, 14, 12);
      }
      if (b.name) {
        ctx.font = `700 17px ${FONT}`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 6);
      }
    }
    // Mission target beacon.
    const target = missionTarget(state);
    if (target) {
      const pulse = 26 + Math.sin(state.elapsed * 4) * 6;
      ctx.strokeStyle = '#ffe27a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.moveTo(target.x, target.y - 34);
      ctx.lineTo(target.x - 10, target.y - 14);
      ctx.lineTo(target.x + 10, target.y - 14);
      ctx.closePath();
      ctx.fill();
      const d = Math.round(dist(state.player.x, state.player.y, target.x, target.y));
      ctx.font = `700 16px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`${d}m`, target.x + 24, target.y - 18);
    }
    // Roadblocks.
    for (const rb of state.roadblocks) {
      drawCarShape(rb.x, rb.y, rb.angle, '#ffffff', true, true);
      ctx.fillStyle = '#ff8a3a';
      ctx.font = `700 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('ROADBLOCK', rb.x, rb.y - 34);
    }
    // Traffic + parked cars.
    for (const car of state.cars) {
      const model = CAR_MODELS[car.model];
      drawCarShape(car.x, car.y, car.angle, model.color, false, false);
      if (car.driven) {
        ctx.font = `700 14px ${FONT}`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(model.name, car.x, car.y - 30);
      }
    }
    // Police cars.
    for (const car of state.police) drawCarShape(car.x, car.y, car.angle, '#e8e8e8', true, Math.floor(car.siren * 2) % 2 === 0);
    // Pedestrians + officers.
    for (const ped of [...state.peds, ...state.officers]) {
      ctx.fillStyle = ped.police ? '#1a3a6e' : ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, ped.police ? 11 : 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c2430';
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (ped.police) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('PD', ped.x, ped.y - 14);
      }
    }
    // Bullets + particles.
    ctx.fillStyle = '#ffe27a';
    for (const b of state.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); }
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life * 2);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Player on foot.
    const p = state.player;
    if (p.onFoot) {
      ctx.fillStyle = p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0 ? 'rgba(232,177,58,0.4)' : '#e8b13a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1c2430';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24);
      ctx.stroke();
      ctx.fillStyle = '#1c2430';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('LUCIA', p.x, p.y - 20);
    }
    ctx.restore();
  }

  function drawMinimap(state) {
    const mm = MINIMAP;
    panel(mm.x - 6, mm.y - 6, mm.w + 12, mm.h + 12, 'rgba(12,16,24,0.85)');
    const sx = mm.w / WORLD_W;
    const sy = mm.h / WORLD_H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(mm.x, mm.y, mm.w, mm.h);
    ctx.clip();
    ctx.fillStyle = '#2f4a2f';
    ctx.fillRect(mm.x, mm.y, mm.w, mm.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD_W; x += ROAD_SPACING) {
      ctx.beginPath(); ctx.moveTo(mm.x + x * sx, mm.y); ctx.lineTo(mm.x + x * sx, mm.y + mm.h); ctx.stroke();
    }
    for (let y = 0; y <= WORLD_H; y += ROAD_SPACING) {
      ctx.beginPath(); ctx.moveTo(mm.x, mm.y + y * sy); ctx.lineTo(mm.x + mm.w, mm.y + y * sy); ctx.stroke();
    }
    ctx.fillStyle = '#2f7fb8';
    ctx.fillRect(mm.x, mm.y + mm.h - 6, mm.w, 6);
    const target = missionTarget(state);
    if (target) {
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.arc(mm.x + target.x * sx, mm.y + target.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const car of state.police) {
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(mm.x + car.x * sx, mm.y + car.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mm.x + state.player.x * sx, mm.y + state.player.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    text('SOLMAR BAY', mm.x + mm.w / 2, mm.y + mm.h + 20, 12, '#cfd6de', 'center');
  }

  function drawHud(state) {
    // Top-left: money, health, armor, day + clock.
    panel(16, 14, 250, 108, 'rgba(12,16,24,0.85)');
    text(`$${state.money.toLocaleString('en-US')}`, 30, 48, 30, '#7dff8a', 'left', true);
    text(`DAY ${state.day} · ${clockText(state.clockMin)}`, 30, 76, 15, '#e8d24a', 'left', true);
    text('HEALTH', 30, 98, 12, '#cfd6de', 'left', true);
    ctx.fillStyle = '#333';
    ctx.fillRect(96, 86, 150, 12);
    ctx.fillStyle = state.player.health > 30 ? '#4ade80' : '#ff5a4a';
    ctx.fillRect(96, 86, 150 * Math.max(0, state.player.health) / 100, 12);
    text('ARMOR', 30, 116, 12, '#cfd6de', 'left', true);
    ctx.fillStyle = '#333';
    ctx.fillRect(96, 104, 150, 12);
    ctx.fillStyle = '#5aa8ff';
    ctx.fillRect(96, 104, 150 * Math.max(0, state.player.armor) / 100, 12);
    // Top-right: wanted stars + minimap.
    const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    text(stars, VIEW_W - 16, 44, 30, state.wanted > 0 ? '#ffb13a' : '#8b93a3', 'right', true);
    text(state.wanted > 0 ? `WANTED — ${state.wanted} STAR${state.wanted > 1 ? 'S' : ''}` : 'WANTED — CLEAR', VIEW_W - 16, 62, 12, state.wanted > 0 ? '#ff8a3a' : '#8b93a3', 'right', true);
    drawMinimap(state);
    // Top-centre: mission banner.
    const label = missionLabel(state);
    const banner = state.mission ? state.mission.text : 'Free roam — explore Solmar Bay, steal a car, visit Benny\'s Garage.';
    panel(VIEW_W / 2 - 330, 14, 660, 66, 'rgba(12,16,24,0.88)');
    text(label, VIEW_W / 2, 38, 15, '#e8d24a', 'center', true);
    text(banner, VIEW_W / 2, 62, 16, '#ffffff', 'center');
    if (state.mission && state.mission.timer > 0) {
      text(`⏱ ${Math.ceil(state.mission.timer)}s`, VIEW_W / 2 + 348, 44, 22, state.mission.timer < 20 ? '#ff5a4a' : '#7dff8a', 'left', true);
    }
    // Bottom-left: radio / dispatch.
    if (state.radio.timer > 0) {
      panel(16, VIEW_H - 86, 560, 58, 'rgba(12,16,24,0.85)');
      ctx.fillStyle = '#e8d24a';
      ctx.beginPath();
      ctx.arc(40, VIEW_H - 57, 13, 0, Math.PI * 2);
      ctx.fill();
      text('R', 40, VIEW_H - 52, 14, '#1c2430', 'center', true);
      text('Radio · SOLMAR FM', 62, VIEW_H - 64, 12, '#e8d24a', 'left', true);
      ctx.font = `15px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      const line = state.radio.text.length > 72 ? state.radio.text.slice(0, 72) + '…' : state.radio.text;
      ctx.fillText(line, 62, VIEW_H - 42);
    }
    // Bottom-right: speed + car.
    if (!state.player.onFoot && state.player.car) {
      const model = CAR_MODELS[state.player.car.model];
      panel(VIEW_W - 216, VIEW_H - 86, 200, 58, 'rgba(12,16,24,0.85)');
      text(`${Math.round(Math.abs(state.player.speed) * 0.55)} km/h`, VIEW_W - 30, VIEW_H - 48, 26, '#7dff8a', 'right', true);
      text(model.name, VIEW_W - 30, VIEW_H - 30, 13, '#ffffff', 'right');
    } else {
      text('[E] Jack car   [Click] Shoot   [Space] Punch', VIEW_W - 16, VIEW_H - 20, 14, '#eef1f5', 'right');
    }
    if (state.player.onFoot) text('[WASD] Move   [E] Jack car   [Click] Shoot', 16, VIEW_H - 20, 14, '#eef1f5', 'left');
    else text('[WASD] Drive   [Space] Handbrake   [H] Horn   [E] Exit car', 16, VIEW_H - 20, 14, '#eef1f5', 'left');
    // Garage prompt.
    if (dist(state.player.x, state.player.y, PLACES.garage.x, PLACES.garage.y) < 220) {
      panel(VIEW_W / 2 - 260, VIEW_H - 170, 520, 62, 'rgba(12,16,24,0.9)');
      text("BENNY'S GARAGE — [1] Speed $400  [2] Armor $350  [3] Repair $120", VIEW_W / 2, VIEW_H - 144, 15, '#ffe27a', 'center', true);
      text(`Upgrades: speed ${state.upgrades.speed}/3 · armor ${state.upgrades.armor}/3`, VIEW_W / 2, VIEW_H - 122, 13, '#ffffff', 'center');
    }
  }

  function drawTitle(state, hasSave) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(10,14,22,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(VIEW_W / 2 - 340, 110, 680, 560, 'rgba(12,16,24,0.92)');
    text('SOLMAR BAY', VIEW_W / 2, 190, 64, '#ffe27a', 'center', true);
    text('An open-world crime game in the spirit of GTA 6', VIEW_W / 2, 226, 20, '#ffffff', 'center');
    text('Three days. Twelve missions. One city that remembers.', VIEW_W / 2, 254, 16, '#e8d24a', 'center');
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = '#cfd6de';
    ctx.textAlign = 'center';
    const words = STORY_INTRO.split(' ');
    let line = '';
    let y = 292;
    for (const word of words) {
      if ((line + ' ' + word).length > 62) { ctx.fillText(line, VIEW_W / 2, y); y += 22; line = word; }
      else line = line ? line + ' ' + word : word;
    }
    ctx.fillText(line, VIEW_W / 2, y);
    const items = [
      'WASD / arrows — walk & drive      Mouse — aim      Click — shoot',
      'E — steal a car / get out      Space — punch / handbrake      H — horn',
      'P — pause      Missions pay cash — spend it at Benny\'s Garage [1][2][3]',
      'Wanted stars bring the Solmar PD. Lose them by breaking line of sight.',
    ];
    items.forEach((item, i) => text(item, VIEW_W / 2, 380 + i * 26, 15, '#ffffff', 'center'));
    text('Press ENTER to start a new story', VIEW_W / 2, 520, 20, '#7dff8a', 'center', true);
    if (hasSave) text('Press C to continue your saved game', VIEW_W / 2, 552, 18, '#5aa8ff', 'center', true);
    text('Solmar Bay is fiction — an original city, crew and story. No Rockstar content.', VIEW_W / 2, 620, 13, '#8b93a3', 'center');
  }

  function drawEndPanel(title, lines, prompt, accent) {
    ctx.fillStyle = 'rgba(10,14,22,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(VIEW_W / 2 - 320, 220, 640, 340, 'rgba(12,16,24,0.94)');
    text(title, VIEW_W / 2, 300, 52, accent, 'center', true);
    lines.forEach((line, i) => text(line, VIEW_W / 2, 350 + i * 30, 18, '#ffffff', 'center'));
    text(prompt, VIEW_W / 2, 510, 18, '#7dff8a', 'center', true);
  }

  function draw(state, screen, info) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11141b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (screen === SCREEN_TITLE) { drawTitle(state, info && info.hasSave); return; }
    drawWorld(state);
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawEndPanel('PAUSED', ['The city waits for you.', `Money $${state.money} · Mission ${state.missionIndex + 1}/12 · Day ${state.day}`], 'Press P to resume — S to save your game');
    } else if (screen === SCREEN_OVER) {
      const busted = state.gameOver === 'busted';
      drawEndPanel(busted ? 'BUSTED' : 'WASTED', [
        busted ? 'The Solmar PD caught Lucia. The crew posts bail — again.' : 'Lucia went down in Solmar Bay. The city moves on.',
        `Money $${state.money} · Missions done ${state.missionDone}/12 · Cars stolen ${state.carsStolen}`,
      ], 'Press ENTER to try again', busted ? '#5aa8ff' : '#ff5a4a');
    } else if (screen === SCREEN_WIN) {
      drawEndPanel('SOLMAR BAY IS YOURS', [
        'All 12 missions complete. The Casino Royale vault run worked.',
        `Final take: $${state.money} · Cars stolen ${state.carsStolen} · Day 3 complete.`,
        'Lucia Reyes owns the city now.',
      ], 'Press ENTER to play again in free roam', '#ffe27a');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
