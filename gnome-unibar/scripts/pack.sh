#!/usr/bin/env bash
# Build a GNOME Shell extension .zip from the src/ tree.
# The resulting bundle in dist/ can be installed with:
#   gnome-extensions install --force dist/unibar@heisencoder.net.zip

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${ROOT_DIR}/src"
DIST_DIR="${ROOT_DIR}/dist"

if [[ ! -d "${SRC_DIR}" ]]; then
  echo "error: expected source tree at ${SRC_DIR}" >&2
  exit 1
fi

UUID="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).uuid)' "${SRC_DIR}/metadata.json")"
if [[ -z "${UUID}" ]]; then
  echo "error: failed to read uuid from src/metadata.json" >&2
  exit 1
fi

BUNDLE="${DIST_DIR}/${UUID}.zip"

mkdir -p "${DIST_DIR}"
rm -f "${BUNDLE}"

(
  cd "${SRC_DIR}"
  zip -qr "${BUNDLE}" . -x '*.DS_Store'
)

echo "Built ${BUNDLE}"
