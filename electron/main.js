// VOX-OS Desktop — Electron main process.
// Spawns the Desktop Agent (agent/index.js) + backend (server/index.js),
// then opens the built web app in a native window. The LAN IP is shown so a
// phone can connect via Mobile Remote (real command execution over WiFi).
const { app, BrowserWindow, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

const isPackaged = app.isPackaged;
// Renderer files live inside app.asar (Electron reads through it).
const ROOT = isPackaged ? path.join(process.resourcesPath, 'app.asar') : path.join(__dirname, '..');
// Child agent/server processes need REAL files on disk (they write config next
// to themselves), so spawn them from app.asar.unpacked when packaged.
const CHILD_ROOT = isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked')
  : path.join(__dirname, '..');
const NODE = process.execPath; // same Node/Electron binary can run our scripts

let agentProc = null;
let serverProc = null;
let mainWindow = null;

function lanIPs() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const i of ifs[name] || []) {
      if (i.family === 'IPv4' && !i.internal) out.push({ name, address: i.address });
    }
  }
  return out;
}

function startChild(rel, args, label) {
  try {
    const file = path.join(CHILD_ROOT, rel);
    const p = spawn(NODE, [file, ...args], {
      cwd: CHILD_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, VOX_DESKTOP: '1', ELECTRON_RUN_AS_NODE: '1', PORT: '8787', AGENT_PORT: '8790' },
    });
    p.stdout.on('data', (d) => log(`[${label}]`, d.toString().trim()));
    p.stderr.on('data', (d) => log(`[${label}]`, d.toString().trim()));
    p.on('exit', (code) => log(`[${label}] exited with code ${code}`));
    return p;
  } catch (e) {
    console.error(`[${label}] failed to start:`, e.message);
    return null;
  }
}

// Persistent debug log (the packaged app has no console).
const LOG_FILE = path.join(app.getPath('userData'), 'vox-desktop.log');
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`;
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* ignore */ }
  console.log(...args);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#05060a',
    title: 'VOX-OS — A Dev\'s First Choice',
    autoHideMenuBar: true,
    icon: path.join(ROOT, 'public', 'vox.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  const index = path.join(ROOT, 'dist', 'index.html');
  if (fs.existsSync(index)) {
    mainWindow.loadFile(index);
  } else {
    dialog.showErrorBox('VOX-OS', 'dist/ not found. Run `npm run build` first.');
  }

  // open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  // 1) start the Desktop Agent (real telemetry + shell + installed apps)
  const agentFile = path.join(CHILD_ROOT, 'agent', 'index.js');
  if (fs.existsSync(agentFile)) {
    agentProc = startChild(path.join('agent', 'index.js'), [], 'agent');
  } else {
    console.log('[desktop] agent/index.js not found — skipping agent');
  }

  // 2) start the backend (GitHub proxy + AI keys + agent discovery)
  const serverFile = path.join(CHILD_ROOT, 'server', 'index.js');
  if (fs.existsSync(serverFile)) {
    serverProc = startChild(path.join('server', 'index.js'), [], 'backend');
  } else {
    console.log('[desktop] server/index.js not found — skipping backend');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  for (const p of [agentProc, serverProc]) {
    if (p) { try { p.kill(); } catch { /* ignore */ } }
  }
});

// Expose the LAN address to the renderer via a tiny status file the UI can read.
app.whenReady().then(() => {
  const ip = lanIPs();
  const info = {
    desktop: true,
    packaged: isPackaged,
    lan: ip,
    backendPort: 8787,
    agentPort: 8790,
  };
  try {
    fs.mkdirSync(path.join(ROOT, 'electron'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'electron', 'desktop-info.json'), JSON.stringify(info, null, 2));
  } catch { /* non-fatal */ }
});
