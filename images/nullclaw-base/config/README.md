# NullClaw base image configuration directory
# Contains all configuration files for Firecracker VM

This directory contains configuration files for the NullClaw Firecracker base image:

## Files

| File | Description |
|------|-------------|
| `kernel-cmdline` | Kernel boot parameters for serial console |
| `firecracker-config.json` | Firecracker VM configuration template |
| `systemd/serial-console.conf` | Systemd override for Getty on ttyS0 |
| `network/interfaces` | DHCP network configuration |

## Usage

1. **Build the base image**:
   ```bash
   cd ../packer
   packer build .
   ```

2. **Create a snapshot**:
   ```bash
   ../scripts/create-snapshot.sh
   ```

3. **Boot from snapshot**:
   ```bash
   ../scripts/boot-snapshot.sh
   ```

## Architecture

```
┌─────────────────────────────────────────────┐
│            Firecracker VM                    │
├─────────────────────────────────────────────┤
│  Serial Console (ttyS0)                      │
│  ├── stdin  ← WebSocket input                │
│  ├── stdout → WebSocket output                │
│  └── Getty autologin (nullclaw user)         │
├─────────────────────────────────────────────┤
│  Network (DHCP)                               │
│  └── eth0 → External via tap                  │
├─────────────────────────────────────────────┤
│  Boot Time: ~200ms (from snapshot)           │
│  Memory: 16GB (Qwen 3.5 + overhead)          │
│  vCPU: 4                                      │
└─────────────────────────────────────────────┘
```