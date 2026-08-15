// make-release.cjs — creates the v1.1.0 release and uploads EXE + APKs.
const fs = require('fs');
const token = require('../server/.vox-keys.json').github;
const OWNER = 'al13n-x-v0x';
const REPO = 'v0x-0s';
const AUTH = { Authorization: 'Bearer ' + token };

const body = [
  '# VOX-OS v1.1.0 — A Dev\u2019s First Choice 🖥️',
  '',
  'The futuristic developer OS command center. Real apps, real system control, real AI — on **Windows (EXE)**, **Android (APK)**, and in any browser.',
  '',
  '## 🆕 What\u2019s new',
  '',
  '- **System Apps** — open real Windows control panels (Disk Management, Task Manager, Device Manager…) straight from the OS',
  '- **V0X-ST0RE** — app store that installs real software via winget in a live terminal',
  '- **GX Browser** — Opera-GX-style tabs, gaming dock (Steam/Epic/Roblox/Twitch/Discord/GeForce NOW), fullscreen mode',
  '- **My Apps** — your actually-installed apps, launched for real via the Desktop Agent',
  '- **4 AI providers** — Groq, Gemini, **OpenAI (ChatGPT)**, **Anthropic (Claude)** — use any key',
  '- **v0x-0s persona** — auto-detects DEV_OPS_MAX / META_GAMER_OS modes',
  '- **Phone home screen** — widgets, clock, stats, quick actions (long-press to edit)',
  '- **Bootable ISO** companion repo: [v0x-0s-iso](https://github.com/al13n-x-v0x/v0x-0s-iso) — replace Windows with Docker',
  '',
  '## 📦 Downloads',
  '',
  '| Asset | What it is |',
  '| ----- | ---------- |',
  '| `VOX-OS-Windows.exe` | Portable Windows app — runs the full OS + Desktop Agent (no install needed) |',
  '| `VOX-OS.apk` | Debug Android build — control your PC from your phone |',
  '| `VOX-OS-release.apk` | Signed Android release build |',
  '',
  '## 🔑 Setup',
  '',
  '1. Open **API Manager** and paste any AI key (Groq / Gemini / OpenAI / Anthropic) + your GitHub PAT',
  '2. Launch the **Desktop Agent** for real hardware telemetry, app launching, and system control',
  '3. Open **My Apps**, **System Apps**, or **V0X-ST0RE** — it all works for real',
  '',
  '## 🧰 Built for',
  '',
  '- **Devs** — terminal, AI engine, GitHub center, secret scanner, workspace manager, hacking lab',
  '- **Gamers** — GX browser dock, gaming boosts, system monitoring, Roblox toolkit',
  '- **Everyone** — phone widgets, mobile remote, dark neon glass UI',
  '',
  '> 🏆 MIT licensed · open source · **A Dev\u2019s First Choice**',
].join('\n');

(async () => {
  // 1. Create the release (tag v1.1.0 at current main)
  const rel = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases`, {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: 'v1.1.0',
      target_commitish: 'main',
      name: 'VOX-OS v1.1.0 — Windows + Android',
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

  // 2. Upload assets
  const assets = [
    ['VOX-OS-Windows.exe', 'VOX-OS-Windows.exe', 'application/octet-stream'],
    ['android/app/build/outputs/apk/debug/app-debug.apk', 'VOX-OS.apk', 'application/vnd.android.package-archive'],
    ['android/app/build/outputs/apk/release/app-release.apk', 'VOX-OS-release.apk', 'application/vnd.android.package-archive'],
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
    else console.log(`  ✓ ${name} → ${ub.browser_download_url}`);
  }
  console.log('done:', rb.html_url);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
