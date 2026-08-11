import type { AutomationRule, Extension } from '../lib/types';

export const SEED_EXTENSIONS: Extension[] = [
  {
    id: 'ext_vox_ai_tools', name: 'VOX AI Tools', author: 'VOX Labs', version: '2.4.1', category: 'AI',
    description: 'Explain, fix, and refactor code through VOX from any editor view.',
    installed: true, enabled: true, permissions: ['PROJECT', 'AI'],
  },
  {
    id: 'ext_cyber_theme', name: 'Cyber Theme Pack', author: 'AL13N', version: '1.0.3', category: 'Themes',
    description: 'Alternate accent palettes tuned for the VOX shell.',
    installed: true, enabled: false, permissions: ['UI'],
  },
  {
    id: 'ext_mc_kit', name: 'Minecraft Mod Kit', author: 'BlockForge', version: '0.9.0', category: 'Minecraft',
    description: 'Scaffold Fabric/Forge mod projects, generate mixins and block/item classes.',
    installed: false, enabled: false, permissions: ['PROJECT', 'FILES'],
  },
  {
    id: 'ext_gitflow', name: 'GitFlow Plus', author: 'CommitSquad', version: '3.1.2', category: 'Git',
    description: 'Branch naming, release checklists, and pre-push secret checks.',
    installed: false, enabled: false, permissions: ['GITHUB'],
  },
  {
    id: 'ext_json_buddy', name: 'JSON Buddy', author: 'DataWorks', version: '1.6.0', category: 'Developer Tools',
    description: 'Inline JSON validation, schema hints, and quick formatting.',
    installed: false, enabled: false, permissions: ['PROJECT'],
  },
  {
    id: 'ext_md_preview', name: 'Markdown Preview Pro', author: 'DocsForge', version: '2.0.1', category: 'Web',
    description: 'Live markdown preview with syntax-aware code blocks.',
    installed: true, enabled: true, permissions: ['PROJECT'],
  },
  {
    id: 'ext_net_mon', name: 'Network Sentinel', author: 'VOX Security', version: '1.2.0', category: 'Automation',
    description: 'Surface network anomalies and connectivity changes as VOX alerts.',
    installed: false, enabled: false, permissions: ['NETWORK', 'AI'],
  },
];

export const SEED_AUTOMATION: AutomationRule[] = [
  { id: 'auto_health', name: 'Daily Health Scan', trigger: 'Every day at 09:00', action: 'Run health scan', enabled: true },
  { id: 'auto_sync', name: 'GitHub Sync', trigger: 'On project open', action: 'Sync GitHub repositories', enabled: false },
  { id: 'auto_build', name: 'Build on Save', trigger: 'File saved', action: 'Run build', enabled: false },
  { id: 'auto_diag', name: 'Weekly Diagnostics', trigger: 'Every Monday 08:00', action: 'Run diagnostics', enabled: true },
];
