// Solmar Bay — the story. 12 missions across 3 days: Lucia Reyes, a courier for the
// Marina crew, works for fixer Mara Voss, runs jobs across the city, and ends with the
// Casino Royale vault run. Each mission has a target place, an optional timer and a reward.
import { PLACES } from './config.js';

export const STORY_INTRO = 'Lucia Reyes came back to Solmar Bay broke. Mara Voss has work — if Lucia can drive, run, and stay out of jail.';

export const MISSIONS = [
  { day: 1, title: 'Welcome Back', text: 'Meet Mara at the Marina Pier.', target: 'marina', timer: 0, reward: 150, completeText: 'Mara: "Good. You still know the city."' },
  { day: 1, title: 'First Drop', text: 'Deliver the package to the Old Market drop — clock is running.', target: 'market', timer: 95, reward: 200, completeText: 'Clean drop. The crew is talking about you.' },
  { day: 1, title: 'Hot Wheels', text: 'Jack any car and bring it to Vela Motors.', target: 'motors', timer: 120, reward: 250, completeText: 'Vela: "Nice ride. No questions asked."' },
  { day: 1, title: 'The Cannery', text: 'Pick up the crate at The Cannery, Harbor East.', target: 'cannery', timer: 110, reward: 300, completeText: 'The crate is heavier than it looks.' },
  { day: 2, title: 'Hotel Brisa', text: 'Collect the envelope from Hotel Brisa — quietly.', target: 'hotel', timer: 100, reward: 350, completeText: 'The envelope is sealed. Do not open it.' },
  { day: 2, title: 'Neon Gym', text: 'Mara needs the gym bag from Neon Gym. Cops are watching.', target: 'gym', timer: 100, reward: 400, completeText: 'You were seen. Heat is rising.' },
  { day: 2, title: 'Surf Shack Run', text: 'Surf Shack pickup, then lose the tail — stay under 2 stars.', target: 'surf', timer: 130, reward: 450, completeText: 'Salt air, clean getaway.' },
  { day: 2, title: 'Bank Job Scout', text: 'Case Azura Bank. Photograph the back door — just get there.', target: 'bank', timer: 120, reward: 500, completeText: 'The vault door is older than it looks.' },
  { day: 3, title: 'Garage Tune-Up', text: "Benny's Garage: get the getaway car ready.", target: 'garage', timer: 90, reward: 400, completeText: "Benny: 'She purrs now. Go get rich.'" },
  { day: 3, title: 'The Distraction', text: 'Draw the police to the Old Market — make some noise.', target: 'market', timer: 110, reward: 600, completeText: 'Every cop in the city is at the market.' },
  { day: 3, title: 'Casino Royale', text: 'Get inside Casino Royale. The vault run starts here.', target: 'casino', timer: 120, reward: 800, completeText: 'The vault is open. Grab everything.' },
  { day: 3, title: 'Vault Run Finale', text: 'Escape the casino lockdown — reach the Marina Pier and vanish.', target: 'marina', timer: 150, reward: 5000, completeText: 'Lucia Reyes owns Solmar Bay now.' },
];

export function missionTarget(state) {
  if (!state.mission) return null;
  const place = PLACES[state.mission.target];
  return place ? { x: place.x, y: place.y, name: place.name } : null;
}

export function startMission(state, index) {
  const def = MISSIONS[index];
  if (!def) { state.mission = null; return; }
  state.missionIndex = index;
  state.mission = { ...def, timer: def.timer };
  state.day = def.day;
  if (index === 10 || index === 11) {
    // The finale brings the heat: police are already looking.
    if (state.wanted < 3) state.wanted = 3;
  }
  if (index === 5) {
    if (state.wanted < 2) state.wanted = 2;
  }
}

export function missionLabel(state) {
  if (!state.mission) return 'FREE ROAM — explore Solmar Bay';
  return `DAY ${state.mission.day} · MISSION ${state.missionIndex + 1}/12 — ${state.mission.title}`;
}
