// Keyboard and pointer input for Solmar Bay. Held keys steer and drive; one-shot presses
// (confirm, pause, interact, punch, horn, upgrade keys) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_PUNCH = 8;
export const ACTION_HORN = 16;
export const ACTION_UPGRADE_SPEED = 32;
export const ACTION_UPGRADE_ARMOR = 64;
export const ACTION_REPAIR = 128;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const INTERACT = new Set(['KeyE']);
const PUNCH = new Set(['Space']);
const HORN = new Set(['KeyH']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseX = 640;
  let mouseY = 400;
  let mouseDown = false;
  let mouseClicked = false;

  window.addEventListener('keydown', (event) => {
    held.add(event.code);
    if (event.repeat) return;
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (INTERACT.has(event.code)) actions |= ACTION_INTERACT;
    else if (PUNCH.has(event.code)) actions |= ACTION_PUNCH;
    else if (HORN.has(event.code)) actions |= ACTION_HORN;
    else if (event.code === 'Digit1') actions |= ACTION_UPGRADE_SPEED;
    else if (event.code === 'Digit2') actions |= ACTION_UPGRADE_ARMOR;
    else if (event.code === 'Digit3') actions |= ACTION_REPAIR;
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || PUNCH.has(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    mouseDown = true;
    mouseClicked = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });

  return {
    /** Steering axes: -1/0/1 each. */
    axes() {
      return {
        x: (held.has('ArrowRight') || held.has('KeyD') ? 1 : 0) - (held.has('ArrowLeft') || held.has('KeyA') ? 1 : 0),
        y: (held.has('ArrowDown') || held.has('KeyS') ? 1 : 0) - (held.has('ArrowUp') || held.has('KeyW') ? 1 : 0),
      };
    },
    held(code) { return held.has(code); },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    takeMouseClick() { const c = mouseClicked; mouseClicked = false; return c; },
    takeActions() { const taken = actions; actions = 0; return taken; },
  };
}
