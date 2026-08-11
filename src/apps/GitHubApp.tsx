import { useState } from 'react';
import { useVox } from '../lib/store';
import type { GithubRepo } from '../lib/store';
import { Badge, Button, EmptyState, ErrorState, Field, Icon, Input, Loading, Modal, Panel, Select, StatusDot, Tabs } from '../components/ui';
import { timeAgo } from '../lib/fmt';
import type { GithubBranch, GithubCommit, GithubIssue, GithubPull } from '../lib/ai';

export function GitHubApp() {
  const s = useVox();
  const connected = s.settings.githubConnected;
  const detail = s.githubDetail;
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [tokenMsg, setTokenMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [repoOpen, setRepoOpen] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [repoDesc, setRepoDesc] = useState('');
  const [repoPrivate, setRepoPrivate] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushMsg, setPushMsg] = useState('chore: commit from VOX-OS');

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
      ) : detail.repo ? (
        <RepoDetail
          repo={detail.repo}
          tab={detail.tab}
          loading={detail.loading}
          error={detail.error}
          branch={detail.branch}
          branches={detail.branches}
          commits={detail.commits}
          issues={detail.issues}
          pulls={detail.pulls}
          onTab={(t) => s.setGithubTab(t)}
          onBranch={(b) => s.setGithubBranch(b)}
          onBack={() => s.closeGithubRepo()}
        />
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

      {connected && !detail.repo && (
        <Panel title="Dev Actions" icon="Zap" glow="cyan" bodyClassName="!p-3.5">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="cyan" icon="FolderPlus" onClick={() => { setRepoOpen(true); setRepoName(''); setRepoDesc(''); }} disabled={s.githubLoading}>CREATE REPO</Button>
            <Button variant="violet" icon="GitCommitHorizontal" onClick={() => setPushOpen(true)} disabled={s.githubLoading}>COMMIT &amp; PUSH</Button>
            <p className="text-[10.5px] text-vox-muted font-mono max-w-md">Create repositories on your GitHub, or commit and push this project's working tree straight to the remote — powered by the backend token, no shell needed.</p>
          </div>
        </Panel>
      )}

      <Modal open={repoOpen} onClose={() => setRepoOpen(false)} title="Create Repository" icon="FolderPlus" width={460}>
        <div className="space-y-3.5">
          <Field label="Repository Name">
            <Input value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="my-new-project" autoFocus className="font-mono" />
          </Field>
          <Field label="Description (optional)">
            <Input value={repoDesc} onChange={(e) => setRepoDesc(e.target.value)} placeholder="What is this project?" />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={repoPrivate} onChange={(e) => setRepoPrivate(e.target.checked)} className="accent-cyan-400" />
            <span className="text-[12px] text-vox-text">Private repository</span>
          </label>
          <p className="text-[10.5px] text-vox-dim">Creates the repo on GitHub via the API. Fine-grained tokens cannot create repos — use a classic token with <span className="font-mono">repo</span> scope.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRepoOpen(false)}>CANCEL</Button>
          <Button variant="solid" icon="FolderPlus" disabled={!repoName.trim()} onClick={() => { void s.createGithubRepo(repoName.trim(), repoDesc.trim(), repoPrivate); setRepoOpen(false); }}>CREATE</Button>
        </div>
      </Modal>

      <Modal open={pushOpen} onClose={() => setPushOpen(false)} title="Commit & Push" icon="GitCommitHorizontal" width={460}>
        <div className="space-y-3">
          <Field label="Commit Message">
            <Input value={pushMsg} onChange={(e) => setPushMsg(e.target.value)} placeholder="chore: commit from VOX-OS" autoFocus className="font-mono" />
          </Field>
          <p className="text-[10.5px] text-vox-dim">Runs <span className="font-mono">git add -A</span>, commits, and pushes the current project to its remote (<span className="font-mono">{s.githubUser ?? 'origin'}</span>). Nothing is staged that isn't already in the working tree.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPushOpen(false)}>CANCEL</Button>
          <Button variant="solid" icon="GitCommitHorizontal" onClick={() => { void s.pushGithubCommit(pushMsg); setPushOpen(false); }}>COMMIT &amp; PUSH</Button>
        </div>
      </Modal>

      {connected && s.githubRepos.length > 0 && !detail.repo && (
        <Panel title="Account Activity" icon="Activity" bodyClassName="!p-3">
          <div className="flex flex-wrap gap-3 text-[11px]">
            <div className="glass-inset px-3 py-2"><span className="hud-label block mb-1">REPOSITORIES</span><span className="font-mono text-[15px] text-vox-text">{s.githubRepos.length}</span></div>
            <div className="glass-inset px-3 py-2"><span className="hud-label block mb-1">LAST SYNC</span><span className="font-mono text-[12px] text-vox-text">{timeAgo(Date.now())}</span></div>
            <div className="glass-inset px-3 py-2 flex-1 min-w-[220px]"><span className="hud-label block mb-1">NOTE</span><span className="text-vox-muted">Select a repository below to browse its real branches, commits, issues, and pull requests.</span></div>
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
            <Badge tone="green">{r.default_branch} · default</Badge>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3.5">
        <Button size="xs" variant="cyan" icon="ExternalLink" onClick={() => window.open(`https://github.com/${r.full_name}`, '_blank')}>VIEW</Button>
        <Button size="xs" icon="GitBranch" onClick={() => void s.openGithubRepo(r.full_name, 'branches')}>BRANCHES</Button>
        <Button size="xs" icon="GitCommitHorizontal" onClick={() => void s.openGithubRepo(r.full_name, 'commits')}>COMMITS</Button>
        <Button size="xs" icon="CircleDot" onClick={() => void s.openGithubRepo(r.full_name, 'issues')}>ISSUES</Button>
        <Button size="xs" variant="ghost" icon="GitPullRequest" onClick={() => void s.openGithubRepo(r.full_name, 'pulls')}>PRS</Button>
        <Button size="xs" variant="ghost" icon="SearchCheck" onClick={() => { s.setSection('security'); void s.scanGithubRepo(r.full_name); }}>SCAN SECRETS</Button>
        <Button size="xs" variant="ghost" icon="Download" onClick={() => s.pushNotification({ category: 'GITHUB', severity: 'info', title: 'CLONE', body: `Cloning requires the Desktop Agent to write to disk.` })}>CLONE</Button>
      </div>
    </div>
  );
}

