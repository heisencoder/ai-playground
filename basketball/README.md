# Basketball Stats Tracker

A simple React web app for tracking player statistics during a basketball game.

## Features

- Add players manually by name.
- Grid layout: players as rows, stats (Fouls, Points, Rebounds, Assists) as columns.
- Tap a cell to increment that stat (+1).
- Right-click (or long-press) a cell to decrement (-1).
- State persists in `localStorage` and syncs across open tabs.
- Copy the scoreboard as TSV, ready to paste into a spreadsheet.
- Remove a player with the × button, or reset all stats with one click.

## Getting Started

```bash
cd basketball
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

## Production-style run

The repo ships with a small Express server that serves the built SPA and
exposes `/health`. It's used by the Dockerfile and Cloud Run deployment.

```bash
npm run build:all
npm start
# open http://localhost:8080
```

During development you can run the server against the last Vite build with
`npm run dev:server`.

## Stack

React 18, TypeScript, Vite, Express 5, Docker, GCP Cloud Run.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full instructions on deploying to GCP
Cloud Run (automated via GitHub Actions release tags `basketball/v*`) or
GCP Compute Engine, plus notes on running on other cloud providers.
