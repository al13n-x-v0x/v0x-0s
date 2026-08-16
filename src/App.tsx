// VOX-OS © 2026 AL13N Industries — All Rights Reserved.
import { Component, type ReactNode, useEffect, useState } from 'react';
import { useVox } from './lib/store';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Dock } from './components/Dock';
import { MobileTabBar } from './components/MobileTabBar';
import { CommandPalette } from './components/CommandPalette';
import { NotificationsPanel, QuickSettings, StartMenu, ContextMenu } from './components/Overlays';
import { BootScreen, RecoveryScreen } from './components/BootScreen';
import { WindowFrame } from './components/window';
import { Icon } from './components/ui';
import { Onboarding } from './components/Onboarding';
import { APPS, ACCENTS } from './lib/constants';
import { Dashboard } from './apps/Dashboard';
import { PhoneLauncher } from './apps/PhoneLauncher';
import { PhoneHome } from './apps/PhoneHome';
import { CodeStudio } from './apps/CodeStudio';
import { TerminalApp } from './apps/TerminalApp';
import { VoxAI } from './apps/VoxAI';
import { AIEngine } from './apps/AIEngine';
import { ApiManager } from './apps/ApiManager';
import { HealthScanner } from './apps/HealthScanner';
import { Performance } from './apps/Performance';
import { GitHubApp } from './apps/GitHubApp';
import { Projects } from './apps/Projects';
import { FileManager } from './apps/FileManager';
import { DevTools } from './apps/DevTools';
import { Automation } from './apps/Automation';
import { Extensions } from './apps/Extensions';
import { Settings } from './apps/Settings';
import { VoiceEngine } from './apps/VoiceEngine';
import { Gaming } from './apps/Gaming';
import {
  VoxCoreApp, EventLog, ErrorCenter, Diagnostics, Memory, Backup, CommandHistory, Profile, TaskManager, SystemInfo, DesktopAgent,
} from './apps/SystemApps';
import { MobileRemote } from './apps/MobileRemote';
import { ReconLab } from './apps/ReconLab';
import { MyApps } from './apps/MyApps';
import { BrowserApp } from './apps/BrowserApp';
import { SystemTools } from './apps/SystemTools';
import { VoxStore } from './apps/VoxStore';
import { Notes } from './apps/Notes';
import { Pairing } from './apps/Pairing';
import { DevKit } from './apps/DevKit';
import { SecurityCenter } from './apps/SecurityCenter';

