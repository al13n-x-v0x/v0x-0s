import { useState } from 'react';
import { useVox } from '../lib/store';
import { Badge, Button, Icon, Input, Panel, StatusDot } from '../components/ui';

// ---------- hash cracker (local, educational) ----------
const WORDLIST = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
  'baseball', 'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321',
  'superman', 'qazwsx', 'michael', 'football', 'admin', 'welcome', 'login', 'princess', 'solo', 'hello',
  'hunter2', 'batman', 'starwars', 'freedom', 'whatever', 'lovely', 'jesus', 'ninja', 'mustang', 'password1',
  'password123', 'admin123', 'root', 'toor', 'guest', 'test', 'testing', 'demo', 'vox', 'voxos', 'vox-os',
  'gamer', 'gaming', 'roblox', 'minecraft', 'fortnite', 'valorant', 'cod', 'warzone', 'epic', 'steam',
  'computer', 'internet', 'google', 'youtube', 'facebook', 'instagram', 'twitter', 'netflix', 'spotify', 'amazon',
  'orange', 'purple', 'yellow', 'green', 'blue', 'red', 'violet', 'silver', 'golden', 'rainbow',
  'summer', 'winter', 'spring', 'autumn', 'birthday', 'christmas', 'halloween', 'newyear', 'thanksgiving', 'easter',
  'charlie', 'daniel', 'edward', 'frank', 'george', 'harry', 'jack', 'king', 'london', 'maggie',
  'nathan', 'oliver', 'peter', 'queen', 'robert', 'sammy', 'tommy', 'ultra', 'victor', 'william',
  'xavier', 'yellow', 'zebra', 'alpha', 'bravo', 'charlie1', 'delta', 'echo', 'foxtrot', 'golf',
  'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec',
  'romeo', 'sierra', 'tango', 'uniform', 'victor1', 'whiskey', 'xray', 'yankee', 'zulu', 'access',
  'account', 'alex', 'angel', 'animal', 'answer', 'apples', 'august', 'autumn1', 'bandit', 'banana',
  'basket', 'beaver', 'bigdog', 'bigdaddy', 'birdie', 'blazer', 'blessed', 'blonde', 'blowfish', 'bluebird',
  'bonjour', 'boomer', 'boston', 'brandy', 'braves', 'brazil', 'brother', 'buster', 'butter', 'california',
  'camaro', 'cameron', 'canada', 'captain', 'carlos', 'carter', 'casper', 'cheese', 'chester', 'chicago',
  'chicken', 'chocolate', 'cocacola', 'coffee', 'college', 'compaq', 'connect', 'cookie', 'cooper', 'corvette',
  'cowboy', 'cricket', 'crystal', 'cyclone', 'dallas', 'david', 'debbie', 'dennis', 'diamond', 'digital',
  'dolphin', 'donald', 'donna', 'dragon1', 'drummer', 'duckie', 'eagle', 'eagles', 'edison', 'elephant',
  'enterprise', 'explorer', 'falcon', 'family', 'fender', 'ferrari', 'fireball', 'firebird', 'fish', 'fishing',
  'flower', 'forever', 'froggy', 'gandalf', 'garfield', 'gators', 'gemini', 'giants', 'ginger', 'gizmo',
  'goldfish', 'golfer', 'gordon', 'graham', 'guitar', 'hammer', 'happy', 'harley', 'harris', 'hockey',
  'homer', 'honda', 'honey', 'hoover', 'hunter', 'icecream', 'indigo', 'jackie', 'jackson', 'jasper',
  'jennifer', 'jessica', 'johnny', 'jordan', 'joseph', 'joshua', 'junior', 'justice', 'karen', 'kathleen',
  'kitten', 'knight', 'lakers', 'lemon', 'little', 'lizard', 'lucky', 'maddog', 'magic', 'magnum',
  'marine', 'marlboro', 'marvin', 'matrix', 'matthew', 'maverick', 'melissa', 'member', 'mercedes', 'merlin',
  'mexico', 'michelle', 'midnight', 'miller', 'missy', 'monday', 'monica', 'monster', 'montana', 'morgan',
  'mother', 'mountain', 'muffin', 'murphy', 'music', 'nascar', 'nathan1', 'ncc1701', 'newyork', 'nicole',
  'night', 'nothing', 'ocean', 'october', 'oliver1', 'orange1', 'packer', 'panther', 'parker', 'patrick',
  'peanut', 'pepper', 'phantom', 'phoenix', 'picard', 'pizza', 'player', 'please', 'porsche', 'power',
  'pumpkin', 'purple1', 'rabbit', 'rachel', 'racing', 'radio', 'rainbow1', 'ranger', 'rangers', 'rebecca',
  'rebel', 'reddog', 'redsox', 'remember', 'richard', 'robert1', 'rocket', 'rosebud', 'runner', 'russia',
  'samsung', 'sandra', 'saturn', 'scooby', 'scorpio', 'secret', 'shannon', 'sharon', 'shining', 'shirley',
  'silver1', 'simple', 'singer', 'skippy', 'slayer', 'smokey', 'snoopy', 'soccer', 'sophie', 'sparky',
  'spider', 'sports', 'squirt', 'star', 'stargate', 'steelers', 'steven', 'stupid', 'success', 'sucker',
  'summer1', 'sunflower', 'sydney', 'system', 'taylor', 'tennis', 'tester', 'theman', 'thomas', 'thunder',
  'tiger', 'tigers', 'tomcat', 'toyota', 'travis', 'travel', 'tricia', 'trouble', 'trumpet', 'tucker',
  'turtle', 'twitter1', 'unicorn', 'victoria', 'viking', 'vincent', 'violet1', 'walter', 'warrior', 'welcome1',
  'wesley', 'western', 'whiskey1', 'william1', 'wilson', 'winner', 'winter1', 'wizard', 'wolverine', 'wrangler',
  'yankees', 'yellow1', 'yourmom', 'zaq12wsx', 'zxcvbnm', '1qaz2wsx', 'qwerty123', 'qwertyuiop', 'asdfghjkl', 'poiuytrewq',
];

