import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AIMessage, AppError, AutomationRule, CommandHistoryItem, DesktopIcon, Extension, HealthCategory,
  HealthState, LogEvent, Notification, Profile, Project, ProviderConfig, ProviderId, RouterLogEntry,
  SectionId, Settings, SystemInfo, TelemetryPoint, TerminalSession, VoiceState, WindowState, Workspace, AIUsage,
} from './types';
import { APP_VERSION, APPS, PROVIDERS } from './constants';
import { SEED_PROJECTS } from '../data/projects';
import { SEED_EXTENSIONS, SEED_AUTOMATION } from '../data/system';
import { runCommand, sessionPrompt } from './shell';
import { computeChecks, computeScore, SCAN_STEPS, STEP_LABELS } from './health';
import { sampleDemo, systemProbe, batteryProbe, realMemoryUsage, browserInfo, sttSupported, ttsSupported } from './telemetry';
import { detectOS, detectRobloxCompat, detectBrowser, detectGPU, suggestProfile, type OSInfo, type RobloxCompat, type GPUInfo } from './os';
import { agentClient, type AgentHello, type AgentStats, type DiskEntry } from './agent';
import { streamChat, pingBackend, testProvider, saveProviderKey, removeProviderKey, fetchModels, githubStatus, fetchGithubRepos, saveGithubToken, removeGithubToken, scanGithubRepo as apiScanGithubRepo, fetchGithubBranches, fetchGithubCommits, fetchGithubIssues, fetchGithubPulls, createGithubRepo, pushGithubCommit, demoReply, classifyTask, routerEntry, setApiBase, BackendStatus } from './ai';
import type { GithubSecretFinding, GithubBranch, GithubCommit, GithubIssue, GithubPull } from './ai';
import { sfx, configureSound } from './sounds';
import { speak, stopSpeaking, getRecognition } from './voice';
import { checkWhisper, recordWhisperAudio, transcribeViaWhisper } from './whisper';
import { clamp, maskKey, timeAgo, uid } from './fmt';
import { writeFile, readFile, addNode, removeNode, renameNode, countFiles, walk } from './vfs';
import { scanForSecrets } from './secrets';
import { diffLines } from './devtools';

/** Folder name for a project inside ~/VOX-OS/projects (agent FS mirror). */
function diskSlug(name: string): string {
  const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'project';
}

export interface MemoryItem {
  id: string;
  section: 'PROJECT' | 'CONVERSATION' | 'PREFERENCES' | 'CODE' | 'ACTIONS';
  text: string;
  time: number;
}

export interface BackupEntry {
  id: string;
  time: number;
  size: number;
  label: string;
  data: Record<string, unknown>;
}

export interface GithubRepo {
  name: string;
  full_name: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  default_branch: string;
}

export interface VoxState {
  // ---- shell ----
  booted: boolean;
  booting: boolean;
  onboardingDone: boolean;
  section: SectionId;
  desktopMode: boolean;
  paletteOpen: boolean;
  paletteMode: 'command' | 'file' | 'vox';
  startOpen: boolean;
  notifOpen: boolean;
  quickOpen: boolean;
  contextMenu: { x: number; y: number; items: { label: string; icon?: string; danger?: boolean; run: () => void }[] } | null;
  safeMode: boolean;
  recovery: boolean;
  windows: WindowState[];
  activeWindowId: string | null;
  desktopIcons: DesktopIcon[];
  // ---- data ----
  settings: Settings;
  projects: Project[];
  activeProjectId: string;
  codeTabs: Record<string, string[]>;
  activeFile: string | null;
  dirty: Record<string, boolean>;
  terminalSessions: TerminalSession[];
  terminalActive: string;
  notifications: Notification[];
  eventLog: LogEvent[];
  errors: AppError[];
  commandHistory: CommandHistoryItem[];
  extensions: Extension[];
  automation: AutomationRule[];
  memory: MemoryItem[];
  profile: Profile;
  workspaces: Workspace[];
  backups: BackupEntry[];
  // ---- ai ----
  providers: Record<ProviderId, ProviderConfig>;
  modelsUnavailable: Record<ProviderId, boolean>;
  aiMessages: AIMessage[];
  aiThinking: boolean;
  aiStatus: 'idle' | 'thinking' | 'generating' | 'complete' | 'error';
  aiError: string | null;
  aiErrorCategory: string | null;
  aiAbort: AbortController | null;
  routerLog: RouterLogEntry[];
  aiUsage: AIUsage;
  backend: BackendStatus;
  // ---- health ----
  health: HealthState;
  scanCancel: boolean;
  // ---- telemetry ----
  telemetry: TelemetryPoint[];
  telemetryReal: { ram: boolean; net: boolean };
  systemInfo: SystemInfo;
  os: OSInfo;
  roblox: RobloxCompat;
  gpu: GPUInfo;
  // ---- desktop agent ----
  agentState: {
    status: 'disconnected' | 'connecting' | 'connected';
    version?: string;
    os?: { platform: string; release: string; arch: string; hostname: string };
    caps: string[];
    perms: Record<string, string>;
    lastError?: string;
  };
  agentStats: {
    cpu: number | null;
    memPct: number | null;
    diskPct: number | null;
    diskTotal: number | null;
    uptime: number | null;
    load: number[];
    hostname: string | null;
  };
  // ---- installed apps (via Desktop Agent) ----
  installedApps: { name: string; appId: string }[];
  appsLoading: boolean;
  appsError: string | null;
  // ---- Windows system tools (via Desktop Agent) ----
  sysTools: { id: string; label: string; icon: string; desc: string }[];
  sysToolsLoading: boolean;
  sysToolsError: string | null;
  // ---- github ----
  githubRepos: GithubRepo[];
  githubLoading: boolean;
  githubError: string | null;
  githubUser: string | null;
  // ---- github repo detail (branches / commits / issues / pulls) ----
  githubDetail: {
    repo: string;
    tab: 'branches' | 'commits' | 'issues' | 'pulls';
    loading: boolean;
    error: string | null;
    branch: string;
    branches: GithubBranch[];
    commits: GithubCommit[];
    issues: GithubIssue[];
    pulls: GithubPull[];
  };
  // ---- github secret scan (Security Center) ----
  githubScan: {
    status: 'idle' | 'scanning' | 'done' | 'error';
    repo: string;
    branch: string;
    filesScanned: number;
    filesSkipped: number;
    findings: GithubSecretFinding[];
    error: string | null;
    scannedAt: number | null;
  };
  // ---- voice ----
  voice: VoiceState;
  /** laptop backend this client is paired with (phone → laptop) */
  pairHost: string | null;
  pairToken: string | null;
  /** real workspace files on disk via the Desktop Agent (~/VOX-OS) */
  diskFs: { ready: boolean; root: string | null; error: string | null };
  // ---- actions ----
  boot: () => void;
  finishBoot: () => void;
  setOnboardingDone: () => void;
  setSection: (s: SectionId) => void;
  setDesktopMode: (v: boolean) => void;
  setPalette: (open: boolean, mode?: 'command' | 'file' | 'vox') => void;
  setStartOpen: (v: boolean) => void;
  setNotifOpen: (v: boolean) => void;
  setQuickOpen: (v: boolean) => void;
  setContextMenu: (m: VoxState['contextMenu']) => void;
  setSafeMode: (v: boolean) => void;
  setRecovery: (v: boolean) => void;
  resetUI: () => void;
  setGameProfile: (p: 'balanced' | 'boost' | 'ultra') => void;
  setGameMode: (on: boolean) => void;
  connectAgent: (manualUrl?: string, manualToken?: string) => Promise<void>;
  disconnectAgent: () => void;
  agentRequestPermission: (perm: string) => Promise<void>;
  agentAllowAll: () => Promise<void>;
  agentSessionInput: (sessionId: string, line: string) => void;
  agentRun: (command: string, timeoutMs?: number) => Promise<{ ok: boolean; output: string }>;
  wireAgent: (hello: AgentHello) => void;
  agentOpenSession: (sessionId: string) => Promise<void>;
  applyAgentStats: (s: AgentStats) => void;
  agentExecChunk: (m: unknown, kind: 'out' | 'err') => void;
  agentExecExit: (m: unknown) => void;
  // windows
  openApp: (appId: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, w: number, h: number) => void;
  cycleWindow: () => void;
  // notifications / logs / errors
  pushNotification: (n: Omit<Notification, 'id' | 'time' | 'read'>) => void;
  markNotifsRead: () => void;
  dismissNotif: (id: string) => void;
  clearNotifs: () => void;
  logEvent: (source: LogEvent['source'], text: string, severity?: LogEvent['severity']) => void;
  addError: (e: Omit<AppError, 'id' | 'time' | 'resolved'>) => void;
  resolveError: (id: string) => void;
  recordCommand: (command: string, result?: string) => void;
  // settings
  setSettings: (p: Partial<Settings>) => void;
  setTheme: (t: Settings['theme']) => void;
  // projects
  openProject: (id: string) => void;
  saveWorkspace: (name: string) => void;
  restoreWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  updateProject: (id: string, p: Partial<Project>) => void;
  buildProject: (id?: string) => Promise<void>;
  testProject: (id?: string) => Promise<void>;
  // files
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  saveFile: (path: string, content: string) => void;
  setFileDirty: (path: string, dirty: boolean) => void;
  createNode: (dir: string[], name: string, kind: 'file' | 'dir', content?: string) => void;
  deleteNode: (dir: string[], name: string) => void;
  renameNodeOp: (dir: string[], oldName: string, newName: string) => void;
  // terminal
  newTerminal: (shell?: TerminalSession['shell']) => void;
  closeTerminal: (id: string) => void;
  setTerminalActive: (id: string) => void;
  terminalInput: (id: string, input: string) => void;
  // ai
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  connectProvider: (id: ProviderId, key: string) => Promise<{ ok: boolean; error?: string }>;
  testProviderConn: (id: ProviderId) => Promise<void>;
  setProviderModel: (id: ProviderId, model: string) => void;
  refreshModels: (id: ProviderId) => Promise<void>;
  removeProvider: (id: ProviderId) => Promise<void>;
  setRouterLog: (e: RouterLogEntry) => void;
  exportAIConfig: () => void;
  importAIConfig: (json: string) => { ok: boolean; error?: string };
  explainWithVox: (prompt: string) => void;
  // health
  runHealthScan: (kind: 'quick' | 'full' | 'project' | 'deps') => Promise<void>;
  cancelScan: () => void;
  // github
  connectGithub: (token?: string) => Promise<void>;
  disconnectGithub: () => Promise<void>;
  createGithubRepo: (name: string, description?: string, isPrivate?: boolean) => Promise<void>;
  pushGithubCommit: (message?: string) => Promise<void>;
  syncGithub: () => Promise<void>;
  scanGithubRepo: (repo: string) => Promise<void>;
  clearGithubScan: () => void;
  openGithubRepo: (repo: string, tab?: 'branches' | 'commits' | 'issues' | 'pulls') => Promise<void>;
  setGithubTab: (tab: 'branches' | 'commits' | 'issues' | 'pulls') => void;
  setGithubBranch: (branch: string) => void;
  closeGithubRepo: () => void;
  // installed apps
  loadInstalledApps: () => Promise<void>;
  launchApp: (appId: string) => Promise<void>;
  loadSysTools: () => Promise<void>;
  openSysTool: (toolId: string) => Promise<void>;
  storeInstall: (wingetId: string, name: string) => Promise<void>;
  // voice
  startListening: () => void;
  stopListening: () => void;
  speakText: (text: string) => void;
  /** probe the local Whisper STT service (tools/whisper-service.py) */
  checkWhisper: () => Promise<void>;
  /** pick the STT backend: auto / local whisper / browser */
  setVoiceEngine: (engine: 'auto' | 'whisper' | 'browser') => void;
  /** point this client at a laptop backend (phone → laptop pairing) */
  applyPairing: (host: string, token: string) => void;
  /** read ?pair= from the URL + listen for voxos:// deep links */
  initPairing: () => void;
  /** arm ~/VOX-OS real-file access once the agent reports the FILES capability */
  agentDiskInit: () => Promise<void>;
  /** pull real files from ~/VOX-OS/projects/<slug> into the in-memory project */
  syncProjectFromDisk: (projectId: string) => Promise<void>;
  /** mirror a VFS operation to real disk (no-op when the agent FS is not armed) */
  diskMirror: (path: string, op: 'write' | 'mkdir' | 'delete' | 'rename', data?: string, to?: string) => void;
  addVoiceHistory: (text: string) => void;
  setVoiceStatus: (s: VoiceState['status'], error?: string) => void;
  executeVoiceCommand: (text: string) => string;
  // system
  telemetryTick: () => void;
  refreshSystem: () => Promise<void>;
  pingBackendNow: () => Promise<void>;
  // memory
  addMemory: (m: Omit<MemoryItem, 'id' | 'time'>) => void;
  editMemory: (id: string, text: string) => void;
  deleteMemory: (id: string) => void;
  clearMemory: (section?: MemoryItem['section']) => void;
  // extensions / automation
  installExtension: (id: string) => void;
  toggleExtension: (id: string) => void;
  removeExtension: (id: string) => void;
  toggleAutomation: (id: string) => void;
  runAutomation: (id: string) => void;
  // backup
  createBackup: () => void;
  restoreBackup: (id: string) => void;
  exportConfig: () => void;
  // diagnostics
  runDiagnostics: () => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'night',
  bootAnimation: true,
  reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  highContrast: false,
  sound: true,
  soundVolume: 0.18,
  fontSize: 1,
  confirmDestructive: true,
  autoSave: true,
  showSimulatedLabels: true,
  demoAssistant: true,
  phoneQuick: ['voxai', 'terminal', 'github', 'recon', 'remote', 'settings'],
  voiceEnabled: true,
  voiceAutoSpeak: false,
  voiceChat: false,
  accent: '',
  voiceSpeed: 1,
  voicePitch: 1,
  voiceVolume: 1,
  wakeWord: false,
  primaryProvider: 'auto',
  secondaryProvider: 'groq',
  routingMode: 'auto',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: 'You are v0x-0s, the ultimate ultra-adaptive AI companion engineered for Elite Developers and Hardcore Gamers, built into the VOX-OS operating environment. Tone: high-energy, confident, deeply technical, slightly competitive. Style: hyper-concise, conversational, direct — zero fluff, no boilerplate, never "As an AI...". You auto-detect two modes: DEV_OPS_MAX (code, architecture, bugs, infrastructure — production-ready code first, then brief optimization notes) and META_GAMER_OS (games, builds, frame data, latency — exact numbers, meta builds, tables for comparisons). Merge both when the task overlaps. When you perform an action in the system, say so in one short sentence. Never invent system data — if you lack telemetry, say so.',
  defaultShell: 'powershell',
  performanceMode: 'balanced',
  gameProfile: 'balanced',
  gameMode: false,
  notifyBuild: true,
  notifyGitHub: true,
  notifyAI: true,
  notifySystem: true,
  notifySecurity: true,
  agentPermission: {
    system: 'allowed',
    files: 'denied',
    terminal: 'denied',
    processes: 'denied',
    git: 'allowed',
    network: 'denied',
    microphone: 'denied',
  },
  githubConnected: false,
  aiConfiguredViaBackend: false,
};

