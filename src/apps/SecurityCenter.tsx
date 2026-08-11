import { useState } from 'react';
import { useVox } from '../lib/store';
import { scanForSecrets } from '../lib/secrets';
import { walk } from '../lib/vfs';
import { Badge, Button, Icon, Panel, Select, StatusDot } from '../components/ui';
import { SecurityToolkit } from './SecurityToolkit';

export function SecurityCenter() {
  const s = useVox();
  const [repo, setRepo] = useState('');
  const active = s.projects.find((p) => p.id === s.activeProjectId);
  const localFindings = active ? scanForSecrets(active.fs) : [];
  const scan = s.githubScan;
  const connected = s.settings.githubConnected;
  const repos = s.githubRepos;

  const startScan = (r?: string) => {
    const target = r ?? repo;
    if (!target) return;
    void s.scanGithubRepo(target);
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1100px]">
      <div>
        <p className="hud-label mb-1.5">DEFENSE & AUDIT</p>
        <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">SECURITY CENTER</h1>
        <p className="text-[11.5px] text-vox-muted mt-1">Secret detection across local projects and connected GitHub repositories. Values are never displayed — only redacted context.</p>
      </div>

      {/* GitHub secret scan */}
      <Panel
        title="GitHub Repository Scan"
        icon="Github"
        glow="violet"
        actions={
          <Badge tone={scan.status === 'done' ? (scan.findings.length ? 'amber' : 'green') : scan.status === 'error' ? 'red' : scan.status === 'scanning' ? 'cyan' : 'dim'}>
            {scan.status === 'scanning' ? 'SCANNING…' : scan.status === 'done' ? (scan.findings.length ? `${scan.findings.length} FINDING(S)` : 'CLEAN') : scan.status === 'error' ? 'ERROR' : 'IDLE'}
          </Badge>
        }
      >
        {!connected ? (
          <div className="text-center py-6">
            <Icon name="Github" size={22} className="text-vox-dim mx-auto mb-2" />
            <p className="text-[12px] text-vox-text">GitHub is not connected.</p>
            <p className="text-[10.5px] text-vox-muted mt-1 max-w-[420px] mx-auto">Connect a personal access token in Git &amp; GitHub or set GITHUB_TOKEN in server/.env — the token lives server-side, never in the browser.</p>
            <div className="mt-3">
              <Button variant="cyan" icon="Link2" onClick={() => s.setSection('github')}>CONNECT GITHUB</Button>
            </div>
          </div>
        ) : repos.length === 0 && scan.status === 'idle' ? (
          <div className="text-center py-6">
            <Icon name="RefreshCw" size={20} className="text-vox-dim mx-auto mb-2" />
            <p className="text-[12px] text-vox-text">No repositories loaded yet.</p>
            <div className="mt-3">
              <Button variant="cyan" icon="RefreshCw" onClick={() => void s.syncGithub()} disabled={s.githubLoading}>SYNC REPOSITORIES</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <p className="hud-label mb-1">REPOSITORY</p>
                <Select value={repo} onChange={(e) => setRepo(e.target.value)} className="w-full">
                  <option value="">Select a repo…</option>
                  {repos.map((r) => (
                    <option key={r.full_name} value={r.full_name}>{r.full_name} · {r.default_branch}</option>
                  ))}
                </Select>
              </div>
              <Button variant="cyan" icon="SearchCheck" onClick={() => startScan()} disabled={!repo || scan.status === 'scanning'}>SCAN RECENT FILES</Button>
            </div>

            {repos.length > 0 && (
              <div className="mt-3">
                <p className="hud-label mb-1.5">QUICK SCAN</p>
                <div className="flex flex-wrap gap-1.5">
                  {repos.slice(0, 8).map((r) => (
                    <button
                      key={r.full_name}
                      onClick={() => { setRepo(r.full_name); startScan(r.full_name); }}
                      disabled={scan.status === 'scanning'}
                      className="px-2 py-1 rounded-md border border-vox-line/60 bg-white/[0.02] hover:border-cyan-400/40 hover:bg-cyan-400/5 text-[10px] font-mono text-vox-muted hover:text-cyan-200 transition-colors disabled:opacity-50"
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scan.status === 'scanning' && (
              <div className="mt-4 py-5 text-center">
                <div className="vox-spinner mx-auto mb-2" />
                <p className="text-[11px] font-mono tracking-[0.15em] text-vox-muted">SCANNING RECENT FILES OF {scan.repo.toUpperCase() || 'REPO'}…</p>
              </div>
            )}

            {scan.status === 'error' && (
              <div className="mt-4 glass-inset px-3.5 py-3 border-l-2 border-red-400/60">
                <p className="text-[11px] font-mono text-red-300">⚠ {scan.error}</p>
                <p className="text-[9.5px] text-vox-dim mt-1">If the token lacks repo read scope, GitHub returns 404. Check the token's scopes, then retry.</p>
              </div>
            )}

            {scan.status === 'done' && scan.findings.length === 0 && (
              <div className="mt-4 text-center py-5">
                <Icon name="ShieldCheck" size={22} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-[12px] text-vox-text">No secret patterns detected</p>
                <p className="text-[10.5px] text-vox-muted mt-1">Scanned {scan.filesScanned} recently changed file(s) on {scan.branch} · {scan.filesSkipped} skipped (binary/generated/too large).</p>
              </div>
            )}

            {scan.status === 'done' && scan.findings.length > 0 && (
              <div className="mt-4 space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {scan.findings.map((f, i) => (
                  <div key={i} className="glass-inset px-3 py-2">
                    <div className="flex items-center gap-2">
                      <StatusDot tone="amber" />
                      <span className="font-mono text-[11px] text-vox-text truncate">{scan.repo} · {f.path}</span>
                      <span className="ml-auto font-mono text-[9px] text-vox-dim">L{f.line}</span>
                    </div>
                    <p className="text-[10px] text-amber-300/90 mt-1 font-mono">{f.type} — value hidden</p>
                    <p className="text-[9.5px] text-vox-muted mt-0.5 font-mono truncate">{f.match}</p>
                  </div>
                ))}
              </div>
            )}

            {scan.status === 'done' && (
              <p className="text-[9.5px] text-vox-dim mt-3 font-mono">
                {scan.filesScanned} file(s) scanned · {scan.filesSkipped} skipped · branch {scan.branch} · {scan.scannedAt ? new Date(scan.scannedAt).toLocaleTimeString() : ''} · Findings are redacted — the secret itself is never shown.
              </p>
            )}
          </>
        )}
      </Panel>

      {/* Local project findings */}
      <div className="grid md:grid-cols-2 gap-4">
        <Panel
          title="Active Project Scan"
          icon="FolderSearch"
          actions={<Badge tone={localFindings.length ? 'amber' : 'green'}>{localFindings.length ? `${localFindings.length} FINDING(S)` : 'CLEAN'}</Badge>}
        >
          {active ? (
            localFindings.length === 0 ? (
              <div className="text-center py-6">
                <Icon name="ShieldCheck" size={22} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-[12px] text-vox-text">No obvious secret patterns detected</p>
                <p className="text-[10.5px] text-vox-muted mt-1">Scanned {walk(active.fs).filter((f) => f.node.kind === 'file').length} files in {active.name}.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                {localFindings.map((f, i) => (
                  <div key={i} className="glass-inset px-3 py-2">
                    <div className="flex items-center gap-2">
                      <StatusDot tone="amber" />
                      <span className="font-mono text-[11px] text-vox-text truncate">{f.path.join('/')}</span>
                      <span className="ml-auto font-mono text-[9px] text-vox-dim">L{f.line}</span>
                    </div>
                    <p className="text-[10px] text-amber-300/90 mt-1 font-mono">{f.type} — value hidden</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <Button size="xs" variant="ghost" onClick={() => s.openFile(f.path.join('/'))}>OPEN FILE</Button>
                      <Button size="xs" variant="ghost" onClick={() => s.addError({ source: 'SECURITY', message: `Marked resolved: ${f.path.join('/')}:${f.line}`, detail: f.type, severity: 'warning' })}>IGNORE</Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-[12px] text-vox-dim text-center py-6">Open a project to scan it.</p>
          )}
          <p className="text-[9.5px] text-vox-dim mt-2 font-mono">Never displays secret values. IGNORE only affects local findings.</p>
        </Panel>

        <SecurityToolkit />

        <Panel title="Security Posture" icon="ShieldCheck" glow="cyan">
          <div className="space-y-2.5">
            {[
              ['Backend-only credentials', 'GitHub tokens and AI keys live in the VOX backend or server/.env — never in the browser bundle.'],
              ['Redacted findings', 'Both the local and GitHub detectors return truncated, redacted context lines. The secret itself is never displayed or persisted.'],
              ['Recent-file coverage', 'GitHub scans target files changed in the last several commits — the files most likely to carry accidentally committed credentials.'],
              ['Healthy hygiene', 'Commit messages, logs and error surfaces use categories — never raw key material.'],
            ].map(([t, d]) => (
              <div key={t} className="flex items-start gap-2.5">
                <Icon name="CheckCircle2" size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] text-vox-text">{t}</p>
                  <p className="text-[10.5px] text-vox-muted leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
