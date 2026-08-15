// make-release.cjs — creates the v1.2.0 release and uploads EXE + APKs + web zip.
const fs = require('fs');
const token = require('../server/.vox-keys.json').github;
const OWNER = 'al13n-x-v0x';
const REPO = 'v0x-0s';
const AUTH = { Authorization: 'Bearer ' + token };

const body = [
  '# VOX-OS v1.2.0 — Phone Pairing + Dev Toolkit 🖥️📱',
  '',
  'The futuristic developer OS command center. Real apps, real system control, real AI — on **Windows (EXE)**, **Android (APK)**, and in any browser.',
  '',
  '## 🆕 What\u2019s new in v1.2.0',
  '',
  '- **LAN Phone Pairing** — the EXE shows a QR screen: scan once and your phone controls the laptop over Wi-Fi (real agent bridge, token-gated, agent token never leaves the PC)',
  '- **voxos:// deep links** — scanning the app QR opens the VOX-OS APK straight into remote-control mode',
  '- **Dev Toolkit** — preloaded cards for **freebuff**, **codebuff**, **Gemini CLI** with exact npm installs, live RUN / INSTALL / VERSION through the real terminal, and one-tap **Code Studio**',
  '- **Backend serves the web app** — phones/browsers on the LAN load VOX-OS straight from the laptop',
  '',
  '## 🆕 In v1.1.0',
  '',
  '- System Apps (open real Windows control panels), V0X-ST0RE (winget installs), GX Browser, My Apps (real installed apps), 4 AI providers (Groq/Gemini/OpenAI/Anthropic), v0x-0s DEV_OPS_MAX / META_GAMER_OS persona',
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
  '1. Open the EXE (or `npm run dev`), start the **Desktop Agent**',
  '2. Open **Phone Pairing** — scan the QR with your phone',
  '3. Add any AI key in **API Manager** (Groq / Gemini / OpenAI / Anthropic) + your GitHub PAT',
  '4. Open **Dev Toolkit** — detect, install and run freebuff / codebuff / Gemini CLI',
  '',
  '## 🧰 Built for',
  '',
  '- **Devs** — terminal, AI engine, GitHub center, secret scanner, workspace manager, hacking lab, dev CLIs',
  '- **Gamers** — GX browser dock, gaming boosts, system monitoring, Roblox toolkit',
  '- **Everyone** — phone widgets, mobile remote, dark neon glass UI',
  '',
  '> 🏆 MIT licensed · open source · **A Dev\u2019s First Choice**',
].join('\n');

(async () => {
  const rel = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases`, {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: 'v1.2.0',
      target_commitish: 'main',
      name: 'VOX-OS v1.2.0 — Phone Pairing + Dev Toolkit',
      body,
      draft: false,
      prerelease: false,
    }),
  });
  const rb = await rel.json();
  if (rel.status !== 201) {
    console.error('release failed:', rel.status, rb.message || JSON.stringify(rb));
    process.exit(1);
  }
  console.log('release created:', rb.html_url);

  const assets = [
    ['VOX-OS-Windows.exe', 'VOX-OS-Windows.exe', 'application/octet-stream'],
    ['android/app/build/outputs/apk/debug/app-debug.apk', 'VOX-OS.apk', 'application/vnd.android.package-archive'],
    ['android/app/build/outputs/apk/release/app-release.apk', 'VOX-OS-release.apk', 'application/vnd.android.package-archive'],
    ['vox-os-web.zip', 'vox-os-web.zip', 'application/zip'],
  ];
  for (const [file, name, ct] of assets) {
    const data = fs.readFileSync(file);
    console.log(`uploading ${name} (${(data.length / 1048576).toFixed(1)} MB)…`);
    const up = await fetch(
      `https://uploads.github.com/repos/${OWNER}/${REPO}/releases/${rb.id}/assets?name=${encodeURIComponent(name)}`,
      { method: 'POST', headers: { ...AUTH, 'Content-Type': ct }, body: data }
    );
    const ub = await up.json();
    if (up.status >= 300) console.error(`  ${name} failed:`, up.status, ub.message);
    else console.log(`  ✓ ${name}`);
  }
  console.log('done:', rb.html_url);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
