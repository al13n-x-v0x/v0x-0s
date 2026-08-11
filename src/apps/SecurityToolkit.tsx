import { useState } from 'react';
import { Badge, Button, Icon, Input, Panel, Select, StatusDot } from '../components/ui';

// ---------- helpers ----------
async function sha(text: string, algo: 'SHA-256' | 'SHA-1'): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function passwordScore(pw: string): { score: number; label: string; tone: 'red' | 'amber' | 'cyan' | 'green'; notes: string[] } {
  if (!pw) return { score: 0, label: 'EMPTY', tone: 'red', notes: ['Enter a password to evaluate.'] };
  let score = 0;
  const notes: string[] = [];
  if (pw.length >= 8) score += 1; else notes.push('Use at least 8 characters.');
  if (pw.length >= 14) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1; else notes.push('Mix upper and lower case.');
  if (/\d/.test(pw)) score += 1; else notes.push('Add numbers.');
  if (/[^A-Za-z0-9]/.test(pw)) score += 1; else notes.push('Add symbols.');
  if (!/(.)\1{2,}/.test(pw) && !/^(123|abc|qwe|password|admin)/i.test(pw)) score += 1; else notes.push('Avoid repeats and common patterns.');
  const unique = new Set(pw.toLowerCase()).size;
  if (unique >= 8) score += 1;
  if (score >= 6) return { score, label: 'STRONG', tone: 'green', notes: notes.length ? notes : ['Excellent — this holds up well.'] };
  if (score >= 4) return { score, label: 'GOOD', tone: 'cyan', notes: notes.length ? notes : ['Solid — a few tweaks would harden it.'] };
  if (score >= 2) return { score, label: 'WEAK', tone: 'amber', notes: notes.length ? notes : ['Too predictable — consider a passphrase.'] };
  return { score, label: 'CRITICAL', tone: 'red', notes: notes.length ? notes : ['Use a unique, long passphrase.'] };
}

const COMMON_PORTS = [80, 443, 3000, 5173, 8080, 8787, 8790, 3306, 5432, 6379, 27017];

