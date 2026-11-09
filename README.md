# canvas-basketball-game

Coach the River City Foxes through a short 10-game season. Set your starting five, then watch or instantly sim each game while AI runs the offense and defense. During live games you can call timeouts and make substitutions.

## Stack

- Electron + React + TypeScript + Vite (`electron-vite`)
- HTML Canvas overhead court view

## Features

- **Season hub** — 6-team league, standings, schedule, and W–L record (each opponent home and away)
- **Lineup** — swap starters and bench; view player ratings (Spd, Shot, Fin, Reb, Def, Sta) and OVR
- **Watch games** — live AI vs AI sim on a top-down court with pause / 1x / 2x / 4x, shot clock, fouls, free throws, and OT
- **Coaching in-game** — call timeouts (Space) when you have the ball; sub by energy/OVR; AI handles stamina rotations otherwise
- **Sim result** — run the same engine headless for a final score and box score
- **Career save** — autosave / resume via Electron (`userData/career.json`); Save now or start a new career

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
