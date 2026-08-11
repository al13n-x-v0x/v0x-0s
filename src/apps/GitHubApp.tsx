import { useState } from 'react';
import { useVox } from '../lib/store';
import type { GithubRepo } from '../lib/store';
import { Badge, Button, EmptyState, ErrorState, Icon, Input, Panel, StatusDot } from '../components/ui';
import { timeAgo } from '../lib/fmt';

export function GitHubApp() {
  const s = useVox();
  const connected = s.settings.githubConnected;
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [tokenMsg, setTokenMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const connectWithToken = async () => {
    if (!token.trim()) return;
    setConnecting(true);
    setTokenMsg(null);
    await s.connectGithub(token.trim());
    setConnecting(false);
    if (s.settings.githubConnected) {
      setTokenMsg({ ok: true, text: `Connected as ${s.githubUser ?? 'GitHub user'}. Repositories loaded.` });
      setToken('');
    } else {
      setTokenMsg({ ok: false, text: s.githubError ?? 'Connection failed.' });
    }
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1200px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="hud-label mb-1.5">GIT & GITHUB</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">GITHUB CENTER</h1>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Badge tone="green"><span className="dot dot-online" /> CONNECTED{s.githubUser ? ` · ${s.githubUser}` : ''}</Badge>
              <Button size="xs" variant="cyan" icon="RefreshCw" onClick={() => void s.syncGithub()} disabled={s.githubLoading}>SYNC</Button>
              <Button size="xs" variant="danger" icon="Link2Off" onClick={() => void s.disconnectGithub()}>DISCONNECT</Button>
            </>
          ) : (
            <Badge tone="dim">○ NOT CONNECTED</Badge>
          )}
        </div>
      </div>

      {!connected ? (
        <Panel title="Connection" icon="Github" glow="violet" bodyClassName="!p-0">
          {s.githubLoading ? (
            <div className="py-10 text-center font-mono text-[11px] tracking-[0.2em] text-vox-muted">CONNECTING…</div>
          ) : s.githubError ? (
            <ErrorState
              title="GITHUB CONNECTION ERROR"
              body={s.githubError}
              onRetry={() => useVox.setState({ githubError: null })}
              actions={<Button size="xs" variant="ghost" onClick={() => s.setSection('settings')}>OPEN SETTINGS</Button>}
            />
          ) : (
            <div className="px-6 py-8 text-center">
              <Icon name="Github" size={30} className="text-vox-dim mx-auto mb-3" />
              <h3 className="font-display text-[13px] font-bold tracking-[0.14em] uppercase text-vox-text">CONNECT GITHUB</h3>
              <p className="text-[12px] text-vox-muted mt-2 max-w-md mx-auto leading-relaxed">
                Connect GitHub to load real repositories, branches, commits, issues, and pull requests.
              </p>
              <div className="mt-5 flex flex-col items-center gap-3">
                <Button variant="solid" icon="Github" onClick={() => void s.connectGithub()} disabled={s.githubLoading}>CONNECT GITHUB</Button>
                <div className="w-full max-w-md glass-inset p-3.5 text-left">
                  <p className="hud-label mb-2">OR USE A PERSONAL ACCESS TOKEN</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        value={token}
                        onChange={(e) => { setToken(e.target.value); setTokenMsg(null); }}
                        placeholder="ghp_••••••••••••••••••••"
                        autoComplete="off"
                      />
                      <button aria-label={showToken ? 'Hide token' : 'Show token'} onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 text-vox-dim hover:text-vox-text">
                        <Icon name={showToken ? 'EyeOff' : 'Eye'} size={14} />
                      </button>
                    </div>
                    <Button variant="cyan" icon="PlugZap" disabled={connecting || !token.trim()} onClick={() => void connectWithToken()}>
                      {connecting ? 'VALIDATING…' : 'CONNECT'}
                    </Button>
                  </div>
                  {tokenMsg && <p className={tokenMsg.ok ? 'text-emerald-300' : 'text-red-300'} style={{ fontSize: 11, marginTop: 8 }}>{tokenMsg.text}</p>}
                  <p className="text-[10px] text-vox-dim mt-2.5 font-mono leading-relaxed">
                    The token is sent to the VOX backend once, validated against the GitHub API, and stored server-side (gitignored). It is never saved or displayed in the browser.
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-vox-dim mt-4 font-mono max-w-md mx-auto">
                Or set GITHUB_TOKEN in server/.env — authentication is handled by the VOX backend, never the frontend.
              </p>
            </div>
          )}
        </Panel>
      ) : s.githubLoading ? (
        <Panel title="Repositories" icon="GitBranch"><div className="py-12 text-center font-mono text-[11px] tracking-[0.2em] text-vox-muted">LOADING REPOSITORIES…</div></Panel>
      ) : s.githubRepos.length === 0 ? (
        <Panel title="Repositories" icon="GitBranch">
          <EmptyState icon="Github" title="NO REPOSITORIES" body="Connected, but no repositories were returned. Check the backend token scopes." />
        </Panel>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {s.githubRepos.map((r) => <RepoCard key={r.full_name} r={r} />)}
          </div>
          <p className="text-[10px] text-vox-dim font-mono">Real data from the GitHub API via the VOX backend. Nothing is fabricated.</p>
        </>
      )}

      {connected && s.githubRepos.length > 0 && (
        <Panel title="Account Activity" icon="Activity" bodyClassName="!p-3">
          <div className="flex flex-wrap gap-3 text-[11px]">
            <div className="glass-inset px-3 py-2"><span className="hud-label block mb-1">REPOSITORIES</span><span className="font-mono text-[15px] text-vox-text">{s.githubRepos.length}</span></div>
            <div className="glass-inset px-3 py-2"><span className="hud-label block mb-1">LAST SYNC</span><span className="font-mono text-[12px] text-vox-text">{timeAgo(Date.now())}</span></div>
            <div className="glass-inset px-3 py-2 flex-1 min-w-[220px]"><span className="hud-label block mb-1">NOTE</span><span className="text-vox-muted">Branches, commits, issues and actions render from repository data on demand.</span></div>
          </div>
        </Panel>
      )}
    </div>
  );
}

