// ============================================================
// VOX-OS platform detection — real, browser-available facts only.
//   · OS family/version/arch from userAgent + userAgentData
//   · GPU renderer from WebGL (real, when the browser exposes it)
//   · Roblox compatibility from actual capability checks
// Nothing here pretends to read the host OS — the browser reports
// what it's willing to report; the rest is labeled honestly.
// ============================================================

export interface OSInfo {
  family: string;      // 'Windows' | 'Linux' | 'Android' | 'BSD' | 'Solaris' | 'ChromeOS' | 'macOS' | 'iOS' | 'Web'
  name: string;        // human label, e.g. 'Windows 11'
  version: string;     // raw-ish version, e.g. 'NT 10.0'
  arch: string;        // 'x64' | 'arm64' | 'arm' | 'unknown'
  mobile: boolean;
  supported: boolean;  // VOX-OS targets Windows/Linux/Android/BSD/Solaris/Web — NOT macOS
  notes: string[];
  gaming: { directX?: string; vulkan?: string; openGL?: string; style: 'DESKTOP' | 'MOBILE' | 'WEB'; tip: string };
}

export interface BrowserInfo {
  name: string;
  version: string;
}

export interface GPUInfo {
  renderer: string | null; // real WebGL renderer string when available
  vendor: string | null;
  webgl2: boolean;
}

