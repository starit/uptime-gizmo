#!/bin/sh
# Copy the page and the few brand assets it uses. The site folder holds no
# duplicates; GitHub Pages is served from the output directory.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
out="$root/site/dist"

if [ "$#" -ne 0 ]; then
    echo "usage: sh site/build.sh" >&2
    exit 2
fi

rm -rf "$out"
mkdir -p "$out/images" "$out/zh"

cp "$root/site/index.html" "$root/site/styles.css" "$root/site/site.js" "$root/site/robots.txt" "$root/site/sitemap.xml" "$root/site/llms.txt" "$out/"
cp "$root/site/zh/index.html" "$out/zh/"
cp "$root/public/favicon-dark-32x32.png" "$out/favicon.png"
cp "$root/public/images/uptime-gizmo-logo-horizontal-on-dark.png" "$out/images/logo.png"
cp "$root/public/images/gizmo-mascot-engineer-cutout.webp" "$out/images/mascot.webp"
cp "$root/public/images/uptime-gizmo-mark-dark.png" "$out/images/og.png"
cp "$root/docs/wiki/images/dashboard-light.png" "$out/images/dashboard.png"
