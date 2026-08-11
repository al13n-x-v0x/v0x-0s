import type { SystemInfo, TelemetryPoint } from './types';
import { clamp } from './fmt';

// Real browser-available metrics + honestly-labeled demo values.
// Nothing here pretends to be OS-level telemetry.

type Mem = Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };

declare const webkitSpeechRecognition: unknown;

export function detectOS(): { os: string; arch: string } {
  const ua = navigator.userAgent;
  let os = 'Web';
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS (unsupported)';
  else if (/FreeBSD/.test(ua)) os = 'FreeBSD';
  else if (/SunOS|Solaris/.test(ua)) os = 'Solaris';
  else if (/Linux/.test(ua)) os = 'Linux';
  const arch = /x86_64|amd64/i.test(ua) || /WOW64/i.test(ua) ? 'x64' : /aarch64|arm64/i.test(ua) ? 'arm64' : /arm/i.test(ua) ? 'arm' : 'unknown';
  return { os, arch };
}

export function browserInfo(): {
  cores: number | null;
  deviceMemory: number | null;
  jsHeap: { used: number; total: number; limit: number } | null;
  connection: { type: string; rtt: number | null; downlink: number | null; effectiveType: string | null };
  online: boolean;
} {
  const mem = performance as Mem;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; rtt?: number; downlink?: number; type?: string } }).connection;
  return {
    cores: navigator.hardwareConcurrency ?? null,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    jsHeap: mem.memory ? { used: mem.memory.usedJSHeapSize, total: mem.memory.totalJSHeapSize, limit: mem.memory.jsHeapSizeLimit } : null,
    connection: {
      type: conn?.type ?? 'unknown',
      rtt: conn?.rtt != null && conn.rtt > 0 ? conn.rtt : null,
      downlink: conn?.downlink != null ? conn.downlink : null,
      effectiveType: conn?.effectiveType ?? null,
    },
    online: navigator.onLine,
  };
}

// Demo telemetry generator — always labeled DEMO in the UI.
let demoSeed = Math.random() * 20 + 15;
export function sampleDemo(prev?: TelemetryPoint): { cpu: number; ram: number; gpu: number; net: number } {
  demoSeed = clamp(demoSeed + (Math.random() - 0.5) * 12, 6, 92);
  const ramBase = 38 + Math.sin(Date.now() / 45000) * 12;
  const gpu = clamp(10 + Math.random() * 30 + (prev ? prev.gpu * 0.4 : 0), 4, 96);
  const net = clamp(40 + Math.random() * 140, 8, 320);
  return { cpu: Math.round(demoSeed), ram: Math.round(ramBase), gpu: Math.round(gpu), net: Math.round(net) };
}

export function realMemoryUsage(): { used: number; total: number; pct: number | null } {
  const mem = performance as Mem;
  if (mem.memory && mem.memory.totalJSHeapSize > 0) {
    const pct = clamp(Math.round((mem.memory.usedJSHeapSize / mem.memory.totalJSHeapSize) * 100), 0, 100);
    return { used: mem.memory.usedJSHeapSize, total: mem.memory.totalJSHeapSize, pct };
  }
  return { used: 0, total: 0, pct: null };
}

export function systemProbe(): Partial<SystemInfo> {
  const { os, arch } = detectOS();
  const info = browserInfo();
  return {
    os,
    arch,
    cores: info.cores,
    ramTotal: info.deviceMemory ? info.deviceMemory * 1024 ** 3 : null,
    network: {
      connected: info.online,
      type: info.connection.type || info.connection.effectiveType || 'unknown',
      rtt: info.connection.rtt,
      down: info.connection.downlink != null ? info.connection.downlink * 1024 * 1024 / 8 : null,
    },
  };
}

export async function batteryProbe(): Promise<{ level: number | null; charging: boolean | null }> {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
    if (!nav.getBattery) return { level: null, charging: null };
    const b = await nav.getBattery();
    return { level: Math.round(b.level * 100), charging: b.charging };
  } catch {
    return { level: null, charging: null };
  }
}

export function sttSupported(): boolean {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