function RepoDetail(props: {
  repo: string;
  tab: 'branches' | 'commits' | 'issues' | 'pulls';
  loading: boolean;
  error: string | null;
  branch: string;
  branches: GithubBranch[];
  commits: GithubCommit[];
  issues: GithubIssue[];
  pulls: GithubPull[];
  onTab: (t: 'branches' | 'commits' | 'issues' | 'pulls') => void;
  onBranch: (b: string) => void;
  onBack: () => void;
}) {
  const { repo, tab, loading, error, branch, branches, commits, issues, pulls, onTab, onBranch, onBack } = props;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="xs" variant="ghost" icon="ArrowLeft" onClick={onBack}>ALL REPOS</Button>
        <h2 className="font-mono text-[15px] font-semibold text-vox-text truncate">{repo}</h2>
        <span className="ml-auto flex items-center gap-2">
          {tab === 'commits' && branches.length > 0 && (
            <Select value={branch} onChange={(e) => onBranch(e.target.value)} className="!text-[10.5px] font-mono !py-1.5">
              {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
            </Select>
          )}
          <Badge tone="cyan">LIVE</Badge>
        </span>
      </div>

      <Tabs<'branches' | 'commits' | 'issues' | 'pulls'>
        tabs={[
          { id: 'branches', label: 'BRANCHES', icon: 'GitBranch' },
          { id: 'commits', label: 'COMMITS', icon: 'GitCommitHorizontal' },
          { id: 'issues', label: 'ISSUES', icon: 'CircleDot' },
          { id: 'pulls', label: 'PULL REQUESTS', icon: 'GitPullRequest' },
        ]}
        active={tab}
        onChange={onTab}
      />

      {loading ? (
        <Panel><Loading label={`LOADING ${tab.toUpperCase()}…`} /></Panel>
      ) : error ? (
        <Panel>
          <ErrorState title="LOAD FAILED" body={error} onRetry={() => { if (tab === 'commits') onBranch(branch); else onTab(tab); }} />
        </Panel>
      ) : tab === 'branches' ? (
        <Panel title={`Branches (${branches.length})`} icon="GitBranch" bodyClassName="!p-0">
          {branches.length === 0 ? <EmptyState icon="GitBranch" title="NO BRANCHES" body="No branches returned — check the token's repo read scope." /> : (
            <div className="divide-y divide-white/[0.04]">
              {branches.map((b) => (
                <div key={b.name} className="flex items-center gap-3 px-3.5 py-2.5">
                  <Icon name="GitBranch" size={13} className="text-vox-dim shrink-0" />
                  <span className="font-mono text-[12px] text-vox-text truncate">{b.name}</span>
                  {b.protected && <Badge tone="violet">PROTECTED</Badge>}
                  <span className="ml-auto font-mono text-[10px] text-vox-dim">{b.sha.slice(0, 7)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : tab === 'commits' ? (
        <Panel title={`Commits${branch ? ` · ${branch}` : ''} (${commits.length})`} icon="GitCommitHorizontal" bodyClassName="!p-0">
          {commits.length === 0 ? <EmptyState icon="GitCommitHorizontal" title="NO COMMITS" body="No commits on this branch, or the token cannot read them." /> : (
            <div className="divide-y divide-white/[0.04] max-h-[440px] overflow-y-auto">
              {commits.map((c) => (
                <div key={c.sha} className="flex items-start gap-3 px-3.5 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5"><Icon name="GitCommitHorizontal" size={12} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] text-vox-text truncate">{c.message}</p>
                    <p className="text-[10px] text-vox-muted mt-0.5 font-mono">{c.author} · {c.date ? timeAgo(new Date(c.date).getTime()) : '—'}</p>
                  </div>
                  <span className="font-mono text-[10px] text-vox-dim">{c.sha.slice(0, 7)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : tab === 'issues' ? (
        <Panel title={`Open issues (${issues.length})`} icon="CircleDot" bodyClassName="!p-0">
          {issues.length === 0 ? <EmptyState icon="CircleDot" title="NO OPEN ISSUES" body="The issue tracker is clear — or the token cannot read issues." /> : (
            <div className="divide-y divide-white/[0.04] max-h-[440px] overflow-y-auto">
              {issues.map((i) => (
                <div key={i.number} className="flex items-start gap-3 px-3.5 py-2.5">
                  <Icon name="CircleDot" size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] text-vox-text truncate">{i.title}</p>
                    <p className="text-[10px] text-vox-muted mt-0.5 font-mono">#{i.number} · opened by {i.user} · {timeAgo(new Date(i.created_at).getTime())}</p>
                  </div>
                  <span className="text-[10px] text-vox-dim font-mono shrink-0">{i.comments > 0 ? `${i.comments} 💬` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : (
        <Panel title={`Open pull requests (${pulls.length})`} icon="GitPullRequest" bodyClassName="!p-0">
          {pulls.length === 0 ? <EmptyState icon="GitPullRequest" title="NO OPEN PRS" body="No open pull requests — or the token cannot read them." /> : (
            <div className="divide-y divide-white/[0.04] max-h-[440px] overflow-y-auto">
              {pulls.map((p) => (
                <div key={p.number} className="flex items-start gap-3 px-3.5 py-2.5">
                  <Icon name="GitPullRequest" size={13} className="text-violet-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] text-vox-text truncate">{p.title}</p>
                    <p className="text-[10px] text-vox-muted mt-0.5 font-mono">#{p.number} · {p.head} → {p.base} · by {p.user} · {timeAgo(new Date(p.created_at).getTime())}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
      <p className="text-[9.5px] text-vox-dim font-mono">Live from the GitHub API via the VOX backend. Click a repo's BRANCHES / COMMITS / ISSUES / PRS to reload.</p>
    </div>
  );
}
