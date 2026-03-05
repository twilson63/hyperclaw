# HyperClaw - Project Plan

## Vision

**HyperClaw** is a self-hosted agent-as-a-service platform. Users deploy fully isolated AI agent instances with zero external dependencies. Each instance runs in a Firecracker microVM with a local LLM (Qwen 3.5), the NullClaw agent runtime, and a web terminal interface.

### Core Value Proposition

- **Zero external APIs** - No OpenAI, no Anthropic, no per-token costs
- **Full isolation** - Each user gets a Firecracker microVM (KVM-level security)
- **Instant deployment** - ~200ms boot from snapshot
- **Self-hosted** - Runs on your own infrastructure
- **Developer-friendly** - Deploy via web dashboard

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HYPERCLAW PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DNS & Load Balancer                           │   │
│  │                     (hyperclaw.io / *.hyperclaw.io)                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        API Gateway (Hono)                            │   │
│  │                        ┌───────────────────────────┐                │   │
│  │                        │  Landing Page (static)    │                │   │
│  │                        │  Dashboard (React)        │                │   │
│  │                        │  Auth (session-based)     │                │   │
│  │                        │  Billing (Stripe)          │                │   │
│  │                        └───────────────────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Orchestrator Service (Go)                         │   │
│  │                                                                         │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │   │ VM Manager   │  │ DNS Manager  │  │ Key Manager  │               │   │
│  │   │ (Firecracker)│  │ (DO API)     │  │ (Secrets)    │               │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                         │   │
│  │   State Store: SQLite or PostgreSQL                                    │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Host Pool (DigitalOcean Droplets)               │   │
│  │                                                                         │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │   │ Host #1      │  │ Host #2      │  │ Host #N      │               │   │
│  │   │ 256GB RAM    │  │ 256GB RAM    │  │ 256GB RAM    │               │   │
│  │   │              │  │              │  │              │               │   │
│  │   │ 12 Firecracker│  │ 12 Firecracker│  │ 12 Firecracker│              │   │
│  │   │ microVMs     │  │ microVMs     │  │ microVMs     │               │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Firecracker MicroVM (per user)                    │   │
│  │                                                                         │   │
│  │   ┌───────────────────────────────────────────────────────────────┐ │   │
│  │   │                    User Instance                              │ │   │
│  │   │                                                                │ │   │
│  │   │   ┌─────────────────┐  ┌─────────────────────────────────┐   │ │   │
│  │   │   │   Web Terminal  │  │        Agent Stack              │   │ │   │
│  │   │   │   (xterm.js)    │  │                                 │   │ │   │
│  │   │   │   HTTP API      │  │   ┌─────────────────────────┐   │   │ │   │
│  │   │   │   WebSocket     │  │   │ NullClaw (678KB)        │   │   │   │ │
│  │   │   └─────────────────┘  │   │ Qwen 3.5 via Ollama    │   │   │   │ │
│  │   │                        │   │ Agent Harness           │   │   │   │ │
│  │   │                        │   │ SQLite Memory           │   │   │   │ │
│  │   │                        │   └─────────────────────────┘   │   │ │   │
│  │   │                        │                                 │   │ │   │
│  │   │                        └─────────────────────────────────┘   │ │   │
│  │   │                                                                │ │   │
│  │   │   RAM: 16-20GB │ Boot: ~200ms (snapshot)                    │ │   │
│  │   └───────────────────────────────────────────────────────────────┘ │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Landing Page (Marketing Site)

**Path**: `hyperclaw.io`
**Tech**: Static HTML/CSS/JS (Svelte or vanilla)
**Hosting**: Cloudflare Pages or Vercel

**Pages**:
- `/` - Hero, value prop, pricing, CTA
- `/features` - Feature breakdown (isolation, zero dependencies, etc.)
- `/pricing` - Plans (Free tier, Pro, Enterprise)
- `/docs` - Documentation, API reference
- `/blog` - Updates, case studies

**Key Messaging**:
- "Your AI Agent, Fully Isolated, Fully Yours"
- "Zero external APIs. Zero per-token fees. Zero compromise."
- "Deploy in 200ms. Scale to infinity."

---

### 2. Dashboard (User Frontend)

