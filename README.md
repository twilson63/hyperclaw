# HyperClaw

**Self-hosted agent-as-a-service platform with Firecracker microVMs**

Run fully isolated AI agents with zero external dependencies. Each agent gets its own microVM with Qwen 3.5 (or your preferred LLM) inside.

---

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────────┐
│  Dashboard  │───▶│ API Gateway │───▶│ Orchestrator│───▶│ Firecracker   │
│  (React)    │    │ (Hono/Bun)  │    │ (Go)        │    │ microVMs      │
│  :5173      │    │ :3000       │    │ :8080       │    │ (Qwen 3.5)    │
└─────────────┘    └─────────────┘    └─────────────┘    └───────────────┘
```

### Three-Layer Design

1. **Dashboard** - React 19 + Vite 7 + Tailwind 4
   - Dark cyberpunk UI for agent management
   - Real-time terminal via WebSocket
   - Auth flows (login/register/session)

2. **API Gateway** - Hono on Bun runtime
   - JWT-based authentication
   - Instance CRUD operations
   - WebSocket proxy to Orchestrator
   - SQLite database for metadata

3. **Orchestrator** - Go service
   - VM lifecycle management
   - IP pool allocation (192.168.1.100-200)
   - API key generation per instance
   - Health monitoring

4. **Firecracker microVMs**
   - ~200ms boot time
   - Strong isolation (no shared kernel)
   - Each VM runs Qwen 3.5 + Ollama
   - Serial console for agent interaction

---

## 🚀 Quick Start

### Prerequisites

- Go 1.26+
- Bun runtime
- Node.js 18+ (for frontend build)

### Development Mode (without Firecracker)

```bash
# Clone the repo
git clone https://github.com/twilson63/hyperclaw.git
cd hyperclaw

# Install dependencies
bun install

# Start Orchestrator (Go)
cd apps/orchestrator && go run main.go

# Start API Gateway (Bun) - in another terminal
cd apps/api && bun run src/index.ts

# Start Dashboard (Vite) - in another terminal
cd apps/dashboard && bun run dev
```

The mock Firecracker client simulates VM creation for development.

### Production Mode (with Firecracker)

```bash
# Build VM image with Packer + Ansible
cd images/nullclaw-base
packer build packer/nullclaw-base.pkr.hcl

# Deploy to DigitalOcean (KVM-enabled droplet)
./deploy.sh
```

---

## 🧪 Testing

```bash
# API Gateway tests (Bun)
cd apps/api && bun test

# Orchestrator tests (Go)
cd apps/orchestrator && go test ./...

# Dashboard tests (Vitest)
cd apps/dashboard && bun run test
```

---

## 📁 Project Structure

```
hyperclaw/
├── apps/
│   ├── dashboard/          # React frontend
│   │   ├── src/
│   │   │   ├── components/ # UI components
│   │   │   ├── contexts/   # Auth context
│   │   │   ├── lib/        # API client
│   │   │   ├── pages/      # Route pages
│   │   │   └── __tests__/  # Tests
│   │   └── package.json
│   │
│   ├── api/                # Hono API Gateway
│   │   ├── src/
│   │   │   ├── routes/     # HTTP routes
│   │   │   ├── services/   # Orchestrator client
│   │   │   ├── middleware/ # Auth, error handling
│   │   │   ├── db/         # SQLite schema
│   │   │   └── __tests__/  # Tests
│   │   └── package.json
│   │
│   └── orchestrator/       # Go service
│       ├── main.go
│       └── internal/
│           ├── api/        # HTTP handlers
│           ├── instances/  # VM manager
│           └── firecracker/ # VM client
│
└── images/
    └── nullclaw-base/      # Packer + Ansible
        ├── packer/         # VM image definition
        └── ansible/        # Provisioning roles
```

---

## 🔐 Security Model

- **VM Isolation**: Each agent runs in its own microVM
- **Network Isolation**: Each VM gets its own IP on a private network
- **Auth Tokens**: Session tokens are SHA-256 hashed (not stored plaintext)
- **Rate Limiting**: Prevent abuse at the API gateway level
- **TTL Enforcement**: Instances auto-expire to prevent resource hoarding

---

## 📝 API Endpoints

### Authentication
```
POST /auth/register  → Create account
POST /auth/login     → Get session token
GET  /auth/session   → Validate session
POST /auth/logout    → End session
```

### Instances
```
GET    /instances           → List user's instances
POST   /instances           → Create new instance
GET    /instances/:id      → Get instance details
DELETE /instances/:id      → Delete instance
POST   /instances/:id/start → Start instance
POST   /instances/:id/stop  → Stop instance
```

### WebSocket Terminal
```
WS /ws/instances/:id/terminal?token=<auth> → Terminal session
```

---

## 🛠️ Configuration

### API Gateway (`apps/api/.env`)
```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
DATABASE_PATH=./data/hyperclaw.db
ORCHESTRATOR_URL=http://localhost:8080
```

### Orchestrator (`apps/orchestrator/config.yaml`)
```yaml
server:
  port: 8080
firecracker:
  socket_path: /run/firecracker.socket
  kernel_path: /var/lib/firecracker/vmlinux
  rootfs_path: /var/lib/firecracker/rootfs.img
ip_pool:
  start: 192.168.1.100
  end: 192.168.1.200
```

### Dashboard (`apps/dashboard/.env`)
```bash
VITE_API_URL=http://localhost:3000
```

---

## 🗺️ Roadmap

### Phase 1: Core Platform ✅
- [x] Three-service architecture
- [x] Auth system (register/login/session)
- [x] Instance CRUD operations
- [x] WebSocket terminal proxy
- [x] Mock Firecracker client

### Phase 2: Real Infrastructure
- [ ] Build VM image with Packer/Ansible
- [ ] Integrate real Firecracker API
- [ ] Serial console implementation
- [ ] Health monitoring

### Phase 3: Production Ready
- [ ] Stripe billing integration
- [ ] DNS automation (DigitalOcean API)
- [ ] Monitoring (Prometheus/Grafana)
- [ ] Log aggregation

### Phase 4: Scaling
- [ ] Multi-host orchestrator
- [ ] Auto-scaling based on load
- [ ] Backup/snapshot system
- [ ] Custom VM images

---

## 📄 License

MIT License - Use freely for any purpose.

---

## 🔗 Links

- **Published Write-up**: https://zenbin.org/p/hyperclaw
- **Arweave**: https://arweave.net/RDuqlDHgSYzoWnu7MmDxgy0pIdvkvfxEoPN93kOdHBU
- **GitHub**: https://github.com/twilson63/hyperclaw

---

Built by the Forward Research team. Exploring self-hosted AI agent infrastructure.