#!/usr/bin/env bash
# boot-snapshot.sh - Boot Firecracker VM from snapshot
#
# Usage: ./boot-snapshot.sh [SNAPSHOT_NAME] [VM_ID]
#
# Boots a Firecracker VM from a previously created snapshot.
# Target boot time: ~200ms
#
# Requirements:
#   - Firecracker binary in PATH
#   - Existing snapshot in snapshots/ directory
#   - Network tap configured

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
SNAPSHOTS_DIR="${BASE_DIR}/snapshots"
CONFIG_DIR="${BASE_DIR}/config"
OUTPUT_DIR="${BASE_DIR}/output"
FIRECRACKER="${FIRECRACKER:-firecracker}"
DEFAULT_SNAPSHOT_NAME="${DEFAULT_SNAPSHOT:-base}"
DEFAULT_VM_ID="nullclaw-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SNAPSHOT_NAME="${1:-$DEFAULT_SNAPSHOT_NAME}"
VM_ID="${2:-$DEFAULT_VM_ID}"

# API socket path
API_SOCKET="/tmp/firecracker-${VM_ID}.socket"

# Snapshot files
MEM_FILE="${SNAPSHOTS_DIR}/${SNAPSHOT_NAME}.mmd"
VMSTATE_FILE="${SNAPSHOTS_DIR}/${SNAPSHOT_NAME}.vmstate"
METADATA_FILE="${SNAPSHOTS_DIR}/${SNAPSHOT_NAME}.json"

echo -e "${BLUE}=== Firecracker Snapshot Boot ===${NC}"
echo -e "Snapshot: ${YELLOW}$SNAPSHOT_NAME${NC}"
echo -e "VM ID: ${YELLOW}$VM_ID${NC}"
echo ""

# Verify snapshot exists
if [ ! -f "$MEM_FILE" ] || [ ! -f "$VMSTATE_FILE" ]; then
    echo -e "${RED}Error: Snapshot not found${NC}"
    echo "Required files:"
    echo "  - $MEM_FILE"
    echo "  - $VMSTATE_FILE"
    echo ""
    echo "Available snapshots:"
    find "$SNAPSHOTS_DIR" -name "*.json" -type f 2>/dev/null | while read -r f; do
        basename "$f" .json
    done | head -10
    exit 1
fi

# Load metadata if available
if [ -f "$METADATA_FILE" ]; then
    echo -e "${BLUE}Loading snapshot metadata...${NC}"
    ROOTFS=$(jq -r '.rootfs // "nullclaw-base.raw"' "$METADATA_FILE")
    KERNEL=$(jq -r '.kernel // "vmlinux"' "$METADATA_FILE")
    MEM_SIZE=$(jq -r '.memory_size // 0' "$METADATA_FILE")
    CREATE_DATE=$(jq -r '.created // "unknown"' "$METADATA_FILE")
    
    echo -e " Created: ${GREEN}$CREATE_DATE${NC}"
    echo -e " Kernel: ${GREEN}$KERNEL${NC}"
    echo -e " Rootfs: ${GREEN}$ROOTFS${NC}"
else
    ROOTFS="nullclaw-base.raw"
    KERNEL="vmlinux"
fi

# Check for Firecracker binary
if ! command -v "$FIRECRACKER" &> /dev/null; then
    echo -e "${RED}Error: Firecracker binary not found${NC}"
    echo "Install Firecracker: https://github.com/firecracker-microvm/firecracker"
    echo "Or set FIRECRACKER environment variable"
    exit 1
fi

# Clean up any existing socket
rm -f "$API_SOCKET"

# Start timing
START_TIME=$(date +%s%N)

echo ""
echo -e "${BLUE}Step 1: Starting Firecracker...${NC}"

# Create initial VM config (will be overwritten by snapshot)
CONFIG_FILE=$(mktemp)
cat > "$CONFIG_FILE" << EOF
{
    "boot-source": {
        "kernel_image_path": "${OUTPUT_DIR}/${KERNEL}",
        "initramfs_path": null,
        "boot_args": "console=ttyS0,115200n8 panic=1 quiet"
    },
    "drives": [
        {
            "drive_id": "rootfs",
            "path_on_host": "${OUTPUT_DIR}/${ROOTFS}",
            "is_root_device": true,
            "is_read_only": false,
            "cache_type": "Writeback"
        }
    ],
    "machine-config": {
        "vcpu_count": 4,
        "mem_size_mib": 16384,
        "smt": false,
        "track_dirty_pages": false
    },
    "network-interfaces": [
        {
            "iface_id": "eth0",
            "guest_mac": "AA:FC:00:00:00:01",
            "host_dev_name": "tap0"
        }
    ],
    "serial": {
        "enabled": true,
        "console": "stdio"
    }
}
EOF

