# Deployment Guide

The Basketball Stats Tracker is a pure client-side React SPA — no
backend, no API calls, no env secrets. It's published to GitHub Pages
as part of the repository's single Pages site.

## Where This App Lives

The repository serves one GitHub Pages site that combines a top-level
table of contents with each static app under its own subpath:

```
https://heisencoder.github.io/ai-playground/              -> site/index.html
https://heisencoder.github.io/ai-playground/basketball/   -> basketball/dist/
```

The assembly logic lives in
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) at the
repository root.

## Architecture Notes for Static Hosting

- The app uses `localStorage` for persistence and the `storage` event
  for cross-tab sync. Both are browser-only — the host just serves
  the bundle.
- `vite.config.ts` sets `base: './'`, so the bundle references assets
  with URL-relative paths. The same `dist/` works at `/basketball/`,
  the repo root, a custom domain, or `file://`.
- There is no client-side routing, so no SPA-fallback rewrite is
  needed on the host.

## Deploying via GitHub Pages (Automated)

The workflow `.github/workflows/pages.yml` rebuilds and redeploys the
whole Pages site whenever `main` receives a push that touches
`site/**`, `basketball/**`, or the workflow itself. It can also be
triggered manually from the Actions tab.

### One-Time Repository Setup

1. Push the code (including the workflow) to `main`.
2. Go to **Settings → Pages** in the GitHub repository.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Done. No branch to pick, no secrets required — GitHub Pages
   deployments from Actions use short-lived OIDC tokens.

### First Deploy

Push the workflow to `main`, or trigger **Actions → Pages Deploy →
Run workflow**. The `deploy` job prints the live URL when it
finishes.

## Adding Another Static App to the Same Pages Site

The workflow is deliberately linear and explicit. To publish another
app (say `foo/`):

1. Ensure the app builds to a `dist/` directory and its build tool
   uses URL-relative asset paths. For Vite: `base: './'`.
2. Edit `.github/workflows/pages.yml`:
   - Add `foo/package-lock.json` to the `cache-dependency-path` list.
   - Add a Build step:
     ```yaml
     - name: Build foo
       working-directory: ./foo
       run: |
         npm ci
         npm run build
     ```
   - In the **Assemble site** step, add:
     ```bash
     mkdir -p _site/foo
     cp -r foo/dist/. _site/foo/
     ```
   - Add `foo/**` to the top-level `paths:` filter so changes to
     that app trigger a deploy.
3. Add a new `<li>` linking to `./foo/` in `site/index.html`.

No other changes needed.

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

## Local Verification

```bash
cd basketball
npm run build
npm run preview
# opens http://localhost:4173 by default
```

This serves the same `dist/` that gets uploaded to Pages. Use it to
check asset paths before pushing.
