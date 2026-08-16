// make-web-zip.cjs — assembles the portable VOX-OS web bundle.
//
// The "web zip" is what the bootable ISO kiosk, the Raspberry Pi image and the
// on-device installer fetch from GitHub releases. It must be a REAL self-host
// bundle: static site (dist/) + backend (server/) + Desktop Agent (agent/) +
// the one runtime dep the server/agent need (ws) + a type:module package.json.
//
// Secrets are never included (server/.vox-keys.json, .vox-pair.json).
//
// Usage:  node scripts/make-web-zip.cjs [out.zip]
// Output defaults to ./vox-os-web.zip (release asset).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'vox-os-web.zip');
const VERSION = require('../package.json').version;

// --- 1. stage ---------------------------------------------------------------
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'voxos-web-'));
try {
  for (const dir of ['dist', 'server', 'agent']) {
    fs.cpSync(path.join(ROOT, dir), path.join(stage, dir), { recursive: true });
  }
  // server + agent only need `ws` at runtime (both are dependency-free ESM
  // otherwise). Ship the exact version from the repo lockfile.
  fs.mkdirSync(path.join(stage, 'node_modules'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'node_modules', 'ws'), path.join(stage, 'node_modules', 'ws'), { recursive: true });
  // type:module is REQUIRED — server/index.js and agent/index.js are ESM and
  // Node resolves "type" from the nearest package.json walking up.
  fs.writeFileSync(
    path.join(stage, 'package.json'),
    JSON.stringify(
      { name: 'vox-os-web', version: VERSION, private: true, type: 'module', dependencies: { ws: require('../node_modules/ws/package.json').version } },
      null,
      2,
    ),
  );
  // never ship real secrets
  for (const f of ['.vox-keys.json', '.vox-pair.json']) {
    fs.rmSync(path.join(stage, 'server', f), { force: true });
  }

  // --- 2. zip ----------------------------------------------------------------
  fs.rmSync(OUT, { force: true });
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-a', '-c', '-f', OUT, '-C', stage, '.'], { stdio: 'inherit' });

  // --- 3. verify ---------------------------------------------------------------
  const listing = execFileSync(tar, ['-tf', OUT], { encoding: 'utf8' });
  const required = ['./server/index.js', './agent/index.js', './node_modules/ws/index.js', './package.json', './dist/index.html'];
  const missing = required.filter((r) => !listing.includes(r));
  if (missing.length) throw new Error('web zip missing required entries: ' + missing.join(', '));
  if (listing.includes('.vox-keys.json') || listing.includes('.vox-pair.json')) throw new Error('web zip contains secrets — aborting');

  console.log('web zip →', OUT, `(${(fs.statSync(OUT).size / 1024 / 1024).toFixed(1)} MB, v${VERSION})`);
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
