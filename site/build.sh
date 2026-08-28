#!/bin/sh
# Copy the page and the few brand assets it uses. The site folder holds no
# duplicates; GitHub Pages is served from the output directory.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
out="${1:-$root/site/dist}"

rm -rf "$out"
mkdir -p "$out/images"

cp "$root/site/index.html" "$root/site/styles.css" "$out/"
cp "$root/public/favicon-dark-32x32.png" "$out/favicon.png"
cp "$root/public/images/uptime-gizmo-logo-horizontal-on-dark.png" "$out/images/logo.png"
cp "$root/public/images/gizmo-mascot-engineer-cutout.webp" "$out/images/mascot.webp"
cp "$root/docs/wiki/images/dashboard-light.png" "$out/images/dashboard.png"
