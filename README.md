# Pi Sentinel Net — Raspberry Pi Network Sensor with Local Dashboard

**Purpose:** Educational/home‑lab network visibility with privacy‑respecting defaults.

## Features
- Passive LAN metadata capture: **ARP, DHCP, DNS, mDNS** (no payload storage)
- Local SQLite storage + REST API + WebSocket live updates
- React/Vite dashboard: stats, timeline, recent events table
- Optional (disabled): 802.11 probe sniffer (monitor mode only; check legality)
- Systemd units for auto‑start on Pi; Docker Compose option

## Quickstart (bare metal on Raspberry Pi)
```bash
# 1) Update and install deps
sudo apt update && sudo apt install -y python3-pip python3-venv libpcap0.8 git

# 2) Clone repo
git clone https://github.com/YOUR_USER/pi-sentinel-net.git
cd pi-sentinel-net

# 3) Configure env
cp env.example .env
# edit .env to set interface (e.g. eth0 or wlan0), bind host/port, retention days

# 4) Install backend + sniffer
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -U pip wheel
pip install -r requirements.txt

# 5) Start sniffer (needs sudo for pcap)
sudo -E env "PATH=$PATH" "PYTHONPATH=$(pwd)" \
  ./sniffer/run_sniffer.sh &

# 6) Start API/dashboard
uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload
# open http://<pi-ip>:8088 in your browser
```

> **Tip:** Use the provided `provisioning/pi-*.service` files to run sniffer/API as systemd services on boot (see below).

## Optional: Docker Compose (on Pi OS / ARM)
```bash
# Requires Docker Engine on the Pi
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker

# Build and run
docker compose up --build
# API at http://<pi-ip>:8088, frontend served by backend static
```

## Directory Layout
```
pi-sentinel-net/
├─ README.md
├─ env.example
├─ .gitignore
├─ docker-compose.yml        # optional: run backend+frontend in containers on Pi
├─ provisioning/
│  ├─ install.sh             # setup script for bare-metal Pi (no Docker)
│  ├─ pi-sentinel.service    # systemd unit for backend
│  ├─ pi-sniffer.service     # systemd unit for packet sniffer
├─ backend/
│  ├─ requirements.txt
│  ├─ Dockerfile
│  ├─ app/
│  │  ├─ main.py             # FastAPI app + WebSocket + static serving
│  │  ├─ db.py               # SQLite schema + helpers
│  │  ├─ models.py           # Pydantic models
│  │  ├─ settings.py         # config via env vars
│  │  └─ static/             # web build gets copied here on build
│  └─ sniffer/
│     ├─ sniffer.py          # scapy-based LAN metadata sniffer
│     ├─ run_sniffer.sh      # wrapper script for sniffer
│     └─ wifi_probe_optional.py # optional 802.11 probe sniffer (disabled by default)
└─ frontend/
   ├─ package.json
   ├─ tsconfig.json
   ├─ vite.config.ts
   ├─ index.html
   └─ src/
      ├─ main.tsx
      ├─ App.tsx
      ├─ api.ts              # client for REST + WebSocket
      ├─ components/
      │  ├─ StatCards.tsx
      │  ├─ EventsTable.tsx
      │  └─ TimelineChart.tsx
      └─ styles.css
```

## Legal & Ethical Notes
- Run only on networks you own/control or with **explicit** permission.
- Default filters exclude payloads; do not extend to intercept sensitive content.
- Comply with local laws, ISP/Org policies, and wiretap regulations.
- 802.11 monitor mode may be illegal/restricted; it is **opt‑in** and **off by default**.

## Privacy Defaults
- Store only timestamp, protocol, IP/MAC, and tiny event context (e.g., DNS qname).
- No packet payloads or streams are retained.
- Retention window is configurable via `PSN_RETENTION_DAYS` (documented cleanup via cron/SQL).

## Threat Model (v0)
- Sensor can be tampered by local admin; not hardened against a local attacker.
- No authentication on local API (intended for trusted LAN). Put behind a firewall if needed.
- Do not expose the dashboard to the internet.

## Roadmap
- Auth (HTTP basic/token) for API
- Per‑device inventory with friendly names (DHCP hostname)
- Prometheus metrics and Grafana integration
- Proper retention job (scheduled DELETE + VACUUM)
- MQTT/Redis for event bus instead of file tail

## License
MIT