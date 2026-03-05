# NullClaw Base Image - Variable Definitions
# Customize these for your environment

# VM Configuration
vm_name         = "nullclaw-base"
memory          = 16384      # 16GB - Required for Qwen 3.5 (6.6GB) + overhead
cpus            = 4          # 4 vCPUs for parallel model inference
disk_size       = "30G"      # 30GB for OS + Ollama models + workspace

# Output Configuration
output_directory = "output"

# Software Versions
debian_version   = "12"       # Debian Bookworm (stable)
nullclaw_version = "latest"
qwen_model       = "qwen3.5"

# Build Options
kernel_url       = "https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/netboot/vmlinuz-virt"

# Firecracker Settings
firecracker_version = "v1.5.0"