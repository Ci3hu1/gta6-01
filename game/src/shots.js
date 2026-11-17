// Solmar Bay — screenshot scenes behind ?shot=start|play|chase|win|end.
// Each scene stages the real game state (no fake pixels): the same city, the same
// HUD, the same minimap — arranged so one frame shows the systems the brief asks for.
import { PLACES } from './config.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { startMission } from './missions.js';
import { spawnPolice } from './entities.js';

function placePlayerInCar(state, x, y, angle, speed, model) {
  const car = state.cars.find((c) => !c.police && !c.traffic) || state.cars[0];
  car.x = x; car.y = y; car.angle = angle; car.speed = speed; car.model = model; car.driven = true; car.traffic = false;
  state.player.onFoot = false;
  state.player.car = car;
  state.player.x = x; state.player.y = y; state.player.angle = angle; state.player.speed = speed;
  state.cam.x = Math.max(640, Math.min(3200 - 640, x));
  state.cam.y = Math.max(400, Math.min(2400 - 400, y));
}

function arrangeTrafficNear(state, x, y) {
  // Traffic stays on the roads: cars along the horizontal road through the player,
  // pedestrians on its sidewalk edge, so no staged car sits on a building.
  const roadY = Math.round(y / 400) * 400;
  const carXs = [-480, -260, 240, 420, 640];
  state.cars.forEach((car, i) => {
    if (car.driven || car.police) return;
    car.x = x + carXs[i % carXs.length];
    // Spread across the road's lanes so cars never stack on one spot.
    car.y = roadY + (i % 2 === 0 ? -14 : 14) + (Math.floor(i / carXs.length) - 1) * 28;
    car.angle = (i % 2 === 0) ? 0 : Math.PI;
    car.speed = 80; car.traffic = true;
  });
  state.peds.forEach((ped, i) => {
    ped.x = x - 320 + (i % 8) * 90;
    ped.y = roadY + 72 + Math.floor(i / 8) * 46;
  });
}

export function stageShot(name, state) {
  if (name === 'play' || name === 'chase') {
    const chase = name === 'chase';
    startMission(state, chase ? 10 : 1);
    state.money = chase ? 48500 : 420;
    state.wanted = chase ? 4 : 2;
    state.player.health = chase ? 72 : 100;
    state.player.armor = chase ? 50 : 20;
    const px = chase ? 1900 : 1100;
    const py = chase ? 800 : 1200;
    placePlayerInCar(state, px, py, 0, chase ? 260 : 180, chase ? 1 : 0);
    // Frame the mission target as well as the player: camera between the two.
    state.cam.x = px;
    state.cam.y = chase ? 950 : 1350;
    if (state.mission) state.mission.timer = chase ? 74 : 93;
    state.police = [];
    state.roadblocks = [];
    spawnPolice(state);
    if (chase) state.roadblocks = [{ x: 2000, y: 900, angle: Math.PI / 2 }];
    state.officers = [{ x: px + 180, y: py + 200, angle: 0, speed: 120, color: '#1a3a6e', panic: 0, police: true }];
    arrangeTrafficNear(state, px, py);
    state.radio.text = chase
      ? 'SOLMAR PD dispatch: four stars, roadblocks up — box that coupe in, all units.'
      : 'Mara: "Deliver the package to the Old Market drop — clock is running."';
    state.radio.timer = 99;
    return { screen: SCREEN_PLAY, hasSave: false };
  }
  if (name === 'win') {
    state.victory = true;
    state.money = 48500;
    state.day = 3;
    state.clockMin = 21 * 60 + 40;
    state.missionDone = 12;
    state.mission = null;
    state.carsStolen = 7;
    state.wanted = 0;
    placePlayerInCar(state, 360, 2100, 0, 0, 1);
    state.cam.x = 640; state.cam.y = 2000;
    state.radio.text = 'SOLMAR FM: Lucia Reyes owns the city now. The vault run worked.';
    state.radio.timer = 99;
    return { screen: SCREEN_WIN, hasSave: false };
  }
  if (name === 'end') {
    state.gameOver = 'busted';
    state.money = 1250;
    state.missionDone = 5;
    state.wanted = 3;
    state.player.health = 0;
    state.player.x = 1200; state.player.y = 1500;
    state.cam.x = 1200; state.cam.y = 1500;
    return { screen: SCREEN_OVER, hasSave: false };
  }
  // start (default): title over the live city, player on foot by Benny's Garage.
  startMission(state, 0);
  state.money = 120;
  state.player.x = PLACES.garage.x;
  state.player.y = PLACES.garage.y + 170;
  state.player.onFoot = true;
  // Title backdrop: a busy intersection, not the empty lot by the garage.
  state.cam.x = 1200;
  state.cam.y = 1200;
  arrangeTrafficNear(state, 1200, 1200);
  return { screen: SCREEN_TITLE, hasSave: true };
}

export { SCREEN_PAUSED };
