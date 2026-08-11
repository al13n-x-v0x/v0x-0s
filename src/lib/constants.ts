import type { NavItem, ProviderId, SectionId } from './types';

// ---------- Icons (lucide names) ----------
export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
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
  { id: 'extensions', label: 'Extensions', icon: 'Puzzle' },
  { id: 'marketplace', label: 'Marketplace', icon: 'Store' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];

export const SYS_NAV: NavItem[] = [
  { id: 'voxcore', label: 'VOX Core', icon: 'Orbit' },
  { id: 'eventlog', label: 'Event Log', icon: 'ListTree' },
  { id: 'errors', label: 'Error Center', icon: 'TriangleAlert' },
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
  { id: 'health', title: 'Health Scanner', icon: 'Activity', section: 'health' },
  { id: 'performance', title: 'Performance', icon: 'Gauge', section: 'performance' },
  { id: 'taskmanager', title: 'Task Manager', icon: 'ListOrdered', section: 'taskmanager' },
  { id: 'systeminfo', title: 'System Info', icon: 'MonitorCog', section: 'systeminfo' },
  { id: 'settings', title: 'Settings', icon: 'Settings', section: 'settings' },
  { id: 'devtools', title: 'Dev Tools', icon: 'Wrench', section: 'devtools' },
  { id: 'eventlog', title: 'Event Log', icon: 'ListTree', section: 'eventlog' },
  { id: 'errors', title: 'Error Center', icon: 'TriangleAlert', section: 'errors' },
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