const SECTION_APPS: Record<string, () => ReactNode> = {
  dashboard: () => <Dashboard />,
  apps: () => <PhoneLauncher />,
  code: () => <CodeStudio />,
  terminal: () => <TerminalApp />,
  voxai: () => <VoxAI />,
  aiengine: () => <AIEngine />,
  health: () => <HealthScanner />,
  performance: () => <Performance />,
  github: () => <GitHubApp />,
  projects: () => <Projects />,
  files: () => <FileManager />,
  devtools: () => <DevTools />,
  apimanager: () => <ApiManager />,
  automation: () => <Automation />,
  gaming: () => <Gaming />,
  browser: () => <BrowserApp />,
  extensions: () => <Extensions />,
  marketplace: () => <Extensions marketplace />,
  settings: () => <Settings />,
  voxcore: () => <VoxCoreApp />,
  eventlog: () => <EventLog />,
  errors: () => <ErrorCenter />,
  security: () => <SecurityCenter />,
  recon: () => <ReconLab />,
  myapps: () => <MyApps />,
  systemtools: () => <SystemTools />,
  store: () => <VoxStore />,
  notes: () => <Notes />,
  pairing: () => <Pairing />,
  toolkit: () => <DevKit />,
  diagnostics: () => <Diagnostics />,
  memory: () => <Memory />,
  backup: () => <Backup />,
  voice: () => <VoiceEngine />,
  taskmanager: () => <TaskManager />,
  systeminfo: () => <SystemInfo />,
  agent: () => <DesktopAgent />,
  remote: () => <MobileRemote />,
  history: () => <CommandHistory />,
  profile: () => <Profile />,
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() {
    useVox.getState().setRecovery(true);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export default function App() {
  const booted = useVox((s) => s.booted);
  const boot = useVox((s) => s.boot);
  const section = useVox((s) => s.section);
  const desktopMode = useVox((s) => s.desktopMode);
  const windows = useVox((s) => s.windows);
  const safeMode = useVox((s) => s.safeMode);
  const desktopIcons = useVox((s) => s.desktopIcons);
  const [mobileNav, setMobileNav] = useState(false);
  // Phones get a widget-style home screen; desktops get the full dashboard.
  const [isPhone] = useState(() => window.matchMedia('(max-width: 1023px)').matches);

  // boot + telemetry
  useEffect(() => {
    boot();
    const iv = setInterval(() => useVox.getState().telemetryTick(), 2000);
    return () => clearInterval(iv);
  }, []);

  // global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const st = useVox.getState();
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (e.shiftKey) st.setPalette(true, 'vox');
        else st.setPalette(!st.paletteOpen, 'command');
      } else if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (e.shiftKey) st.setPalette(true, 'vox');
        else st.setPalette(true, 'file');
      } else if (mod && e.key === '`') {
        e.preventDefault();
        st.openApp('terminal');
      } else if (e.key === 'Escape') {
        if (st.paletteOpen) st.setPalette(false);
        else if (st.startOpen) st.setStartOpen(false);
        else if (st.notifOpen) st.setNotifOpen(false);
        else if (st.quickOpen) st.setQuickOpen(false);
      } else if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        st.cycleWindow();
      } else if (e.key === 'F1') {
        e.preventDefault();
        st.openApp('voxai');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // apply settings to DOM
  useEffect(() => {
    const st = useVox.getState();
    document.documentElement.dataset.theme = st.settings.theme;
    document.documentElement.classList.toggle('reduced-motion', st.settings.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', st.settings.highContrast);
    document.documentElement.style.setProperty('--font-scale', String(st.settings.fontSize));
    // runtime accent override (overrides the theme's accent vars)
    const acc = ACCENTS.find((a) => a.id === st.settings.accent);
    const root = document.documentElement;
    if (acc) {
      root.style.setProperty('--vox-cyan', acc.cyan);
      root.style.setProperty('--vox-blue', acc.blue);
      root.style.setProperty('--vox-violet', acc.violet);
    } else {
      root.style.removeProperty('--vox-cyan');
      root.style.removeProperty('--vox-blue');
      root.style.removeProperty('--vox-violet');
    }
  }, [useVox((s) => s.settings)]);

  if (!booted) return <BootScreen />;

  const Content = section === 'dashboard' && isPhone ? PhoneHome : SECTION_APPS[section] ?? Dashboard;

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col vox-stage vox-shell overflow-hidden">
        <div className="vox-grid" />
        <div className="vox-aurora" />
        <div className="relative z-10 flex flex-col h-full">
          <TitleBar onOpenNav={() => setMobileNav(true)} />

          <div className="flex flex-1 min-h-0 relative">
            <Sidebar mobileOpen={mobileNav} onCloseMobile={() => setMobileNav(false)} />

            <main className="flex-1 min-w-0 relative overflow-y-auto overflow-x-hidden">
              {desktopMode ? (
                <DesktopView icons={desktopIcons} />
              ) : (
                <div className="min-h-full">
                  <Content />
                </div>
              )}
            </main>

            {/* floating windows */}
            <div className="absolute inset-0 z-[60] pointer-events-none">
              {windows.map((w) => (
                <div key={w.id} className="pointer-events-auto absolute inset-0">
                  <WindowFrame id={w.id} appId={w.app} title={w.title}>
                    <AppContent appId={w.app} />
                  </WindowFrame>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block"><Dock /></div>
          <MobileTabBar />
        </div>

        {/* overlays */}
        <CommandPalette />
        <NotificationsPanel />
        <QuickSettings />
        <StartMenu />
        <ContextMenu />
        <RecoveryScreen />
        <Onboarding />
      </div>
    </ErrorBoundary>
  );
}

function AppContent({ appId }: { appId: string }) {
  const app = APPS.find((a) => a.id === appId);
  if (!app) return null;
  const Cmp = SECTION_APPS[app.section] ?? Dashboard;
  return <div className="h-full"><Cmp /></div>;
}

function DesktopView({ icons }: { icons: ReturnType<typeof useVox.getState>['desktopIcons'] }) {
  const s = useVox();
  return (
    <div
      className="h-full relative"
      onContextMenu={(e) => {
        e.preventDefault();
        s.setContextMenu({
          x: e.clientX, y: e.clientY,
          items: [
            { label: 'New Folder', icon: 'FolderPlus', run: () => s.pushNotification({ category: 'SYSTEM', severity: 'info', title: 'NEW FOLDER', body: 'Creating folders on the desktop requires the Desktop Agent.' }) },
            { label: 'Open Terminal', icon: 'SquareTerminal', run: () => s.openApp('terminal') },
            { label: 'Refresh', icon: 'RefreshCw', run: () => s.pushNotification({ category: 'SYSTEM', severity: 'info', title: 'REFRESH', body: 'Desktop refreshed.' }) },
            { label: 'Display Settings', icon: 'Monitor', run: () => s.setSection('settings') },
            { label: 'VOX Settings', icon: 'Settings', run: () => s.setSection('settings') },
          ],
        });
      }}
    >
      {/* wallpaper */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(900px 500px at 70% 20%, rgba(34,211,238,0.07), transparent 60%), radial-gradient(800px 500px at 20% 80%, rgba(139,92,246,0.06), transparent 60%)' }} />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.4em] text-vox-dim/60">VOX-OS DESKTOP · A DEV'S FIRST CHOICE</p>
      </div>

      {/* icons */}
      <div className="absolute inset-0 p-4 flex flex-col flex-wrap content-start gap-1">
        {icons.map((ic) => (
          <button
            key={ic.id}
            onDoubleClick={() => { if (ic.app) s.openApp(ic.app); else if (ic.section) s.setSection(ic.section); }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              s.setContextMenu({
                x: e.clientX, y: e.clientY,
                items: [
                  { label: 'Open', icon: 'FolderOpen', run: () => ic.app ? s.openApp(ic.app!) : ic.section && s.setSection(ic.section) },
                  { label: 'Rename', icon: 'Pencil', run: () => s.pushNotification({ category: 'SYSTEM', severity: 'info', title: 'RENAME', body: 'Desktop icon renaming requires the Desktop Agent.' }) },
                  { label: 'Properties', icon: 'Info', run: () => s.pushNotification({ category: 'SYSTEM', severity: 'info', title: 'PROPERTIES', body: `${ic.label} · desktop icon · double-click to open` }) },
                ],
              });
            }}
            className="w-[84px] py-2.5 px-1 rounded-lg flex flex-col items-center gap-1.5 hover:bg-white/[0.06] group"
          >
            <span className="w-10 h-10 rounded-xl border border-white/10 bg-ink-800/80 flex items-center justify-center text-vox-muted group-hover:text-vox-cyan group-hover:border-cyan-400/30 transition-colors shadow-lg">
              <Icon name={ic.icon} size={19} />
            </span>
            <span className="text-[9.5px] text-vox-text text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{ic.label}</span>
          </button>
        ))}
      </div>

      {/* system status strip */}
      <div className="absolute bottom-3 right-4 flex items-center gap-2 glass-inset px-3 py-1.5">
        <span className="font-mono text-[9px] tracking-[0.16em] text-vox-muted">VOX CORE ●</span>
        <span className="font-mono text-[9px] tracking-[0.16em] text-emerald-300">AI READY</span>
        <span className="font-mono text-[9px] tracking-[0.16em] text-emerald-300">PROJECT READY</span>
        <span className="font-mono text-[9px] tracking-[0.16em] text-vox-muted">GITHUB {s.settings.githubConnected ? 'READY' : '—'}</span>
        <span className="font-mono text-[9px] tracking-[0.16em] text-emerald-300">SYSTEM HEALTHY</span>
      </div>
    </div>
  );
}