async function probePort(port: number): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 900);
  try {
    await fetch(`http://127.0.0.1:${port}/`, { mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    return true;
  } catch {
    clearTimeout(t);
    return false; // refused or timed out → closed
  }
}

type Tool = 'ports' | 'dns' | 'whois' | 'hash' | 'password';

export function SecurityToolkit() {
  const [tool, setTool] = useState<Tool>('ports');
  const [ports, setPorts] = useState<{ port: number; open: boolean; state: 'idle' | 'checking' | 'done' }[]>(COMMON_PORTS.map((p) => ({ port: p, open: false, state: 'idle' })));
  const [scanning, setScanning] = useState(false);
  const [dnsHost, setDnsHost] = useState('example.com');
  const [dnsOut, setDnsOut] = useState<null | { ok: boolean; rows: { name: string; type: string; data: string }[]; err?: string }>(null);
  const [dnsBusy, setDnsBusy] = useState(false);
  const [whoisDomain, setWhoisDomain] = useState('example.com');
  const [whoisOut, setWhoisOut] = useState<null | { ok: boolean; rows: [string, string][] }>(null);
  const [whoisBusy, setWhoisBusy] = useState(false);
  const [hashIn, setHashIn] = useState('');
  const [hashAlgo, setHashAlgo] = useState<'SHA-256' | 'SHA-1'>('SHA-256');
  const [hashOut, setHashOut] = useState('');
  const [pw, setPw] = useState('');

  const runPortScan = async () => {
    setScanning(true);
    setPorts((prev) => prev.map((p) => ({ ...p, state: 'checking' })));
    const results = await Promise.all(COMMON_PORTS.map(async (port) => ({ port, open: await probePort(port) })));
    setPorts(results.map((r) => ({ ...r, state: 'done' })));
    setScanning(false);
  };

  const runDns = async () => {
    const host = dnsHost.trim();
    if (!host || dnsBusy) return;
    setDnsBusy(true);
    setDnsOut(null);
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`);
      const j = await res.json();
      if (j.Status !== 0 || !Array.isArray(j.Answer)) {
        setDnsOut({ ok: false, rows: [], err: j.Comment ?? `DNS status ${j.Status}` });
      } else {
        setDnsOut({ ok: true, rows: j.Answer.map((a: { name: string; type: number; data: string }) => ({ name: a.name, type: ['A', 'NS', 'CNAME', 'SOA', 'PTR', 'MX', 'TXT', 'AAAA'][a.type] ?? String(a.type), data: a.data })) });
      }
    } catch {
      setDnsOut({ ok: false, rows: [], err: 'Lookup failed — check your connection to dns.google.' });
    }
    setDnsBusy(false);
  };

  const runWhois = async () => {
    const domain = whoisDomain.trim();
    if (!domain || whoisBusy) return;
    setWhoisBusy(true);
    setWhoisOut(null);
    try {
      const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
      if (!res.ok) {
        setWhoisOut({ ok: false, rows: [['HTTP', String(res.status)], ['Note', res.status === 404 ? 'Domain not found in RDAP.' : 'Registry lookup failed.']] });
      } else {
        const j = await res.json();
        const rows: [string, string][] = [];
        if (j.ldhName) rows.push(['Domain', j.ldhName]);
        if (j.status?.length) rows.push(['Status', j.status.join(', ')]);
        if (j.events?.length) {
          for (const e of j.events) if (e.eventAction) rows.push([e.eventAction.toUpperCase().replace('_', ' '), e.eventDate?.slice(0, 10) ?? '—']);
        }
        if (Array.isArray(j.nameservers)) rows.push(['Nameservers', j.nameservers.map((n: { ldhName: string }) => n.ldhName).join(', ')]);
        if (Array.isArray(j.entities)) {
          const reg = j.entities.find((e: { roles?: string[] }) => e.roles?.includes('registrar'));
          if (reg?.vcardArray?.[1]) {
            const vcard = reg.vcardArray[1] as unknown[][];
            const fn = vcard.find((v) => v[0] === 'fn');
            if (fn) rows.push(['Registrar', String(fn[3])]);
          }
        }
        setWhoisOut({ ok: true, rows });
      }
    } catch {
      setWhoisOut({ ok: false, rows: [['Note', 'WHOIS lookup failed — rdap.org unreachable.']] });
    }
    setWhoisBusy(false);
  };

  const runHash = async () => {
    if (!hashIn) return;
    setHashOut(await sha(hashIn, hashAlgo));
  };

  const strength = passwordScore(pw);

  const tabs: { id: Tool; label: string; icon: string }[] = [
    { id: 'ports', label: 'PORT PROBE', icon: 'Radar' },
    { id: 'dns', label: 'DNS LOOKUP', icon: 'Globe' },
    { id: 'whois', label: 'WHOIS', icon: 'BookOpen' },
    { id: 'hash', label: 'HASH', icon: 'Fingerprint' },
    { id: 'password', label: 'PASSWORD', icon: 'Lock' },
  ];

  return (
    <Panel title="Security Toolkit" icon="Shield" glow="violet" bodyClassName="!p-0">
      <div className="flex gap-1.5 p-3 pb-0 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[10.5px] font-mono tracking-wide flex items-center gap-1.5 border transition-colors ${
              tool === t.id ? 'bg-violet-500/15 border-violet-400/40 text-violet-200' : 'border-white/5 text-vox-muted hover:text-vox-text hover:border-white/10'
            }`}
          >
            <Icon name={t.icon} size={12} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-3.5">
        {tool === 'ports' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-vox-muted max-w-[420px]">Probes common service ports on <span className="font-mono text-vox-text">127.0.0.1</span> from this browser tab. A responding port (even one that blocks the request) counts as OPEN.</p>
              <Button size="xs" variant="violet" icon="Radar" onClick={() => void runPortScan()} disabled={scanning}>{scanning ? 'SCANNING…' : 'RUN PROBE'}</Button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
              {ports.map((p) => (
                <div key={p.port} className={`glass-inset rounded-lg px-2 py-1.5 flex items-center gap-1.5 ${p.state === 'done' && p.open ? 'border-emerald-400/30' : ''}`}>
                  <StatusDot tone={p.state === 'done' ? (p.open ? 'online' : 'dim') : 'amber'} pulse={p.state === 'checking'} />
                  <span className="font-mono text-[11px] text-vox-text">{p.port}</span>
                  <span className="ml-auto text-[9px] font-mono text-vox-dim">{p.state === 'done' ? (p.open ? 'OPEN' : 'closed') : p.state === 'checking' ? '…' : '—'}</span>
                </div>
              ))}
            </div>
            <p className="text-[9.5px] text-vox-dim font-mono">Read-only check of your own machine. Port scanning other hosts requires the Desktop Agent.</p>
          </div>
        )}

        {tool === 'dns' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={dnsHost} onChange={(e) => setDnsHost(e.target.value)} placeholder="example.com" className="font-mono" onKeyDown={(e) => e.key === 'Enter' && void runDns()} />
              <Button variant="violet" icon="Search" onClick={() => void runDns()} disabled={dnsBusy}>LOOKUP</Button>
            </div>
            <p className="text-[10px] text-vox-dim font-mono">Via Google DNS-over-HTTPS (dns.google/resolve) — no API key required. Free and public.</p>
            {dnsOut && (
              <div className="glass-inset rounded-lg p-3">
                {dnsOut.ok ? (
                  <div className="space-y-1">
                    {dnsOut.rows.map((r, i) => (
                      <div key={i} className="flex gap-2 text-[11px] font-mono">
                        <Badge tone="violet" className="shrink-0">{r.type}</Badge>
                        <span className="text-vox-muted break-all">{r.name}</span>
                        <span className="ml-auto text-vox-text break-all text-right">{r.data}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11.5px] text-amber-300 font-mono">{dnsOut.err}</p>
                )}
              </div>
            )}
          </div>
        )}

        {tool === 'whois' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={whoisDomain} onChange={(e) => setWhoisDomain(e.target.value)} placeholder="example.com" className="font-mono" onKeyDown={(e) => e.key === 'Enter' && void runWhois()} />
              <Button variant="violet" icon="BookOpen" onClick={() => void runWhois()} disabled={whoisBusy}>LOOKUP</Button>
            </div>
            <p className="text-[10px] text-vox-dim font-mono">Registry data via public RDAP (rdap.org) — no API key required. Registrars, status, dates, nameservers.</p>
            {whoisOut && (
              <div className="glass-inset rounded-lg p-3 space-y-1.5">
                {whoisOut.rows.length === 0 && <p className="text-[11.5px] text-vox-muted font-mono">No registry records returned.</p>}
                {whoisOut.rows.map(([k, v], i) => (
                  <div key={i} className="flex gap-2 text-[11px] font-mono">
                    <span className="text-violet-300 w-32 shrink-0 uppercase text-[9.5px] tracking-wide pt-0.5">{k}</span>
                    <span className="text-vox-text break-all">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tool === 'hash' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={hashIn} onChange={(e) => setHashIn(e.target.value)} placeholder="Text to hash…" className="font-mono" onKeyDown={(e) => e.key === 'Enter' && void runHash()} />
              <Select value={hashAlgo} onChange={(e) => setHashAlgo(e.target.value as 'SHA-256' | 'SHA-1')} className="vox-select w-28">
                <option value="SHA-256">SHA-256</option>
                <option value="SHA-1">SHA-1</option>
              </Select>
              <Button variant="violet" icon="Fingerprint" onClick={() => void runHash()}>HASH</Button>
            </div>
            {hashOut && (
              <div className="glass-inset rounded-lg p-3">
                <p className="text-[9.5px] text-vox-dim font-mono mb-1">{hashAlgo} · COMPUTED LOCALLY IN YOUR BROWSER</p>
                <p className="font-mono text-[12px] text-cyan-300 break-all select-all">{hashOut}</p>
              </div>
            )}
          </div>
        )}

        {tool === 'password' && (
          <div className="space-y-3">
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Type a password to evaluate…" className="font-mono" />
            {pw && (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden flex gap-0.5">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className={`flex-1 rounded-full transition-colors ${i < strength.score ? (strength.tone === 'green' ? 'bg-emerald-400' : strength.tone === 'cyan' ? 'bg-cyan-400' : strength.tone === 'amber' ? 'bg-amber-400' : 'bg-red-400') : 'bg-white/5'}`} />
                    ))}
                  </div>
                  <Badge tone={strength.tone}>{strength.label}</Badge>
                </div>
                <ul className="space-y-1">
                  {strength.notes.map((n, i) => (
                    <li key={i} className="text-[10.5px] text-vox-muted flex gap-1.5">
                      <Icon name={strength.score >= 4 ? 'CheckCircle2' : 'Info'} size={11} className={strength.score >= 4 ? 'text-emerald-400 mt-0.5' : 'text-amber-300 mt-0.5'} />
                      {n}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="text-[9.5px] text-vox-dim font-mono">Evaluated entirely in your browser — the password never leaves this page.</p>
          </div>
        )}
      </div>
    </Panel>
  );
}
