# NullClaw Base Image - Packer Build

Builds a Firecracker-compatible VM image with Qwen 3.5, Ollama, and NullClaw pre-installed.

## Prerequisites

```bash
# Install Packer
brew install packer

# Install Ansible
pip install ansible

# Install QEMU (for building the image)
brew install qemu
```

## Quick Start

```bash
# Initialize Packer plugins
packer init .

# Validate configuration
packer validate .

# Build the image
packer build .

# Output will be in:
# - output/nullclaw-base.raw    - Root filesystem
# - output/config/firecracker.json - Firecracker config template
```

## Build Options

Customize via variables:

```bash
# Larger memory for bigger models
packer build -var 'memory=32768' -var 'qwen_model=qwen3.5:32b' .

# Different output directory
packer build -var 'output_directory=/opt/firecracker/images' .

# Specify NullClaw version
packer build -var 'nullclaw_version=v1.2.3' .
```

## Output Artifacts

| File | Description |
|------|-------------|
| `output/nullclaw-base.raw` | Raw disk image (rootfs) |
| `output/config/firecracker.json` | Firecracker VM configuration |
| `output/vmlinux` | Kernel for Firecracker |
| `output/initrd` | Initial ramdisk |

## Architecture

```
┌─────────────────────────────────────────────┐
│            NullClaw Base Image               │
├─────────────────────────────────────────────┤
│  Debian 12 Minimal                           │
│  ├── Node.js 20.x LTS                        │
│  ├── Bun Runtime                             │
│  ├── Ollama + Qwen 3.5 (6.6GB)               │
│  ├── NullClaw Binary (678KB)                 │
│  └── Systemd Services                        │
├─────────────────────────────────────────────┤
│  Serial Console (ttyS0)                      │
│  ├── stdin ← WebSocket input                 │
│  ├── stdout → WebSocket output               │
│  └── Getty autologin (nullclaw user)         │
└─────────────────────────────────────────────┘
```

## Next Steps

1. Run `packer build` to create the base image
2. Use Ansible playbooks to customize further
3. Create snapshots using `../scripts/create-snapshot.sh`
4. Boot from snapshots using `../scripts/boot-snapshot.sh`

## Troubleshooting

### Boot hangs
- Check serial console output: `cat output/serial.log`
- Verify kernel parameters include `console=ttyS0`

### Ansible provisioning fails
- Check SSH connectivity: `packer build -debug`
- Verify Ansible inventory: `../ansible/inventory.yml`

### Firecracker compatibility
- Ensure kernel is Firecracker-compatible
- Verify serial console is configured
- Check disk format is raw (not qcow2)