# Start Firecracker with API socket
echo -e "${BLUE}Step 2: Loading snapshot...${NC}"

# Note: The snapshot load must happen before the VM starts
# Firecracker requires us to first start it, then immediately load snapshot

# Create tap interface if not exists
create_tap() {
    local tap_name="$1"
    if ! ip link show "$tap_name" &> /dev/null; then
        echo -e "${YELLOW}Creating tap interface: $tap_name${NC}"
        ip tuntap add dev "$tap_name" mode tap
        ip link set dev "$tap_name" up
    fi
}

# Setup network if TAP_NEEDED
if [ "${TAP_NEEDED:-true}" = "true" ]; then
    create_tap "tap0" || true
fi

# Start Firecracker (will wait for configuration)
FIRECRACKER_PID_FILE="/tmp/firecracker-${VM_ID}.pid"
rm -f "$FIRECRACKER_PID_FILE"

echo -e "${BLUE}Starting Firecracker process...${NC}"

# Start Firecracker - it will wait for API calls
"$FIRECRACKER" \
    --api-sock "$API_SOCKET" \
    --id "$VM_ID" \
    --log-path "/tmp/firecracker-${VM_ID}.log" \
    --level Info \
    --show-log-origin &

FIRECRACKER_PID=$!
echo $FIRECRACKER_PID > "$FIRECRACKER_PID_FILE"

# Wait for API socket to be ready
echo -e "${BLUE}Waiting for API socket...${NC}"
for i in {1..30}; do
    if [ -S "$API_SOCKET" ]; then
        break
    fi
    sleep 0.1
done

if [ ! -S "$API_SOCKET" ]; then
    echo -e "${RED}Error: Firecracker API socket not ready after 3 seconds${NC}"
    kill $FIRECRACKER_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}Firecracker started (PID: $FIRECRACKER_PID)${NC}"

# Load snapshot immediately
echo -e "${BLUE}Loading snapshot into VM...${NC}"

LOAD_RESPONSE=$(curl -s -X PUT "http://localhost/snapshot/load" \
    --unix-sock "$API_SOCKET" \
    -H "Content-Type: application/json" \
    -d "{\"snapshot_path\": \"${VMSTATE_FILE}\", \"mem_backend_path\": \"${MEM_FILE}\", \"enable_diff_snapshots\": false, \"resume\": true}")

if [ -n "$LOAD_RESPONSE" ]; then
    echo -e "${RED}Error loading snapshot: $LOAD_RESPONSE${NC}"
    kill $FIRECRACKER_PID 2>/dev/null || true
    rm -f "$API_SOCKET" "$FIRECRACKER_PID_FILE"
    exit 1
fi

# End timing
END_TIME=$(date +%s%N)
BOOT_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))

echo -e "${GREEN}Snapshot loaded successfully!${NC}"
echo ""

# Show boot time
echo -e "${GREEN}=== Boot Complete ===${NC}"
echo -e "Boot time: ${YELLOW}${BOOT_TIME_MS}ms${NC}"
echo ""

# Record boot time for metrics
BOOT_TIME_FILE="${BASE_DIR}/logs/boot-times.json"
mkdir -p "$(dirname "$BOOT_TIME_FILE")"
if [ ! -f "$BOOT_TIME_FILE" ]; then
    echo '{"boot_times": []}' > "$BOOT_TIME_FILE"
fi
TMP_FILE=$(mktemp)
jq ".boot_times += [{\"snapshot\": \"$SNAPSHOT_NAME\", \"vm_id\": \"$VM_ID\", \"boot_ms\": $BOOT_TIME_MS, \"timestamp\": \"$(date -Iseconds)\"}]" \
    "$BOOT_TIME_FILE" > "$TMP_FILE" && mv "$TMP_FILE" "$BOOT_TIME_FILE"

# Function to handle shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down VM...${NC}"
    kill $FIRECRACKER_PID 2>/dev/null || true
    rm -f "$API_SOCKET" "$FIRECRACKER_PID_FILE"
    echo -e "${GREEN}VM stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}VM is running. Serial console attached.${NC}"
echo -e "${BLUE}Press Ctrl+C to stop.${NC}"
echo ""

# Keep script running - serial console is connected to stdout/stderr
wait $FIRECRACKER_PID