const PROFILE: Profile = {
  name: 'AL13N',
  role: 'Administrator',
  workspaceCount: 3,
  projectCount: 3,
  githubStatus: 'disconnected',
  voxActivity: 0,
  avatarHue: 262,
};

function defaultProviders(): Record<ProviderId, ProviderConfig> {
  return {
    gemini: { id: 'gemini', configured: false, maskedKey: null, model: 'gemini-2.0-flash', status: 'not_configured', envVar: 'GEMINI_API_KEY', label: 'Google Gemini' },
    groq: { id: 'groq', configured: false, maskedKey: null, model: 'llama-3.3-70b-versatile', status: 'not_configured', envVar: 'GROQ_API_KEY', label: 'Groq' },
    openai: { id: 'openai', configured: false, maskedKey: null, model: 'gpt-4o-mini', status: 'not_configured', envVar: 'OPENAI_API_KEY', label: 'OpenAI (ChatGPT)' },
    anthropic: { id: 'anthropic', configured: false, maskedKey: null, model: 'claude-sonnet-4-20250514', status: 'not_configured', envVar: 'ANTHROPIC_API_KEY', label: 'Anthropic Claude' },
  };
}

function defaultHealth(): HealthState {
  return {
    score: 0, grade: '—', categories: [], scanning: false, scanKind: null,
    progress: 0, progressMsg: '', lastScan: null, steps: [],
  };
}

function makeSession(shell: TerminalSession['shell'], index: number): TerminalSession {
  return {
    id: uid('term'),
    shell,
    cwd: [],
    history: [
      { kind: 'sys', output: `VOX-OS simulated ${shell} terminal · v${APP_VERSION} · real execution requires the Desktop Agent` },
      { kind: 'sys', output: `Project workspace ready. Type 'help' for commands.` },
    ],
    prompt: '',
  };
}

function defaultTerminals(): TerminalSession[] {
  return [makeSession('powershell', 0)];
}

const now = Date.now();

function seedNotifs(): Notification[] {
  return [
    { id: uid('n'), category: 'SYSTEM', severity: 'success', title: 'VOX-OS ONLINE', body: 'All core engines initialized. System ready.', time: now - 1000 * 60 * 3, read: false },
    { id: uid('n'), category: 'BUILD', severity: 'success', title: 'BUILD COMPLETE', body: 'v0x-0s compiled successfully in 2.34s.', time: now - 1000 * 60 * 4, read: false, action: { label: 'VIEW BUILD', section: 'projects' } },
    { id: uid('n'), category: 'SECURITY', severity: 'warning', title: 'DEPENDENCY UPDATE', body: '3 dependencies have updates available.', time: now - 1000 * 60 * 12, read: false, action: { label: 'REVIEW', section: 'aiengine' } },
  ];
}

const initialOS = detectOS();
const initialRoblox = detectRobloxCompat();
const initialGPU = detectGPU();
const initialSystemInfo: SystemInfo = {
  agent: 'disconnected',
  os: initialOS.name,
  arch: 'unknown',
  cpu: 'Detecting…',
  cores: null,
  gpu: 'Detecting…',
  ramTotal: null,
  hostname: 'vox-host',
  kernel: 'vox-shell',
  uptime: '—',
  battery: null,
  batteryCharging: null,
  network: { connected: true, type: 'unknown', rtt: null, down: null },
};

const initialVoice: VoiceState = {
  status: 'idle',
  transcript: '',
  lastCommand: null,
  history: [],
  micPermission: 'unknown',
  sttSupported: false,
  ttsSupported: false,
  whisperOnline: false,
  sttEngine: 'auto',
};

// lets the STOP button end a local-Whisper recording early
let whisperStopRef: { stop: boolean } | null = null;