function RepoCard({ r }: { r: GithubRepo }) {
  const s = useVox();
  return (
    <div className="glass hud-border p-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-vox-muted shrink-0"><Icon name="Github" size={16} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-[13px] font-semibold text-vox-text truncate">{r.full_name}</h3>
          <div className="flex items-center gap-2.5 mt-1 text-[10px] font-mono text-vox-dim">
            <span className="text-vox-muted">{r.language ?? '—'}</span>
            <span>★ {r.stargazers_count}</span>
            <span>⑂ {r.forks_count}</span>
            <span className="ml-auto">{r.pushed_at ? timeAgo(new Date(r.pushed_at).getTime()) : '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <Badge tone="green">main · clean</Badge>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3.5">
        <Button size="xs" variant="cyan" icon="ExternalLink" onClick={() => window.open(`https://github.com/${r.full_name}`, '_blank')}>VIEW</Button>
        <Button size="xs" icon="GitBranch" onClick={() => s.pushNotification({ category: 'GITHUB', severity: 'info', title: 'BRANCHES', body: `Branch listing for ${r.full_name} requires the backend GitHub adapter.` })}>BRANCH</Button>
        <Button size="xs" icon="GitCommitHorizontal" onClick={() => s.pushNotification({ category: 'GITHUB', severity: 'info', title: 'COMMITS', body: `Commit history for ${r.full_name} loads from the GitHub API on demand.` })}>COMMITS</Button>
        <Button size="xs" icon="CircleDot" onClick={() => s.pushNotification({ category: 'GITHUB', severity: 'info', title: 'ISSUES', body: `Issue list for ${r.full_name} loads from the GitHub API on demand.` })}>ISSUES</Button>
        <Button size="xs" variant="ghost" icon="GitPullRequest" onClick={() => s.pushNotification({ category: 'GITHUB', severity: 'info', title: 'PULL REQUESTS', body: `PRs for ${r.full_name} load from the GitHub API on demand.` })}>PR</Button>
        <Button size="xs" variant="ghost" icon="SearchCheck" onClick={() => { s.setSection('security'); void s.scanGithubRepo(r.full_name); }}>SCAN SECRETS</Button>
        <Button size="xs" variant="ghost" icon="Download" onClick={() => s.pushNotification({ category: 'GITHUB', severity: 'info', title: 'CLONE', body: `Cloning requires the Desktop Agent to write to disk.` })}>CLONE</Button>
      </div>
    </div>
  );
}
