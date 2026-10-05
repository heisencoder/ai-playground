# QR Code Generator

A simple React web app that turns any URL or text into a QR code, live as
you type.

## Features

- Live preview: the QR code updates instantly while you type.
- URL validation by default, or flip a switch to allow free-form text.
- Choose the output size (128 / 256 / 512 / 1024 px); the QR version
  auto-fits the data.
- Download the result as PNG or SVG.
- No backend — the whole app is static.

## Getting Started

```bash
cd qrcode
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

## Test

```bash
npm test
```

## Build and Preview

```bash
npm run build
npm run preview   # serves the built dist/ at http://localhost:4173
```

## Stack

React 18, TypeScript, Vite, and the `qrcode` library. Tested with Vitest
and Testing Library.

## Deployment

The app is built to be hosted as a static site, and this repo publishes it
to GitHub Pages under `/qrcode/` alongside the other apps.
