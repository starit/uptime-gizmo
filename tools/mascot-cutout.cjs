/*
 * Turn the mascot's white studio background into transparency.
 *
 *   node tools/mascot-cutout.cjs public/images/gizmo-mascot-engineer.png out.png
 *
 * Then resize and encode:
 *   sips -Z 448 out.png --out m448.png
 *   cwebp -q 88 -alpha_q 92 m448.png -o public/images/gizmo-mascot-engineer-cutout.webp
 *
 * Kept in the repository because the committed .webp is otherwise unreproducible,
 * and because the seed coordinates below are tied to this one piece of art: point
 * it at different source art and they will need to be found again.
 *
 * A global white key is wrong here — the character's shirt is cream and would be
 * eaten along with the backdrop. So the background is found by flooding inward
 * from the border, which only reaches white that is actually connected to the
 * outside. Alpha then comes from how white each reached pixel is, so the soft
 * drop shadow fades out instead of leaving a cut-out edge.
 */
const fs = require("fs");
const zlib = require("zlib");

const src = fs.readFileSync(process.argv[2]);
let pos = 8;
let ihdr = null;
const idat = [];
while (pos < src.length) {
    const len = src.readUInt32BE(pos);
    const type = src.toString("ascii", pos + 4, pos + 8);
    const data = src.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { ihdr = data; }
    if (type === "IDAT") { idat.push(data); }
    pos += 12 + len;
}
const W = ihdr.readUInt32BE(0), H = ihdr.readUInt32BE(4);
const depth = ihdr[8], colour = ihdr[9], interlace = ihdr[12];
if (depth !== 8 || colour !== 2 || interlace !== 0) {
    throw new Error(`unhandled PNG: depth=${depth} colour=${colour} interlace=${interlace}`);
}

const raw = zlib.inflateSync(Buffer.concat(idat));
const BPP = 3, stride = W * BPP;
const rgb = Buffer.alloc(H * stride);
for (let y = 0; y < H; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
        const a = x >= BPP ? rgb[y * stride + x - BPP] : 0;
        const b = y > 0 ? rgb[(y - 1) * stride + x] : 0;
        const c = x >= BPP && y > 0 ? rgb[(y - 1) * stride + x - BPP] : 0;
        let v = line[x];
        if (filter === 1) { v += a; }
        else if (filter === 2) { v += b; }
        else if (filter === 3) { v += (a + b) >> 1; }
        else if (filter === 4) {
            const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
            v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        }
        rgb[y * stride + x] = v & 0xff;
    }
}

/*
 * Flood from the border over pixels light enough to be backdrop.
 *
 * The threshold has to clear the backdrop (250 and up) without admitting the
 * character's cream shirt, whose darkest channel sits around 207. At 200 the
 * flood leaked in through the bright edge of a sleeve and ate its way across the
 * whole shirt, which showed up as torn holes once the image was placed on a dark
 * page. Anything the tighter bound leaves behind at the silhouette is recovered
 * by the feather below.
 */
const FLOOD = 240;
const bg = new Uint8Array(W * H);
const stack = [];
const push = (x, y) => {
    const i = y * W + x;
    if (bg[i]) { return; }
    const o = i * 3;
    if (Math.min(rgb[o], rgb[o + 1], rgb[o + 2]) < FLOOD) { return; }
    bg[i] = 1; stack.push(i);
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) { push(x - 1, y); }
    if (x < W - 1) { push(x + 1, y); }
    if (y > 0) { push(x, y - 1); }
    if (y < H - 1) { push(x, y + 1); }
}

/*
 * The flood above only reaches backdrop connected to the border, so white
 * enclosed by the character — the gap between his legs, the gap under his bent
 * arm — stayed opaque. Invisible on a white page, a bright blob on a dark one.
 *
 * These are cleared from named seed points rather than by a rule. Every rule
 * tried here also matched the specular highlights on his cream sleeve, which are
 * just as bright and just as neutral as the backdrop, and punching those out
 * tore holes in the shirt. Colour cannot separate the two and neither can the
 * contrast across their boundary; what separates them is knowing which is which.
 * With one image to process, saying so directly is more honest than a threshold
 * tuned until this one file happens to come out right.
 */
const POCKETS = [ [ 627, 899 ], [ 506, 725 ] ];
for (const [ sx, sy ] of POCKETS) {
    const seed = sy * W + sx;
    if (bg[seed]) { continue; }
    const queue = [ seed ];
    bg[seed] = 1;
    let n = 0;
    while (queue.length) {
        const i = queue.pop(), x = i % W, y = (i / W) | 0;
        n++;
        for (const [ dx, dy ] of [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) { continue; }
            const j = ny * W + nx;
            if (bg[j]) { continue; }
            const o = j * 3;
            if (Math.min(rgb[o], rgb[o + 1], rgb[o + 2]) < FLOOD) { continue; }
            bg[j] = 1;
            queue.push(j);
        }
    }
    console.log(`pocket at ${sx},${sy}: ${n} px`);
}

