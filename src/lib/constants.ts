import type { NavItem, ProviderId, SectionId } from './types';

// ---------- Icons (lucide names) ----------
export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'apps', label: 'App Drawer', icon: 'LayoutGrid' },
  { id: 'code', label: 'Code Studio', icon: 'Code2' },
  { id: 'terminal', label: 'Terminal', icon: 'SquareTerminal' },
  { id: 'voxai', label: 'VOX AI', icon: 'Sparkles' },
  { id: 'aiengine', label: 'AI Engine', icon: 'Cpu' },
  { id: 'health', label: 'Health Scanner', icon: 'Activity' },
  { id: 'performance', label: 'Performance', icon: 'Gauge' },
  { id: 'github', label: 'Git & GitHub', icon: 'GitBranch' },
  { id: 'projects', label: 'Projects', icon: 'FolderKanban' },
  { id: 'files', label: 'File Manager', icon: 'FolderTree' },
  { id: 'devtools', label: 'Dev Tools', icon: 'Wrench' },
  { id: 'apimanager', label: 'API Manager', icon: 'KeyRound' },
  { id: 'automation', label: 'Automation', icon: 'Workflow' },
  { id: 'gaming', label: 'Gaming & Boost', icon: 'Gamepad2', badge: 'NEW' },
  { id: 'browser', label: 'VOX Browser', icon: 'Globe', badge: 'GX' },
  { id: 'extensions', label: 'Extensions', icon: 'Puzzle' },
  { id: 'marketplace', label: 'Marketplace', icon: 'Store' },
  { id: 'notes', label: 'VoxNotes', icon: 'StickyNote', badge: 'MD' },
  { id: 'pairing', label: 'Phone Pairing', icon: 'QrCode', badge: 'LAN' },
  { id: 'toolkit', label: 'Dev Toolkit', icon: 'Blocks', badge: 'CLI' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];

export const SYS_NAV: NavItem[] = [
  { id: 'voxcore', label: 'VOX Core', icon: 'Orbit' },
  { id: 'eventlog', label: 'Event Log', icon: 'ListTree' },
  { id: 'errors', label: 'Error Center', icon: 'TriangleAlert' },
  { id: 'security', label: 'Security Center', icon: 'ShieldCheck' },
  { id: 'recon', label: 'Recon Lab', icon: 'Radar' },
  { id: 'remote', label: 'Mobile Remote', icon: 'Smartphone' },
  { id: 'myapps', label: 'My Apps', icon: 'AppWindow', badge: 'REAL' },
  { id: 'systemtools', label: 'System Apps', icon: 'MonitorCog', badge: 'WIN' },
  { id: 'store', label: 'V0X-ST0RE', icon: 'Store', badge: 'NEW' },
  { id: 'diagnostics', label: 'Diagnostics', icon: 'Stethoscope' },
  { id: 'voice', label: 'Voice Engine', icon: 'Mic' },
  { id: 'taskmanager', label: 'Task Manager', icon: 'ListOrdered' },
  { id: 'systeminfo', label: 'System Info', icon: 'MonitorCog' },
  { id: 'agent', label: 'Desktop Agent', icon: 'Bot' },
  { id: 'memory', label: 'VOX Memory', icon: 'Brain' },
  { id: 'backup', label: 'Backup', icon: 'HardDriveDownload' },
  { id: 'history', label: 'Command History', icon: 'History' },
  { id: 'profile', label: 'Developer Profile', icon: 'UserRound' },
];

export const SECTION_LABEL: Record<SectionId, string> = Object.fromEntries(
  [...NAV, ...SYS_NAV].map((n) => [n.id, n.label]),
) as Record<SectionId, string>;