async function crack(hash: string, algo: 'SHA-1' | 'SHA-256'): Promise<string | null> {
  const target = hash.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(target) && !/^[a-f0-9]{64}$/.test(target)) return null;
  const buf = new TextEncoder();
  const digest = async (s: string) => {
    const d = await crypto.subtle.digest(algo, buf.encode(s));
    return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  const list = [...WORDLIST, ...WORDLIST.map((w) => w + '1'), ...WORDLIST.map((w) => w + '123'), ...WORDLIST.map((w) => w + '!'), ...WORDLIST.map((w) => w + '2024'), ...WORDLIST.map((w) => w + '2025'), ...WORDLIST.map((w) => w + '2026')];
  for (const word of list) {
    if (await digest(word) === target) return word;
  }
  return null;
}

// ---------- tool component ----------
function ToolPanel({ title, icon, glow, children, right }: { title: string; icon: string; glow?: 'cyan' | 'violet'; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Panel title={title} icon={icon} glow={glow} actions={right} bodyClassName="!p-3.5">
      {children}
    </Panel>
  );
}

function Output({ text, error, busy }: { text: string; error?: boolean; busy?: boolean }) {
  return (
    <div className={`mt-3 rounded-lg p-3 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap break-all max-h-[260px] overflow-y-auto ${error ? 'bg-red-500/[0.06] text-red-300 border border-red-400/20' : 'bg-black/40 border border-white/5 text-vox-muted'}`}>
      {busy && <span className="text-cyan-300 animate-pulse">▌</span>}
      {text}
    </div>
  );
}

