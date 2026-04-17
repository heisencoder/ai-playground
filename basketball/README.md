# Basketball Stats Tracker

A simple React web app for tracking player statistics during a basketball game.

## Features

- Add players manually by name.
- Grid layout: players as rows, stats (Fouls, Points, Rebounds, Assists) as columns.
- Tap a cell to increment that stat (+1).
- Right-click (or long-press) a cell to decrement (-1).
- State persists in `localStorage` and syncs across open tabs.
- Copy the scoreboard as TSV, ready to paste into a spreadsheet.
- Remove a player with the × button, or reset all stats (with a confirm prompt).

## Getting Started

```bash
cd basketball
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

## Build and Preview

```bash
npm run build
npm run preview   # serves the built dist/ at http://localhost:4173
```

## Stack

React 18, TypeScript, Vite. No backend — the whole app is static.

## Deployment

The app is built to be hosted as a static site, and this repo
publishes it to GitHub Pages at
[`/ai-playground/basketball/`](https://heisencoder.github.io/ai-playground/basketball/)
alongside a top-level table of contents. See
[DEPLOY.md](./DEPLOY.md) for the Pages setup, how to add more static
apps to the same site, and how to host on Netlify / Cloudflare Pages
/ S3 / Firebase instead.