**Path**: `app.hyperclaw.io` or `dash.hyperclaw.io`
**Tech**: React + Vite + Tailwind + shadcn/ui
**Auth**: Session-based (cookie or JWT)

**Features**:
- **Instance Management**
  - Create new agent instance
  - View running instances (status, metrics, TTL)
  - Start/stop/restart instances
  - Delete instances
  
- **Instance Configuration**
  - Select LLM: Qwen 3.5, Llama 3, etc.
  - Select RAM allocation (16GB, 32GB, 64GB)
  - Set TTL (time-to-live)
  - Add custom SOUL.md / IDENTITY.md
  
- **Instance Access**
  - Web terminal (xterm.js)
  - HTTP API endpoint
  - WebSocket endpoint
  
- **Billing**
  - Stripe integration
  - Usage-based pricing (per instance-hour)
  - Plan management
  
- **Monitoring**
  - Instance metrics (CPU, RAM, tokens processed)
  - Request logs
  - Error tracking

**UI Wireframe**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  HyperClaw Dashboard                              [User] [Logout]    │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                       │
│  📊 Overview │  ┌─────────────────────────────────────────────────┐│
│              │  │  Your Instances                                  ││
│  🖥️ Instances │  │                                                  ││
│              │  │  ┌─────────────────────────────────────────────┐││
│  ⚙️ Settings  │  │  │ agent-001          [Running] ●              │││
│              │  │  │ Qwen 3.5 │ 16GB │ 2h 34m remaining          │││
│  💳 Billing  │  │  │ [Open Terminal] [API Key] [Stop]            │││
│              │  │  └─────────────────────────────────────────────┘││
│  📖 Docs     │  │                                                  ││
│              │  │  ┌─────────────────────────────────────────────┐││
│              │  │  │ agent-002          [Stopped] ○               │││
│              │  │  │ Qwen 3.5 │ 32GB │ Expired                   │││
│              │  │  │ [Restart] [Delete]                           │││
│  ─────────── │  │  └─────────────────────────────────────────────┘││
│              │  │                                                  ││
│  [+ Deploy   │  │  [+ Deploy New Instance]                        ││
│   New Agent] │  │                                                  ││
│              │  └─────────────────────────────────────────────────┘│
│              │                                                       │
└──────────────┴──────────────────────────────────────────────────────┘
```

---

### 3. API Gateway (Backend)

**Path**: `api.hyperclaw.io`
**Tech**: Hono + Bun
**Database**: SQLite (development) / PostgreSQL (production)
**Auth**: Session-based with cookies

**Endpoints**:

```
POST   /auth/login              - Login with email/password
POST   /auth/register           - Register new user
POST   /auth/logout             - Logout
GET    /auth/session            - Get current session

GET    /instances               - List user's instances
POST   /instances               - Create new instance
GET    /instances/:id           - Get instance details
DELETE /instances/:id           - Delete instance
POST   /instances/:id/start     - Start instance
POST   /instances/:id/stop      - Stop instance
POST   /instances/:id/restart   - Restart instance

GET    /instances/:id/terminal  - WebSocket terminal connection
GET    /instances/:id/api       - HTTP API proxy to instance

POST   /billing/checkout        - Create Stripe checkout session
GET    /billing/subscription    - Get subscription status
POST   /billing/cancel          - Cancel subscription

