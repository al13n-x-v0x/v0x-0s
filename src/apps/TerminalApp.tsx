import { useState } from 'react';
import clsx from 'clsx';
import { useVox } from '../lib/store';
import { Badge, Button, Icon, useAutoScroll } from '../components/ui';
import { sessionPrompt } from '../lib/shell';
import { sfx } from '../lib/sounds';

export function TerminalApp() {
  const sessions = useVox((s) => s.terminalSessions);
  const activeId = useVox((s) => s.terminalActive);
  const newTerminal = useVox((s) => s.newTerminal);
  const closeTerminal = useVox((s) => s.closeTerminal);
  const setActive = useVox((s) => s.setTerminalActive);
  const terminalInput = useVox((s) => s.terminalInput);
  const agent = useVox((s) => s.systemInfo.agent);
  const showSim = useVox((s) => s.settings.showSimulatedLabels);
  const [draft, setDraft] = useState('');

  const session = sessions.find((t) => t.id === activeId) ?? sessions[0];
  const scrollRef = useAutoScroll<HTMLDivElement>([session?.history.length, draft]);

  const submit = () => {
    if (!draft.trim()) return;
    terminalInput(session.id, draft);
    setDraft('');
  };

  return (
    <div className="h-full flex flex-col bg-ink-950/80">
      {/* tabs */}
      <div className="flex items-center gap-0.5 px-3 pt-2 border-b border-vox-line bg-ink-900/60 shrink-0">
        {sessions.map((t) => (
          <div
            key={t.id}
            data-active={t.id === activeId}
            onClick={() => setActive(t.id)}
            className={clsx(
              'group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg cursor-pointer text-[10.5px] font-semibold tracking-[0.08em] uppercase border border-b-0',
              t.id === activeId ? 'bg-ink-850 text-cyan-300 border-vox-line' : 'text-vox-dim hover:text-vox-muted border-transparent',
            )}
          >
            <Icon name="SquareTerminal" size={11} />
            {t.shell}
            <button
              aria-label={`Close ${t.shell}`}
              onClick={(e) => { e.stopPropagation(); sfx.command(); closeTerminal(t.id); }}
              className="opacity-0 group-hover:opacity-100 hover:text-red-300"
            >
              <Icon name="X" size={10} />
            </button>
          </div>
        ))}
        <button
          onClick={() => newTerminal()}
          aria-label="New terminal session"
          className="px-2 py-1.5 text-vox-dim hover:text-cyan-300"
        >
          <Icon name="Plus" size={13} />
        </button>
        <div className="ml-auto flex items-center gap-2 pr-2">
          {session.agentMode ? <Badge tone="green">● REAL SHELL</Badge> : <Badge tone="amber">{showSim ? 'SIMULATED' : 'SANDBOX'}</Badge>}
          {agent === 'connected' ? <Badge tone="green">AGENT CONNECTED</Badge> : <Badge tone="dim">AGENT OFFLINE</Badge>}
        </div>
      </div>

      {/* output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[1.75]">
        {session.history.map((h, i) => (
          <div key={i} className="term-line">
            {h.kind === 'in' ? (
              <>
                <span className="text-cyan-300 select-none">{sessionPrompt({ ...session, history: session.history.slice(0, i) })} </span>
                <span className="text-vox-text">{h.input}</span>
              </>
            ) : h.kind === 'err' ? (
              <span className="text-red-300">{h.output}</span>
            ) : h.kind === 'sys' ? (
              <span className="text-vox-dim italic">{h.output}</span>
            ) : (
              <span className="text-vox-muted">{h.output}</span>
            )}
          </div>
        ))}
        {session.history.filter((h) => h.kind === 'out' || h.kind === 'err').length > 0 && (
          <div className="text-vox-dim text-[10px] font-mono mt-1">— exit code {(session.history[session.history.length - 1] as { exitCode?: number }).exitCode ?? 0}</div>
        )}
        <div className="flex items-center gap-0">
          <span className="text-cyan-300 select-none">{sessionPrompt(session)} </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'ArrowUp') setDraft('history'); }}
            onKeyUp={(e) => { if (e.key === 'ArrowUp') setDraft(''); }}
            className="flex-1 bg-transparent outline-none text-vox-text caret-cyan-300 font-mono text-[12px]"
            aria-label="Terminal input"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>

      {/* status bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-t border-vox-line bg-ink-900/60 text-[9.5px] font-mono text-vox-dim shrink-0">
        <span className="text-cyan-300/80">{session.shell}</span>
        <span className="flex items-center gap-1"><span className="dot dot-dim" /> {session.cwd.join('/') || '~'}</span>
        <span className="ml-auto flex items-center gap-2">
          <span>HELP: type <span className="text-vox-text">help</span></span>
          <Button size="xs" variant="ghost" icon="Copy" silent onClick={() => navigator.clipboard?.writeText(session.history.map((h) => h.input ?? h.output ?? '').filter(Boolean).join('\n'))}>COPY</Button>
          <Button size="xs" variant="ghost" icon="Maximize2" silent onClick={() => useVox.getState().openApp('terminal')}>EXPAND</Button>
        </span>
      </div>
    </div>
  );
}
