#!/usr/bin/env bash
# Install the extension into the current user's GNOME Shell extension directory
# and (optionally) enable it. Intended for local development on Ubuntu 24.04.

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${ROOT_DIR}/src"

UUID="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).uuid)' "${SRC_DIR}/metadata.json")"
TARGET_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

echo "Installing ${UUID} -> ${TARGET_DIR}"
rm -rf "${TARGET_DIR}"
mkdir -p "${TARGET_DIR}"
cp -R "${SRC_DIR}/." "${TARGET_DIR}/"

if command -v gnome-extensions >/dev/null 2>&1; then
  echo "Enabling ${UUID}"
  gnome-extensions enable "${UUID}" || true
else
  echo "gnome-extensions CLI not found; skipping enable."
fi

cat <<EOF

Installed. On Xorg, press Alt+F2 then type "r" to reload GNOME Shell.
On Wayland, log out and back in for the new extension to load.
EOF