// ---------- Apps (openable as windows) ----------
export const APPS: { id: string; title: string; icon: string; section: SectionId }[] = [
  { id: 'voxai', title: 'VOX AI', icon: 'Sparkles', section: 'voxai' },
  { id: 'terminal', title: 'Terminal', icon: 'SquareTerminal', section: 'terminal' },
  { id: 'code', title: 'Code Studio', icon: 'Code2', section: 'code' },
  { id: 'files', title: 'Files', icon: 'FolderTree', section: 'files' },
  { id: 'github', title: 'GitHub', icon: 'GitBranch', section: 'github' },
  { id: 'projects', title: 'Projects', icon: 'FolderKanban', section: 'projects' },
  { id: 'gaming', title: 'Gaming & Boost', icon: 'Gamepad2', section: 'gaming' },
  { id: 'browser', title: 'VOX Browser', icon: 'Globe', section: 'browser' },
  { id: 'systemtools', title: 'System Apps', icon: 'MonitorCog', section: 'systemtools' },
  { id: 'store', title: 'V0X-ST0RE', icon: 'Store', section: 'store' },
  { id: 'notes', title: 'VoxNotes', icon: 'StickyNote', section: 'notes' },
  { id: 'pairing', title: 'Phone Pairing', icon: 'QrCode', section: 'pairing' },
  { id: 'toolkit', title: 'Dev Toolkit', icon: 'Blocks', section: 'toolkit' },
  { id: 'health', title: 'Health Scanner', icon: 'Activity', section: 'health' },
  { id: 'performance', title: 'Performance', icon: 'Gauge', section: 'performance' },
  { id: 'taskmanager', title: 'Task Manager', icon: 'ListOrdered', section: 'taskmanager' },
  { id: 'systeminfo', title: 'System Info', icon: 'MonitorCog', section: 'systeminfo' },
  { id: 'settings', title: 'Settings', icon: 'Settings', section: 'settings' },
  { id: 'devtools', title: 'Dev Tools', icon: 'Wrench', section: 'devtools' },
  { id: 'eventlog', title: 'Event Log', icon: 'ListTree', section: 'eventlog' },
  { id: 'errors', title: 'Error Center', icon: 'TriangleAlert', section: 'errors' },
];

// ---------- App drawer (phone launcher) ----------
// Every section gets a tile with a per-app gradient tint. Order defines
// the launcher grid + search.
export const LAUNCHER: { id: SectionId; label: string; icon: string; tint: [string, string]; blurb: string }[] = [
  { id: 'voxai', label: 'VOX AI', icon: 'Sparkles', tint: ['#22d3ee', '#3b82f6'], blurb: 'AI assistant' },
  { id: 'terminal', label: 'Terminal', icon: 'SquareTerminal', tint: ['#10b981', '#059669'], blurb: 'Real shell' },
  { id: 'code', label: 'Code Studio', icon: 'Code2', tint: ['#3b82f6', '#8b5cf6'], blurb: 'Editor + build' },
  { id: 'files', label: 'Files', icon: 'FolderTree', tint: ['#f59e0b', '#ef4444'], blurb: 'File manager' },
  { id: 'github', label: 'GitHub', icon: 'GitBranch', tint: ['#94a3b8', '#64748b'], blurb: 'Repos & push' },
  { id: 'projects', label: 'Projects', icon: 'FolderKanban', tint: ['#8b5cf6', '#d946ef'], blurb: 'Workspaces' },
  { id: 'gaming', label: 'Gaming', icon: 'Gamepad2', tint: ['#f43f5e', '#8b5cf6'], blurb: 'Boost & play' },
  { id: 'browser', label: 'Browser', icon: 'Globe', tint: ['#fa1e4e', '#8b5cf6'], blurb: 'GX web browser' },
  { id: 'health', label: 'Health', icon: 'Activity', tint: ['#34d399', '#22d3ee'], blurb: 'Telemetry' },
  { id: 'performance', label: 'Performance', icon: 'Gauge', tint: ['#fbbf24', '#f97316'], blurb: 'Speed & boost' },
  { id: 'security', label: 'Security', icon: 'ShieldCheck', tint: ['#10b981', '#22d3ee'], blurb: 'Scanner + secrets' },
  { id: 'recon', label: 'Recon Lab', icon: 'Radar', tint: ['#22d3ee', '#8b5cf6'], blurb: 'Network recon' },
  { id: 'remote', label: 'Remote', icon: 'Smartphone', tint: ['#3b82f6', '#22d3ee'], blurb: 'Control from phone' },
  { id: 'devtools', label: 'Dev Tools', icon: 'Wrench', tint: ['#f97316', '#ef4444'], blurb: 'Kitchen sink' },
  { id: 'apimanager', label: 'API Keys', icon: 'KeyRound', tint: ['#eab308', '#f59e0b'], blurb: 'Providers' },
  { id: 'automation', label: 'Automation', icon: 'Workflow', tint: ['#06b6d4', '#3b82f6'], blurb: 'Workflows' },
  { id: 'eventlog', label: 'Event Log', icon: 'ListTree', tint: ['#64748b', '#475569'], blurb: 'System events' },
  { id: 'errors', label: 'Errors', icon: 'TriangleAlert', tint: ['#ef4444', '#f97316'], blurb: 'Error center' },
  { id: 'taskmanager', label: 'Task Manager', icon: 'ListOrdered', tint: ['#8b5cf6', '#6366f1'], blurb: 'Processes' },
  { id: 'systeminfo', label: 'System Info', icon: 'MonitorCog', tint: ['#0ea5e9', '#6366f1'], blurb: 'Hardware' },
  { id: 'diagnostics', label: 'Diagnostics', icon: 'Stethoscope', tint: ['#14b8a6', '#0ea5e9'], blurb: 'Troubleshoot' },
  { id: 'agent', label: 'Desktop Agent', icon: 'Bot', tint: ['#22d3ee', '#8b5cf6'], blurb: 'Local daemon' },
  { id: 'memory', label: 'VOX Memory', icon: 'Brain', tint: ['#d946ef', '#8b5cf6'], blurb: 'Recall & context' },
  { id: 'voice', label: 'Voice Engine', icon: 'Mic', tint: ['#f43f5e', '#f59e0b'], blurb: 'Talk to VOX' },
  { id: 'aiengine', label: 'AI Engine', icon: 'Cpu', tint: ['#6366f1', '#8b5cf6'], blurb: 'Model routing' },
  { id: 'extensions', label: 'Extensions', icon: 'Puzzle', tint: ['#22d3ee', '#34d399'], blurb: 'Plugins' },
  { id: 'marketplace', label: 'Marketplace', icon: 'Store', tint: ['#f59e0b', '#ef4444'], blurb: 'Add-ons' },
  { id: 'backup', label: 'Backup', icon: 'HardDriveDownload', tint: ['#64748b', '#0ea5e9'], blurb: 'Snapshots' },
  { id: 'history', label: 'History', icon: 'History', tint: ['#14b8a6', '#22d3ee'], blurb: 'Commands' },
  { id: 'profile', label: 'Profile', icon: 'UserRound', tint: ['#8b5cf6', '#d946ef'], blurb: 'Developer card' },
  { id: 'myapps', label: 'My Apps', icon: 'AppWindow', tint: ['#22d3ee', '#10b981'], blurb: 'Your installed apps' },
  { id: 'systemtools', label: 'System Apps', icon: 'MonitorCog', tint: ['#38bdf8', '#3b82f6'], blurb: 'Drive Mgmt, Task Mgr…' },
  { id: 'store', label: 'V0X-ST0RE', icon: 'Store', tint: ['#f59e0b', '#ef4444'], blurb: 'Get apps + games' },
  { id: 'notes', label: 'VoxNotes', icon: 'StickyNote', tint: ['#22d3ee', '#8b5cf6'], blurb: 'Markdown, autosave' },
  { id: 'pairing', label: 'Phone Pairing', icon: 'QrCode', tint: ['#22d3ee', '#10b981'], blurb: 'Scan to control PC' },
  { id: 'toolkit', label: 'Dev Toolkit', icon: 'Blocks', tint: ['#8b5cf6', '#22d3ee'], blurb: 'freebuff, codebuff, Gemini' },
  { id: 'voxcore', label: 'VOX Core', icon: 'Orbit', tint: ['#22d3ee', '#3b82f6'], blurb: 'Kernel' },
  { id: 'settings', label: 'Settings', icon: 'Settings', tint: ['#94a3b8', '#64748b'], blurb: 'System settings' },
];

