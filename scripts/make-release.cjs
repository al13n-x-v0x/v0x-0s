// make-release.cjs — creates the v1.3.0 release and uploads EXE + APKs + web zip.
const fs = require('fs');
const token = require('../server/.vox-keys.json').github;
const OWNER = 'al13n-x-v0x';
const REPO = 'v0x-0s';
const AUTH = { Authorization: 'Bearer ' + token };

const body = [
  '# VOX-OS v1.3.0 — Real Disk Files + Secure Pairing Sessions 🖥️📱💾',
  '',
  'The futuristic developer OS command center. Real apps, real system control, real AI — on **Windows (EXE)**, **Android (APK)**, and in any browser.',
  '',
  '## 🆕 What’s new in v1.3.0',
  '',
  '- **Real disk files through the Desktop Agent** — Code Studio and File Manager now read and write **actual files on disk** (`~/VOX-OS/projects/…`), not just the in-memory sandbox. Projects auto-sync on agent connect; every save / create / rename / delete lands on the real filesystem. The sandbox stays as the offline fallback.',
  '- **Agent FILES protocol** — new `fs_read / fs_write / fs_list / fs_mkdir / fs_delete / fs_rename` handlers rooted at `~/VOX-OS` with **path-traversal guards** (no escaping the workspace) and a 2MB file cap.',
  '- **File Manager DISK mode** — flip the **SANDBOX / DISK** toggle to browse, edit and save real folders with live sizes and timestamps.',
  '- **Code Studio DISK badge** — shows when your project is wired to real disk; edits mirror to `~/VOX-OS/projects/<project>` on save.',
  '- **Pairing session expiry** — pairing tokens now expire automatically after **24h** (countdown chip on the pairing screen).',
  '- **One-tap revocation** — the new **REVOKE** button kills the current token **and every connected phone session instantly**; the old QR links are permanently dead until you mint a new token.',
  '- **EXE first-run pairing** — the desktop app auto-opens the **Phone Pairing** screen on its very first launch, so the phone can be connected with one QR scan before anything else.',
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
  '| `VOX-OS-Windows.exe` | Portable Windows app — full OS + Desktop Agent + pairing screen (no install needed) |',
  '| `VOX-OS.apk` | Debug Android build — scan the QR to control your PC from your phone |',
  '| `VOX-OS-release.apk` | Signed Android release build |',
  '| `vox-os-web.zip` | Web bundle for the bootable ISO kiosk |',
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
  const tag = 'v1.3.0';
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

  const assets = [
    ['VOX-OS-Windows.exe', 'application/octet-stream'],
    ['VOX-OS.apk', 'application/vnd.android.package-archive'],
    ['VOX-OS-release.apk', 'application/vnd.android.package-archive'],
    ['vox-os-web.zip', 'application/zip'],
  ];
  for (const [file, ct] of assets) {
    if (!fs.existsSync(file)) { console.log('SKIP (missing):', file); continue; }
    const asset = await upload(release.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(file)}`), file);
    console.log('uploaded:', asset.name, `(${(fs.statSync(file).size / 1024 / 1024).toFixed(1)} MB)`);
  }
  console.log('DONE —', release.html_url);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
