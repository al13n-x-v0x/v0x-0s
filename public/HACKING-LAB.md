# 🎯 VOX-OS Hacking Lab — a legal playground

> **The #1 rule of security: only test systems you own or have written permission to test.**
> This lab is 100% legal because *you* build it, *you* own it, and it lives in a sandboxed VM on *your* machine — isolated from the internet. This is exactly how professional penetration testers train.

## ✅ The Safety Contract (read this first)

1. **Lab targets only** — never run these tools against IPs you don't own (that includes your school/work network, neighbors' WiFi, and the public internet).
2. **Isolate the lab** — use a **host-only** or NAT-network adapter so the vulnerable VMs can't reach the internet or your real LAN devices.
3. **Snapshot before you exploit** — one click in VirtualBox and you can roll back to a pristine target whenever you break it.
4. **It's a lab, not a trophy** — "hacking" your own Metasploitable is the achievement. Real-world attacking is where people go to jail.

---

## 🧱 The Targets

| Target | What it is | Why it's legal | Level |
|---|---|---|---|
| **Metasploitable 2** | A Linux VM stuffed with ~50 known vulnerabilities on purpose | You download and run it on your own machine | Beginner → Pro |
| **DVWA** | Damn Vulnerable Web Application — a deliberately broken PHP app | Runs in Docker on your own machine | Beginner |

---

## 🐧 Part 1 — Metasploitable 2 (VirtualBox)

### 1. Install VirtualBox
- **Windows/macOS/Linux**: download from [virtualbox.org](https://www.virtualbox.org/wiki/Downloads)

### 2. Get Metasploitable 2
- Grab the ZIP from the official [SourceForge page](https://sourceforge.net/projects/metasploitable/files/Metasploitable2/) (it's the official Rapid7 training image — free)
- Unzip → you get a `.vmdk` disk image

### 3. Create the VM (important: host-only network)
```
New VM:
  Name:        metasploitable
  Type:        Linux · Ubuntu (64-bit)
  Memory:      512–1024 MB
  Disk:        Use existing → metasploitable.vmdk
  Network:     Host-only adapter  ← THIS IS THE SAFETY NET
```
> **Why host-only:** the VM gets an IP only VirtualBox and your host can reach. No router, no internet, no chance of touching the real world.

### 4. Boot it
- Default login: **`msfadmin` / `msfadmin`**
- It prints its IP at login (usually `192.168.56.101`)

### 5. Snapshot (the undo button)
- **Machine → Take Snapshot** → name it `pristine`. Exploit freely, then restore.

---

## 🐳 Part 2 — DVWA (Docker, one command)

```bash
# anywhere with Docker installed
docker run -d -p 8080:80 --name dvwa vulnerables/web-dvwa
```
Then open **http://localhost:8080** → default login **`admin` / `password`** → click **Create/Reset Database**.

DVWA has 4 security levels (low → impossible). Start at **low**, learn the exploit, then turn the dial up.

> No Docker? Use a single binary:
> ```bash
> # install PHP + MariaDB, then:
> git clone https://github.com/digininja/DVWA
> cd DVWA && cp config/config.inc.php.dist config/config.inc.php
> # set DB creds, chmod -R 777 hackable/uploads, run setup.php
> ```

---

## 🛰️ Part 3 — Wire VOX-OS Recon Lab against your lab

Open **SYSTEM → Recon Lab** in VOX-OS. The **Practice Lab** panel is built for exactly this.

### Playbook A — Find your lab on the network
1. **Ping Sweep** → subnet of your VirtualBox host-only network (usually `192.168.56.` range `1-254`) → your Metasploitable appears as `UP  192.168.56.101`
2. **LAN Device Discovery (ARP -A)** → confirms it and shows its MAC (VirtualBox interfaces have `08:00:27:` MACs)

### Playbook B — Enumerate services (the classic first step)
3. **Port Scanner** → host `192.168.56.101`, ports `21,22,23,25,53,80,111,139,445,512,513,514,1099,1524,2121,3306,5432,5900,6000,6667,8009,8180`
   - You'll see the whole attack surface light up: **21 FTP, 22 SSH, 23 Telnet, 80 HTTP, 445 SMB, 3306 MySQL, 5432 Postgres, 5900 VNC, 6667 IRC…**
4. Read the results — every `OPEN` is a door. Now the fun begins.

### Playbook C — Walk through a door (the Terminal is your weapon)
5. Open **Terminal** (REAL SHELL via the Desktop Agent) and poke the open doors:
   ```bash
   # Banner grab the FTP server (vsftpd 2.3.4 — famously vulnerable)
   nc -nv 192.168.56.101 21

   # Anonymous FTP login
   ftp 192.168.56.101        # user: anonymous, pass: anything

   # SSH + Telnet (default creds: msfadmin/msfadmin)
   ssh msfadmin@192.168.56.101
   telnet 192.168.56.101
   ```
6. **Exploit**: install `metasploit-framework` (Linux/macOS) and fire a classic:
   ```bash
   msfconsole
   use exploit/unix/ftp/vsftpd_234_backdoor
   set RHOSTS 192.168.56.101
   run        # 🏆 you now have a root shell on YOUR OWN lab VM
   ```

### Playbook D — Web attacks on DVWA (OWASP Top 10 in practice)
DVWA at **http://localhost:8080** with security level **low**:
| OWASP Top 10 | DVWA exercise |
|---|---|
| A01 Broken Access Control | `File Inclusion` — LFI/RFI |
| A03 Injection | `SQL Injection` (SQLi) — the classic `' OR '1'='1` |
| A05 Security Misconfiguration | `Command Injection` — `127.0.0.1; id` |
| A07 XSS | `XSS (Reflected)` / `(Stored)` |
| A08 Insecure Design | `Insecure CAPTCHA` / `Weak Session IDs` |
| A09 Logging Failure | `CSP Bypass` |
| A10 SSRF | `File Upload` chaining |

Each exercise comes with source-view and hints — read the vulnerable PHP, understand *why* it breaks, then fix it. That's the whole skill.

---

## 🏆 Part 4 — Level up (legally, forever)

| Path | What it is | Cost |
|---|---|---|
| **TryHackMe** | Guided rooms on legal VMs in your browser | Free tier |
| **HackTheBox** | Realistic labs, active machines | Free tier |
| **PortSwigger Web Security Academy** | The best free web-hacking labs | Free |
| **OverTheWire (Bandit)** | CLI/SSH war-games | Free |
| **Bug bounty** | Find vulns in real companies' *programs* that permit it | Paid when you find one |

## 🧹 Tear-down

- Delete the lab: `docker rm -f dvwa` + VirtualBox **remove VM → delete files**
- Or keep it snapshot'd for next time — your call, it's your sandbox.

---

**Remember the Safety Contract.** Own the lab, own the skills, and the "dream of being a hacker" becomes a career — legally.
