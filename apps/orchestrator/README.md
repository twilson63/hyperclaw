# HyperClaw Orchestrator

Go service that manages Firecracker microVMs for isolated AI agent instances.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  API Routes  │  │   Instance   │  │ Firecracker  │   │
│  │  (HTTP/WS)   │  │   Manager    │  │   Client     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  In-Memory State (SQLite in production)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Firecracker microVMs  │
              │   (one per user)        │
              └────────────────────────┘
```

## Prerequisites

- Go 1.22+
- Install via Homebrew: `brew install go`

## Building

```bash
cd apps/orchestrator
go mod tidy
go build -o orchestrator .
```

## Running

```bash
./orchestrator

# Or with custom config:
HOST_ID=host-001 \
SNAPSHOT_PATH=./snapshots \
ORCHESTRATOR_PORT=8080 \
./orchestrator
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/v1/instances | List all instances |
| POST | /api/v1/instances | Create new instance |
| GET | /api/v1/instances/:id | Get instance details |
| DELETE | /api/v1/instances/:id | Delete instance |
| POST | /api/v1/instances/:id/start | Start stopped instance |
| POST | /api/v1/instances/:id/stop | Stop running instance |
| WS | /api/v1/instances/:id/console | Serial console WebSocket |
| GET | /api/v1/instances/:id/logs | Get instance logs |

## Instance Config

```json
{
  "name": "my-agent",
  "model": "qwen3.5",
  "ramGb": 16,
  "ttlHours": 24,
  "snapshotId": "base-qwen35-v1"
}
```

## Response Format

```json
{
  "instance": {
    "id": "uuid",
    "name": "my-agent",
    "status": "running",
    "model": "qwen3.5",
    "ramGb": 16,
    "hostId": "host-001",
    "apiKey": "hc_xxx...",
    "endpoint": "http://192.168.1.100:50390",
    "serialSocket": "/tmp/firecracker-uuid.sock",
    "createdAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2024-01-02T00:00:00Z",
    "ipAddress": "192.168.1.100",
    "machineId": "vm-uuid8"
  }
}
```

## Development Status

- [x] Project scaffold
- [x] HTTP API routes
- [x] Instance manager (in-memory)
- [x] WebSocket terminal (mock)
- [x] Firecracker client (stub)
- [ ] SQLite persistence
- [ ] Real Firecracker integration
- [ ] Snapshot management
- [ ] IP allocation (real)
- [ ] TTL expiration checker