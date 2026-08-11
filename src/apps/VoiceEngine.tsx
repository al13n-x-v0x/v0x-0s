import { useVox } from '../lib/store';
import { Badge, Button, Icon, Panel, StatusDot, Toggle } from '../components/ui';
import { VoxCore } from '../components/VoxCore';
import { fmtTime } from '../lib/fmt';

export function VoiceEngine() {
  const s = useVox();
  const v = s.voice;
  const coreState = v.status === 'listening' ? 'listening' : v.status === 'speaking' ? 'speaking' : v.status === 'processing' ? 'thinking' : v.status === 'error' ? 'error' : 'idle';

  const statusMeta: Record<string, { label: string; tone: 'online' | 'cyan' | 'violet' | 'red' | 'dim' }> = {
    idle: { label: 'VOX IDLE', tone: 'dim' },
    listening: { label: 'VOX LISTENING', tone: 'red' },
    processing: { label: 'VOX THINKING', tone: 'violet' },
    speaking: { label: 'VOX SPEAKING', tone: 'cyan' },
    error: { label: 'VOX ERROR', tone: 'red' },
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1100px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="hud-label mb-1.5">VOX VOICE ENGINE</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">Speech · Command · Response</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={v.sttSupported ? 'green' : 'dim'}>{v.sttSupported ? 'STT AVAILABLE' : 'STT UNAVAILABLE'}</Badge>
          <Badge tone={v.ttsSupported ? 'green' : 'dim'}>{v.ttsSupported ? 'TTS AVAILABLE' : 'TTS UNAVAILABLE'}</Badge>
          <Toggle checked={s.settings.voiceEnabled} onChange={(val) => s.setSettings({ voiceEnabled: val })} label="Voice enabled" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="VOX Core" icon="Sparkles" glow="violet" bodyClassName="flex flex-col items-center py-8">
          <VoxCore state={coreState} size={200} showStatus={false} />
          <div className="mt-4 flex items-center gap-2">
            <StatusDot tone={statusMeta[v.status].tone} pulse={v.status === 'listening' || v.status === 'speaking'} />
            <span className="font-mono text-[11px] tracking-[0.2em] text-vox-text">{statusMeta[v.status].label}</span>
          </div>

          {v.status === 'listening' && (
            <div className="mt-4 glass-inset px-4 py-2.5 w-full max-w-[320px]">
              <p className="hud-label mb-1">LIVE TRANSCRIPT</p>
              <p className="font-mono text-[13px] text-cyan-200 min-h-[20px]">“{v.transcript || '…' }”</p>
            </div>
          )}
          {v.status === 'error' && <p className="mt-3 text-[11.5px] text-red-300 max-w-[340px] text-center">{v.error}</p>}

          <div className="mt-5 flex gap-2">
            {v.status === 'listening' ? (
              <Button variant="danger" icon="Square" onClick={() => s.stopListening()}>STOP</Button>
            ) : (
              <Button variant="solid" icon="Mic" onClick={() => s.startListening()} disabled={!v.sttSupported || !s.settings.voiceEnabled}>
                🎙 VOX LISTENING
              </Button>
            )}
            <Button variant="cyan" icon="Volume2" onClick={() => s.speakText('Voice engine active. All systems operational.')} disabled={!v.ttsSupported || !s.settings.voiceEnabled}>TEST TTS</Button>
          </div>

          <div className="mt-4 flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5"><Icon name="Mic" size={11} className={v.status === 'listening' ? 'text-red-400' : 'text-vox-dim'} /> MIC {v.status === 'listening' ? '● ACTIVE' : '○ OFF'}</span>
            <span className="text-vox-dim">PRIVACY: mic only activates on explicit press — never in the background.</span>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Voice Command Examples" icon="MicVocal" bodyClassName="!p-3">
            <div className="grid grid-cols-2 gap-1.5">
              {['Open terminal', 'Show my projects', 'Run health scan', 'Open GitHub', 'What\'s using my CPU?', 'Switch to Groq', 'Build this project', 'Show errors', 'Go home', 'Open settings'].map((c) => (
                <button key={c} onClick={() => { s.startListening(); s.executeVoiceCommand(c); }} className="glass-inset px-2.5 py-2 text-left text-[11px] font-mono text-vox-muted hover:text-cyan-300 hover:border-cyan-400/30 transition-colors">
                  “{c}”
                </button>
              ))}
            </div>
            <p className="text-[10px] text-vox-dim mt-2.5 font-mono">Clicking a sample runs the command immediately (voice recognition is not required for samples).</p>
          </Panel>

          <Panel title="Pipeline" icon="GitMerge" bodyClassName="!p-3">
            <div className="flex flex-col items-center gap-1 font-mono text-[10px]">
              {['MIC', 'STT', 'VOICE COMMAND / AI REQUEST', 'VOX ROUTER', 'GEMINI / GROQ', 'VOX RESPONSE', 'TTS', 'SPEAKER'].map((st, i) => (
                <div key={st} className="flex flex-col items-center gap-1">
                  <span className="glass-inset px-3 py-1 text-vox-muted">{st}</span>
                  {i < 7 && <Icon name="ChevronDown" size={11} className="text-vox-dim" />}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Voice History" icon="History" bodyClassName="!p-3">
            {v.history.length === 0 ? <p className="text-[11.5px] text-vox-dim py-2">No recognized commands yet. Only recognized text is stored — no raw audio.</p> : (
              <div className="space-y-1">
                {v.history.slice(0, 8).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11.5px] font-mono">
                    <span className="text-vox-dim">{fmtTime(h.time)}</span>
                    <span className="text-vox-muted">“{h.text}”</span>
                  </div>
                ))}
              </div>
            )}
            {v.history.length > 0 && <Button size="xs" variant="ghost" className="mt-2" onClick={() => useVox.setState({ voice: { ...v, history: [] } })}>CLEAR HISTORY</Button>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
