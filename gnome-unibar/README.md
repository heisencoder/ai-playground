# Unibar

A GNOME Shell 46 extension that moves the top bar to the bottom of the primary
monitor. Targeted at Ubuntu 24.04 LTS (GNOME 46), which is the shell version
shipped with that release.

- **UUID:** `unibar@heisencoder.net`
- **GNOME Shell:** 46
- **License:** GPL-2.0-or-later

## Quick start

```bash
# Install into ~/.local/share/gnome-shell/extensions and enable it
npm run install:local

# After install, reload the shell:
#   Xorg:    Alt+F2, then type `r`, then Enter
#   Wayland: log out and back in
```

To disable or remove the extension:

```bash
gnome-extensions disable unibar@heisencoder.net
gnome-extensions uninstall unibar@heisencoder.net
```

## Project layout

```
├── src/                     # Files shipped inside the extension .zip
│   ├── extension.js         # GNOME Shell entry point (enable/disable)
│   ├── lib/
│   │   └── panelPositioner.js   # Pure, unit-tested core logic
│   ├── metadata.json        # GNOME extension manifest
│   └── stylesheet.css
├── test/                    # Node test runner specs + mock helpers
├── scripts/
│   ├── install.sh           # Copy src/ into the user's extensions dir
│   └── pack.sh              # Build dist/<uuid>.zip for distribution
├── .github/workflows/ci.yml # Lint + format + coverage gate
├── eslint.config.js         # ESLint flat config
├── .prettierrc.json         # Formatter config
├── .c8rc.json               # Coverage thresholds (>= 90% all metrics)
└── package.json
```

The entry point `src/extension.js` is intentionally thin — it wires the live
GNOME Shell objects (`Main.layoutManager`, `Main.layoutManager.panelBox`) into
`PanelPositioner`, which holds all of the real logic. That split is what makes
the extension unit-testable outside of a live shell: the positioner takes its
collaborators by dependency injection, so the tests drop in plain JavaScript
mocks of the signal-emitting actors.

## Development

Node.js 22+ is required (uses the built-in test runner).

```bash
npm install            # one-time: install dev dependencies

npm run lint           # ESLint
npm run format:check   # Prettier (use `npm run format` to auto-fix)
npm test               # node --test, spec reporter
npm run test:coverage  # c8 + coverage gate (fails below 90% on any metric)
npm run check          # lint + format:check + test:coverage, in sequence
```

### Packaging

```bash
npm run pack           # writes dist/unibar@heisencoder.net.zip
gnome-extensions install --force dist/unibar@heisencoder.net.zip
```

## Testing strategy

`src/lib/panelPositioner.js` is the unit of isolation for tests. It receives
every GNOME dependency through its constructor, so the suite in
`test/panelPositioner.test.js` exercises every code path — including signal
reconnection across monitor changes, idempotent enable/disable, and graceful
cleanup when a destroyed actor's `disconnect()` throws — against plain mock
objects in `test/helpers/mocks.js`.

`src/extension.js` is excluded from the coverage gate because it imports from
`resource:///org/gnome/shell/...`, URIs that only resolve inside a live shell.
Its behavior is a one-liner around the fully-covered positioner; holding it to
the same gate would force a fake-import shim without adding real signal.

Current coverage on the gated module:

| Statements | Branches | Functions | Lines |
| ---------- | -------- | --------- | ----- |
| 100%       | 100%     | 100%      | 100%  |

## Continuous integration

`.github/workflows/gnome-unibar-ci.yml` runs on every push and PR to `main` on
Node 22 on `ubuntu-24.04`:

1. `npm ci`
2. `npm run lint`
3. `npm run format:check`
4. `npm run test:coverage` (enforces the 90% coverage floor)
5. Packages the extension bundle and uploads it as a build artifact.

Any failure blocks the workflow; there are no warn-only steps.

## Migrating to GitHub

```bash
gh repo create gnome-unibar --public --source=. --remote=origin --push
```

The CI workflow, `.gitignore`, `LICENSE`, and `README.md` are already in place;
no further setup is required for green builds on a fresh repo.
