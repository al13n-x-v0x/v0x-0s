// harden-build.cjs — post-build hardening for VOX-OS distributables.
// 1. Injects the AL13N Industries copyright banner into every JS chunk.
// 2. Obfuscates the production bundle so the shipped app can't be trivially
//    copied or reverse-engineered. (Browser JS can't be truly encrypted — the
//    runtime must execute it — so obfuscation + license is the standard defense.)
// 3. Drops source maps (they would defeat the obfuscation).
// Idempotent: skips chunks that already carry the banner.
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const BANNER = '/*! VOX-OS (c) 2026 AL13N Industries — All rights reserved. Redistribution, copying and reverse engineering prohibited. Inspired-by attribution: "Inspired by VOX-OS (c) AL13N Industries — vox-os.dev" */\n';
const MARKER = 'VOX-OS (c) 2026 AL13N Industries';

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: false,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false, // avoid runtime traps that can break legitimate execution
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.6,
  unicodeEscapeSequence: false,
};

const distDir = path.join(__dirname, '..', 'dist', 'assets');
if (!fs.existsSync(distDir)) {
  console.error('dist/assets not found — run `npm run build` first.');
  process.exit(1);
}

let obfuscated = 0, skipped = 0;
for (const name of fs.readdirSync(distDir)) {
  if (!name.endsWith('.js')) continue;
  const file = path.join(distDir, name);
  let code = fs.readFileSync(file, 'utf8');

  if (code.includes(MARKER)) { skipped++; continue; }

  const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS);
  code = BANNER + result.getObfuscatedCode();
  fs.writeFileSync(file, code, 'utf8');
  obfuscated++;
  console.log(`  hardened ${name} → ${(fs.statSync(file).size / 1024).toFixed(0)} kB`);
}

// drop source maps — they would expose the original bundle
for (const name of fs.readdirSync(distDir)) {
  if (name.endsWith('.map')) fs.unlinkSync(path.join(distDir, name));
}

console.log(`harden-build: ${obfuscated} obfuscated, ${skipped} already hardened, source maps removed.`);