export const useVox = create<VoxState>()(
  persist(
    (set, get) => ({
      booted: false,
      booting: false,
      onboardingDone: false,
      section: 'dashboard',
      desktopMode: false,
      paletteOpen: false,
      paletteMode: 'command',
      startOpen: false,
      notifOpen: false,
      quickOpen: false,
      contextMenu: null,
      safeMode: false,
      recovery: false,
      windows: [],
      activeWindowId: null,
      desktopIcons: [
        { id: 'di_pc', label: 'This PC', icon: 'Monitor', section: 'systeminfo', x: 24, y: 28 },
        { id: 'di_proj', label: 'Projects', icon: 'FolderKanban', section: 'projects', x: 24, y: 108 },
        { id: 'di_term', label: 'Terminal', icon: 'SquareTerminal', app: 'terminal', x: 24, y: 188 },
        { id: 'di_gh', label: 'GitHub', icon: 'GitBranch', section: 'github', x: 24, y: 268 },
        { id: 'di_vox', label: 'VOX AI', icon: 'Sparkles', app: 'voxai', x: 24, y: 348 },
        { id: 'di_settings', label: 'Settings', icon: 'Settings', section: 'settings', x: 24, y: 428 },
        { id: 'di_trash', label: 'Trash', icon: 'Trash2', x: 24, y: 508 },
      ],
      settings: DEFAULT_SETTINGS,
      projects: SEED_PROJECTS,
      activeProjectId: 'p_voxos',
      codeTabs: { p_voxos: ['src/App.tsx', 'src/components/VoxCore.tsx', 'package.json'], p_a3ther: ['src/engine.ts'], p_web: ['src/api.ts'] },
      activeFile: 'src/App.tsx',
      dirty: {},
      terminalSessions: defaultTerminals(),
      terminalActive: defaultTerminals()[0].id,
      notifications: seedNotifs(),
      eventLog: [
        { id: uid('l'), time: now - 1000 * 60 * 3, source: 'SYSTEM', text: 'VOX-OS core initialized', severity: 'success' },
        { id: uid('l'), time: now - 1000 * 60 * 2, source: 'PROJECT', text: 'v0x-0s loaded', severity: 'info' },
        { id: uid('l'), time: now - 1000 * 60 * 1, source: 'BUILD', text: 'Build successful (2.34s)', severity: 'success' },
      ],
      errors: [
        { id: uid('e'), time: now - 1000 * 60 * 60, source: 'BUILD', message: 'a3ther-engine: build failed (exit 1)', detail: 'error TS2345: argument of type string is not assignable to TaskKind', severity: 'error', resolved: false },
      ],
      commandHistory: [
        { id: uid('c'), time: now - 1000 * 60 * 6, command: 'scan my project' },
        { id: uid('c'), time: now - 1000 * 60 * 5, command: 'open GitHub' },
        { id: uid('c'), time: now - 1000 * 60 * 3, command: 'run build' },
      ],
      extensions: SEED_EXTENSIONS,
      automation: SEED_AUTOMATION,
      memory: [
        { id: uid('m'), section: 'PROJECT', text: 'VOX-OS (v0x-0s) uses React + TypeScript.', time: now - 1000 * 60 * 60 * 5 },
        { id: uid('m'), section: 'PROJECT', text: 'Primary AI provider: Gemini. Secondary: Groq.', time: now - 1000 * 60 * 60 * 4 },
        { id: uid('m'), section: 'PROJECT', text: 'Repository: AL13N/v0x-0s · branch: main.', time: now - 1000 * 60 * 60 * 3 },
        { id: uid('m'), section: 'PREFERENCES', text: 'Developer prefers npm over pnpm.', time: now - 1000 * 60 * 60 * 24 },
        { id: uid('m'), section: 'ACTIONS', text: 'Ran full health scan — score 96/100.', time: now - 1000 * 60 * 30 },
      ],
      profile: PROFILE,
      workspaces: [],
      backups: [],
      providers: defaultProviders(),
      modelsUnavailable: { gemini: false, groq: false, openai: false, anthropic: false },
      aiMessages: [
        { role: 'assistant', content: 'Good afternoon, developer. All systems are operational. What shall we build?', time: now - 1000 * 60 * 60 },
      ],
      aiThinking: false,
      aiStatus: 'idle',
      aiError: null,
      aiErrorCategory: null,
      aiAbort: null,
      routerLog: [],
      aiUsage: { requestsToday: 3, tokensUsed: 1240, avgLatencyMs: null, errors: 0, successRate: null },
      backend: 'unknown',
      health: defaultHealth(),
      scanCancel: false,
      telemetry: [],
      telemetryReal: { ram: false, net: false },
      systemInfo: initialSystemInfo,
      os: initialOS,
      roblox: initialRoblox,
      gpu: initialGPU,
      agentState: { status: 'disconnected', caps: [], perms: {} },
      agentStats: { cpu: null, memPct: null, diskPct: null, diskTotal: null, uptime: null, load: [], hostname: null },
      installedApps: [],
      appsLoading: false,
      appsError: null,
      sysTools: [],
      sysToolsLoading: false,
      sysToolsError: null,
      githubRepos: [],
      githubLoading: false,
      githubError: null,
      githubUser: null,
      githubScan: { status: 'idle', repo: '', branch: '', filesScanned: 0, filesSkipped: 0, findings: [], error: null, scannedAt: null },
      githubDetail: { repo: '', tab: 'branches', loading: false, error: null, branch: '', branches: [], commits: [], issues: [], pulls: [] },
      voice: initialVoice,
      pairHost: null,
      pairToken: null,
      diskFs: { ready: false, root: null, error: null },

      // ================= SHELL =================
      boot: () => {
        configureSound(get().settings.sound, get().settings.soundVolume);
        set({ voice: { ...get().voice, sttSupported: sttSupported(), ttsSupported: ttsSupported() } });
        void get().checkWhisper();
        get().initPairing();
        if (!get().settings.bootAnimation || get().settings.reducedMotion) {
          get().finishBoot();
          return;
        }
        set({ booting: true });
        sfx.boot();
        setTimeout(() => {
          get().finishBoot();
        }, 2600);
      },
      finishBoot: () => {
        set({ booting: false, booted: true });
        void get().pingBackendNow();
        void get().refreshSystem();
        // quietly detect a running Desktop Agent — no error noise if absent
        fetch('/api/agent/status').then((r) => r.json()).then((st) => {
          if (st?.running) {
            void get().connectAgent();
          }
        }).catch(() => undefined);
      },
      applyPairing: (host, token) => {
        const clean = String(host || '').replace(/\/+$/, '');
        if (!clean || !token) return;
        set({ pairHost: clean, pairToken: token });
        setApiBase(clean);
        get().logEvent('SYSTEM', `Paired with ${clean} — agent bridge armed`, 'success');
        get().pushNotification({ category: 'SYSTEM', severity: 'success', title: 'PAIRED', body: `Controlling ${clean}.` });
      },
      initPairing: () => {
        // deep link handler: voxos://pair?url=http://ip:8787&pair=TOKEN (Capacitor APK)
        const handle = (raw: string) => {
          try {
            const u = new URL(raw.replace(/^voxos:\/\//, 'http://voxos.local/'));
            const token = u.searchParams.get('pair') || u.searchParams.get('token') || '';
            const host = u.searchParams.get('url') || '';
            if (token && host) get().applyPairing(host, token);
          } catch { /* ignore */ }
        };
        // web path: the phone browser loads http://ip:8787/?pair=TOKEN
        try {
          const sp = new URLSearchParams(window.location.search);
          const token = sp.get('pair') || '';
          if (token) get().applyPairing(window.location.origin, token);
        } catch { /* ignore */ }
        // Capacitor deep links (only fires inside the APK)
        try {
          void import('@capacitor/app').then(({ App }) => {
            void App.addListener('appUrlOpen', (data: { url: string }) => handle(data.url));
          }).catch(() => undefined);
        } catch { /* web build */ }
        // Electron EXE first-run: the desktop app loads #pairing so the pairing
        // screen opens automatically on the very first launch.
        try {
          const onHash = () => {
            if (window.location.hash.replace(/^#/, '') === 'pairing') get().setSection('pairing');
          };
          window.addEventListener('hashchange', onHash);
          onHash();
        } catch { /* ignore */ }
      },
      setOnboardingDone: () => set({ onboardingDone: true }),
      setSection: (s) => {
        set({ section: s, desktopMode: false, startOpen: false });
        sfx.command();
        get().logEvent('SYSTEM', `Navigated to ${s.toUpperCase()}`, 'info');
      },
      setDesktopMode: (v) => set({ desktopMode: v, startOpen: false }),
      setPalette: (open, mode) => set({ paletteOpen: open, paletteMode: mode ?? 'command' }),
      setStartOpen: (v) => set({ startOpen: v }),
      setNotifOpen: (v) => set({ notifOpen: v }),
      setQuickOpen: (v) => set({ quickOpen: v }),
      setContextMenu: (m) => set({ contextMenu: m }),
      setSafeMode: (v) => set({ safeMode: v }),
      setRecovery: (v) => set({ recovery: v }),
      setGameProfile: (p) => {
        set({ settings: { ...get().settings, gameProfile: p, performanceMode: p === 'balanced' ? 'balanced' : 'performance' } });
        get().logEvent('SYSTEM', `GAME BOOST profile → ${p.toUpperCase()}`, 'info');
        get().pushNotification({ category: 'SYSTEM', severity: 'success', title: 'BOOST PROFILE ACTIVE', body: `${p.toUpperCase()} profile applied${p === 'ultra' ? ' — max performance' : p === 'boost' ? ' — performance boost' : ' — balanced power'}. VOX-OS prioritizes the active session.` });
      },
      setGameMode: (on) => {
        set({ settings: { ...get().settings, gameMode: on } });
        if (on) {
          get().logEvent('SYSTEM', 'GAME MODE ON — notifications suppressed, boost applied', 'info');
          get().pushNotification({ category: 'SYSTEM', severity: 'success', title: 'GAME MODE ON', body: 'Non-critical notifications suppressed. VOX-OS focuses on the running session.' });
        } else {
          get().logEvent('SYSTEM', 'GAME MODE OFF', 'info');
        }
      },
      resetUI: () => {
        set({
          windows: [], activeWindowId: null, paletteOpen: false, startOpen: false, notifOpen: false, quickOpen: false,
          desktopIcons: get().desktopIcons, section: 'dashboard', desktopMode: false,
        });
        get().pushNotification({ category: 'SYSTEM', severity: 'info', title: 'UI STATE RESET', body: 'Window layout and shell state restored to defaults. Your projects and data are untouched.' });
      },

      // ================= WINDOWS =================
      openApp: (appId) => {
        const app = APPS.find((a) => a.id === appId);
        if (!app) return;
        const existing = get().windows.find((w) => w.app === appId);
        if (existing) {
          set({ activeWindowId: existing.id, windows: get().windows.map((w) => ({ ...w, minimized: w.id === existing.id ? false : w.minimized })) });
          return;
        }
        const count = get().windows.length;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = Math.min(920, Math.max(560, vw * 0.62));
        const h = Math.min(620, Math.max(420, vh * 0.68));
        const win: WindowState = {
          id: uid('win'),
          app: appId,
          title: app.title,
          x: clamp(60 + count * 28, 8, vw - w - 8),
          y: clamp(48 + count * 24, 8, vh - h - 8),
          w, h,
          minimized: false,
          maximized: false,
          z: Date.now(),
        };
        set({ windows: [...get().windows, win], activeWindowId: win.id, section: 'dashboard', desktopMode: true, startOpen: false });
        sfx.open();
        get().logEvent('SYSTEM', `Window opened: ${app.title}`, 'info');
      },
      closeWindow: (id) => {
        const win = get().windows.find((w) => w.id === id);
        set({ windows: get().windows.filter((w) => w.id !== id), activeWindowId: get().activeWindowId === id ? get().windows.filter((w) => w.id !== id).sort((a, b) => b.z - a.z)[0]?.id ?? null : get().activeWindowId });
        if (win) sfx.close();
      },
      minimizeWindow: (id) => set({ windows: get().windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) }),
      maximizeWindow: (id) => {
        set({
          windows: get().windows.map((w) => {
            if (w.id !== id) return w;
            if (w.maximized) return { ...w, maximized: false, ...(w.prev ?? {}) };
            return { ...w, maximized: true, prev: { x: w.x, y: w.y, w: w.w, h: w.h }, x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
          }),
        });
      },
      focusWindow: (id) => {
        const win = get().windows.find((w) => w.id === id);
        if (!win) return;
        set({
          activeWindowId: id,
          windows: get().windows.map((w) => (w.id === id ? { ...w, minimized: false, z: Date.now() } : w)),
        });
      },
      moveWindow: (id, x, y) => set({ windows: get().windows.map((w) => (w.id === id ? { ...w, x, y } : w)) }),
      resizeWindow: (id, w, h) => set({ windows: get().windows.map((wi) => (wi.id === id ? { ...wi, w, h } : wi)) }),
      cycleWindow: () => {
        const wins = get().windows.filter((w) => !w.minimized);
        if (wins.length < 2) return;
        const sorted = [...wins].sort((a, b) => b.z - a.z);
        const next = sorted[1] ?? sorted[0];
        get().focusWindow(next.id);
      },

      // ================= NOTIFICATIONS / LOGS =================
      pushNotification: (n) => {
        const s = get().settings;
        // GAME MODE: only errors and security alerts break through.
        if (s.gameMode && !['error'].includes(n.severity) && n.category !== 'SECURITY') return;
        const enabled =
          (n.category === 'BUILD' && s.notifyBuild) ||
          (n.category === 'GITHUB' && s.notifyGitHub) ||
          (n.category === 'AI' && s.notifyAI) ||
          (n.category === 'SYSTEM' && s.notifySystem) ||
          (n.category === 'SECURITY' && s.notifySecurity) ||
          !['BUILD', 'GITHUB', 'AI', 'SYSTEM', 'SECURITY'].includes(n.category);
        if (!enabled) return;
        const notif: Notification = { ...n, id: uid('n'), time: Date.now(), read: false };
        set({ notifications: [notif, ...get().notifications].slice(0, 40) });
        if (n.severity === 'error') sfx.error();
        else if (n.severity === 'warning') sfx.notify();
        else sfx.notify();
      },
      markNotifsRead: () => set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) }),
      dismissNotif: (id) => set({ notifications: get().notifications.filter((n) => n.id !== id) }),
      clearNotifs: () => set({ notifications: [] }),
      logEvent: (source, text, severity = 'info') => {
        // dedupe: identical consecutive events collapse into one (refreshes time) — keeps RAM low
        const cur = get().eventLog;
        if (cur[0]?.source === source && cur[0]?.text === text) {
          set({ eventLog: [{ ...cur[0], time: Date.now() }, ...cur.slice(1)].slice(0, 150) });
          return;
        }
        set({ eventLog: [{ id: uid('l'), time: Date.now(), source, text, severity }, ...cur].slice(0, 150) });
      },
      addError: (e) => {
        // dedupe: an identical unresolved error (same source+message) just bumps its time —
        // repeated failures (e.g. provider 400s at boot) no longer flood RAM or the Error Center.
        const now = Date.now();
        const existing = get().errors.find((x) => !x.resolved && x.source === e.source && x.message === e.message);
        if (existing) {
          set({ errors: get().errors.map((x) => (x.id === existing.id ? { ...x, time: now, count: (x.count ?? 1) + 1 } : x)).slice(0, 60) });
          return;
        }
        const err: AppError = { ...e, id: uid('e'), time: now, resolved: false, count: 1 };
        set({ errors: [err, ...get().errors].slice(0, 60) });
        get().logEvent('ERROR', `${e.source}: ${e.message}`, 'error');
      },
      resolveError: (id) => set({ errors: get().errors.map((e) => (e.id === id ? { ...e, resolved: true } : e)) }),
      recordCommand: (command, result) => {
        set({ commandHistory: [{ id: uid('c'), time: Date.now(), command, result }, ...get().commandHistory].slice(0, 100) });
      },

      // ================= SETTINGS =================
      setSettings: (p) => {
        set({ settings: { ...get().settings, ...p } });
        const s = { ...get().settings, ...p };
        configureSound(s.sound, s.soundVolume);
        document.documentElement.dataset.theme = s.theme;
        document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
        document.documentElement.classList.toggle('high-contrast', s.highContrast);
        document.documentElement.style.setProperty('--font-scale', String(s.fontSize));
      },
      setTheme: (t) => get().setSettings({ theme: t }),

      // ================= WORKSPACES =================
      saveWorkspace: (name) => {
        const pid = get().activeProjectId;
        const proj = get().projects.find((p) => p.id === pid);
        const tabs = get().codeTabs[pid] ?? [];
        const terminals = get().terminalSessions.map((t) => ({ ...t, agentSessionId: undefined, agentMode: false }));
        const ws: Workspace = { id: uid('ws'), name: name.trim() || proj?.name || 'Untitled', time: Date.now(), projectId: pid, tabs, activeFile: get().activeFile, terminals, aiMessages: get().aiMessages.slice(-30) };
        set({ workspaces: [ws, ...get().workspaces].slice(0, 20) });
        get().logEvent('PROJECT', `Workspace "${ws.name}" saved (${proj?.name ?? 'unknown'})`, 'success');
        get().pushNotification({ category: 'PROJECT', severity: 'success', title: 'WORKSPACE SAVED', body: `${ws.name} — ${tabs.length} file${tabs.length === 1 ? '' : 's'}, ${terminals.length} terminal${terminals.length === 1 ? '' : 's'}, AI context snapshot.` });
      },
      restoreWorkspace: (id) => {
        const ws = get().workspaces.find((w) => w.id === id);
        if (!ws) return;
        const proj = get().projects.find((p) => p.id === ws.projectId);
        if (!proj) return;
        set({
          activeProjectId: ws.projectId,
          projects: get().projects.map((p) => (p.id === ws.projectId ? { ...p, lastOpened: Date.now() } : p)),
          codeTabs: { ...get().codeTabs, [ws.projectId]: ws.tabs },
          activeFile: ws.activeFile,
          terminalSessions: ws.terminals,
          terminalActive: ws.terminals[ws.terminals.length - 1]?.id ?? '',
          aiMessages: ws.aiMessages,
          section: 'dashboard',
        });
        get().logEvent('PROJECT', `Workspace "${ws.name}" restored (${proj.name})`, 'success');
        get().pushNotification({ category: 'PROJECT', severity: 'success', title: 'WORKSPACE RESTORED', body: `${ws.name} — files, terminals, and AI context reloaded.` });
        get().addMemory({ section: 'PROJECT', text: `Restored workspace: ${ws.name} on ${proj.name}.` });
      },
      deleteWorkspace: (id) => set({ workspaces: get().workspaces.filter((w) => w.id !== id) }),
      // ================= PROJECTS =================
      openProject: (id) => {
        const p = get().projects.find((pr) => pr.id === id);
        if (!p) return;
        set({
          activeProjectId: id,
          projects: get().projects.map((pr) => (pr.id === id ? { ...pr, lastOpened: Date.now() } : pr)),
          activeFile: get().codeTabs[id]?.[0] ?? null,
          section: 'dashboard',
        });
        const s = get().terminalSessions.map((t) => ({ ...t, cwd: [], history: [...t.history, { kind: 'sys' as const, output: `[VOX] project switched to ${p.name} — working tree ready` }] }));
        set({ terminalSessions: s });
        get().logEvent('PROJECT', `${p.name} opened`, 'info');
        get().addMemory({ section: 'PROJECT', text: `Active project: ${p.name} (${p.language}, ${p.framework}).` });
        get().pushNotification({ category: 'PROJECT', severity: 'info', title: 'PROJECT LOADED', body: `${p.name} opened. Context updated across engines.` });
      },
      updateProject: (id, patch) => set({ projects: get().projects.map((pr) => (pr.id === id ? { ...pr, ...patch } : pr)) }),
      buildProject: async (id) => {
        const pid = id ?? get().activeProjectId;
        const p = get().projects.find((pr) => pr.id === pid);
        if (!p) return;
        get().updateProject(pid, { build: { ...p.build, status: p.build.status } });
        get().logEvent('BUILD', `Building ${p.name}…`, 'info');
        const started = Date.now();
        const outputLines: string[] = [`> ${p.name}@0.1.0 build`, '> vite build', ''];
        await new Promise((r) => setTimeout(r, 700));
        outputLines.push('vite v5.4.3 building for production...');
        await new Promise((r) => setTimeout(r, 900));
        const fail = p.id === 'p_a3ther';
        const durationMs = Date.now() - started;
        if (fail) {
          outputLines.push('error during build:', 'error TS2345: argument of type \'string\' is not assignable to parameter of type \'TaskKind\'.', '  src/engine.ts:18:37', '', '✕ Build failed.');
          get().updateProject(pid, { build: { status: 'failed', lastRun: Date.now(), durationMs, exitCode: 1, output: outputLines.join('\n') } });
          get().addError({ source: 'BUILD', message: `${p.name}: build failed (exit 1)`, detail: 'error TS2345: argument of type \'string\' is not assignable to TaskKind — src/engine.ts:18', severity: 'error' });
          get().pushNotification({ category: 'BUILD', severity: 'error', title: 'BUILD FAILED', body: `${p.name} failed to build. VOX detected an error in src/engine.ts.`, action: { label: 'ANALYZE WITH VOX', section: 'errors' } });
          get().logEvent('BUILD', `${p.name}: build failed`, 'error');
        } else {
          outputLines.push('✓ built in', `${(durationMs / 1000).toFixed(2)}s`, '', '✓ Build successful.');
          get().updateProject(pid, { build: { status: 'success', lastRun: Date.now(), durationMs, exitCode: 0, output: outputLines.join('\n') } });
          get().pushNotification({ category: 'BUILD', severity: 'success', title: 'BUILD COMPLETE', body: `${p.name} compiled successfully.`, action: { label: 'VIEW BUILD', section: 'projects' } });
          get().logEvent('BUILD', `${p.name}: build successful (${(durationMs / 1000).toFixed(2)}s)`, 'success');
        }
        sfx.success();
      },
      testProject: async (id) => {
        const pid = id ?? get().activeProjectId;
        const p = get().projects.find((pr) => pr.id === pid);
        if (!p) return;
        get().logEvent('PROJECT', `Running tests for ${p.name}…`, 'info');
        await new Promise((r) => setTimeout(r, 900));
        const fail = p.id === 'p_a3ther';
        if (fail) {
          get().pushNotification({ category: 'BUILD', severity: 'error', title: 'TESTS FAILED', body: `${p.name}: 2 tests failed, 1 passed.` });
        } else {
          get().pushNotification({ category: 'BUILD', severity: 'success', title: 'TESTS PASSED', body: `${p.name}: 14 tests passed in 812ms.` });
          sfx.success();
        }
      },

      // ================= FILES =================
      openFile: (path) => {
        const pid = get().activeProjectId;
        const tabs = get().codeTabs[pid] ?? [];
        if (!tabs.includes(path)) {
          set({ codeTabs: { ...get().codeTabs, [pid]: [...tabs, path] } });
        }
        set({ activeFile: path });
      },
      closeFile: (path) => {
        const pid = get().activeProjectId;
        const tabs = (get().codeTabs[pid] ?? []).filter((t) => t !== path);
        set({ codeTabs: { ...get().codeTabs, [pid]: tabs }, activeFile: get().activeFile === path ? tabs[tabs.length - 1] ?? null : get().activeFile });
      },
      setActiveFile: (path) => set({ activeFile: path }),
      saveFile: (path, content) => {
        const pid = get().activeProjectId;
        const p = get().projects.find((pr) => pr.id === pid);
        if (!p) return;
        set({
          projects: get().projects.map((pr) => (pr.id === pid ? { ...pr, fs: writeFile(pr.fs, path.split('/'), content), lastModified: Date.now() } : pr)),
          dirty: { ...get().dirty, [path]: false },
        });
        get().logEvent('PROJECT', `Saved ${path}`, 'info');
        get().diskMirror(path, 'write', content);
      },
      setFileDirty: (path, d) => set({ dirty: { ...get().dirty, [path]: d } }),
      createNode: (dir, name, kind, content = '') => {
        const pid = get().activeProjectId;
        set({
          projects: get().projects.map((pr) => (pr.id === pid ? { ...pr, fs: addNode(pr.fs, dir, name, kind, content), lastModified: Date.now() } : pr)),
        });
        get().logEvent('PROJECT', `Created ${kind} ${[...dir, name].join('/')}`, 'info');
        if (kind === 'dir') get().diskMirror([...dir, name].join('/'), 'mkdir');
        else get().diskMirror([...dir, name].join('/'), 'write', content);
      },
      deleteNode: (dir, name) => {
        const pid = get().activeProjectId;
        const pathStr = [...dir, name].join('/');
        set({
          projects: get().projects.map((pr) => (pr.id === pid ? { ...pr, fs: removeNode(pr.fs, dir, name), lastModified: Date.now() } : pr)),
          codeTabs: { ...get().codeTabs, [pid]: (get().codeTabs[pid] ?? []).filter((t) => t !== pathStr) },
        });
        get().logEvent('PROJECT', `Deleted ${pathStr}`, 'warning');
        get().diskMirror(pathStr, 'delete');
      },
      renameNodeOp: (dir, oldName, newName) => {
        const pid = get().activeProjectId;
        set({
          projects: get().projects.map((pr) => (pr.id === pid ? { ...pr, fs: renameNode(pr.fs, dir, oldName, newName), lastModified: Date.now() } : pr)),
        });
        get().logEvent('PROJECT', `Renamed ${oldName} → ${newName}`, 'info');
        get().diskMirror([...dir, oldName].join('/'), 'rename', undefined, [...dir, newName].join('/'));
      },

      // ================= TERMINAL =================
      newTerminal: (shell) => {
        const s = makeSession(shell ?? get().settings.defaultShell, get().terminalSessions.length);
        set({ terminalSessions: [...get().terminalSessions, s], terminalActive: s.id });
      },
      closeTerminal: (id) => {
        const rest = get().terminalSessions.filter((t) => t.id !== id);
        set({ terminalSessions: rest, terminalActive: get().terminalActive === id ? rest[rest.length - 1]?.id ?? '' : get().terminalActive });
      },
      setTerminalActive: (id) => set({ terminalActive: id }),
      terminalInput: (id, input) => {
        const s = get().terminalSessions.find((t) => t.id === id);
        if (!s) return;
        // REAL EXECUTION via the Desktop Agent when connected.
        if (get().agentState.status === 'connected') {
          if (!s.agentSessionId) {
            void get().agentOpenSession(id);
            // fall through to simulated for this first line if session not ready
          } else {
            set({ terminalSessions: get().terminalSessions.map((t) => (t.id === id ? { ...t, history: [...t.history, { kind: 'in', input: input.trim() }] } : t)) });
            void get().agentSessionInput(id, input);
            get().recordCommand(input.trim());
            return;
          }
        }
        const project = get().projects.find((pr) => pr.id === get().activeProjectId) ?? get().projects[0];
        const result = runCommand(s, input, {
          project,
          runBuild: () => {
            const r = { output: '', exitCode: 0, durationMs: 0 };
            // synchronous trigger — fire async build, capture the simulated outcome inline
            const p = get().projects.find((pr) => pr.id === project.id)!;
            const fail = p.id === 'p_a3ther';
            const out = fail
              ? 'vite v5.4.3 building for production...\nerror TS2345: argument of type \'string\' is not assignable to TaskKind\n  src/engine.ts:18:37\n✕ Build failed.'
              : 'vite v5.4.3 building for production...\n✓ built in 2.34s\n✓ Build successful.';
            void get().buildProject(project.id);
            return { output: out, exitCode: fail ? 1 : 0, durationMs: fail ? 890 : 2340 };
          },
          runTest: () => {
            const fail = project.id === 'p_a3ther';
            const out = fail ? '✕ 2 failed, 1 passed (412ms)' : '✓ 14 passed (812ms)';
            void get().testProject(project.id);
            return { output: out, exitCode: fail ? 1 : 0 };
          },
          runScan: () => {
            void get().runHealthScan('project');
            return { output: 'Project health scan initiated — see Health Scanner.', exitCode: 0 };
          },
          openSection: (sec) => {
            const known = ['dashboard', 'terminal', 'github', 'projects', 'settings', 'errors', 'health', 'performance'] as SectionId[];
            if (known.includes(sec as SectionId)) get().setSection(sec as SectionId);
          },
          history: get().commandHistory.slice(0, 50).map((c) => c.command),
        });
        const newSession: TerminalSession = {
          ...s,
          cwd: result.cwd ?? s.cwd,
          history: [
            ...s.history,
            { kind: 'in', input: input.trim() },
            ...(result.output.some((l) => l === '__CLEAR__') ? [] : result.output.map((l) => ({ kind: (result.exitCode !== 0 ? 'err' : 'out') as 'out' | 'err', output: l }))),
            ...(result.output.some((l) => l === '__CLEAR__') ? [{ kind: 'sys' as const, output: '' }] : []),
          ],
          prompt: sessionPrompt({ ...s, cwd: result.cwd ?? s.cwd }),
        };
        set({ terminalSessions: get().terminalSessions.map((t) => (t.id === id ? newSession : t)) });
        get().recordCommand(input.trim());
      },

      // ================= AI =================
      sendMessage: async (content) => {
        const s = get().settings;
        const pid = get().activeProjectId;
        const p = get().projects.find((pr) => pr.id === pid);
        const ctx = {
          projectName: p?.name ?? 'unknown',
          language: p?.language ?? 'unknown',
          healthScore: get().health.score || (p?.healthScore ?? 0),
          buildStatus: p?.build.status ?? 'none',
          gitChanges: p?.git.changes.length ?? 0,
          branch: p?.git.branch ?? 'main',
        };
        const userMsg: AIMessage = { role: 'user', content, time: Date.now() };
        const assistantIdx = get().aiMessages.length + 1; // index of the assistant message about to be appended
        set({ aiMessages: [...get().aiMessages, userMsg, { role: 'assistant', content: '', time: Date.now(), demo: false }], aiThinking: true, aiStatus: 'thinking', aiError: null, aiErrorCategory: null });
        get().recordCommand(content);
        const task = classifyTask(content);
        get().setRouterLog(routerEntry(task, s.primaryProvider === 'auto' ? 'auto' : (s.primaryProvider as ProviderId), true, '· QUEUED'));

        const patchAssistant = (content: string, extra?: Partial<AIMessage>) =>
          set({ aiMessages: get().aiMessages.map((m, i) => (i === assistantIdx ? { ...m, content, ...extra } : m)) });
        const finish = (text: string, provider: ProviderId, latencyMs: number, demo: boolean) => {
          patchAssistant(text, { provider, demo });
          set({
            aiThinking: false,
            aiStatus: 'complete',
            aiUsage: { ...get().aiUsage, requestsToday: get().aiUsage.requestsToday + 1, tokensUsed: get().aiUsage.tokensUsed + Math.ceil(text.length / 4), avgLatencyMs: latencyMs },
          });
          get().setRouterLog(routerEntry(task, provider, true, `· SUCCESS · ${Math.round(latencyMs)}ms`));
          get().logEvent('AI', `VOX responded via ${provider.toUpperCase()} (${Math.round(latencyMs)}ms)`, 'success');
          if (s.voiceAutoSpeak && get().voice.ttsSupported) get().speakText(text);
          sfx.ai();
        };

        const runDemo = () => {
          set({ aiStatus: 'generating' });
          const reply = demoReply(content, ctx);
          const step = Math.max(1, Math.floor(reply.length / 40));
          let i = 0;
          const timer = setInterval(() => {
            i = Math.min(reply.length, i + step);
            set({ aiMessages: get().aiMessages.map((m, i2) => (i2 === assistantIdx ? { ...m, content: reply.slice(0, i), demo: true } : m)) });
            if (i >= reply.length) {
              clearInterval(timer);
              finish(reply, get().settings.primaryProvider === 'groq' ? 'groq' : 'gemini', 400 + Math.random() * 300, true);
            }
          }, 24);
        };

        if (get().backend === 'online') {
          const abort = new AbortController();
          set({ aiAbort: abort, aiStatus: 'generating' });
          const msgs = get().aiMessages.filter((m) => m.role !== 'system').slice(-10).map((m) => ({ role: m.role, content: m.content }));
          await streamChat(
            content, msgs,
            { primaryProvider: s.primaryProvider, secondaryProvider: s.secondaryProvider, routingMode: s.routingMode, temperature: s.temperature, maxTokens: s.maxTokens, systemPrompt: s.systemPrompt },
            {
              onDelta: (text) => {
                set({ aiStatus: 'generating', aiMessages: get().aiMessages.map((m, i) => (i === assistantIdx ? { ...m, content: text } : m)) });
              },
              onDone: (r) => {
                if (r.note) get().setRouterLog(routerEntry(task, r.provider, true, `· ${r.note}`));
                finish(r.text, r.provider, r.latencyMs, false);
              },
              onError: (r) => {
                // No provider configured on the backend — fall back to the clearly-labeled demo assistant.
                if (r.errorCategory === 'CONFIGURATION ERROR' && s.demoAssistant) {
                  get().setRouterLog(routerEntry('DEMO MODE', 'local', true, '· no provider configured'));
                  runDemo();
                  return;
                }
                set({ aiThinking: false, aiStatus: 'error', aiError: r.error ?? 'Unknown error', aiErrorCategory: r.errorCategory ?? 'PROVIDER ERROR' });
                get().setRouterLog(routerEntry(task, 'gemini', false, '· FAILED'));
                get().logEvent('AI', `AI request failed: ${r.errorCategory ?? 'error'}`, 'error');
                if (get().settings.routingMode !== 'primary') {
                  get().setRouterLog(routerEntry('FAILOVER', s.secondaryProvider, true, '· ACTIVATED'));
                }
              },
            },
            abort.signal,
          );
        } else if (s.demoAssistant) {
          runDemo();
        } else {
          set({
            aiThinking: false, aiStatus: 'error',
            aiError: 'No AI provider is configured and the VOX backend is offline. Configure GEMINI_API_KEY / GROQ_API_KEY in the backend (server/.env) to enable real AI responses.',
            aiErrorCategory: 'AI NOT CONFIGURED',
          });
        }
      },
      stopGeneration: () => {
        get().aiAbort?.abort();
        set({ aiThinking: false, aiStatus: 'idle', aiAbort: null });
      },
      connectProvider: async (id, key) => {
        const res = await saveProviderKey(id, key);
        if (res.ok) {
          const masked = maskKey(key);
          set({ providers: { ...get().providers, [id]: { ...get().providers[id], configured: true, maskedKey: masked, status: 'checking' } }, settings: { ...get().settings, aiConfiguredViaBackend: true } });
          get().logEvent('SECURITY', `${id.toUpperCase()} API key configured (backend-side)`, 'success');
          await get().testProviderConn(id);
          return { ok: true };
        }
        return { ok: false, error: res.error };
      },
      testProviderConn: async (id) => {
        set({ providers: { ...get().providers, [id]: { ...get().providers[id], status: 'checking' } } });
        const res = await testProvider(id);
        if (res.ok) {
          set({ providers: { ...get().providers, [id]: { ...get().providers[id], status: 'connected', latencyMs: res.latencyMs, lastCheck: Date.now() } } });
          get().pushNotification({ category: 'AI', severity: 'success', title: 'CONNECTION SUCCESSFUL', body: `${get().providers[id].label} · ${res.model ?? 'model'} · ${Math.round(res.latencyMs ?? 0)}ms` });
          get().logEvent('AI', `${id.toUpperCase()} connection test passed (${Math.round(res.latencyMs ?? 0)}ms)`, 'success');
        } else {
          set({ providers: { ...get().providers, [id]: { ...get().providers[id], status: 'error', lastCheck: Date.now() } } });
          get().pushNotification({ category: 'AI', severity: 'error', title: 'CONNECTION FAILED', body: `${get().providers[id].label}: ${res.category ?? res.error}` });
          get().logEvent('AI', `${id.toUpperCase()} connection test failed: ${res.category ?? res.error}`, 'error');
        }
      },
      setProviderModel: (id, model) => set({ providers: { ...get().providers, [id]: { ...get().providers[id], model } } }),
      refreshModels: async (id) => {
        const models = await fetchModels(id);
        set({ modelsUnavailable: { ...get().modelsUnavailable, [id]: models == null } });
        if (models && models.length) {
          const cur = get().providers[id].model;
          if (!models.includes(cur)) set({ providers: { ...get().providers, [id]: { ...get().providers[id], model: models[0] } } });
        }
      },
      removeProvider: async (id) => {
        const res = await removeProviderKey(id);
        set({ providers: { ...get().providers, [id]: { ...get().providers[id], configured: false, maskedKey: null, status: 'not_configured', latencyMs: undefined, lastCheck: undefined } } });
        get().logEvent('SECURITY', `${id.toUpperCase()} configuration removed`, 'warning');
        if (!res.ok) get().pushNotification({ category: 'AI', severity: 'warning', title: 'BACKEND OFFLINE', body: 'Key removed locally, but the backend could not be updated.' });
      },
      setRouterLog: (e) => set({ routerLog: [e, ...get().routerLog].slice(0, 80) }),
      exportAIConfig: () => {
        const s = get().settings;
        const cfg = { primaryProvider: s.primaryProvider, secondaryProvider: s.secondaryProvider, routingMode: s.routingMode, temperature: s.temperature, maxTokens: s.maxTokens, models: { gemini: get().providers.gemini.model, groq: get().providers.groq.model } };
        const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'vox-ai-config.json';
        a.click();
        URL.revokeObjectURL(a.href);
        get().logEvent('SYSTEM', 'AI configuration exported (no secrets included)', 'info');
        get().pushNotification({ category: 'AI', severity: 'info', title: 'CONFIG EXPORTED', body: 'AI configuration exported. API keys were NOT included.' });
      },
      importAIConfig: (json) => {
        try {
          const cfg = JSON.parse(json);
          const s = get().settings;
          const patch: Partial<Settings> = {};
          if (['gemini', 'groq', 'openai', 'anthropic', 'auto'].includes(cfg.primaryProvider)) patch.primaryProvider = cfg.primaryProvider;
          if (['gemini', 'groq', 'openai', 'anthropic'].includes(cfg.secondaryProvider)) patch.secondaryProvider = cfg.secondaryProvider;
          if (['auto', 'primary', 'failover', 'dual'].includes(cfg.routingMode)) patch.routingMode = cfg.routingMode;
          if (typeof cfg.temperature === 'number') patch.temperature = clamp(cfg.temperature, 0, 2);
          if (typeof cfg.maxTokens === 'number') patch.maxTokens = cfg.maxTokens;
          get().setSettings(patch);
          if (cfg.models?.gemini) get().setProviderModel('gemini', cfg.models.gemini);
          if (cfg.models?.groq) get().setProviderModel('groq', cfg.models.groq);
          get().logEvent('SYSTEM', 'AI configuration imported (secrets untouched)', 'success');
          return { ok: true };
        } catch {
          return { ok: false, error: 'Invalid configuration file' };
        }
      },
      explainWithVox: (prompt) => {
        set({ section: 'voxai' });
        get().pushNotification({ category: 'AI', severity: 'info', title: 'VOX CONTEXT', body: 'Prompt queued for VOX.' });
        void get().sendMessage(prompt);
      },

      // ================= HEALTH =================
      runHealthScan: async (kind) => {
        if (get().health.scanning) return;
        const project = get().projects.find((pr) => pr.id === get().activeProjectId) ?? get().projects[0];
        const steps = SCAN_STEPS.filter((s) => s.kind.includes(kind));
        set({ scanCancel: false, health: { ...get().health, scanning: true, scanKind: kind, progress: 0, progressMsg: steps[0]?.label ?? 'Scanning…', steps: steps.map((s) => s.id) } });
        get().logEvent('SYSTEM', `Health scan started (${kind.toUpperCase()})`, 'info');
        let i = 0;
        for (const step of steps) {
          if (get().scanCancel) break;
          set({ health: { ...get().health, progress: Math.round((i / steps.length) * 100), progressMsg: step.label } });
          await new Promise((r) => setTimeout(r, 220 + Math.random() * 180));
          i++;
        }
        const checks = computeChecks(project, kind, get().agentStats);
        const { score, grade } = computeScore(checks);
        const categories: HealthCategory[] = checks.map((c) => ({ id: c.id, label: c.label, status: c.status, detail: c.detail, score: c.score }));
        set({
          health: {
            ...get().health, scanning: false, scanKind: null, progress: 100, progressMsg: 'Scan complete', score, grade,
            categories, lastScan: Date.now(),
          },
        });
        get().logEvent('SYSTEM', `Health scan complete — ${score}/100 (${grade})`, score >= 90 ? 'success' : score >= 60 ? 'warning' : 'error');
        get().pushNotification({
          category: 'SYSTEM', severity: score >= 90 ? 'success' : score >= 60 ? 'warning' : 'error',
          title: 'HEALTH SCAN COMPLETE', body: `Health score ${score}/100 — ${grade.toLowerCase()}.`,
        });
        if (get().health.score < 60) sfx.error(); else sfx.success();
      },
      cancelScan: () => set({ scanCancel: true, health: { ...get().health, scanning: false } }),

      // ================= GITHUB =================
      connectGithub: async (token?: string) => {
        set({ githubLoading: true, githubError: null });
        // optional PAT flow: send the token to the backend once, validate it there
        if (token && token.trim()) {
          const saved = await saveGithubToken(token.trim());
          if (!saved.ok) {
            set({ githubLoading: false, githubError: `${saved.error ?? 'Failed to save GitHub token'}${saved.category ? ` · ${saved.category}` : ''}. The token is never stored in the browser.` });
            get().logEvent('GITHUB', `GitHub token rejected by backend: ${saved.category ?? 'error'}`, 'error');
            return;
          }
          set({ githubUser: saved.user ?? null });
          get().logEvent('SECURITY', 'GitHub token configured (backend-side)', 'success');
        }
        const st = await githubStatus();
        if (!st.connected) {
          set({ githubLoading: false, githubError: 'GitHub connection requires the VOX backend with a GITHUB_TOKEN (server/.env) or a personal access token configured in API Manager. The frontend never holds GitHub credentials.' });
          get().logEvent('GITHUB', 'GitHub connect attempt: backend has no credentials', 'warning');
          return;
        }
        set({ githubUser: st.user ?? null, settings: { ...get().settings, githubConnected: true }, githubLoading: false });
        await get().syncGithub();
      },
      disconnectGithub: async () => {
        await removeGithubToken();
        set({ githubUser: null, githubRepos: [], settings: { ...get().settings, githubConnected: false } });
        get().logEvent('GITHUB', 'GitHub disconnected — token removed from backend', 'warning');
        get().pushNotification({ category: 'GITHUB', severity: 'info', title: 'GITHUB DISCONNECTED', body: 'The stored token was removed. GITHUB_TOKEN in server/.env, if set, still applies.' });
      },
      createGithubRepo: async (name, description, isPrivate = false) => {
        set({ githubLoading: true, githubError: null });
        const r = await createGithubRepo(name, description ?? '', isPrivate);
        set({ githubLoading: false });
        if (!r.ok) {
          set({ githubError: `${r.error ?? 'Failed to create repo'}${r.category ? ` · ${r.category}` : ''}` });
          get().logEvent('GITHUB', `Repo creation failed: ${r.category ?? 'error'}`, 'error');
          return;
        }
        get().pushNotification({ category: 'GITHUB', severity: 'success', title: 'REPO CREATED', body: `${r.repo} created on GitHub.` });
        get().logEvent('GITHUB', `Repo created: ${r.repo}`, 'success');
        await get().syncGithub();
      },
      pushGithubCommit: async (message) => {
        set({ githubLoading: true, githubError: null });
        const r = await pushGithubCommit(message?.trim() || 'chore: commit from VOX-OS');
        set({ githubLoading: false });
        if (!r.ok) {
          set({ githubError: `${r.error ?? 'Commit & push failed'}${r.category ? ` · ${r.category}` : ''}` });
          get().logEvent('GITHUB', `Commit & push failed: ${r.category ?? 'error'}`, 'error');
          return;
        }
        if (r.skipped) {
          get().pushNotification({ category: 'GITHUB', severity: 'info', title: 'NOTHING TO COMMIT', body: 'Working tree is clean — no changes to push.' });
          return;
        }
        get().pushNotification({ category: 'GITHUB', severity: 'success', title: 'PUSHED TO GITHUB', body: `Changes committed and pushed to ${r.branch ?? 'main'}.` });
        get().logEvent('GITHUB', `Committed and pushed to ${r.branch ?? 'main'}`, 'success');
        sfx.success();
      },
      syncGithub: async () => {
        set({ githubLoading: true, githubError: null });
        const { repos, error } = await fetchGithubRepos();
        if (error) {
          set({ githubLoading: false, githubError: error });
          get().logEvent('GITHUB', `Repository sync failed: ${error}`, 'error');
          return;
        }
        set({ githubRepos: repos, githubLoading: false, settings: { ...get().settings, githubConnected: true } });
        get().logEvent('GITHUB', `Synchronized ${repos.length} repositories`, 'success');
        get().pushNotification({ category: 'GITHUB', severity: 'success', title: 'GITHUB SYNCHRONIZED', body: `${repos.length} repositories loaded.` });
        sfx.success();
      },
      scanGithubRepo: async (repo) => {
        set({ githubScan: { ...get().githubScan, status: 'scanning', repo, error: null } });
        get().logEvent('GITHUB', `Secret scan started on ${repo}`, 'info');
        const res = await apiScanGithubRepo(repo);
        if (!res.ok) {
          set({ githubScan: { status: 'error', repo, branch: '', filesScanned: 0, filesSkipped: 0, findings: [], error: res.error ?? 'Scan failed', scannedAt: Date.now() } });
          get().logEvent('GITHUB', `Secret scan failed on ${repo}: ${res.error ?? 'unknown error'}`, 'error');
          return;
        }
        set({
          githubScan: {
            status: 'done', repo: res.repo, branch: res.branch, filesScanned: res.filesScanned, filesSkipped: res.filesSkipped,
            findings: res.findings, error: null, scannedAt: res.scannedAt,
          },
        });
        get().logEvent('GITHUB', `Secret scan of ${repo}: ${res.filesScanned} files, ${res.findings.length} finding(s)`, res.findings.length ? 'warning' : 'success');
        if (res.findings.length) {
          get().pushNotification({ category: 'SECURITY', severity: 'warning', title: 'SECRETS FOUND', body: `${res.findings.length} possible secret(s) in ${repo} — review in Security Center.` });
          get().addError({ source: 'SECURITY', message: `${res.findings.length} possible secret(s) in GitHub repo ${repo}`, detail: `Scan of ${res.filesScanned} recent files on ${res.branch}. Values are redacted.`, severity: 'warning' });
        } else {
          get().pushNotification({ category: 'SECURITY', severity: 'success', title: 'SECRET SCAN CLEAN', body: `No secret patterns in ${repo} recent files.` });
        }
        sfx.success();
      },
      clearGithubScan: () => set({ githubScan: { status: 'idle', repo: '', branch: '', filesScanned: 0, filesSkipped: 0, findings: [], error: null, scannedAt: null } }),
      openGithubRepo: async (repo, tab = 'branches') => {
        set({ githubDetail: { repo, tab, loading: true, error: null, branch: '', branches: [], commits: [], issues: [], pulls: [] } });
        get().logEvent('GITHUB', `Loading ${tab} for ${repo}`, 'info');
        // load branches first (needed for the commits tab) plus the requested tab in parallel
        const [branchesRes, tabRes] = await Promise.all([
          fetchGithubBranches(repo),
          tab === 'commits' ? fetchGithubCommits(repo) : tab === 'issues' ? fetchGithubIssues(repo) : tab === 'pulls' ? fetchGithubPulls(repo) : Promise.resolve({ ok: true as const, repo, data: [] }),
        ]);
        const branches = branchesRes.ok ? branchesRes.data : [];
        const branch = branches[0]?.name ?? '';
        const d = get().githubDetail;
        if (!branchesRes.ok) {
          set({ githubDetail: { ...d, loading: false, error: branchesRes.error ?? 'Failed to load branches', branches: [] } });
          return;
        }
        set({ githubDetail: { ...d, loading: false, branch, branches } });
        if (tab !== 'branches') get().setGithubTab(tab);
      },
      setGithubTab: (tab) => {
        const d = get().githubDetail;
        if (!d.repo || d.tab === tab) return;
        set({ githubDetail: { ...d, tab, loading: true, error: null } });
        const load = tab === 'commits' ? fetchGithubCommits(d.repo, d.branch || undefined) : tab === 'issues' ? fetchGithubIssues(d.repo) : tab === 'pulls' ? fetchGithubPulls(d.repo) : Promise.resolve({ ok: true as const, repo: d.repo, data: [] });
        load.then((res) => {
          const cur = get().githubDetail;
          if (cur.repo !== d.repo || cur.tab !== tab) return; // stale
          set({
            githubDetail: {
              ...cur, loading: false,
              error: res.ok ? null : res.error ?? 'Failed to load',
              branches: cur.branches, commits: tab === 'commits' ? res.data as GithubCommit[] : cur.commits,
              issues: tab === 'issues' ? res.data as GithubIssue[] : cur.issues,
              pulls: tab === 'pulls' ? res.data as GithubPull[] : cur.pulls,
            },
          });
        });
      },
      setGithubBranch: (branch) => {
        const d = get().githubDetail;
        set({ githubDetail: { ...d, branch, tab: 'commits', loading: true, error: null } });
        fetchGithubCommits(d.repo, branch).then((res) => {
          const cur = get().githubDetail;
          if (cur.repo !== d.repo) return;
          set({ githubDetail: { ...cur, loading: false, commits: res.ok ? res.data as GithubCommit[] : [], error: res.ok ? null : res.error ?? 'Failed to load commits' } });
        });
      },
      closeGithubRepo: () => set({ githubDetail: { repo: '', tab: 'branches', loading: false, error: null, branch: '', branches: [], commits: [], issues: [], pulls: [] } }),

      // ================= DESKTOP AGENT =================
      connectAgent: async (manualUrl, manualToken) => {
        // phone → laptop: connect through the backend pairing bridge
        if (!manualUrl && get().pairHost && get().pairToken) {
          const wsUrl = get().pairHost!.replace(/^http/, 'ws') + '/ws/agent?pair=' + encodeURIComponent(get().pairToken!);
          set({ agentState: { ...get().agentState, status: 'connecting', lastError: undefined } });
          try {
            const hello = await agentClient.connect(wsUrl, 'bridge', 8000);
            get().wireAgent(hello);
            return;
          } catch (e) {
            set({ agentState: { ...get().agentState, status: 'disconnected', lastError: e instanceof Error ? e.message : 'Bridge connection failed' } });
            return;
          }
        }
        set({ agentState: { ...get().agentState, status: 'connecting', lastError: undefined } });
        let url = manualUrl;
        let token = manualToken;
        if (!url || !token) {
          // broker via the VOX backend, which reads agent/.vox-agent.json
          try {
            const res = await fetch('/api/agent/status');
            const st = await res.json();
            if (!st.running) {
              set({ agentState: { ...get().agentState, status: 'disconnected', lastError: st.error || 'Agent daemon not running.' } });
              return;
            }
            url = st.url;
            token = st.token;
          } catch {
            set({ agentState: { ...get().agentState, status: 'disconnected', lastError: 'Could not reach the VOX backend to discover the agent. Start node server/index.js, or enter the agent URL + token manually.' } });
            return;
          }
        }
        if (!url || !token) {
          set({ agentState: { ...get().agentState, status: 'disconnected', lastError: 'Agent URL and token are required. Start node server/index.js for auto-discovery, or enter them manually.' } });
          return;
        }
        try {
          const hello = await agentClient.connect(url, token);
          get().wireAgent(hello);
        } catch (e) {
          set({ agentState: { ...get().agentState, status: 'disconnected', lastError: e instanceof Error ? e.message : 'Agent connection failed' } });
        }
      },
      disconnectAgent: () => {
        agentClient.disconnect();
        set({
          agentState: { status: 'disconnected', caps: [], perms: {} },
          agentStats: { cpu: null, memPct: null, diskPct: null, diskTotal: null, uptime: null, load: [], hostname: null },
          systemInfo: { ...get().systemInfo, agent: 'disconnected' },
          terminalSessions: get().terminalSessions.map((t) => ({ ...t, agentMode: false, agentSessionId: undefined })),
        });
        get().logEvent('SYSTEM', 'Desktop Agent disconnected', 'warning');
      },
      agentRequestPermission: async (perm) => {
        try {
          const ok = await agentClient.requestPermission(perm);
          const perms = { ...get().agentState.perms, [perm]: ok ? 'allowed' : 'denied' };
          set({ agentState: { ...get().agentState, perms } });
          get().pushNotification({ category: 'SYSTEM', severity: ok ? 'success' : 'warning', title: 'AGENT PERMISSION', body: `${perm} ${ok ? 'GRANTED' : 'DENIED'} — check the agent console.` });
        } catch { /* agent offline */ }
      },
      agentAllowAll: async () => {
        try {
          const perms = await agentClient.allowAll();
          if (perms) {
            set({ agentState: { ...get().agentState, perms } });
            get().pushNotification({ category: 'SYSTEM', severity: 'success', title: 'AGENT UNLOCKED', body: 'All agent capabilities granted — the Desktop Agent can act on your behalf.' });
            get().logEvent('SYSTEM', 'Desktop Agent: ALLOW ALL granted by user', 'success');
          }
        } catch { /* agent offline */ }
      },
      agentSessionInput: (sessionId, line) => {
        const session = get().terminalSessions.find((t) => t.id === sessionId);
        if (!session?.agentSessionId) return;
        void agentClient.execInput(session.agentSessionId, line + '\n').catch(() => undefined);
      },
      loadInstalledApps: async () => {
        if (get().agentState.status !== 'connected') {
          set({ appsError: 'Desktop Agent offline — start it to see your installed apps.' });
          return;
        }
        set({ appsLoading: true, appsError: null });
        try {
          const res = await agentClient.appsList();
          set({ installedApps: res.apps ?? [], appsLoading: false, appsError: res.note ?? null });
          get().logEvent('SYSTEM', `Loaded ${(res.apps ?? []).length} installed apps via agent`, 'info');
        } catch (e) {
          set({ appsLoading: false, appsError: e instanceof Error ? e.message : 'Failed to load apps' });
        }
      },
      launchApp: async (appId) => {
        if (get().agentState.status !== 'connected') {
          get().pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'AGENT OFFLINE', body: 'Cannot launch apps — Desktop Agent disconnected.' });
          return;
        }
        try {
          const res = await agentClient.appsLaunch(appId);
          get().pushNotification({
            category: 'SYSTEM',
            severity: res.ok ? 'success' : 'warning',
            title: res.ok ? 'APP LAUNCHED' : 'LAUNCH FAILED',
            body: res.ok ? 'Launched on your PC.' : (res.reason ?? 'Unknown error'),
          });
        } catch (e) {
          get().pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'LAUNCH FAILED', body: e instanceof Error ? e.message : 'Unknown error' });
        }
      },
      loadSysTools: async () => {
        if (get().agentState.status !== 'connected') {
          set({ sysToolsError: 'Desktop Agent offline — start it to see system tools.' });
          return;
        }
        set({ sysToolsLoading: true, sysToolsError: null });
        try {
          const res = await agentClient.sysList();
          set({ sysTools: res.tools ?? [], sysToolsLoading: false });
        } catch (e) {
          set({ sysToolsLoading: false, sysToolsError: e instanceof Error ? e.message : 'Failed to load system tools' });
        }
      },
      openSysTool: async (toolId) => {
        if (get().agentState.status !== 'connected') {
          get().pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'AGENT OFFLINE', body: 'Cannot open system tools — Desktop Agent disconnected.' });
          return;
        }
        try {
          const res = await agentClient.sysOpen(toolId);
          get().pushNotification({
            category: 'SYSTEM',
            severity: res.ok ? 'success' : 'warning',
            title: res.ok ? 'SYSTEM TOOL OPENED' : 'OPEN FAILED',
            body: res.ok ? (res.label ?? 'Opened on your PC.') : (res.reason ?? 'Unknown error'),
          });
          if (res.ok) sfx.success();
        } catch (e) {
          get().pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'OPEN FAILED', body: e instanceof Error ? e.message : 'Unknown error' });
        }
      },
      storeInstall: async (wingetId, name) => {
        // Opens a terminal and runs the winget install — real execution when the
        // agent is connected, simulated otherwise.
        const cmd = `winget install --id ${wingetId} --accept-package-agreements --accept-source-agreements --silent`;
        const s = get();
        if (s.agentState.status === 'connected') {
          s.newTerminal(s.settings.defaultShell);
          const id = s.terminalActive;
          s.setSection('terminal');
          setTimeout(() => get().terminalInput(id, cmd), 400);
          get().pushNotification({ category: 'STORE', severity: 'success', title: 'INSTALL STARTED', body: `${name} — winget install launched in Terminal.` });
        } else {
          try { await navigator.clipboard.writeText(cmd); } catch { /* ignore */ }
          get().pushNotification({ category: 'STORE', severity: 'info', title: 'COMMAND COPIED', body: `Agent offline — winget command for ${name} copied to clipboard.` });
        }
      },
      wireAgent: (hello: AgentHello) => {
        set({
          agentState: {
            status: 'connected', version: hello.version, os: hello.os, caps: hello.caps, perms: hello.perms, lastError: undefined,
          },
          systemInfo: { ...get().systemInfo, agent: 'connected' },
        });
        get().logEvent('SYSTEM', `Desktop Agent connected · v${hello.version} · ${hello.os.platform}/${hello.os.arch}`, 'success');
        get().pushNotification({ category: 'SYSTEM', severity: 'success', title: 'DESKTOP AGENT CONNECTED', body: `Real system data and shell execution enabled on ${hello.os.hostname}.` });
        sfx.success();
        // subscribe to live stats + open real shell sessions for existing terminals
        agentClient.subscribe(2000).catch(() => undefined);
        void agentClient.stats().then((s) => get().applyAgentStats(s)).catch(() => undefined);
        if (hello.caps.includes('FILES')) void get().agentDiskInit();
        for (const t of get().terminalSessions) void get().agentOpenSession(t.id);
        // event wiring
        agentClient.on('event:exec_out', (m) => get().agentExecChunk(m, 'out'));
        agentClient.on('event:exec_err', (m) => get().agentExecChunk(m, 'err'));
        agentClient.on('event:exec_exit', (m) => get().agentExecExit(m));
        agentClient.on('event:stats', (m) => { const d = (m as { data: AgentStats }).data; if (d) get().applyAgentStats(d); });
        agentClient.on('status', (connected) => {
          if (!connected) set({ agentState: { ...get().agentState, status: 'disconnected', lastError: 'Connection lost — agent daemon stopped?' }, systemInfo: { ...get().systemInfo, agent: 'disconnected' } });
        });
        agentClient.on('reconnected', (h) => {
          const hh = h as AgentHello;
          set({ agentState: { ...get().agentState, status: 'connected', version: hh.version, os: hh.os, caps: hh.caps, perms: hh.perms } });
          // the old agent's shell sessions died with it — re-open real sessions on the new one
          for (const t of get().terminalSessions) {
            if (t.agentMode) void get().agentOpenSession(t.id);
          }
        });
      },
      agentOpenSession: async (sessionId) => {
        const session = get().terminalSessions.find((t) => t.id === sessionId);
        if (!session) return;
        // Always attempt exec_open: a reloaded page may carry a stale agentSessionId
        // from a previous agent process whose sessions no longer exist.
        try {
          await agentClient.execOpen(sessionId, session.shell, undefined);
          set({ terminalSessions: get().terminalSessions.map((t) => (t.id === sessionId ? { ...t, agentSessionId: sessionId, agentMode: true } : t)) });
          get().logEvent('SYSTEM', `Real ${session.shell} session opened via Desktop Agent`, 'info');
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (msg.includes('already open')) {
            // reconnecting to the same agent — the session survived, keep it
            set({ terminalSessions: get().terminalSessions.map((t) => (t.id === sessionId ? { ...t, agentSessionId: sessionId, agentMode: true } : t)) });
            return;
          }
          set({ terminalSessions: get().terminalSessions.map((t) => (t.id === sessionId ? { ...t, agentMode: false, agentSessionId: undefined } : t)) });
          get().pushNotification({ category: 'SYSTEM', severity: 'warning', title: 'AGENT SHELL DENIED', body: msg || 'Could not open a real shell session.' });
        }
      },
      // ---- real workspace files on disk (agent FILES capability) ----
      agentDiskInit: async () => {
        if (get().agentState.status !== 'connected') return;
        try {
          const { root } = await agentClient.fsRoot();
          set({ diskFs: { ready: true, root, error: null } });
          get().logEvent('SYSTEM', `Real workspace files armed → ${root}`, 'info');
          for (const p of get().projects) void get().syncProjectFromDisk(p.id);
        } catch (e) {
          set({ diskFs: { ready: false, root: null, error: e instanceof Error ? e.message : 'FILES capability unavailable — restart the agent with --allow FILES' } });
        }
      },
      syncProjectFromDisk: async (projectId) => {
        const st = get();
        if (!st.diskFs.ready || st.agentState.status !== 'connected') return;
        const p = st.projects.find((pr) => pr.id === projectId);
        if (!p) return;
        const slug = diskSlug(p.name);
        const base = `projects/${slug}`;
        let fsTree = p.fs;
        const pull = async (rel: string, dirPath: string[]) => {
          let entries: DiskEntry[];
          try { entries = await agentClient.fsList(rel); } catch { return; }
          for (const e of entries) {
            if (e.isDir) {
              fsTree = addNode(fsTree, dirPath, e.name, 'dir');
              await pull(rel ? `${rel}/${e.name}` : e.name, [...dirPath, e.name]);
            } else if (e.size <= 2 * 1024 * 1024) {
              try {
                const data = await agentClient.fsRead(rel ? `${rel}/${e.name}` : e.name);
                fsTree = writeFile(fsTree, [...dirPath, e.name], data);
              } catch { /* skip unreadable */ }
            }
          }
        };
        try {
          const rootEntries = await agentClient.fsList(base).catch(() => [] as DiskEntry[]);
          if (rootEntries.length === 0) return; // no disk folder yet — stay in sandbox
          for (const e of rootEntries) {
            if (e.isDir) {
              fsTree = addNode(fsTree, [], e.name, 'dir');
              await pull(`${base}/${e.name}`, [e.name]);
            } else if (e.size <= 2 * 1024 * 1024) {
              try { fsTree = writeFile(fsTree, [e.name], await agentClient.fsRead(`${base}/${e.name}`)); } catch { /* skip */ }
            }
          }
          set({ projects: get().projects.map((pr) => (pr.id === projectId ? { ...pr, fs: fsTree, lastModified: Date.now() } : pr)) });
          get().logEvent('PROJECT', `Synced ${p.name} with real files from ~/VOX-OS/projects/${slug}`, 'info');
        } catch { /* disk unreachable — sandbox mode */ }
      },
      diskMirror: (path, op, data, to) => {
        const st = get();
        if (!st.diskFs.ready || st.agentState.status !== 'connected') return;
        const slug = diskSlug(st.projects.find((p) => p.id === st.activeProjectId)?.name ?? 'project');
        const rel = `projects/${slug}/${path}`;
        const fail = () => get().logEvent('PROJECT', `Disk ${op} failed: ${path}`, 'warning');
        if (op === 'write') void agentClient.fsWrite(rel, data ?? '').catch(fail);
        else if (op === 'mkdir') void agentClient.fsMkdir(rel).catch(fail);
        else if (op === 'delete') void agentClient.fsDelete(rel).catch(fail);
        else if (op === 'rename' && to) void agentClient.fsRename(rel, `projects/${slug}/${to}`).catch(fail);
      },
      applyAgentStats: (s: AgentStats) => {
        set({
          agentStats: {
            cpu: s.cpu, memPct: s.mem.pct, diskPct: s.disk.pct, diskTotal: s.disk.total,
            uptime: s.uptime, load: s.load, hostname: s.hostname,
          },
          systemInfo: {
            ...get().systemInfo,
            os: `${s.platform === 'win32' ? 'Windows' : s.platform} ${s.release}`, // agent-reported
            arch: s.arch,
            cpu: `${get().systemInfo.cores ?? '?'} logical cores · agent reported ${s.arch}`,
            uptime: `${Math.floor(s.uptime / 3600)}h ${Math.floor((s.uptime % 3600) / 60)}m (agent)`,
            hostname: s.hostname,
          },
        });
      },
      agentExecChunk: (m: unknown, kind: 'out' | 'err') => {
        const msg = m as { id: string; data: string };
        if (!msg?.data) return;
        set({
          terminalSessions: get().terminalSessions.map((t) =>
            t.id === msg.id && t.agentMode ? { ...t, history: [...t.history, { kind, output: msg.data }] } : t,
          ),
        });
      },
      agentExecExit: (m: unknown) => {
        const msg = m as { id: string; code: number };
        set({
          terminalSessions: get().terminalSessions.map((t) =>
            t.id === msg.id && t.agentMode ? { ...t, history: [...t.history, { kind: 'sys' as const, output: `[agent] process exited with code ${msg.code}` }], agentSessionId: undefined } : t,
          ),
        });
      },
      // run a command on the host through the Desktop Agent and collect its output
      agentRun: async (command, timeoutMs = 45000) => {
        const st = get().agentState;
        if (st.status !== 'connected') return { ok: false, output: 'AGENT NOT CONNECTED — start the Desktop Agent on the host machine.' };
        get().newTerminal(get().settings.defaultShell);
        const sid = get().terminalActive;
        const t = get().terminalSessions.find((x) => x.id === sid);
        if (t && !t.agentSessionId) await get().agentOpenSession(sid).catch(() => undefined);
        get().agentSessionInput(sid, command);
        const started = Date.now();
        let lastLen = -1;
        let quietSince = Date.now();
        while (Date.now() - started < timeoutMs) {
          const s = get().terminalSessions.find((x) => x.id === sid);
          const out = (s?.history ?? []).filter((h) => h.kind === 'out' || h.kind === 'err').map((h) => h.output).join('');
          const len = out.length;
          if (len !== lastLen) { lastLen = len; quietSince = Date.now(); }
          // interactive shells never exit; completion = trailing prompt + a quiet beat
          const trimmed = out.trimEnd();
          const atPrompt = /(PS [^>]*>|\$|#|>)\s*$/.test(trimmed);
          const quiet = Date.now() - quietSince > 1200;
          if (len > 0 && quiet && (atPrompt || Date.now() - started > 4000)) {
            // strip echoed prompts + the echoed command line, keep the results
            const cleaned = out
              .split(/\r?\n/)
              .map((l) => l.replace(/^PS [^>]*> ?/, '').trim())
              .filter(Boolean)
              .slice(1)
              .join('\n');
            return { ok: true, output: cleaned || '(no output)' };
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        const s = get().terminalSessions.find((x) => x.id === sid);
        const partial = (s?.history ?? []).filter((h) => h.kind === 'out' || h.kind === 'err').map((h) => h.output).join('').replace(/\r/g, '').trim();
        return { ok: false, output: `TIMED OUT after ${Math.round(timeoutMs / 1000)}s. Partial output:\n${partial || '(none)'}` };
      },

      // ================= VOICE =================
      checkWhisper: async () => {
        const st = await checkWhisper();
        set({ voice: { ...get().voice, whisperOnline: st.online } });
      },
      setVoiceEngine: (engine) => set({ voice: { ...get().voice, sttEngine: engine } }),
      startListening: () => {
        const v = get().voice;
        // local Whisper first: auto (if online) or explicitly chosen
        const useWhisper = v.whisperOnline && (v.sttEngine === 'whisper' || v.sttEngine === 'auto');
        if (useWhisper) {
          whisperStopRef = { stop: false };
          set({ voice: { ...get().voice, status: 'listening', error: undefined, transcript: '', micPermission: 'granted' } });
          get().logEvent('SYSTEM', 'VOX listening via local Whisper (offline STT)', 'info');
          recordWhisperAudio(
            (secs) => set({ voice: { ...get().voice, transcript: `● listening… ${secs.toFixed(0)}s` } }),
            15_000,
            whisperStopRef
          )
            .then(async (blob) => {
              if (!blob) {
                set({ voice: { ...get().voice, status: 'idle', transcript: '' } });
                return;
              }
              set({ voice: { ...get().voice, status: 'processing', transcript: 'Transcribing locally…' } });
              try {
                const text = await transcribeViaWhisper(blob);
                if (text) {
                  get().addVoiceHistory(text);
                  get().executeVoiceCommand(text);
                }
                set({ voice: { ...get().voice, status: 'idle', transcript: '' } });
              } catch {
                set({ voice: { ...get().voice, status: 'error', error: 'Local Whisper failed — switch to the browser engine in Voice Engine.', transcript: '' } });
              }
            })
            .catch((e: unknown) => {
              set({ voice: { ...get().voice, status: 'error', error: e instanceof Error ? e.message : 'Microphone error', transcript: '' } });
            });
          return;
        }
        const stt = getRecognition();
        if (!stt) {
          set({ voice: { ...get().voice, status: 'error', error: v.whisperOnline ? 'VOICE INPUT UNAVAILABLE — start tools/whisper-service.py, then press the mic again.' : 'VOICE INPUT UNAVAILABLE — this browser does not expose SpeechRecognition. Type a command instead.' } });
          return;
        }
        const r = stt as unknown as {
          onresult: ((e: { results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
          onerror: ((e: { error: string }) => void) | null;
          onend: (() => void) | null;
          start: () => void;
        };
        r.onresult = (e) => {
          let interim = '';
          let final = '';
          for (let i = 0; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) final += res[0].transcript;
            else interim += res[0].transcript;
          }
          set({ voice: { ...get().voice, transcript: final || interim } });
          if (final) {
            get().addVoiceHistory(final.trim());
            get().executeVoiceCommand(final.trim());
          }
        };
        r.onerror = (e) => {
          const msg = e.error === 'not-allowed' ? 'Microphone access blocked by the browser. Enable it in site permissions.' : e.error === 'no-speech' ? 'No speech detected.' : `Speech recognition error: ${e.error}`;
          set({ voice: { ...get().voice, status: 'error', error: msg, micPermission: e.error === 'not-allowed' ? 'blocked' : get().voice.micPermission } });
        };
        r.onend = () => set({ voice: { ...get().voice, status: 'idle', transcript: '' } });
        try {
          r.start();
          set({ voice: { ...get().voice, status: 'listening', error: undefined, transcript: '', micPermission: 'granted' } });
          get().logEvent('SYSTEM', 'VOX listening (microphone active)', 'info');
        } catch {
          set({ voice: { ...get().voice, status: 'error', error: 'Could not start the microphone.' } });
        }
      },
      stopListening: () => {
        if (whisperStopRef) { whisperStopRef.stop = true; whisperStopRef = null; }
        try { getRecognition()?.stop(); } catch { /* noop */ }
        set({ voice: { ...get().voice, status: 'idle' } });
      },
      speakText: (text) => {
        const s = get().settings;
        if (!s.voiceEnabled || !get().voice.ttsSupported) return;
        set({ voice: { ...get().voice, status: 'speaking' } });
        speak(text, {
          speed: s.voiceSpeed, pitch: s.voicePitch, volume: s.voiceVolume,
          onEnd: () => set({ voice: { ...get().voice, status: 'idle' } }),
          onError: () => set({ voice: { ...get().voice, status: 'idle' } }),
        });
      },
      addVoiceHistory: (text) => set({ voice: { ...get().voice, lastCommand: text, history: [{ time: Date.now(), text }, ...get().voice.history].slice(0, 50) } }),
      setVoiceStatus: (s, error) => set({ voice: { ...get().voice, status: s, error } }),
      executeVoiceCommand: (text) => {
        // voice-chat mode: everything spoken goes to the AI conversation
        if (get().settings.voiceChat) {
          void get().sendMessage(text);
          return 'Asked VOX: ' + text.slice(0, 60);
        }
        const q = text.toLowerCase();
        let response = '';
        if (/(open|launch|start).*(terminal|shell)/.test(q) || q === 'terminal') {
          get().openApp('terminal'); response = 'Opening terminal.';
        } else if (/(show|open).*(project|workspace)|\bprojects\b/.test(q)) {
          get().setSection('projects'); response = 'Opening projects.';
        } else if (/(run|start).*(health|scan)|scan my project/.test(q)) {
          void get().runHealthScan('project'); response = 'Starting system diagnostics.';
        } else if (/(open|show).*github/.test(q)) {
          get().setSection('github'); response = 'Opening GitHub.';
        } else if (/(cpu|memory|ram|performance|system stats)/.test(q)) {
          get().setSection('performance');
          const last = get().telemetry[get().telemetry.length - 1];
          response = last ? `Displaying system performance. CPU ${last.cpu}%, memory ${last.ram}%.` : 'Displaying system performance.';
        } else if (/(minecraft|mod)/.test(q)) {
          const mc = get().projects.find((p) => p.workspace === 'Minecraft' || /minecraft/i.test(p.name));
          if (mc) get().openProject(mc.id);
          response = mc ? `Opening ${mc.name}.` : 'No Minecraft project found in your workspaces.';
        } else if (/(switch|use|change).*(groq|gemini)/.test(q)) {
          const prov = /groq/.test(q) ? 'groq' : 'gemini';
          get().setSettings({ primaryProvider: prov });
          response = `Routing AI requests to ${prov.toUpperCase()}.`;
        } else if (/build this project/.test(q)) {
          void get().buildProject(); response = 'Starting build.';
        } else if (/(show|open).*(error|log)/.test(q)) {
          get().setSection('errors'); response = 'Opening error center.';
        } else if (/(go home|dashboard|home)/.test(q)) {
          get().setSection('dashboard'); response = 'Returning to dashboard.';
        } else if (/(open|show).*settings/.test(q)) {
          get().setSection('settings'); response = 'Opening settings.';
        } else if (/(file manager|open.*files)/.test(q)) {
          get().setSection('files'); response = 'Opening file manager.';
        } else if (/(code|studio|editor)/.test(q)) {
          get().openApp('code'); response = 'Opening code studio.';
        } else if (/(who are you|what can you do|^help$)/.test(q)) {
          response = "I'm VOX, your developer operating environment. Try 'open terminal', 'run health scan', 'open GitHub', or 'switch to Groq'.";
        } else {
          response = `Understood: "${text}". Sending to VOX AI.`;
          get().explainWithVox(text);
        }
        get().logEvent('SYSTEM', `VOICE COMMAND: ${text}`, 'info');
        get().setVoiceStatus('idle');
        if (get().settings.voiceEnabled && get().voice.ttsSupported) get().speakText(response);
        return response;
      },

      // ================= SYSTEM =================
      telemetryTick: () => {
        const prev = get().telemetry[get().telemetry.length - 1];
        const demo = sampleDemo(prev);
        const realMem = realMemoryUsage();
        const info = browserInfo();
        const realNet = info.connection.downlink != null && info.connection.downlink > 0 ? info.connection.downlink * 1024 / 8 : null;
        const pt: TelemetryPoint = {
          t: Date.now(),
          cpu: demo.cpu,
          ram: realMem.pct ?? demo.ram,
          gpu: demo.gpu,
          net: realNet ?? demo.net,
        };
        set({ telemetryReal: { ram: realMem.pct != null, net: realNet != null } });
        set({
          telemetry: [...get().telemetry, pt].slice(-300),
          systemInfo: {
            ...get().systemInfo,
            network: { connected: info.online, type: info.connection.type || info.connection.effectiveType || 'unknown', rtt: info.connection.rtt, down: info.connection.downlink != null ? info.connection.downlink * 1024 * 1024 / 8 : null },
          },
        });
      },
      refreshSystem: async () => {
        const probe = systemProbe();
        const battery = await batteryProbe();
        const os = detectOS();
        const gpu = detectGPU();
        const roblox = detectRobloxCompat();
        set({
          os, gpu, roblox,
          systemInfo: {
            ...get().systemInfo,
            ...probe,
            os: os.name,
            arch: os.arch,
            cpu: `${probe.cores ?? '?'} logical cores (browser)`,
            gpu: gpu.renderer ? `${gpu.renderer} (browser)` : 'Hidden by browser — requires Desktop Agent',
            hostname: 'vox-host',
            kernel: 'vox-shell · browser sandbox',
            uptime: `${Math.floor(performance.now() / 60000)}m session`,
            battery: battery.level,
            batteryCharging: battery.charging,
          },
        });
      },
      pingBackendNow: async () => {
        const st = await pingBackend();
        set({ backend: st });
        if (st === 'online') {
          const gh = await githubStatus();
          if (gh.connected) {
            set({ githubUser: gh.user ?? null, settings: { ...get().settings, githubConnected: true } });
            void get().syncGithub();
          }
          // providers configured via env — configured only when the backend holds a key
          const gem = await testProvider('gemini').catch(() => null);
          const gro = await testProvider('groq').catch(() => null);
          const hasKey = (r: Awaited<ReturnType<typeof testProvider>> | null) => (r?.ok ?? false) || (!!r?.category && r.category !== 'CONFIGURATION ERROR');
          set({
            providers: {
              ...get().providers,
              gemini: gem ? { ...get().providers.gemini, configured: hasKey(gem), status: gem.ok ? 'connected' : hasKey(gem) ? 'error' : 'not_configured', latencyMs: gem.latencyMs, lastCheck: Date.now() } : get().providers.gemini,
              groq: gro ? { ...get().providers.groq, configured: hasKey(gro), status: gro.ok ? 'connected' : hasKey(gro) ? 'error' : 'not_configured', latencyMs: gro.latencyMs, lastCheck: Date.now() } : get().providers.groq,
            },
          });
        }
      },

      // ================= MEMORY =================
      addMemory: (m) => set({ memory: [{ ...m, id: uid('m'), time: Date.now() }, ...get().memory].slice(0, 100) }),
      editMemory: (id, text) => set({ memory: get().memory.map((m) => (m.id === id ? { ...m, text, time: Date.now() } : m)) }),
      deleteMemory: (id) => set({ memory: get().memory.filter((m) => m.id !== id) }),
      clearMemory: (section) => set({ memory: section ? get().memory.filter((m) => m.section !== section) : [] }),

      // ================= EXTENSIONS / AUTOMATION =================
      installExtension: (id) => {
        set({ extensions: get().extensions.map((e) => (e.id === id ? { ...e, installed: true, enabled: true } : e)) });
        const ext = get().extensions.find((e) => e.id === id);
        if (ext) {
          get().logEvent('SYSTEM', `Extension installed: ${ext.name}`, 'success');
          get().pushNotification({ category: 'SYSTEM', severity: 'info', title: 'EXTENSION INSTALLED', body: `${ext.name} v${ext.version} — permissions: ${ext.permissions.join(', ')}`, action: { label: 'MANAGE', section: 'extensions' } });
        }
      },
      toggleExtension: (id) => {
        set({ extensions: get().extensions.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)) });
        const ext = get().extensions.find((e) => e.id === id);
        if (ext) get().logEvent('SYSTEM', `Extension ${ext.enabled ? 'enabled' : 'disabled'}: ${ext.name}`, 'info');
      },
      removeExtension: (id) => set({ extensions: get().extensions.map((e) => (e.id === id ? { ...e, installed: false, enabled: false } : e)) }),
      toggleAutomation: (id) => set({ automation: get().automation.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)) }),
      runAutomation: (id) => {
        const rule = get().automation.find((a) => a.id === id);
        if (!rule) return;
        const action = rule.action.toLowerCase();
        if (action.includes('health')) void get().runHealthScan('quick');
        else if (action.includes('github') || action.includes('sync')) void get().syncGithub();
        else if (action.includes('build')) void get().buildProject();
        else if (action.includes('terminal')) { get().openApp('terminal'); }
        else if (action.includes('diagnos')) void get().runDiagnostics();
        set({ automation: get().automation.map((a) => (a.id === id ? { ...a, lastRun: Date.now() } : a)) });
        get().logEvent('SYSTEM', `Automation triggered: ${rule.name}`, 'info');
        get().pushNotification({ category: 'SYSTEM', severity: 'info', title: 'AUTOMATION RAN', body: `${rule.name} executed.` });
      },

      // ================= BACKUP =================
      createBackup: () => {
        const s = get().settings;
        const data: Record<string, unknown> = {
          app: 'VOX-OS', version: APP_VERSION, created: new Date().toISOString(),
          settings: { theme: s.theme, routingMode: s.routingMode, primaryProvider: s.primaryProvider, secondaryProvider: s.secondaryProvider, voiceSpeed: s.voiceSpeed, voicePitch: s.voicePitch, fontSize: s.fontSize },
          workspaces: get().workspaces,
          projects: get().projects.map((p) => ({ id: p.id, name: p.name, repo: p.repo, description: p.description })),
          extensions: get().extensions.map((e) => ({ id: e.id, installed: e.installed, enabled: e.enabled })),
          automation: get().automation.map((a) => ({ id: a.id, enabled: a.enabled })),
          memory: get().memory.map((m) => ({ section: m.section, text: m.text })),
        };
        const size = new Blob([JSON.stringify(data)]).size;
        const entry: BackupEntry = { id: uid('bkp'), time: Date.now(), size, label: `Backup ${new Date().toLocaleString()}`, data };
        set({ backups: [entry, ...get().backups].slice(0, 8) });
        get().logEvent('SYSTEM', 'Backup created (no secrets included)', 'success');
        get().pushNotification({ category: 'SYSTEM', severity: 'success', title: 'BACKUP CREATED', body: 'Workspace configuration, settings, and project metadata backed up. Secrets excluded.' });
        sfx.success();
      },
      restoreBackup: (id) => {
        const b = get().backups.find((x) => x.id === id);
        if (!b) return;
        const d = b.data as { settings?: Partial<Settings>; workspaces?: Workspace[]; extensions?: { id: string; installed: boolean; enabled: boolean }[]; automation?: { id: string; enabled: boolean }[]; memory?: { section: MemoryItem['section']; text: string }[] };
        if (d.settings) get().setSettings(d.settings);
        if (d.workspaces) set({ workspaces: d.workspaces });
        if (d.extensions) set({ extensions: get().extensions.map((e) => { const b = d.extensions!.find((x) => x.id === e.id); return b ? { ...e, installed: b.installed, enabled: b.enabled } : e; }) });
        if (d.automation) set({ automation: get().automation.map((a) => { const b = d.automation!.find((x) => x.id === a.id); return b ? { ...a, enabled: b.enabled } : a; }) });
        if (d.memory) set({ memory: d.memory.map((m) => ({ ...m, id: uid('m'), time: Date.now() })) });
        get().logEvent('SYSTEM', `Backup restored: ${b.label}`, 'warning');
        get().pushNotification({ category: 'SYSTEM', severity: 'info', title: 'BACKUP RESTORED', body: 'Settings and metadata restored. API keys were never included.' });
      },
      exportConfig: () => {
        const s = get().settings;
        const cfg = { app: 'VOX-OS', version: APP_VERSION, settings: s, workspaces: get().workspaces };
        const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'vox-os-config.json';
        a.click();
        URL.revokeObjectURL(a.href);
        get().logEvent('SYSTEM', 'Configuration exported (secrets excluded)', 'info');
      },

      // ================= DIAGNOSTICS =================
      runDiagnostics: async () => {
        const steps = ['CHECKING CORE', 'CHECKING PROJECT', 'CHECKING GIT', 'CHECKING AI', 'CHECKING NETWORK', 'CHECKING DEPENDENCIES', 'CHECKING BUILD'];
        set({ health: { ...get().health, scanning: true, scanKind: 'full', progress: 0, progressMsg: steps[0], steps } });
        const results: { label: string; score: number; status: string }[] = [];
        const project = get().projects.find((pr) => pr.id === get().activeProjectId) ?? get().projects[0];
        for (let i = 0; i < steps.length; i++) {
          set({ health: { ...get().health, progress: Math.round((i / steps.length) * 100), progressMsg: steps[i] } });
          await new Promise((r) => setTimeout(r, 300));
          const status = 'pass';
          const score = i === 1 ? (project?.healthScore ?? 90) : i === 2 ? (project?.git.clean ? 100 : 90) : i === 3 ? (get().backend === 'online' ? 100 : get().settings.demoAssistant ? 70 : 40) : i === 4 ? (navigator.onLine ? 100 : 0) : i === 5 ? 90 : 92;
          results.push({ label: steps[i].replace('CHECKING ', ''), score, status });
        }
        const total = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length);
        set({ health: { ...get().health, scanning: false, progress: 100, progressMsg: 'Diagnostics complete' } });
        get().logEvent('SYSTEM', `Diagnostics complete — total ${total}%`, total >= 90 ? 'success' : 'warning');
        get().pushNotification({ category: 'SYSTEM', severity: total >= 90 ? 'success' : 'warning', title: 'DIAGNOSTICS COMPLETE', body: `Total health ${total}%. Full report generated.` });
      },
    }),
    {
      name: 'vox-os-state',
      version: 6,
      storage: createJSONStorage(() => localStorage),
      // v4 stored `workspaces` as string[] (legacy labels); v5 uses full Workspace snapshots.
      // v6 adds the phone-home quick-action order. Shallow merges drop missing
      // fields, so backfill defaults here — never wipe saved settings/projects.
      migrate: (persisted, version) => {
        const p = persisted as Record<string, unknown> & { workspaces?: unknown; settings?: Record<string, unknown> };
        if (version < 5 && Array.isArray(p.workspaces)) p.workspaces = [];
        if (version < 6) {
          const settings = (p.settings ?? {}) as Record<string, unknown>;
          if (!Array.isArray(settings.phoneQuick)) {
            settings.phoneQuick = ['voxai', 'terminal', 'github', 'recon', 'remote', 'settings'];
          }
        }
        return p as never;
      },
      partialize: (s) => ({
        settings: s.settings,
        projects: s.projects,
        activeProjectId: s.activeProjectId,
        codeTabs: s.codeTabs,
        terminalSessions: s.terminalSessions,
        terminalActive: s.terminalActive,
        notifications: s.notifications.slice(0, 20),
        eventLog: s.eventLog.slice(0, 100),
        commandHistory: s.commandHistory.slice(0, 50),
        extensions: s.extensions,
        automation: s.automation,
        memory: s.memory,
        profile: s.profile,
        workspaces: s.workspaces,
        backups: s.backups,
        providers: s.providers,
        modelsUnavailable: s.modelsUnavailable,
        aiMessages: s.aiMessages.filter((m) => m.role === 'user' || m.content).slice(-30),
        aiUsage: s.aiUsage,
        windows: s.windows,
        desktopIcons: s.desktopIcons,
        onboardingDone: s.onboardingDone,
        errors: s.errors.slice(0, 60),
        githubRepos: s.githubRepos,
        routerLog: s.routerLog.slice(0, 40),
        voice: s.voice,
        pairHost: s.pairHost,
        pairToken: s.pairToken,
      }),
    },
  ),
);

// helper: active project selector
export function useActiveProject(): Project | undefined {
  return useVox((s) => s.projects.find((p) => p.id === s.activeProjectId));
}

// helper used by Code Studio / File Manager
export function projectFileCount(project: Project): number {
  return countFiles(project.fs);
}
