# NullClaw Base Image

Firecracker-compatible VM image with Qwen 3.5, Ollama, and NullClaw pre-installed. Enables ~200ms boot from snapshot.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Firecracker MicroVM                       │
│                    (~200ms boot from snapshot)               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Qwen 3.5 (6.6GB)                                    │    │
│  │  Local LLM via Ollama                                │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  NullClaw (678KB)                                    │    │
│  │  Autonomous AI agent (Zig binary)                    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Agent Harness                                       │    │
│  │  Workspace + SOUL.md + MEMORY.md                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Serial Console (ttyS0) ← stdin/stdout                      │
│  16GB RAM | 4 vCPUs | 30GB Disk                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

```bash
# Install Packer
brew install packer

# Install Ansible
pip install ansible

# Install QEMU (for building)
brew install qemu

# Download Firecracker
curl -L https://github.com/firecracker-microvm/firecracker/releases/download/v1.5.0/firecracker-v1.5.0-$(uname -m).tar.gz | tar xz
```

### Build the Image

```bash
# Build with Packer (takes 30-60 minutes)
cd packer
packer init .
packer build .

# Output: output/nullclaw-base.raw
```

### Create Base Snapshot

```bash
# Boot from raw image
./scripts/boot-snapshot.sh base --first-boot

# Create snapshot
./scripts/create-snapshot.sh nullclaw-base base

# Boot from snapshot (~200ms)
./scripts/boot-snapshot.sh base
```

## Directory Structure

```
nullclaw-base/
├── packer/                  # Packer configuration
│   ├── nullclaw-base.pkr.hcl    # Main Packer config
│   ├── variables.pkr.hcl        # Build variables
│   └── README.md                # Build instructions
│
├── ansible/                 # Ansible playbooks
│   ├── site.yml             # Main playbook
│   ├── inventory.yml        # Target inventory
│   └── roles/               # Ansible roles
│       ├── base/            # Base system setup
│       ├── runtime/         # Node.js + Bun
│       ├── ollama/          # Ollama + Qwen
│       ├── nullclaw/        # NullClaw binary
│       ├── serial/          # Serial console config
│       └── security/        # Firewall + hardening
│
├── config/                  # VM configuration
│   ├── firecracker-config.json  # Firecracker config
│   ├── kernel-cmdline           # Kernel boot parameters
│   └── systemd/                 # Systemd service configs
│
├── scripts/                 # Management scripts
│   ├── create-snapshot.sh   # Create VM snapshot
│   ├── boot-snapshot.sh      # Boot from snapshot
│   └── manage-snapshots.sh   # Snapshot management
│
├── snapshots/               # Snapshot storage
│   └── README.md            # Snapshot documentation
│
├── output/                  # Build output (created by Packer)
│   ├── nullclaw-base.raw    # Root filesystem
│   ├── vmlinux              # Kernel
│   └── initrd               # Initial ramdisk
│
├── docs/                    # Documentation
│   └── snapshot-optimization.md  # Fast boot guide
│
└── README.md                # This file
```

## Usage

### Building the Base Image

```bash
# Initialize Packer
packer init .

# Validate configuration
packer validate .

# Build (30-60 minutes)
packer build .

# Custom variables
packer build -var 'memory=32768' -var 'qwen_model=qwen3.5:32b' .
```

### Creating Snapshots

```bash
# List VMs
./scripts/manage-snapshots.sh list

# Create snapshot
./scripts/create-snapshot.sh <vm_id> <snapshot_name>

# Example
./scripts/create-snapshot.sh nullclaw-001 prod-20240115
```

### Booting from Snapshots

```bash
# Boot from snapshot
./scripts/boot-snapshot.sh <snapshot_name>

# Example
./scripts/boot-snapshot.sh base
```

### Managing Snapshots

```bash
# List all snapshots
./scripts/manage-snapshots.sh list

# Show snapshot details
./scripts/manage-snapshots.sh info base

# Delete old snapshots
./scripts/manage-snapshots.sh clean-older 30

# Show disk usage
./scripts/manage-snapshots.sh sizes
```

## Configuration

### VM Resources

Default configuration (edit `packer/variables.pkr.hcl`):

| Resource | Default | Description |
|----------|---------|-------------|
| Memory | 16GB | Required for Qwen 3.5 + overhead |
| CPUs | 4 | For parallel inference |
| Disk | 30GB | OS + models + workspace |

### Kernel Parameters

Edit `config/kernel-cmdline`:

```bash
console=ttyS0,115200n8    # Serial console
panic=1                    # Reboot on kernel panic
quiet                      # Suppress boot messages
root=/dev/vda             # Root device
rw                        # Read-write root
```

### Network

Edit `config/network/interfaces`:

```bash
auto eth0
iface eth0 inet dhcp
    hostname nullclaw
```

### Serial Console

Serial console is automatically configured for:
- Getty autologin as `nullclaw` user
- 115200 baud rate
- stdin/stdout pipe to Firecracker

### Security

The image is hardened with:
- Nftables firewall (allow SSH, Ollama localhost)
- Audit logging enabled
- Fail2ban configured
- SSH hardening (key-only, no root)
- sysctl kernel hardening

## Components

### Debian 12 Minimal

```bash
# Base packages
- curl, wget, git
- build-essential
- vim, htop, tmux
```

### Node.js + Bun

```bash
# Versions
- Node.js 20.x LTS
- Bun (latest)
```

### Ollama + Qwen 3.5

```bash
# Ollama automatically downloads
ollama pull qwen3.5

# Model sizes
- qwen3.5: 6.6GB (default)
- qwen3.5:14b: ~8GB
- qwen3.5:32b: ~19GB
```

### NullClaw

```bash
# Binary
/usr/local/bin/nullclaw

# Configuration
/etc/nullclaw/config.yaml

# Workspace
/home/nullclaw/workspace/
├── SOUL.md      # Agent persona
├── MEMORY.md    # Long-term memory
└── AGENTS.md    # Workspace rules
```

## Integration with Kubernetes

For Kubernetes deployment with Firecracker, see the parent documentation at `../docs/` for:

- firecracker-containerd configuration
- Flintlock MicroVM CRDs
- Kubernetes operator integration

## API Access

NullClaw connects to Ollama:

```bash
# Ollama API (internal)
curl http://localhost:11434/api/generate -d '{
  "model": "qwen3.5",
  "prompt": "Hello"
}'

# NullClaw uses Ollama internally
nullclaw --provider ollama --model qwen3.5
```

## Troubleshooting

### Boot hangs

```bash
# Check serial console output
cat output/serial.log

# Verify kernel parameters include console
grep console config/kernel-cmdline
```

### Ollama not starting

```bash
# Check Ollama service
systemctl status ollama

# Manually start
ollama serve

# Check model
ollama list
```

### Snapshot load fails

```bash
# Verify snapshot files
ls -la snapshots/base.*

# Check metadata
jq . snapshots/base.json
```

## Performance

| Metric | Value |
|--------|-------|
| Cold boot | 8-19 seconds |
| Snapshot boot | ~200ms |
| Image size | ~20GB (with Qwen) |
| Memory usage | 16-20GB |
| CPU usage | 4 vCPUs recommended |

## License

See individual component licenses:
- Debian: GPL + various
- Ollama: MIT
- NullClaw: MIT
- Qwen: Apache 2.0 / Qwen License