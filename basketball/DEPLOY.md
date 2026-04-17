# Deployment Guide

The Basketball Stats Tracker is a pure client-side React SPA — no
backend, no API calls, no env secrets. It can be hosted as a plain
static site. These instructions cover **GitHub Pages**, which is the
recommended (and free) default.

## Architecture Notes for Static Hosting

- The app uses `localStorage` for persistence and the `storage` event
  for cross-tab sync. Both are browser-only features — the server just
  serves the bundle.
- `vite.config.ts` sets `base: './'`, so the built bundle references
  assets with relative paths. The same `dist/` works at the repo root,
  a subpath (`/ai-playground/`), a custom domain, or `file://`.
- Because there's no server-side routing, any static host is fine:
  GitHub Pages, Netlify, Cloudflare Pages, S3 + CloudFront, Firebase
  Hosting, etc.

## Deploying via GitHub Pages (Automated)

The workflow `.github/workflows/basketball-pages.yml` builds the app
and publishes `basketball/dist/` to GitHub Pages on every push to
`main` that touches `basketball/**`. It can also be run manually from
the Actions tab ("Run workflow").

### One-Time Repository Setup

1. Push the code (including the workflow) to `main`.
2. Go to **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
   (This replaces the older "Deploy from a branch" setting.)
4. That's it — no branch to pick, no folder to pick. The workflow
   handles uploading and deploying the artifact.

### First Deploy

- Merge/push the workflow to `main`, **or** trigger it manually: go
  to **Actions → Basketball Pages Deploy → Run workflow**.
- When the `deploy` job finishes, the Actions run page shows the
  live URL. For this repo it will be:

  ```
  https://<your-github-username>.github.io/<repo-name>/
  ```

  e.g. `https://heisencoder.github.io/ai-playground/`.

### Required Permissions

The workflow already declares everything it needs:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

No repository secrets or variables are required — GitHub Pages
deployments from Actions use short-lived OIDC tokens automatically.

### What Gets Deployed

Because this repo contains multiple projects (polyarb,
stock-gift-value, etc.), the Pages workflow here publishes **only the
basketball app's `dist/`** as the entire Pages site. If you later want
to publish another app to the same Pages site, you have two options:

1. **Subpaths under one artifact.** Change the workflow to build each
   app into a staging directory, e.g. `_site/basketball/` and
   `_site/other-app/`, then upload `_site` as the Pages artifact. Each
   app's `vite.config.ts` already uses `base: './'`, so no rebuild
   tweaks are needed.
2. **Separate Pages deployments per app with a custom domain or
   different repos.** Only one Pages site per repository.

## Manual Build + Host Elsewhere

```bash
cd basketball
npm ci
npm run build
# Upload the contents of basketball/dist to any static host.
```

Because of `base: './'`, the bundle works under any URL or subpath.
Examples:

- **Netlify / Cloudflare Pages / Vercel** — connect the repo, set the
  build command to `npm run build` with base directory `basketball`
  and publish directory `basketball/dist`.
- **S3 + CloudFront** — `aws s3 sync dist/ s3://your-bucket/` and set
  the default root object to `index.html`.
- **Firebase Hosting** — `firebase deploy --only hosting` with
  `"public": "basketball/dist"` in `firebase.json`.
- **Any web server** — serve the files; because routing is fully
  client-side for this app (there is no router with deep links), no
  SPA-fallback rewrite rule is needed.

## Local Verification

```bash
cd basketball
npm run build
npm run preview
# opens http://localhost:4173 by default
```

This serves the exact same `dist/` that gets deployed. Use this to
sanity-check asset paths before pushing.