/*
 * The contact shadow on the ground.
 *
 * It is painted as light grey, which only reads as a shadow because the backdrop
 * behind it is white. Over a dark page the same pixels are a pale smear under his
 * boots, and no opacity setting fixes that: a shadow has to darken what is behind
 * it, and this one can only lighten. So it is removed outright, and the page adds
 * its own shadow in CSS, in whatever colour the theme calls for.
 *
 * Confined to the rows below the boots and to neutral greys, which is what keeps
 * it clear of the boots themselves — those are warm brown, roughly fifty apart
 * across their channels, and their black soles are far below the lightness bound.
 */
const SHADOW_TOP = 1020, SHADOW_MIN = 150, SHADOW_SPREAD = 18;
const shadow = new Uint8Array(W * H);
const shadowQueue = [];
for (let y = SHADOW_TOP; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (bg[i]) { shadowQueue.push(i); }
    }
}
while (shadowQueue.length) {
    const i = shadowQueue.pop(), x = i % W, y = (i / W) | 0;
    for (const [ dx, dy ] of [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < SHADOW_TOP || nx >= W || ny >= H) { continue; }
        const j = ny * W + nx;
        if (bg[j] || shadow[j]) { continue; }
        const o = j * 3;
        const lo = Math.min(rgb[o], rgb[o + 1], rgb[o + 2]);
        const hi = Math.max(rgb[o], rgb[o + 1], rgb[o + 2]);
        if (lo < SHADOW_MIN || hi - lo > SHADOW_SPREAD) { continue; }
        shadow[j] = 1;
        shadowQueue.push(j);
    }
}
let shadowPixels = 0;
for (let i = 0; i < W * H; i++) {
    if (shadow[i]) { bg[i] = 1; shadowPixels++; }
}
console.log(`contact shadow removed: ${shadowPixels} px`);

/*
 * A tight flood stops short of the anti-aliased rim, leaving a pale outline. So
 * pixels touching the backdrop are pulled in too, but only where they are near
 * white and neutral like the backdrop is — the shirt is warm enough (a spread of
 * about 30 between its channels) to be left alone.
 */
const FEATHER_SPREAD = 8, FEATHER_MIN = 215;
for (let pass = 0; pass < 2; pass++) {
    const add = [];
    for (let i = 0; i < W * H; i++) {
        if (bg[i]) { continue; }
        const o = i * 3;
        const lo = Math.min(rgb[o], rgb[o + 1], rgb[o + 2]);
        const hi = Math.max(rgb[o], rgb[o + 1], rgb[o + 2]);
        if (lo < FEATHER_MIN || hi - lo > FEATHER_SPREAD) { continue; }
        const x = i % W, y = (i / W) | 0;
        const touches =
            (x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) ||
            (y > 0 && bg[i - W]) || (y < H - 1 && bg[i + W]);
        if (touches) { add.push(i); }
    }
    for (const i of add) { bg[i] = 1; }
}

const out = Buffer.alloc(H * (W * 4 + 1));
let cleared = 0;
for (let y = 0; y < H; y++) {
    out[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
        const i = y * W + x, o = i * 3, d = y * (W * 4 + 1) + 1 + x * 4;
        out[d] = rgb[o]; out[d + 1] = rgb[o + 1]; out[d + 2] = rgb[o + 2];
        if (!bg[i]) { out[d + 3] = 255; continue; }
        if (shadow[i]) { out[d + 3] = 0; continue; }
        // Reached from outside: alpha from distance to white, so the shadow fades.
        const w = Math.min(rgb[o], rgb[o + 1], rgb[o + 2]);
        out[d + 3] = Math.max(0, Math.min(255, 255 - w));
        if (w >= 250) { cleared++; }
    }
}

const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([ Buffer.from(type, "ascii"), data ]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(body) >>> 0 : crc32(body) >>> 0);
    return Buffer.concat([ len, body, crc ]);
};
function crc32(buf) {
    let c, crc = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
        c = (crc ^ buf[n]) & 0xff;
        for (let k = 0; k < 8; k++) { c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; }
        crc = c ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
const newIhdr = Buffer.from(ihdr); newIhdr[9] = 6;
fs.writeFileSync(process.argv[3], Buffer.concat([
    src.subarray(0, 8),
    chunk("IHDR", newIhdr),
    chunk("IDAT", zlib.deflateSync(out, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
]));
console.log(`${W}x${H}, background pixels made transparent: ${cleared} (${(cleared / (W * H) * 100).toFixed(1)}%)`);
