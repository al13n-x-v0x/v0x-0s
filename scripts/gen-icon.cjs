// Generates public/vox.png (256px) + public/vox.ico from raw pixels.
// Simple VOX logo: dark rounded square, cyan→violet hexagonal core, white V.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const S = 256;

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- pixel shader ----
const px = Buffer.alloc(S * S * 4);
function inHex(x, y, cx, cy, r) {
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  return dx <= r * 0.866 && dy <= r * 0.5 && (r * 0.5 - dx) * 0.866 <= dy === false ? false : dx <= r * 0.866 && dy <= r * 0.5 && dy <= (r * 0.5) + (r - (r * 0.5)) && (dy >= r * 0.5 - (r * 0.5 - dx) * 1.732 || dx > r * 0.433);
}

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    // rounded-square background
    const r = 46;
    const dxx = Math.max(r - x, x - (S - 1 - r), 0);
    const dyy = Math.max(r - y, y - (S - 1 - r), 0);
    const dist = Math.sqrt(dxx * dxx + dyy * dyy);
    const bg = dist <= r ? 1 : Math.max(0, 1 - (dist - r));
    // base dark
    let R = 5 * bg, G = 6 * bg, B = 10 * bg, A = 255;
    // hexagon core (pointy-top)
    const cx = S / 2, cy = S / 2, hx = 64;
    const hx0 = Math.abs(x - cx) / hx;
    const hy0 = Math.abs(y - cy) / (hx * 0.866);
    const inHexCore = hx0 <= 1 && hy0 <= 1 && hx0 + hy0 * 0.5 <= 1 && hx0 + hy0 <= 1.5;
    if (inHexCore) {
      // vertical cyan→violet gradient
      const t = (y - cy + hx) / (2 * hx);
      const c1 = [34, 211, 238], c2 = [139, 92, 246];
      R = c1[0] + (c2[0] - c1[0]) * t;
      G = c1[1] + (c2[1] - c1[1]) * t;
      B = c1[2] + (c2[2] - c1[2]) * t;
    }
    // white "V" mark
    const vy = (y - cy) / 40;
    if (vy >= -1 && vy <= 1) {
      const half = 1 - Math.abs(vy) * 0.9;
      const vx = Math.abs(x - cx) / 34;
      if (vx <= half && vy >= -0.05) { R = 245; G = 250; B = 255; }
    }
    px[i] = Math.round(R);
    px[i + 1] = Math.round(G);
    px[i + 2] = Math.round(B);
    px[i + 3] = Math.round(A * bg);
  }
}

const png = encodePng(S, S, px);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'vox.png'), png);
console.log('vox.png', png.length, 'bytes');

// ICO wrapper (embeds the PNG for the 256x256 entry — supported on Win Vista+)
const ico = Buffer.alloc(6 + 16);
ico.writeUInt16LE(0, 0); // reserved
ico.writeUInt16LE(1, 2); // type: icon
ico.writeUInt16LE(1, 4); // count
ico.writeUInt8(0, 6);    // width (0 = 256)
ico.writeUInt8(0, 7);    // height
ico.writeUInt8(0, 8);    // colors
ico.writeUInt8(0, 9);    // reserved
ico.writeUInt16LE(1, 10); // planes
ico.writeUInt16LE(32, 12); // bpp
ico.writeUInt32LE(png.length, 14); // size
ico.writeUInt32LE(22, 18); // offset
fs.writeFileSync(path.join(__dirname, '..', 'public', 'vox.ico'), Buffer.concat([ico, png]));
console.log('vox.ico written');
