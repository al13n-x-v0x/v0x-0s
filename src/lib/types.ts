// ============================================================
// VOX-OS core domain types
// ============================================================

export type ThemeId = 'night' | 'cyber' | 'midnight' | 'graphite';

export type SectionId =
  | 'dashboard'
  | 'apps'
  | 'code'
  | 'terminal'
  | 'voxai'
  | 'aiengine'
  | 'health'
  | 'performance'
  | 'github'
  | 'projects'
  | 'files'
  | 'devtools'
  | 'apimanager'
  | 'automation'
  | 'gaming'
  | 'extensions'
  | 'marketplace'
  | 'settings'
  | 'voxcore'
  | 'eventlog'
  | 'errors'
  | 'diagnostics'
  | 'memory'
  | 'backup'
  | 'voice'
  | 'taskmanager'
  | 'systeminfo'
  | 'agent'
  | 'profile'
  | 'history'
  | 'security'
  | 'remote'
  | 'recon'
  | 'myapps'
  | 'browser'
  | 'systemtools'
  | 'store';

export interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
  badge?: string;
}

export type Severity = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  category: string; // SYSTEM | PROJECT | AI | GITHUB | SECURITY | BUILD
  severity: Severity;
  title: string;
  body: string;
  time: number;
  action?: { label: string; section: SectionId };
  read: boolean;
}

export interface LogEvent {
  id: string;
  time: number;
  source: 'AI' | 'GITHUB' | 'SYSTEM' | 'PROJECT' | 'SECURITY' | 'BUILD' | 'TERMINAL' | 'ERROR';
  text: string;
  severity: Severity;
}

export interface AppError {
  id: string;
  time: number;
  source: string;
  message: string;
  detail?: string;
  severity: 'error' | 'warning';
  resolved: boolean;
  count?: number;
}

export interface CommandHistoryItem {
  id: string;
  time: number;
  command: string;
  result?: string;
}

// ---------- Projects / VFS ----------

export type VNode =
  | { kind: 'dir'; name: string; children: VNode[] }
  | { kind: 'file'; name: string; content: string; binary?: boolean };

export interface GitFileStatus {
  path: string;
  state: 'modified' | 'added' | 'deleted' | 'renamed';
}

export interface Project {
  id: string;
  name: string;
  repo: string;
  language: string;
  framework: string;
  packageManager: string;
  description: string;
  fs: VNode;
  dependencies: { name: string; version: string; latest: string }[];
  git: {
    branch: string;
    ahead: number;
    behind: number;
    changes: GitFileStatus[];
    lastCommit: string;
    clean: boolean;
  };
  build: { status: 'success' | 'failed' | 'none'; lastRun?: number; durationMs?: number; output?: string; exitCode?: number };
  lastModified: number;
  lastOpened: number;
  workspace: string;
  healthScore?: number;
  color: string;
}

export interface TerminalSession {
  id: string;
  shell: 'powershell' | 'bash' | 'cmd';
  cwd: string[];
  history: { input?: string; output?: string; kind: 'in' | 'out' | 'err' | 'sys'; exitCode?: number }[];
  prompt: string;
  agentSessionId?: string;
  agentMode?: boolean;
}

// ---------- AI ----------

export type ProviderId = 'gemini' | 'groq' | 'openai' | 'anthropic';

export interface ProviderConfig {
  id: ProviderId;
  configured: boolean;
  maskedKey: string | null;
  model: string;
  status: 'not_configured' | 'connected' | 'error' | 'checking';
  latencyMs?: number;
  lastCheck?: number;
  envVar: string;
  label: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: ProviderId;
  demo?: boolean;
  time: number;
}

export interface RouterLogEntry {
  id: string;
  time: number;
  text: string;
  ok: boolean;
}

export interface AIUsage {
  requestsToday: number;
  tokensUsed: number;
  avgLatencyMs: number | null;
  errors: number;
  successRate: number | null;
}

export interface Workspace {
  id: string;
  name: string;
  time: number;
  projectId: string;
  tabs: string[];
  activeFile: string | null;
  terminals: TerminalSession[];
  aiMessages: AIMessage[];
}

// ---------- Health ----------

export type CheckStatus = 'pass' | 'warn' | 'error' | 'unavailable' | 'pending';

export interface HealthCategory {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  score: number; // 0-100
}

export interface HealthState {
  score: number;
  grade: string;
  categories: HealthCategory[];
  scanning: boolean;
  scanKind: string | null;
  progress: number;
  progressMsg: string;
  lastScan: number | null;
  steps: string[];
}

// ---------- Settings ----------

export interface Settings {
  theme: ThemeId;
  bootAnimation: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  sound: boolean;
  soundVolume: number;
  fontSize: number; // scale multiplier 0.9 - 1.2
  confirmDestructive: boolean;
  autoSave: boolean;
  showSimulatedLabels: boolean;
  demoAssistant: boolean;
  // voice
  voiceEnabled: boolean;
  voiceAutoSpeak: boolean;
  voiceSpeed: number;
  voicePitch: number;
  voiceVolume: number;
  wakeWord: boolean;
  // ai
  primaryProvider: ProviderId | 'auto';
  secondaryProvider: ProviderId;
  routingMode: 'auto' | 'primary' | 'failover' | 'dual';
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  // terminal
  defaultShell: 'powershell' | 'bash' | 'cmd';
  // phone home
  phoneQuick: string[];
  // performance
  performanceMode: 'balanced' | 'performance';
  // gaming
  gameProfile: 'balanced' | 'boost' | 'ultra';
  gameMode: boolean;
  // notifications
  notifyBuild: boolean;
  notifyGitHub: boolean;
  notifyAI: boolean;
  notifySystem: boolean;
  notifySecurity: boolean;
  // agent
  agentPermission: Record<string, 'allowed' | 'denied' | 'requested'>;
  // github
  githubConnected: boolean;
  // ai usage
  aiConfiguredViaBackend: boolean;
}

// ---------- Windows ----------

export interface WindowState {
  id: string;
  app: string; // app id
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
  prev?: { x: number; y: number; w: number; h: number };
}

export interface DesktopIcon {
  id: string;
  label: string;
  icon: string;
  app?: string;
  section?: SectionId;
  x: number;
  y: number;
}

// ---------- Extensions ----------

export interface Extension {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  category: string;
  installed: boolean;
  enabled: boolean;
  permissions: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  lastRun?: number;
}

// ---------- System ----------

export interface TelemetryPoint {
  t: number;
  cpu: number;
  ram: number;
  gpu: number;
  net: number;
}

export interface SystemInfo {
  agent: 'connected' | 'disconnected';
  os: string;
  arch: string;
  cpu: string;
  cores: number | null;
  gpu: string;
  ramTotal: number | null;
  hostname: string;
  kernel: string;
  uptime: string;
  battery: number | null;
  batteryCharging: boolean | null;
  network: { connected: boolean; type: string; rtt: number | null; down: number | null };
}

export interface Profile {
  name: string;
  role: string;
  workspaceCount: number;
  projectCount: number;
  githubStatus: string;
  voxActivity: number;
  avatarHue: number;
}

export interface VoiceState {
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  transcript: string;
  lastCommand: string | null;
  history: { time: number; text: string }[];
  micPermission: 'unknown' | 'granted' | 'blocked';
  sttSupported: boolean;
  ttsSupported: boolean;
  error?: string;
}