export interface RobloxCompat {
  webgl2: boolean;
  gpu: GPUInfo;
  ramGB: number | null;
  cores: number | null;
  online: boolean;
  browser: BrowserInfo;
  playerAgent: boolean; // Roblox Player requires the Desktop Agent — always false in the web shell
  os: OSInfo;
  grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'UNKNOWN';
  issues: string[];
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

export function detectOS(): OSInfo {
  const fam = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
  let family = 'Web';
  let version = '';
  let mobile = false;

  if (/Windows NT 10/i.test(ua) || fam === 'Windows' || /Windows/i.test(ua)) {
    family = 'Windows';
    const m = ua.match(/Windows NT ([\d.]+)/i);
    version = m ? m[1] : '';
    if (version.startsWith('10.0') && /Windows NT 10\.0;\s*Win64;\s*x64/.test(ua) && /ARM64/.test(ua)) family = 'Windows';
  } else if (/Android/i.test(ua)) {
    family = 'Android';
    version = (ua.match(/Android ([\d.]+)/i) || [])[1] ?? '';
    mobile = true;
  } else if (/CrOS|ChromiumOS/i.test(ua)) {
    family = 'ChromeOS';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    family = 'iOS';
    mobile = true;
  } else if (/Mac OS X|Macintosh/i.test(ua)) {
    family = 'macOS';
  } else if (/FreeBSD/i.test(ua)) {
    family = 'BSD';
    version = 'FreeBSD';
  } else if (/OpenBSD/i.test(ua)) {
    family = 'BSD';
    version = 'OpenBSD';
  } else if (/NetBSD/i.test(ua)) {
    family = 'BSD';
    version = 'NetBSD';
  } else if (/SunOS|Solaris/i.test(ua)) {
    family = 'Solaris';
    version = (ua.match(/SunOS ([\d.]+)/i) || [])[1] ?? '';
  } else if (/Linux/i.test(ua)) {
    family = 'Linux';
    const distro = (ua.match(/\((X11;)?\s*([A-Za-z]+)/i) || [])[2];
    if (distro) version = distro;
  }

  let arch = 'unknown';
  if (/x86_64|amd64|WOW64|\bx64\b/i.test(ua) || fam === 'Win32') arch = 'x64';
  else if (/aarch64|arm64/i.test(ua)) arch = 'arm64';
  else if (/\barm\b|ARMv/i.test(ua)) arch = 'arm';

  const name = family === 'Windows'
    ? (version.startsWith('10.0') ? 'Windows 11' : version ? `Windows ${version}` : 'Windows')
    : family === 'Linux' ? (version ? `Linux (${version})` : 'Linux')
    : family === 'macOS' ? 'macOS' : family === 'iOS' ? 'iOS' : family === 'BSD' ? version || 'BSD' : family;

  const supported = !['macOS', 'iOS'].includes(family);

  const notes: string[] = [];
  if (family === 'Windows') notes.push(`Detected via browser: ${name} (${arch}). Full hardware access requires the Desktop Agent.`);
  else if (family === 'Linux') notes.push(`Detected Linux build: ${name} (${arch}). Native desktop integration requires the Desktop Agent.`);
  else if (family === 'Android') notes.push('Android detected. VOX-OS adapts its layout for touch/mobile.');
  else if (family === 'BSD') notes.push(`BSD detected (${version}). POSIX tooling available in the simulated terminal.`);
  else if (family === 'Solaris') notes.push('Solaris detected. POSIX tooling available in the simulated terminal.');
  else notes.push('Running in a generic web context. Enable the Desktop Agent for OS-level integration.');
  if (!supported) notes.push('macOS is NOT a supported VOX-OS target platform.');

  const gaming = gamingNotes(family, arch, mobile);
  return { family, name, version, arch, mobile, supported, notes, gaming };
}

function gamingNotes(family: string, arch: string, mobile: boolean): OSInfo['gaming'] {
  if (family === 'Windows') {
    return {
      directX: 'DirectX 11/12 (via Desktop Agent)', vulkan: 'Vulkan (WDDM)', openGL: 'OpenGL 4.x (browser)',
      style: 'DESKTOP',
      tip: arch === 'arm64' ? 'Windows-on-ARM detected — x64 games may run through emulation. Favor ARM-native builds.' : 'Windows detected — Roblox runs natively through the Desktop Agent; browser fallback uses WebGL.',
    };
  }
  if (family === 'Linux') {
    return {
      directX: 'DXVK / Proton layer', vulkan: 'Vulkan (native)', openGL: 'OpenGL/GLES (browser)',
      style: 'DESKTOP',
      tip: 'Linux detected — Roblox runs best with Vulkan via the Desktop Agent; the browser version uses WebGL.',
    };
  }
  if (family === 'Android') {
    return {
      directX: undefined, vulkan: 'Vulkan (mobile GPU)', openGL: 'OpenGL ES 3.x (browser)',
      style: 'MOBILE',
      tip: 'Android detected — Roblox mobile app is available; the web build uses WebGL on the mobile GPU.',
    };
  }
  if (family === 'BSD' || family === 'Solaris') {
    return {
      directX: undefined, vulkan: 'Vulkan (community drivers)', openGL: 'OpenGL via Mesa',
      style: 'DESKTOP',
      tip: `${family} detected — Roblox support is limited; browser WebGL is the primary path.`,
    };
  }
  return {
    directX: undefined, vulkan: undefined, openGL: 'WebGL 2 (browser)',
    style: 'WEB',
    tip: 'Generic web context — browser WebGL is the primary path; the Desktop Agent unlocks native gaming integration.',
  };
}

export function detectBrowser(): BrowserInfo {
  if (/Edg\//i.test(ua)) return { name: 'Microsoft Edge', version: (ua.match(/Edg\/([\d.]+)/i) || [])[1] ?? '' };
  if (/OPR\//i.test(ua)) return { name: 'Opera', version: (ua.match(/OPR\/([\d.]+)/i) || [])[1] ?? '' };
  if (/Chrome\//i.test(ua)) return { name: 'Chrome', version: (ua.match(/Chrome\/([\d.]+)/i) || [])[1] ?? '' };
  if (/Firefox\//i.test(ua)) return { name: 'Firefox', version: (ua.match(/Firefox\/([\d.]+)/i) || [])[1] ?? '' };
  if (/Safari\//i.test(ua)) return { name: 'Safari', version: (ua.match(/Version\/([\d.]+)/i) || [])[1] ?? '' };
  return { name: 'Unknown browser', version: '' };
}

export function detectGPU(): GPUInfo {
  const fallback: GPUInfo = { renderer: null, vendor: null, webgl2: false };
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return fallback;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      return {
        renderer: String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'Unknown GPU'),
        vendor: String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || 'Unknown vendor'),
        webgl2: !!canvas.getContext('webgl2'),
      };
    }
    return { renderer: String(gl.getParameter(gl.RENDERER) || 'Unknown GPU'), vendor: null, webgl2: !!canvas.getContext('webgl2') };
  } catch {
    return fallback;
  }
}

const WEBGL_CANVAS: HTMLCanvasElement[] = [];

export function webglCompat(): { webgl2: boolean; webgl1: boolean; renderer: string | null } {
  try {
    const c = document.createElement('canvas');
    WEBGL_CANVAS.push(c);
    const gl2 = c.getContext('webgl2');
    const gl1 = c.getContext('webgl') || c.getContext('experimental-webgl');
    let renderer: string | null = null;
    const gl = (gl2 || gl1) as WebGLRenderingContext | null;
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || null);
    }
    return { webgl2: !!gl2, webgl1: !!gl1, renderer };
  } catch {
    return { webgl2: false, webgl1: false, renderer: null };
  }
}

export function detectRobloxCompat(): RobloxCompat {
  const os = detectOS();
  const browser = detectBrowser();
  const gpu = detectGPU();
  const gl = webglCompat();
  const ramGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
  const cores = navigator.hardwareConcurrency ?? null;
  const online = navigator.onLine;
  const issues: string[] = [];

  if (!gl.webgl2 && !gl.webgl1) issues.push('WebGL is unavailable — Roblox in the browser cannot render. Enable hardware acceleration.');
  else if (!gl.webgl2) issues.push('Only WebGL 1 detected — Roblox recommends WebGL 2 for modern experiences.');
  if (!gpu.renderer) issues.push('GPU renderer is hidden by this browser — hardware details unavailable.');
  if (ramGB != null && ramGB < 4) issues.push(`${ramGB} GB device memory is below Roblox’s 4 GB recommendation.`);
  if (cores != null && cores < 2) issues.push(`Only ${cores} logical core(s) detected.`);
  if (!online) issues.push('Offline — Roblox requires a network connection.');
  if (os.mobile && os.family !== 'Android') issues.push('Roblox on iOS is not supported by VOX-OS (macOS/iOS are excluded targets).');
  if (os.family === 'macOS' || os.family === 'iOS') issues.push('VOX-OS does not target macOS/iOS.');

  let grade: RobloxCompat['grade'] = 'UNKNOWN';
  if (gl.webgl2 && (ramGB == null || ramGB >= 4) && (cores == null || cores >= 4)) grade = 'EXCELLENT';
  else if (gl.webgl2 || gl.webgl1) grade = ramGB != null && ramGB >= 4 ? 'GOOD' : 'FAIR';
  else grade = 'FAIR';

  return {
    webgl2: gl.webgl2,
    gpu: { ...gpu, renderer: gl.renderer ?? gpu.renderer },
    ramGB,
    cores,
    online,
    browser,
    playerAgent: false, // Roblox Player is a Desktop-Agent capability — never claimed in the web shell
    os,
    grade,
    issues,
  };
}

/** Suggested boost profile from real hardware, so the OS "checks itself and applies". */
export function suggestProfile(c: { cores: number | null; ramGB: number | null; mobile: boolean }): 'balanced' | 'boost' | 'ultra' {
  if (c.mobile) return 'balanced';
  const score = (c.cores ?? 0) + (c.ramGB ?? 0) * 0.4;
  if (score >= 12) return 'ultra';
  if (score >= 6) return 'boost';
  return 'balanced';
}