// ---------- AI providers ----------
export const PROVIDERS: { id: ProviderId; label: string; envVar: string; color: string; models: string[] }[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    envVar: 'GEMINI_API_KEY',
    color: '#3b82f6',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'groq',
    label: 'Groq',
    envVar: 'GROQ_API_KEY',
    color: '#f97316',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  },
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    envVar: 'OPENAI_API_KEY',
    color: '#10a37f',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    envVar: 'ANTHROPIC_API_KEY',
    color: '#d97757',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-haiku-20241022'],
  },
];

export const ROUTING_RULES = [
  { task: 'Deep reasoning', provider: 'gemini' as ProviderId },
  { task: 'Fast response', provider: 'groq' as ProviderId },
  { task: 'Code generation', provider: 'gemini' as ProviderId },
  { task: 'Quick explanation', provider: 'groq' as ProviderId },
  { task: 'Large context', provider: 'gemini' as ProviderId },
  { task: 'Code review', provider: 'gemini' as ProviderId },
];

// ---------- Dev tool languages ----------
export const EDITOR_LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'html', 'css', 'json', 'yaml', 'markdown'];

export const FILE_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', mjs: 'javascript',
  py: 'python', java: 'java', cpp: 'cpp', c: 'cpp', h: 'cpp', hpp: 'cpp',
  cs: 'csharp', html: 'html', htm: 'html', css: 'css', scss: 'css',
  json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown', txt: 'plain', log: 'plain',
};

export const APP_VERSION = '0.1.0';
export const APP_CODENAME = 'v0x-0s';
