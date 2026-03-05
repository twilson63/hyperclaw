#!/usr/bin/env bash
# create-snapshot.sh - Create Firecracker snapshot from running VM
#
# Usage: ./create-snapshot.sh [VM_ID] [SNAPSHOT_NAME]
#
# Creates both memory snapshot (.mmd) and VM state snapshot
# for fast boot resume (~200ms)
#
# Requirements:
#   - Firecracker running VM with microvm API access
#   - Write access to snapshots/ directory

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
SNAPSHOTS_DIR="${BASE_DIR}/snapshots"
FIRECRACKER_API_SOCKET="${FIRECRACKER_API_SOCKET:-/tmp/firecracker.socket}"
DEFAULT_VM_ID="nullclaw-base"
DEFAULT_SNAPSHOT_NAME="$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
VM_ID="${1:-$DEFAULT_VM_ID}"
SNAPSHOT_NAME="${2:-$DEFAULT_SNAPSHOT_NAME}"

# Create snapshots directory
mkdir -p "$SNAPSHOTS_DIR"

echo -e "${BLUE}=== Firecracker Snapshot Creation ===${NC}"
echo -e "VM ID: ${YELLOW}$VM_ID${NC}"
echo -e "Snapshot Name: ${YELLOW}$SNAPSHOT_NAME${NC}"
echo ""

# Check if Firecracker is running
if ! pgrep -f "firecracker.*$VM_ID" > /dev/null 2>&1; then
    echo -e "${RED}Error: Firecracker VM '$VM_ID' is not running${NC}"
    echo "Start the VM first: ./boot-snapshot.sh $VM_ID"
    exit 1
fi

# Check API socket
if [ ! -S "$FIRECRACKER_API_SOCKET" ]; then
    echo -e "${RED}Error: Firecracker API socket not found: $FIRECRACKER_API_SOCKET${NC}"
    echo "Set FIRECRACKER_API_SOCKET environment variable"
    exit 1
fi

echo -e "${BLUE}Step 1: Pausing VM...${NC}"
# Pause VM before creating snapshot
curl -s -X PUT "http://localhost/_internal/metrics" \
    --unix-socket "$FIRECRACKER_API_SOCKET" || true

# Pause the VM
PAUSE_RESPONSE=$(curl -s -X PUT "http://localhost/actions" \
    --unix-socket "$FIRECRACKER_API_SOCKET" \
    -H "Content-Type: application/json" \
    -d '{"action_type": "Pause"}')

if [ -n "$PAUSE_RESPONSE" ]; then
    echo -e "${RED}Error pausing VM: $PAUSE_RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}VM paused successfully${NC}"
echo ""

echo -e "${BLUE}Step 2: Creating memory snapshot...${NC}"
# Define snapshot paths
MEM_FILE="${SNAPSHOTS_DIR}/${SNAPSHOT_NAME}.mmd"
VMSTATE_FILE="${SNAPSHOTS_DIR}/${SNAPSHOT_NAME}.vmstate"

# Create memory snapshot
CREATE_RESPONSE=$(curl -s -X PUT "http://localhost/snapshot/create" \
    --unix-socket "$FIRECRACKER_API_SOCKET" \
    -H "Content-Type: application/json" \
    -d "{\"snapshot_path\": \"${VMSTATE_FILE}\", \"mem_file_path\": \"${MEM_FILE}\", \"version\": null}")

if [ -n "$CREATE_RESPONSE" ]; then
    echo -e "${RED}Error creating snapshot: $CREATE_RESPONSE${NC}"
    # Resume VM on failure
    curl -s -X PUT "http://localhost/actions" \
        --unix-socket "$FIRECRACKER_API_SOCKET" \
        -H "Content-Type: application/json" \
        -d '{"action_type": "Resume"}'
    exit 1
fi

echo -e "${GREEN}Memory snapshot created: $MEM_FILE${NC}"
echo -e "${GREEN}VM state saved: $VMSTATE_FILE${NC}"
echo ""

echo -e "${BLUE}Step 3: Resuming VM...${NC}"
# Resume VM
RESUME_RESPONSE=$(curl -s -X PUT "http://localhost/actions" \
    --unix-socket "$FIRECRACKER_API_SOCKET" \
    -H "Content-Type: application/json" \
    -d '{"action_type": "Resume"}')

if [ -n "$RESUME_RESPONSE" ]; then
    echo -e "${YELLOW}Warning: VM resume returned: $RESUME_RESPONSE${NC}"
fi

echo -e "${GREEN}VM resumed successfully${NC}"
echo ""

# Calculate snapshot sizes
MEM_SIZE=$(stat -f%z "$MEM_FILE" 2>/dev/null || stat -c%s "$MEM_FILE" 2>/dev/null)
VMSTATE_SIZE=$(stat -f%z "$VMSTATE_FILE" 2>/dev/null || stat -c%s "$VMSTATE_FILE" 2>/dev/null)
TOTAL_SIZE=$((MEM_SIZE + VMSTATE_SIZE))

# Function to format bytes
format_size() {
    local bytes=$1
    if [ $bytes -gt 10737418240 ]; then
        echo "$((bytes / 1073741824))GB"
    elif [ $bytes -gt 10485760 ]; then
        echo "$((bytes / 1048576))MB"
    elif [ $bytes -gt 10240 ]; then
        echo "$((bytes / 1024))KB"
    else
        echo "${bytes}B"
    fi
}

echo -e "${BLUE}=== Snapshot Summary ===${NC}"
echo -e "Memory file:   $(format_size $MEM_SIZE)"
echo -e "VM state file: $(format_size $VMSTATE_SIZE)"
echo -e "Total size:    $(format_size $TOTAL_SIZE)"
echo -e "Location:      ${SNAPSHOTS_DIR}"
echo ""

# Create metadata file
METADATA_FILE="${SNAPSHOTS_DIR}/${SNAPSHOT_NAME}.json"
cat > "$METADATA_FILE" << EOF
{
    "name": "$SNAPSHOT_NAME",
    "vm_id": "$VM_ID",
    "created": "$(date -Iseconds)",
    "memory_file": "$(basename "$MEM_FILE")",
    "vmstate_file": "$(basename "$VMSTATE_FILE")",
    "memory_size": $MEM_SIZE,
    "vmstate_size": $VMSTATE_SIZE,
    "total_size": $TOTAL_SIZE,
    "kernel": "vmlinux",
    "rootfs": "$VM_ID.raw"
}
EOF

echo -e "${GREEN}Metadata saved: $METADATA_FILE${NC}"
echo ""
echo -e "${GREEN}Snapshot created successfully!${NC}"
echo ""
echo -e "${BLUE}To boot from this snapshot:${NC}"
echo "  ./boot-snapshot.sh $SNAPSHOT_NAME"
echo ""