GET    /admin/hosts             - List host pool (admin only)
GET    /admin/capacity          - Get capacity metrics (admin only)
```

---

### 4. Orchestrator Service (VM Manager)

**Tech**: Go or Rust
**Transport**: gRPC or REST (internal)

**Responsibilities**:
- Manage Firecracker VM lifecycle
- Track host pool capacity
- Select optimal host for new instances
- Route traffic to running instances
- Handle instance snapshots
- Manage DNS records (via DigitalOcean API)
- Rotate API keys and secrets

**Database Schema**:
```sql
-- Hosts (physical machines running Firecracker)
CREATE TABLE hosts (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    region TEXT NOT NULL,
    total_ram_gb INTEGER NOT NULL,
    used_ram_gb INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Instances (user Firecracker VMs)
CREATE TABLE instances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    host_id TEXT REFERENCES hosts(id),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, running, stopped, expired
    allocated_ram_gb INTEGER NOT NULL,
    model TEXT DEFAULT 'qwen3.5',
    ttl_seconds INTEGER NOT NULL,
    api_key TEXT NOT NULL, -- encrypted
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

-- Users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Firecracker Integration**:
```go
type VMManager struct {
    hosts      []*Host
    httpClient *http.Client
}

func (m *VMManager) CreateInstance(config InstanceConfig) (*Instance, error) {
    // 1. Select host with most available capacity
    host := m.selectHost(config.RAM)
    
    // 2. Call Firecracker API on host
    resp, err := m.httpClient.Put(
        fmt.Sprintf("http://%s/firecracker/%s", host.IP, config.ID),
        firecrackerConfig{
            Kernel:      "/snapshots/vmlinux",
            RootDrive:   "/snapshots/nullclaw-qwen-base.qcow2",
            MachineConfig: {
                VcpuCount:  config.VCPU,
                MemSizeMib: config.RAM * 1024,
            },
        },
    )
    
    // 3. Start VM
    m.httpClient.Put(
        fmt.Sprintf("http://%s/firecracker/%s/actions", host.IP, config.ID),
        {ActionType: "InstanceStart"},
    )
    
    // 4. Return instance info
    return &Instance{
        ID:       config.ID,
        HostIP:   host.IP,
        Endpoint: fmt.Sprintf("http://%s:%d", host.IP, config.Port),
    }, nil
}
```

---

### 5. DNS Manager (DigitalOcean Integration)

**Tech**: Internal service (Go/Rust)
**API**: DigitalOcean DNS API

**Responsibilities**:
- Create DNS records for new instances
- Point subdomain to host IP
- Clean up DNS on instance deletion

**Flow**:
```
1. User creates instance "agent-123"
2. Orchestrator selects host (192.168.1.50)
3. DNS Manager creates record:
   - agent-123.hyperclaw.io → A → 192.168.1.50
4. User accesses via: wss://agent-123.hyperclaw.io/terminal
```

**API Call**:
```go
func (d *DNSManager) CreateInstanceRecord(instanceID, hostIP string) error {
    _, err := d.doClient.Domains.CreateRecord(context.Background(), "hyperclaw.io", &godo.DomainRecordEditRequest{
        Type:     "A",
        Name:     instanceID,
        Data:     hostIP,
        TTL:      300,
    })
    return err
}
```

---

### 6. Firecracker Base Image (Snapshot)

**Built with**: Packer + Ansible
**Size**: ~15GB (8GB compressed)
**Contents**:
- Debian 12 minimal
- Ollama + Qwen 3.5 (pre-downloaded)
- NullClaw binary (678KB)
- Agent harness (Node.js/Bun)
- xterm.js static files
- Serial console configured
- Network configured (DHCP)

**Build Process**:
```bash
# 1. Create base VM image with Packer
packer build packer/nullclaw-base.json

# 2. Snapshot for fast boot
qemu-img snapshot -c base nullclaw-qwen-base.qcow2

# 3. Upload to host pool
scp nullclaw-qwen-base.qcow2 host-001:/snapshots/
```

---

### 7. Billing (Stripe)

**Plans**:

| Plan     | Price      | RAM    | Concurrent | Features                     |
|----------|------------|--------|------------|------------------------------|
| Free     | $0         | 16GB   | 1          | 1 hour TTL, 1 instance       |
| Pro      | $29/mo     | 32GB   | 3          | 24h TTL, API access          |
| Business | $99/mo     | 64GB   | 10         | Unlimited TTL, priority      |
| Enterprise | Custom   | Custom | Unlimited  | Dedicated hosts, SLA         |

**Stripe Integration**:
```typescript
// Create checkout session
app.post('/billing/checkout', async (c) => {
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
        success_url: 'https://app.hyperclaw.io/success',
        cancel_url: 'https://app.hyperclaw.io/cancel',
    });
    return c.redirect(session.url);
});
```

---

## Data Flow

### User Creates New Instance

```
1. User clicks "Deploy New Agent" in dashboard
   │
   ▼
2. Dashboard POST /api/instances
   │
   ▼
3. API Gateway validates auth, creates instance record in DB
   │
   ▼
4. API Gateway calls Orchestrator.CreateInstance()
   │
   ▼
5. Orchestrator:
   a. Selects host with most capacity
   b. Creates Firecracker VM via Firecracker API
   c. Waits for boot (~200ms)
   d. Calls health check on instance
   │
   ▼
6. DNS Manager creates record:
   - {instance-id}.hyperclaw.io → {host-ip}
   │
   ▼
7. Orchestrator returns instance details to API Gateway
   │
   ▼
8. Dashboard redirects to terminal:
   - wss://{instance-id}.hyperclaw.io/terminal
```

### User Accesses Terminal

```
1. Browser opens wss://agent-123.hyperclaw.io/terminal
   │
   ▼
2. API Gateway:
   a. Resolves agent-123 → host IP
   b. Proxies WebSocket to host
   │
   ▼
3. Host:
   a. Routes to Firecracker VM via port mapping
   b. VM's web service serves xterm.js + WebSocket bridge
   │
   ▼
4. xterm.js <-> WebSocket <-> stdin/stdout <-> NullClaw <-> Qwen 3.5
```

---

## Project Structure

```
hyperclaw/
├── apps/
│   ├── landing/           # Marketing site (Svelte)
│   ├── dashboard/         # User frontend (React)
│   └── api/               # API Gateway (Hono + Bun)
├── services/
│   ├── orchestrator/     # VM Manager (Go)
│   └── dns-manager/       # DNS integration (Go)
├── images/
│   └── nullclaw-base/     # Firecracker base image
│       ├── packer/        # Packer config
│       └── ansible/       # Ansible provisioning
├── infra/
│   ├── terraform/         # DigitalOcean infrastructure
│   └── ansible/           # Host provisioning
├── docs/
│   ├── api.md             # API documentation
│   ├── deployment.md      # Deployment guide
│   └── architecture.md    # Architecture docs
└── README.md
```

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)
- [ ] Firecracker base image with Qwen + NullClaw
- [ ] Basic API Gateway (auth, instance CRUD)
- [ ] Simple dashboard (create/list/delete instances)
- [ ] Manual DNS (no subdomains yet)
- [ ] Single host deployment

