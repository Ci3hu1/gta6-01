# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Ci3hu1/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Ci3hu1/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** — a complete open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/c/gta6-01). Top-down 2D canvas, vanilla JS,
no libraries, no network requests — plain static files under `game/`.

Lucia Reyes came back to Solmar Bay broke. Fixer Mara Voss has work: **12 missions over
3 days**, from a first delivery at the Old Market to the Casino Royale vault run. Explore
the city on foot and by car, steal cars (walk up, press **E**), outrun the Solmar PD
(wanted stars 0–5, chases, roadblocks), fight on foot, and spend mission cash on garage
upgrades at Benny's Garage.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

- **WASD / arrows** — walk & drive · **Mouse** — aim · **Click** — shoot
- **E** — steal a car / get out · **Space** — punch / handbrake · **H** — horn
- **P** — pause · **S** (paused) — save · **C** (title) — continue saved game
- **1 / 2 / 3** at Benny's Garage — speed / armor / repair

## Systems

City (6 districts, 10 named locations) · traffic cars + pedestrians · car theft ·
wanted stars + police chases + roadblocks · 12-mission story with timers · on-foot
combat · money + garage upgrades · HUD with minimap · radio/dispatch flavor ·
day/time progression · WebAudio synth SFX + music loop · save/load · Busted / Wasted /
victory screens.

## Layout

- `game/` — the playable game (`index.html`, `src/*.js`, one job per file)
- `screenshots/` — 4 real renders (title, delivery drive, 4-star chase, victory)
- `tests/` — `node:test` smoke test + headless Chromium playtest
- `main.ts` — the make.fun handoff program (copies `game/` + `screenshots/`, writes `dossier.json`)
- `STRATEGY.md` — why this build wins

## License

MIT — see `LICENSE`. Solmar Bay is entirely original fiction; no Rockstar Games
names, characters, maps, art, music or assets.
