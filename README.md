# HyperClaw API Gateway

Self-hosted agent-as-a-service platform. This is the API Gateway component.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Initialize database (runs automatically on first start)
bun run db:init
```

## Environment Variables

```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
DATABASE_PATH=./data/hyperclaw.db
```

## API Endpoints

### Auth

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/session` - Get current session

### Instances

- `GET /instances` - List user's instances
- `POST /instances` - Create new instance
- `GET /instances/:id` - Get instance details
- `DELETE /instances/:id` - Delete instance
- `POST /instances/:id/start` - Start instance
- `POST /instances/:id/stop` - Stop instance

### WebSocket

- `GET /ws/instances/:id/terminal` - Terminal WebSocket connection

## Project Structure

```
apps/api/
├── src/
│   ├── index.ts          # Entry point
│   ├── db/
│   │   ├── index.ts      # Database connection & operations
│   │   └── schema.sql    # Schema definitions
│   ├── routes/
│   │   ├── auth.ts       # Auth endpoints
│   │   ├── instances.ts  # Instance CRUD
│   │   └── health.ts     # Health check
│   ├── middleware/
│   │   ├── auth.ts       # Auth middleware
│   │   └── error.ts      # Error handling
│   ├── services/
│   │   ├── orchestrator.ts # Orchestrator stub
│   │   └── terminal.ts   # WebSocket handler
│   └── utils/
│       ├── crypto.ts     # ID generation, hashing
│       └── validation.ts # Zod schemas
├── data/                 # SQLite database files
├── package.json
└── tsconfig.json
```

## Development

The server uses Bun's hot reload feature. Just edit files and they'll reload automatically.

## Testing

```bash
# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create instance (requires auth)
curl -X POST http://localhost:3000/instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session_token>" \
  -d '{"model":"qwen3.5","ramGb":16,"ttlSeconds":3600}'
```

## Architecture

See PROJECT-PLAN.md for full architecture documentation.