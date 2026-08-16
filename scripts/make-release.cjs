// make-release.cjs — creates the v1.3.2 release (fixed portable web zip).
const fs = require('fs');
const token = require('../server/.vox-keys.json').github;
const OWNER = 'al13n-x-v0x';
const REPO = 'v0x-0s';
const AUTH = { Authorization: 'Bearer ' + token };

const body = [
  '# VOX-OS v1.3.2 — Portable web bundle fixed 📦',
  '',
  'The futuristic developer OS command center. Real apps, real system control, real AI — on **Windows (EXE)**, **Android (APK)**, **Raspberry Pi (image)**, and in any browser.',
  '',
  '## 🆕 What’s new in v1.3.2',
  '',
  '- **Portable web bundle fixed** — `vox-os-web.zip` now ships the **full self-host bundle**: `dist/` + `server/` + `agent/` + the `ws` runtime dep + a `type:module` manifest. Previously it contained only the static site, so the bootable ISO kiosk / Raspberry Pi image / on-device installer booted a shell with no backend, no Desktop Agent, no AI proxy.',
  '- **Raspberry Pi image** — new `VOX-OS-pi-arm64.img` (built from Raspberry Pi OS Desktop via GitHub Actions) in the [v0x-0s-iso](https://github.com/al13n-x-v0x/v0x-0s-iso) repo, plus a one-command `setup-pi.sh` for a Pi you already have.',
  '',
  '## 🆕 In v1.3.1',
  '',
  '- **© Copyright protection** — VOX-OS Source License (© 2026 AL13N Industries, All Rights Reserved). Study it for **inspiration**; copying, redistribution, repackaging and commercial use are prohibited without written permission.',
  '- **Build hardening** — every production JS chunk is obfuscated + carries a copyright banner; source maps stripped.',
  '',
  '## 🆕 In v1.3.0',
  '',
  '- **Real disk files** through the Desktop Agent — Code Studio + File Manager read/write `~/VOX-OS/projects/…` (path-traversal-guarded, 2MB cap)',
  '- **Pairing session expiry** (24h TTL) + **one-tap revocation** that kills all connected phones instantly',
  '- **EXE first-run** auto-opens the Phone Pairing screen',
  '',
  '## 🆕 In v1.2.0',
  '',
  '- **LAN Phone Pairing** — scan once, control the laptop over Wi-Fi (agent bridge, token-gated, agent token never leaves the PC)',
  '- **voxos:// deep links** — the app QR opens the APK straight into remote-control mode',
  '- **Dev Toolkit** — freebuff / codebuff / Gemini CLI install cards + live terminal actions',
  '',
  '## 📦 Downloads',
  '',
  '| Asset | What it is |',
  '| ----- | ---------- |',
  '| `VOX-OS-Windows.exe` | Portable Windows app — full OS + Desktop Agent + pairing screen (unchanged from v1.3.1) |',
  '| `VOX-OS.apk` | Debug Android build (unchanged from v1.3.1) |',
  '| `VOX-OS-release.apk` | Signed Android release build (unchanged from v1.3.1) |',
  '| `vox-os-web.zip` | **Fixed** portable web bundle — full backend + agent for ISO / Pi / self-host |',
  '',
  '## 🔑 Setup',
  '',
  '1. Open the EXE (or `npm run dev`) — on first launch it opens **Phone Pairing** automatically',
  '2. Scan the QR with your phone to control the laptop from the LAN',
  '3. Start the **Desktop Agent** to arm real telemetry, shell sessions, and **real disk files**',
  '4. Add any AI key in **API Manager** (Groq / Gemini / OpenAI / Anthropic) + your GitHub PAT',
  '',
  '## 🧰 Built for',
  '',
  '- **Developers** — Code Studio on real disk, terminal, Git, AI agents, Dev Toolkit',
  '- **Gamers** — GX Browser, boost profiles, system tuning',
  '- **Power users** — Windows system apps, V0X-ST0RE, My Apps, full remote control',
  '- **Pi / homelab** — flash the image or run `setup-pi.sh` and VOX-OS becomes a LAN appliance',
  '',
  'Security: pairing tokens expire (24h), revoke instantly, and the agent FS never leaves `~/VOX-OS`.',
  '',
  '> **AL13N Industries** · “Powerful under the hood. Simple on the surface.”',
].join('\n');

async function api(path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: opts.method || 'GET',
    headers: { ...AUTH, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${path} → HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  return res.json();
}

async function upload(url, file) {
  const buf = fs.readFileSync(file);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: AUTH.Authorization, 'Content-Type': 'application/octet-stream', 'Content-Length': String(buf.length) },
    body: buf,
  });
  if (!res.ok) throw new Error(`Upload ${file} → HTTP ${res.status}`);
  return res.json();
}

(async () => {
  const tag = 'v1.3.2';
  // The portable web bundle is the point of this release — build it first.
  require('child_process').execFileSync(process.execPath, [require('path').join(__dirname, 'make-web-zip.cjs')], { stdio: 'inherit' });
  // delete the tag+release if it exists (idempotent reruns)
  try {
    const rel = await api(`/repos/${OWNER}/${REPO}/releases/tags/${tag}`);
    await api(`/repos/${OWNER}/${REPO}/releases/${rel.id}`, { method: 'DELETE' });
  } catch { /* first run */ }
  try { await api(`/repos/${OWNER}/${REPO}/git/refs/tags/${tag}`, { method: 'DELETE' }); } catch { /* first run */ }

  const ref = await api(`/repos/${OWNER}/${REPO}/git/ref/heads/main`);
  await api(`/repos/${OWNER}/${REPO}/git/refs`, {
    method: 'POST',
    body: { ref: `refs/tags/${tag}`, sha: ref.object.sha },
  });

  const release = await api(`/repos/${OWNER}/${REPO}/releases`, {
    method: 'POST',
    body: { tag_name: tag, name: `VOX-OS ${tag}`, body, draft: false, prerelease: false },
  });
  console.log('release created:', release.html_url);

  // v1.3.2 ships the fixed web zip; the EXE/APKs are byte-identical to v1.3.1
  // and live in the v1.3.1 release, so only the web zip is uploaded here.
  const assets = [['vox-os-web.zip', 'application/zip']];
  for (const [file, ct] of assets) {
    if (!fs.existsSync(file)) { console.log('SKIP (missing):', file); continue; }
    const asset = await upload(release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(file)}`), file);
    console.log('uploaded:', asset.name, `(${(fs.statSync(file).size / 1024 / 1024).toFixed(1)} MB)`);
  }
  console.log('DONE —', release.html_url);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
