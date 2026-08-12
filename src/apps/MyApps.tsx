import { useEffect, useMemo, useState } from 'react';
import { useVox } from '../lib/store';
import { Badge, Icon } from '../components/ui';
import { sfx } from '../lib/sounds';

export function MyApps() {
  const s = useVox();
  const apps = s.installedApps;
  const loading = s.appsLoading;
  const error = s.appsError;
  const agentOnline = s.agentState.status === 'connected';
  const load = s.loadInstalledApps;
  const launch = s.launchApp;
  const requestPerm = s.agentRequestPermission;
  const [q, setQ] = useState('');
  const [launching, setLaunching] = useState<string | null>(null);

  useEffect(() => {
    if (agentOnline) void load();
  }, [agentOnline, load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return apps;
    return apps.filter((a) => a.name.toLowerCase().includes(query));
  }, [apps, q]);

  const onLaunch = async (appId: string, name: string) => {
    sfx.command();
    // ensure the APPS permission is granted first (may prompt on the agent console)
    if (!s.agentState.perms['APPS'] || s.agentState.perms['APPS'] !== 'allowed') {
      await requestPerm('APPS');
    }
    setLaunching(appId);
    await launch(appId);
    setLaunching(null);
  };

  return (
    <div className="p-5 sm:p-6 max-w-[1100px] mx-auto animate-fade-in space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="hud-label mb-1.5">SYSTEM · REAL APPLICATIONS</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">My Apps</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={agentOnline ? 'green' : 'dim'}>{agentOnline ? 'AGENT LINKED' : 'AGENT OFFLINE'}</Badge>
          <Badge tone="cyan">{apps.length} INSTALLED</Badge>
          <button
            onClick={() => { sfx.command(); void load(); }}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-cyan-400/10 border border-vox-cyan/30 text-vox-cyan text-[11px] font-bold tracking-[0.14em] hover:bg-cyan-400/20 disabled:opacity-50"
          >
            {loading ? 'SCANNING…' : 'REFRESH'}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl px-4 py-3 border border-vox-amber/30 text-vox-amber font-mono text-[11px] tracking-[0.08em]">
          {error}
        </div>
      )}

      {!agentOnline && (
        <div className="glass rounded-2xl px-6 py-10 text-center">
          <Icon name="Bot" size={30} className="text-vox-dim mx-auto" />
          <p className="mt-3 font-display text-[14px] font-bold tracking-[0.16em] text-vox-text uppercase">Desktop Agent Offline</p>
          <p className="mt-1 text-[12px] text-vox-muted max-w-md mx-auto">
            Start the VOX Desktop Agent on this PC to scan and launch your real installed applications.
          </p>
        </div>
      )}

      {/* search */}
      {agentOnline && (
        <div className="glass-inset flex items-center gap-2.5 px-3.5 h-11 rounded-xl border border-vox-line focus-within:border-vox-cyan/50">
          <Icon name="Search" size={16} className="text-vox-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search installed apps…"
            className="flex-1 bg-transparent outline-none text-[13px] text-vox-text placeholder:text-vox-dim"
            aria-label="Search installed apps"
          />
        </div>
      )}

      {/* loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      )}

      {/* app grid */}
      {agentOnline && !loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((app) => (
            <button
              key={app.appId}
              onClick={() => void onLaunch(app.appId, app.name)}
              disabled={launching === app.appId}
              className="glass rounded-2xl px-4 py-4 flex flex-col items-start gap-2.5 text-left hover:border-vox-cyan/40 hover:bg-white/[0.03] transition-colors active:scale-[0.98] disabled:opacity-60"
              title={`Launch ${app.name}`}
            >
              <span className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-vox-line flex items-center justify-center text-vox-cyan">
                {launching === app.appId ? (
                  <Icon name="Loader" size={18} className="animate-spin" />
                ) : (
                  <Icon name="AppWindow" size={18} />
                )}
              </span>
              <span className="min-w-0 w-full">
                <span className="block text-[12.5px] font-semibold text-vox-text truncate">{app.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] text-vox-cyan uppercase">
                  Launch <Icon name="ExternalLink" size={10} />
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {agentOnline && !loading && filtered.length === 0 && (
        <div className="glass rounded-2xl px-6 py-10 text-center">
          <Icon name="SearchX" size={26} className="text-vox-dim mx-auto" />
          <p className="mt-3 font-mono text-[11px] tracking-[0.2em] text-vox-dim uppercase">
            {apps.length === 0 ? 'No apps detected yet — hit REFRESH' : `No apps match “${q}”`}
          </p>
        </div>
      )}

      <p className="text-center font-mono text-[9.5px] tracking-[0.22em] text-vox-dim uppercase pt-1">
        Real applications from this PC via the Desktop Agent · launching opens them on the host
      </p>
    </div>
  );
}