export function ReconLab() {
  const s = useVox();
  const connected = s.agentState.status === 'connected';
  const [busy, setBusy] = useState<string | null>(null);

  // port scan
  const [scanHost, setScanHost] = useState('127.0.0.1');
  const [scanPorts, setScanPorts] = useState('22,80,443,3000,3306,5173,5432,6379,8080,8787,8790,27017');
  const [scanOut, setScanOut] = useState('');
  const [scanErr, setScanErr] = useState(false);

  // ping sweep
  const [sweepSub, setSweepSub] = useState('192.168.1.');
  const [sweepRange, setSweepRange] = useState('1-30');
  const [sweepOut, setSweepOut] = useState('');
  const [sweepErr, setSweepErr] = useState(false);

  // netstat / arp
  const [netOut, setNetOut] = useState('');
  const [netErr, setNetErr] = useState(false);
  const [arpOut, setArpOut] = useState('');
  const [arpErr, setArpErr] = useState(false);

  // subdomain recon
  const [subDomain, setSubDomain] = useState('');
  const [subOut, setSubOut] = useState('');
  const [subErr, setSubErr] = useState(false);

  // hash cracker
  const [hashIn, setHashIn] = useState('');
  const [hashAlgo, setHashAlgo] = useState<'SHA-1' | 'SHA-256'>('SHA-1');
  const [crackOut, setCrackOut] = useState('');
  const [crackBusy, setCrackBusy] = useState(false);

  // practice lab
  const [labIp, setLabIp] = useState('192.168.56.101');
  const [labOut, setLabOut] = useState('');
  const [labErr, setLabErr] = useState(false);

  const runAgent = async (key: string, cmd: string) => {
    if (!connected) return;
    setBusy(key);
    const r = await s.agentRun(cmd, 60000);
    setBusy(null);
    return r;
  };

  const doPortScan = async () => {
    const host = scanHost.trim() || '127.0.0.1';
    const ports = scanPorts.split(',').map((p) => p.trim()).filter((p) => /^\d+$/.test(p)).map(Number).filter((p) => p > 0 && p < 65536);
    if (!ports.length) { setScanOut('Enter at least one valid port.'); setScanErr(true); return; }
    setScanErr(false);
    setScanOut('');
    const cmd = `$h='${host}'; $ports=@(${ports.join(',')}); foreach($p in $ports){ $c=New-Object Net.Sockets.TcpClient; try{ $t=$c.ConnectAsync($h,$p); if($t.Wait(400) -and $c.Connected){ \"$p OPEN\" } else { \"$p closed\" } } finally { $c.Close() } }; \"scan complete\"`;
    const r = await runAgent('scan', cmd);
    setScanOut(r?.output ?? '');
    setScanErr(!r?.ok);
  };

  const doSweep = async () => {
    const sub = sweepSub.trim();
    const m = sweepRange.trim().match(/^(\d+)-(\d+)$/);
    if (!sub.endsWith('.')) { setSweepOut('Subnet must end with a dot, e.g. 192.168.1.'); setSweepErr(true); return; }
    if (!m) { setSweepOut('Range must be like 1-30.'); setSweepErr(true); return; }
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a < 1 || b > 254 || a > b) { setSweepOut('Range must be within 1-254 and start <= end.'); setSweepErr(true); return; }
    setSweepErr(false);
    setSweepOut('');
    const cmd = `$sub='${sub}'; $p=New-Object Net.NetworkInformation.Ping; for($i=${a};$i -le ${b};$i++){ $h=$sub+$i; if($p.Send($h,400).Status -eq 'Success'){ \"UP  $h\" } }; 'sweep complete'`;
    const r = await runAgent('sweep', cmd);
    setSweepOut(r?.output ?? '');
    setSweepErr(!r?.ok);
  };

  const doNetstat = async () => {
    setNetErr(false);
    setNetOut('');
    const r = await runAgent('net', `netstat -ano | Select-String 'ESTABLISHED|LISTENING' | Select-Object -First 40 | ForEach-Object { $_.ToString().Trim() }; 'netstat complete'`);
    setNetOut(r?.output ?? '');
    setNetErr(!r?.ok);
  };

  const doArp = async () => {
    setArpErr(false);
    setArpOut('');
    const r = await runAgent('arp', `arp -a`);
    setArpOut(r?.output ?? '');
    setArpErr(!r?.ok);
  };

  const doSubs = async () => {
    const domain = subDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain.includes('.')) { setSubOut('Enter a domain, e.g. example.com'); setSubErr(true); return; }
    setSubErr(false);
    setSubOut('Brute-forcing ~230 common subdomain names against dns.google…');
    try {
      const res = await fetch(`/api/recon/subdomains?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) { setSubOut(data.error ?? 'Lookup failed'); setSubErr(true); return; }
      setSubOut(data.subdomains.length ? data.subdomains.map((s: { name: string; ips: string[] }) => `${s.name}  →  ${s.ips.join(', ')}`).join('\n') : `No subdomains from the dictionary resolved for ${domain}.`);
    } catch {
      setSubOut('Backend unreachable.'); setSubErr(true);
    }
  };

  const doCrack = async () => {
    if (!hashIn.trim()) return;
    setCrackBusy(true);
    setCrackOut('Brute-forcing against local wordlist…');
    const found = await crack(hashIn, hashAlgo);
    setCrackBusy(false);
    setCrackOut(found ? `CRACKED → "${found}"` : 'NOT FOUND — not in the bundled wordlist (try a longer/stronger hash or a real hashcat/John session).');
  };

  const LAB_PORTS = '21,22,23,25,53,80,111,139,445,512,513,514,1099,1524,2121,3306,5432,5900,6000,6667,8009,8180';

  const doLabCheck = async () => {
    const ip = labIp.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) { setLabOut('Enter a valid IPv4, e.g. 192.168.56.101'); setLabErr(true); return; }
    setLabErr(false);
    setLabOut('');
    const r = await runAgent('lab', `$p=New-Object Net.NetworkInformation.Ping; if($p.Send('${ip}',800).Status -eq 'Success'){ 'TARGET UP' } else { 'TARGET UNREACHABLE' }`);
    setLabOut(r?.output ?? '');
    setLabErr(!r?.ok);
  };

  const doLabRecon = async () => {
    const ip = labIp.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) { setLabOut('Enter a valid IPv4, e.g. 192.168.56.101'); setLabErr(true); return; }
    setLabErr(false);
    setLabOut('Running full recon chain against your lab target…');
    // 1) ping check
    const ping = await runAgent('lab', `$p=New-Object Net.NetworkInformation.Ping; if($p.Send('${ip}',800).Status -eq 'Success'){ '1) TARGET UP' } else { '1) TARGET UNREACHABLE' }`);
    // 2) port scan of the classic lab service list
    const ports = LAB_PORTS.split(',').map((p) => p.trim()).join(',');
    const scan = await runAgent('lab', `$h='${ip}'; $ports=@(${ports}); foreach($p in $ports){ $c=New-Object Net.Sockets.TcpClient; try{ $t=$c.ConnectAsync($h,$p); if($t.Wait(400) -and $c.Connected){ \"2) PORT $p OPEN\" } } finally { $c.Close() } }; 'scan done'`);
    // 3) ARP to identify the lab VM's MAC
    const arp = await runAgent('lab', `arp -a | Select-String '${ip.split('.').slice(0, 3).join('.')}'`);
    // display filter: keep only the meaningful result lines (drops command echoes)
    const clean = (o?: string) => (o ?? '').split(/\r?\n/).filter((l) => /^1\) |^2\) PORT|scan done|Internet Address|dynamic|static/.test(l)).join('\n');
    setLabOut([clean(ping?.output), clean(scan?.output), clean(arp?.output)].filter(Boolean).join('\n'));
    setLabErr(!ping?.ok || !scan?.ok);
  };

  const agentBadge = <Badge tone={connected ? 'green' : 'dim'}>{connected ? `AGENT: ${s.agentState.os?.hostname ?? 'LINKED'}` : 'AGENT OFFLINE'}</Badge>;

  return (
    <div className="p-5 space-y-4 animate-fade-in max-w-[1200px]">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="hud-label mb-1.5">SECURITY · RECON</p>
          <h1 className="font-display text-[22px] font-semibold tracking-[0.06em] uppercase">RECON LAB</h1>
        </div>
        {agentBadge}
      </div>

      <div className="glass hud-border rounded-xl p-3.5 flex items-start gap-3 border-amber-400/20">
        <Icon name="TriangleAlert" size={15} className="text-amber-300 mt-0.5 shrink-0" />
        <p className="text-[11px] text-vox-muted leading-relaxed">
          <span className="text-amber-300 font-semibold">AUTHORIZED TESTING ONLY.</span> These tools run real commands through the Desktop Agent against targets on your own machine or network. Scanning systems you don't own or lack permission to test may be illegal — you're responsible for using them lawfully.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ToolPanel title="Port Scanner" icon="Radar" glow="cyan" right={<StatusDot tone={connected ? 'online' : 'dim'} pulse={busy === 'scan'} />}>
          <div className="flex gap-2 flex-wrap">
            <Input value={scanHost} onChange={(e) => setScanHost(e.target.value)} placeholder="127.0.0.1" className="font-mono w-32" />
            <Input value={scanPorts} onChange={(e) => setScanPorts(e.target.value)} placeholder="22,80,443" className="font-mono flex-1 min-w-[150px]" />
            <Button size="sm" variant="cyan" icon="Radar" disabled={!connected || busy !== null} onClick={() => void doPortScan()}>SCAN</Button>
          </div>
          <p className="text-[9.5px] text-vox-dim mt-2 font-mono">TCP connect scan via Test-NetConnection · targets you own</p>
          <Output text={scanOut} error={scanErr} busy={busy === 'scan'} />
        </ToolPanel>

        <ToolPanel title="Ping Sweep" icon="Wifi" glow="cyan" right={<StatusDot tone={connected ? 'online' : 'dim'} pulse={busy === 'sweep'} />}>
          <div className="flex gap-2 flex-wrap">
            <Input value={sweepSub} onChange={(e) => setSweepSub(e.target.value)} placeholder="192.168.1." className="font-mono w-32" />
            <Input value={sweepRange} onChange={(e) => setSweepRange(e.target.value)} placeholder="1-30" className="font-mono w-20" />
            <Button size="sm" variant="cyan" icon="Wifi" disabled={!connected || busy !== null} onClick={() => void doSweep()}>SWEEP</Button>
          </div>
          <p className="text-[9.5px] text-vox-dim mt-2 font-mono">ICMP sweep of your subnet · live hosts only · ~1s per host</p>
          <Output text={sweepOut} error={sweepErr} busy={busy === 'sweep'} />
        </ToolPanel>

        <ToolPanel title="Active Connections" icon="ListOrdered" glow="violet" right={<StatusDot tone={connected ? 'online' : 'dim'} pulse={busy === 'net'} />}>
          <Button size="sm" variant="violet" icon="ListOrdered" disabled={!connected || busy !== null} onClick={() => void doNetstat()}>NETSTAT</Button>
          <p className="text-[9.5px] text-vox-dim mt-2 font-mono">ESTABLISHED + LISTENING sockets on this machine</p>
          <Output text={netOut} error={netErr} busy={busy === 'net'} />
        </ToolPanel>

        <ToolPanel title="LAN Device Discovery" icon="Network" glow="violet" right={<StatusDot tone={connected ? 'online' : 'dim'} pulse={busy === 'arp'} />}>
          <Button size="sm" variant="violet" icon="Network" disabled={!connected || busy !== null} onClick={() => void doArp()}>ARP -A</Button>
          <p className="text-[9.5px] text-vox-dim mt-2 font-mono">Devices your machine has talked to on the LAN (IP + MAC)</p>
          <Output text={arpOut} error={arpErr} busy={busy === 'arp'} />
        </ToolPanel>
      </div>

      <ToolPanel title="Practice Lab" icon="FlaskConical" glow="violet" right={<StatusDot tone={connected ? 'online' : 'dim'} pulse={busy === 'lab'} />}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input value={labIp} onChange={(e) => setLabIp(e.target.value)} placeholder="192.168.56.101" className="font-mono w-40" />
          <Button size="sm" variant="cyan" icon="Wifi" disabled={!connected || busy !== null} onClick={() => void doLabCheck()}>CHECK TARGET</Button>
          <Button size="sm" variant="violet" icon="Radar" disabled={!connected || busy !== null} onClick={() => void doLabRecon()}>FULL RECON</Button>
          <a href="/HACKING-LAB.md" className="text-[10px] font-mono text-violet-300 hover:text-violet-200 underline underline-offset-2" target="_blank" rel="noreferrer">open the lab guide →</a>
        </div>
        <p className="text-[9.5px] text-vox-dim mt-2 font-mono">Your own DVWA / Metasploitable VMs only · defaults to the Metasploitable host-only IP · FULL RECON = ping + classic service port scan + ARP identify</p>
        <Output text={labOut} error={labErr} busy={busy === 'lab'} />
      </ToolPanel>

      <div className="grid md:grid-cols-2 gap-4">
        <ToolPanel title="Subdomain Recon" icon="Globe" glow="cyan">
          <div className="flex gap-2">
            <Input value={subDomain} onChange={(e) => setSubDomain(e.target.value)} placeholder="example.com" className="font-mono flex-1" onKeyDown={(e) => e.key === 'Enter' && void doSubs()} />
            <Button size="sm" variant="cyan" icon="Globe" disabled={busy !== null} onClick={() => void doSubs()}>ENUMERATE</Button>
          </div>
          <p className="text-[9.5px] text-vox-dim mt-2 font-mono">DNS dictionary brute-force of ~230 common names via dns.google — no key needed</p>
          <Output text={subOut} error={subErr} />
        </ToolPanel>

        <ToolPanel title="Hash Cracker" icon="Fingerprint" glow="violet">
          <div className="flex gap-2">
            <Input value={hashIn} onChange={(e) => setHashIn(e.target.value)} placeholder="40- or 64-hex hash" className="font-mono flex-1" onKeyDown={(e) => e.key === 'Enter' && void doCrack()} />
            <select value={hashAlgo} onChange={(e) => setHashAlgo(e.target.value as 'SHA-1' | 'SHA-256')} className="vox-input vox-select w-28 font-mono">
              <option value="SHA-1">SHA-1</option>
              <option value="SHA-256">SHA-256</option>
            </select>
            <Button size="sm" variant="violet" icon="Fingerprint" disabled={crackBusy} onClick={() => void doCrack()}>CRACK</Button>
          </div>
          <p className="text-[9.5px] text-vox-dim mt-2 font-mono">Offline wordlist attack, 100% in your browser · ~1,400 candidates · nothing leaves the page</p>
          <Output text={crackOut} busy={crackBusy} />
        </ToolPanel>
      </div>

      <p className="text-[10px] text-vox-dim font-mono">Agent-powered tools execute real host commands and are labeled honestly — no simulated results. For serious pentesting, the Desktop Agent shell gives you the full toolkit: install Python/Go tooling and run nmap, masscan, ffuf, hashcat, sqlmap and friends right from the Terminal.</p>
    </div>
  );
}
