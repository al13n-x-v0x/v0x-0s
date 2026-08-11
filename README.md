<div align="center">

# 🛸 VOX-OS
### A DEV'S FIRST CHOICE

**A futuristic developer operating environment — code, terminals, AI, GitHub, security tools, and remote control — in one shell.**

[![License: MIT](https://img.shields.io/badge/License-MIT-8b5cf6.svg?style=for-the-badge)](LICENSE)
[![Made with React](https://img.shields.io/badge/Made%20with-React-22d3ee?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![Android APK](https://img.shields.io/badge/Android-APK%20ready-3ddc84?style=for-the-badge&logo=android)](VOX-OS.apk)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

<img src="public/vox.svg" width="96" alt="VOX-OS" />

**✨ 100% local-first · 💾 Zero subscriptions · 🔒 Your keys, your machine · 🚀 Installable on Windows, macOS, Linux & Android**

</div>

---

## 🏆 Trophy Case

| | | |
|---|---|---|
| 🥇 **1-Click Installable APK** | 🥈 **Desktop Agent** — real shell + hardware telemetry | 🥉 **VOX AI** — dual Gemini + Groq routing |
| 🎖️ **Recon Lab** — real security tools | 🏅 **Mobile Remote** — control your PC from your phone | 🪙 **Workspace Manager** — files/terminals/AI context snapshots |
| 💠 **Live GitHub center** — branches, commits, issues, PRs | 🛡️ **Security Center** — secret scanning | ⚡ **Gaming & Boost** — real OS detection + FPS meter |

---

## 🧠 What is VOX-OS?

VOX-OS is a **developer control center** that feels like an operating system: a glassmorphic shell with windows, a dock, a command palette (`Ctrl+K`), notifications, voice control, and a desktop agent that talks to the *real* machine underneath it.

> Everything is honest: when something is simulated it says **SIMULATED**; when the Desktop Agent is powering it, it says **REAL SHELL** / **AGENT**. Nothing is faked.

<details>
<summary>🔥 Click to expand — full feature list</summary>

### Workspace
- 🗔 **Windows & dock** — open apps as real draggable windows
- ⌨️ **Command palette** — every action searchable (`Ctrl+K`)
- 💾 **Workspace Manager** — save a snapshot of open files, terminals & AI context; restore with one click
- 🔔 **Notification center**, event log, error center with deduplication

### Code
- 🖥️ **Terminal** — PowerShell / Bash / CMD; **real execution via the Desktop Agent** (or labeled SIMULATED)
- 📝 **Code Studio** — multi-file editor with tabs and a project tree
- 📁 **File Manager** — full virtual workspace tree

### AI
- 🤖 **VOX AI** — a chat assistant ("a cheap Claude, but yours") with **Google Gemini + Groq** providers and smart task routing
- 🎙️ **Voice Engine** — talk to your OS
- 🧠 **VOX Memory** — remembers projects, preferences, and actions

### GitHub
- 🌐 **GitHub Center** — connect a PAT and browse **real** branches, commits, issues & pull requests
- 🆕 **Create repos** and **commit & push** straight from the app
- 🕵️ **Secret scanner** — scans connected repos for leaked keys (redacted, backend-only)

### Security
- 🛡️ **Security Center** — local + GitHub secret detection
- 🎯 **Recon Lab** — real, working tools on systems **you own** (see Security section below)
- 💪 **Password strength** + offline hash cracker for your own auditing

### System
- 🖥️ **System Info / Task Manager / Diagnostics** — real telemetry via the Desktop Agent
- 🎮 **Gaming & Boost** — detects your real OS, GPU & RAM; honest per-OS gaming notes + Game Mode
- 🤝 **Desktop Agent** — a local daemon (`ws://127.0.0.1:8790`) that gives the web shell real hardware stats and a real shell. Token-authenticated, permission-gated, **ALLOW ALL** button for trusted machines.

</details>

---

## 📱 Phone (Android) — Install the APK

<details open>
<summary>Step-by-step: get VOX-OS on your phone</summary>

### 1 · Get the APK
Grab **`VOX-OS.apk`** from this repo (or run `npm run apk:build` to compile it yourself — requires the Android SDK).

> **🚀 Signed release build:** `VOX-OS-release.apk` (v1.1.0) is signed with a dedicated release keystore and ready to distribute. Rebuild it anytime with `npm run apk:release`. The keystore itself lives only on the build machine (never in this repo) — back it up, because Android requires the **same key** for every future update of the app.

### 2 · Install it
- Copy the APK to your phone (USB, Google Drive, or download straight from GitHub)
- Tap it → allow **"Install unknown apps"** for your file manager/browser
- Android 6.0+ required (minSdk 22)

### 3 · Control your laptop from the phone 🔥
1. On your **laptop**, start the VOX backend + Desktop Agent:
   ```bash
   npm run server      # backend  → http://localhost:8787
   npm run agent       # daemon   → ws://127.0.0.1:8790  (generates a token)
   ```
2. On your **phone**, open VOX-OS → **SYSTEM → Mobile Remote**
3. Tap **CONNECT AGENT** → manual → `ws://<laptop-LAN-IP>:8790` + the agent token
4. Run **real commands** on your PC from your pocket — system info, processes, network, disk.

### 4 · Or just use it as an app (PWA)
Open `http://<laptop-ip>:5173` in Chrome → menu → **Add to Home screen**. Full-screen, offline-capable.

</details>

---

## 💻 Laptop Setup (Windows · macOS · Linux)

<details>
<summary>Click to expand — full dev setup for every OS</summary>

### Requirements
| Tool | Version |
|---|---|
| [Node.js](https://nodejs.org) | ≥ 18 |
| npm | ≥ 9 |
| Git | any recent |
| Android SDK (only for APK builds) | API 34 + build-tools |

### 1 · Clone & install
```bash
git clone https://github.com/al13n-x-v0x/v0x-0s.git
cd v0x-0s
npm install
```

### 2 · Run the shell
```bash
npm run dev           # web shell → http://localhost:5173
```
Open the URL, complete the 30-second onboarding, done.

### 3 · Start the real machine integration
```bash
npm run server        # VOX backend (API keys, GitHub proxy, agent discovery)
npm run agent         # Desktop Agent — real shell + hardware telemetry
```
The web shell auto-discovers the agent and upgrades from **SIMULATED** to **REAL SHELL** everywhere.

### 4 · Configure your AI keys (optional but recommended)
VOX AI routes between **Google Gemini** and **Groq** — add one or both in **API Manager** (or `server/.env`):
```
GEMINI_API_KEY=...
GROQ_API_KEY=...
```
Both together = automatic smart routing + fallback. That's your **cheap Claude**.

### 5 · Connect GitHub
**Git & GitHub → OR USE A PERSONAL ACCESS TOKEN → CONNECT** with a classic PAT (`repo` scope) — then browse real repos, scan for secrets, create repos, and **COMMIT & PUSH** from the app.

</details>

---

## 🧩 Make VOX-OS your default OS experience

VOX-OS is a web shell — it can't replace your kernel, but it **can** be the first thing you see, auto-starting fullscreen like a real OS on login. Here's how on every platform:

<details open>
<summary>Linux (systemd — Chromium kiosk mode)</summary>

```bash
# 1. Create the autostart service
sudo tee /etc/systemd/system/voxos.service > /dev/null <<'EOF'
[Unit]
Description=VOX-OS Kiosk
After=graphical.target network-online.target
Wants=network-online.target

[Service]
User=%i
Environment=DISPLAY=:0
ExecStartPre=/usr/bin/npm --prefix /home/YOU/v0x-0s run build
ExecStart=/usr/bin/chromium --kiosk --noerrdialogs --disable-infobars \
  --disable-session-crashed-bubble --no-first-run --check-for-update-interval=31536000 \
  http://localhost:5173
Restart=always
RestartSec=3

[Install]
WantedBy=graphical.target
EOF

# 2. Enable + boot into VOX-OS
sudo systemctl enable voxos.service
sudo systemctl start voxos.service
```

</details>

<details>
<summary>Windows (startup + fullscreen)</summary>

1. Start the stack: `npm run server` + `npm run agent` + `npm run dev`
2. Press `Win+R` → `shell:startup` → create `voxos.bat`:
   ```bat
   @echo off
   cd /d C:\v0x-0s
   start /b node server\index.js
   start /b node agent\index.js
   start /b npx vite
   timeout /t 4 >nul
   start chrome --start-fullscreen --app=http://localhost:5173
   ```
3. Reboot — VOX-OS is the first thing you see. 🚀

</details>

<details>
<summary>macOS (login item + fullscreen)</summary>

1. Start the stack in Terminal
2. **System Settings → General → Login Items** → add a script that launches `open -a "Google Chrome" --args --start-fullscreen http://localhost:5173`
3. Sign out/in — VOX-OS greets you.

</details>

<details>
<summary>Android (it's already the app)</summary>

You don't kiosk a phone — you just **tap the VOX-OS icon**. That's the whole point of the APK. 📱

</details>

---

## 🎯 Security — the honest part

> **VOX-OS will never include tools for breaking into accounts or systems you don't own.** That's not a missing feature — it's the law, and it's what separates a security professional from a felon. The tools below are the *real* hacker toolkit, for **authorized testing only**:

| Tool | What it does | Works on |
|---|---|---|
| 🔎 **Port Scanner** | Fast TCP probes (400 ms/port) | Your machines & network |
| 📡 **Ping Sweep** | Live-host discovery of a subnet | Your LAN |
| 🔌 **Active Connections** | Real `netstat` sockets | Your machine |
| 🌐 **LAN Discovery** | Real `arp -a` table | Your LAN |
| 🧩 **Subdomain Recon** | ~230-name DNS brute-force via dns.google | Any domain (public DNS data) |
| 🔑 **Hash Cracker** | Offline SHA-1/SHA-256 wordlist attack, 100% in-browser | Hashes you own |
| 🛡️ **Secret Scanner** | Finds leaked API keys in your repos | Your code |
| 🏆 **Password Strength** | Audits passwords you control | Your accounts |

**Want to go deeper?** The Terminal is a full shell — install `nmap`, `masscan`, `ffuf`, `hashcat`, `sqlmap` and run them on your own targets. That's how real security engineers train.

### 🧪 Build a legal hacking lab

Set up your own **DVWA + Metasploitable playground** and drive it straight from Recon Lab's **Practice Lab** panel (ping check + classic service port scan + ARP identify in one click). Full step-by-step guide with VirtualBox host-only isolation, Docker one-liner, OWASP Top 10 mapping, and free level-up resources:

**→ [`HACKING-LAB.md`](HACKING-LAB.md)**

---

## 🛠️ Development & Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Web shell (Vite) |
| `npm run server` | VOX backend (`:8787`) |
| `npm run agent` | Desktop Agent daemon (`:8790`) |
| `npm run build` | Type-check + production build |
| `npm run apk:sync` | Build web + sync Capacitor |
| `npm run apk:build` | Compile the Android APK |

**Project layout**
```
agent/      Desktop Agent daemon (WebSocket protocol, permissions)
server/     VOX backend (API keys, GitHub proxy, agent discovery)
src/apps/   Every app: Terminal, Code Studio, VOX AI, GitHub, Recon Lab…
src/lib/    Store, AI router, health engine, secret scanner, agent client
android/    Capacitor native project (builds VOX-OS.apk)
```

---

## 🏅 Achievements

<details>
<summary>🏆 Click to reveal your VOX-OS achievements</summary>

- 🥇 **First Boot** — completed the 7-step onboarding
- ⚡ **Real Shell** — connected the Desktop Agent
- 🤖 **VOX AI Online** — configured a Gemini or Groq key
- 🌐 **GitHub Linked** — connected a PAT
- 🕵️ **Clean Sweep** — ran a secret scan with zero findings
- 🎯 **Recon Pro** — ran a port scan on your own machine
- 📱 **Mobile Master** — controlled your PC from your phone
- 🎮 **Game On** — activated Game Mode
- 🛠️ **Builder** — compiled the APK yourself
- 💎 **Full Stack** — did everything above

</details>

---

## 📜 License

**MIT** — do whatever you want with it (see [LICENSE](LICENSE)). Built with ❤️ and way too much caffeine.

<div align="center">

**VOX-OS — A DEV'S FIRST CHOICE** 🛸

[Report an issue](https://github.com/al13n-x-v0x/v0x-0s/issues) · [Star the repo](https://github.com/al13n-x-v0x/v0x-0s/stargazers) · [Get the APK](VOX-OS.apk)

</div>
