// Solmar Bay — boot and the one loop. Input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens: title, play,
// paused, busted/wasted, victory. Save/load lives in localStorage under SAVE_KEY.
// ?seed=N fixes the city. ?shot=start|play|chase|win|end stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createGame, resetGame, stepGame, buyUpgrade, garageNear, EVENT_BUSTED, EVENT_MISSION_DONE, EVENT_SHOT, EVENT_WANTED_UP, EVENT_WASTED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { startMission } from './missions.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const state = createGame(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money, day: state.day, missionIndex: state.missionIndex,
      missionDone: state.missionDone, upgrades: state.upgrades,
      health: state.player.health, armor: state.player.armor, carsStolen: state.carsStolen,
    }));
  } catch { /* storage can be off: the save then lasts this visit only */ }
}

function runShot(name) {
  const scene = stageShot(name, state);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, { hasSave: scene.hasSave });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let saved = readSave();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }

  function startNewGame() {
    resetGame(state);
    audio.unlock();
    audio.startMusic();
    screen = SCREEN_PLAY;
    announce('Playing Solmar Bay. Day 1, mission 1: meet Mara at the Marina Pier.');
  }

  function continueGame() {
    resetGame(state);
    if (saved) {
      state.money = saved.money;
      state.day = saved.day;
      state.missionDone = saved.missionDone || 0;
      state.upgrades = saved.upgrades || { speed: 0, armor: 0 };
      state.player.health = saved.health ?? 100;
      state.player.armor = saved.armor ?? 0;
      state.carsStolen = saved.carsStolen || 0;
      // Restart at the next unplayed mission.
      startMission(state, Math.min(saved.missionIndex || 0, 11));
    }
    audio.unlock();
    audio.startMusic();
    screen = SCREEN_PLAY;
    announce('Continuing your saved game.');
  }

  function handleActions(actions) {
    if (input.takeMouseClick() && screen === SCREEN_TITLE) { audio.unlock(); startNewGame(); return; }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE) startNewGame();
      else if (screen === SCREEN_OVER || screen === SCREEN_WIN) startNewGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (input.held('KeyC') && screen === SCREEN_TITLE && saved) continueGame();
    if (input.held('KeyS') && screen === SCREEN_PAUSED) { writeSave(); announce('Game saved.'); }
    if (input.held('KeyR') && (screen === SCREEN_OVER || screen === SCREEN_WIN)) startNewGame();
    if (screen === SCREEN_PLAY && garageNear(state)) {
      if (actions & 32) buyUpgrade(state, 'speed');
      else if (actions & 64) buyUpgrade(state, 'armor');
      else if (actions & 128) buyUpgrade(state, 'repair');
    }
    if (input.held('KeyM')) audio.toggle();
  }

  function step(actions) {
    const events = stepGame(state, input, STEP, actions);
    if (events & EVENT_SHOT) audio.shoot();
    if (events & EVENT_MISSION_DONE) { audio.mission(); audio.pickup(); writeSave(); }
    if (events & EVENT_WANTED_UP) audio.siren();
    audio.engine(state.player.onFoot ? 0 : Math.min(1, Math.abs(state.player.speed) / 380));
    if (events & EVENT_BUSTED) { screen = SCREEN_OVER; announce('Busted. The Solmar PD caught Lucia.'); }
    else if (events & EVENT_WASTED) { screen = SCREEN_OVER; announce('Wasted. Lucia went down in Solmar Bay.'); }
    else if (state.victory) { screen = SCREEN_WIN; announce('Victory. All 12 missions complete.'); }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step(firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, { hasSave: !!saved });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  // Test / automation handle: the playtest drives the game through this.
  window.__game = {
    get state() { return screen; },
    get player() { return state.player; },
    get money() { return state.money; },
    get wanted() { return state.wanted; },
    get missionIndex() { return state.missionIndex; },
    get mission() { return state.mission; },
    get victory() { return state.victory; },
    get gameOver() { return state.gameOver; },
    get cars() { return state.cars; },
    get police() { return state.police; },
    start: startNewGame,
    save: writeSave,
    load: readSave,
  };

  announce('Solmar Bay. Press Enter to start a new story, or C to continue your save.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