### Phase 2: Core (Week 3-4)
- [ ] DNS Manager with auto subdomains
- [ ] Billing integration (Stripe)
- [ ] Multi-host support
- [ ] Instance monitoring
- [ ] Web terminal (xterm.js)

### Phase 3: Polish (Week 5-6)
- [ ] Landing page
- [ ] Documentation
- [ ] Error handling
- [ ] Instance snapshots for faster boot
- [ ] Rate limiting

### Phase 4: Scale (Week 7-8)
- [ ] Auto-scaling host pool
- [ ] Usage-based billing
- [ ] Admin dashboard
- [ ] API keys for programmatic access

---

## Technical Requirements

### Host Machine Specs
- **Minimum**: 256GB RAM, 32 vCPU, 1TB NVMe
- **Recommended**: 512GB RAM, 64 vCPU, 2TB NVMe
- **OS**: Ubuntu 22.04 LTS with KVM enabled
- **Network**: Public IP, open ports 80/443 + 50000-59999 (instance ports)

### DigitalOcean Resources
- **Droplets**: 256GB+ RAM dedicated instances
- **DNS**: Managed DNS for hyperclaw.io
- **Load Balancer**: Optional for API gateway

### Security
- **Auth**: Session-based with CSRF protection
- **Instance isolation**: KVM + Firecracker (VM-level)
- **Network**: Each instance on isolated network namespace
- **Secrets**: Encrypted at rest, rotated per instance
- **Audit**: Full request logging

---

## Success Metrics

| Metric              | Target          |
|---------------------|-----------------|
| Instance boot time  | <500ms          |
| API response time   | <100ms          |
| Uptime              | 99.9%           |
| Concurrent instances| 10+ per host    |
| Cost per instance   | <$0.50/hour     |

---

## Next Steps

1. **Set up project structure** - Initialize monorepo
2. **Build base image** - Packer + Ansible for Firecracker snapshot
3. **Build API Gateway** - Hono + Bun with SQLite
4. **Build Dashboard** - React + Vite + Tailwind
5. **Deploy first host** - DigitalOcean droplet with Firecracker
6. **End-to-end test** - Deploy instance, access terminal, verify Qwen 3.5 works