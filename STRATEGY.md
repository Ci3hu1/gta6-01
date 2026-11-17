# Solmar Bay — STRATEGY

## The entry
**Solmar Bay** — a complete open-world crime game in the spirit of GTA 6, top-down 2D
canvas, vanilla JS, no libraries, no network requests, all static files under `game/`.
Protagonist Lucia Reyes, courier for fixer Mara Voss, in the fictional coastal city of
Solmar Bay (Marina, Old Market, Neon Strip, Harbor East, Palm Heights, Azura Bank).

## Why top-down 2D
The live top-10 study (17 Nov 2026, 283 entries) showed ranks 1–2 are top-down 2D
("Neon Harbor", 990,081) and rank 3 is 3D third-person. Both views can win; top-down is
the fastest way to make every brief system complete *and readable* in a 1280×800
screenshot, which is most of what the judge sees (contact sheet + source outline).

## What the leaders show — and what we match
- Named fictional city + named locations (Benny's Garage, Azura Bank, Hotel Brisa,
  The Cannery, Casino Royale, Vela Motors, Surf Shack, Neon Gym, Marina Pier).
- Missions with timers + day/chapter progression: **12 missions over 3 days**,
  from "First Drop" (95s delivery) to the "Vault Run Finale" (escape the casino
  lockdown, $5,000).
- Wanted stars (0–5) + police cars that chase and ram, foot officers at 2+ stars,
  roadblocks at 3+ stars, heat that cools when police lose sight of the player.
- Money + garage upgrades: missions pay cash; at Benny's Garage buy speed (+45 top
  speed/level), armor (+50/level) and repairs with keys 1/2/3.
- HUD with minimap: money, health/armor bars, day + clock, wanted stars, mission
  banner with countdown, radio/dispatch flavor text, speedometer, control hints.
- Start screen (story intro, controls, Continue from save) + pause + localStorage
  save/load (money, day, mission, upgrades, health) + Busted/Wasted + victory screens.
- Combat on foot: mouse-aim shooting, Space punch; shooting raises the wanted level.
- WebAudio synth SFX (shots, siren, pickup, crash) + engine hum + a simple bass loop
  (Solmar FM). No audio files.

## Edge vs the leaders
Most leaders show one view well; the brief rewards the *complete set*. Solmar Bay
wires all of it together in one playable loop, and every system is visible in the
4 screenshots: (1) title over the live city by Benny's Garage, (2) driving a delivery
mission at 2 stars, (3) a 4-star chase with roadblock + minimap + mission timer,
(4) the victory screen. Shot 3 deliberately stacks chase + stars + minimap + mission
objective in one frame.

## Structure (judge criterion 5)
`game/src/` — one job per file, named for it: `config.js` (tuning/places),
`random.js` (seeded RNG), `input.js` (keyboard/mouse), `world.js` (city + game state
+ step), `entities.js` (traffic/pedestrians/police), `missions.js` (12-mission story),
`combat.js` (shoot/punch/bullets), `audio.js` (WebAudio synth), `render.js` (city +
HUD + minimap + menus), `shots.js` (deterministic `?shot=` scenes), `main.js`
(loop, state machine, save/load).

## What was tried and dropped
- 3D (three.js): dropped — slower to make complete and harder to read at contact-sheet
  size; ranks 1–2 prove top-down 2D wins.
- Copying any Rockstar name/map/asset: never — all names, story and art are original.

## Verification
- `node --test tests/smoke.test.mjs` — dossier builds, no network references, screenshots
  meet the gate shape, STRATEGY + LICENSE present.
- `node tests/playtest.mjs` — headless Chromium: loads with zero console errors and zero
  non-localhost requests, starts, drives, jacks a car, raises wanted level, saves, and
  takes the 4 screenshots (1280×800, ≤256 KiB each).
- `node cli/makefun.mjs check --kit . --repo <repo>` from the kit dir — must pass with
  zero failures before any submit is proposed.
