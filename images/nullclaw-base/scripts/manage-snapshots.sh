#!/usr/bin/env bash
# manage-snapshots.sh - Manage Firecracker snapshots
#
# Usage: ./manage-snapshots.sh <command> [options]
#
# Commands:
#   list              - List all snapshots
#   info <name>       - Show snapshot details
#   delete <name>     - Delete a snapshot
#   copy <name> <dir> - Copy snapshot to another directory
#   clean-older <days> - Delete snapshots older than N days
#   sizes             - Show disk usage

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
SNAPSHOTS_DIR="${BASE_DIR}/snapshots"
BACKUP_DIR="${BASE_DIR}/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure snapshots directory exists
mkdir -p "$SNAPSHOTS_DIR"

# Function to format size
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

# Command: list
cmd_list() {
    echo -e "${BLUE}=== Available Snapshots ===${NC}"
    echo ""
    
    local count=0
    for metadata in "$SNAPSHOTS_DIR"/*.json; do
        [ -f "$metadata" ] || continue
        count=$((count + 1))
        
        local name=$(jq -r '.name' "$metadata")
        local created=$(jq -r '.created' "$metadata")
        local mem_size=$(jq -r '.memory_size // 0' "$metadata")
        local vmstate_size=$(jq -r '.vmstate_size // 0' "$metadata")
        local total=$((mem_size + vmstate_size))
        
        echo -e "${GREEN}$name${NC}"
        echo "  Created: $(date -d "$created" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$created")"
        echo "  Size: $(format_size $total)"
        echo ""
    done
    
    if [ $count -eq 0 ]; then
        echo -e "${YELLOW}No snapshots found${NC}"
        echo "Create one with: ./create-snapshot.sh"
    else
        echo -e "Total: ${YELLOW}$count${NC} snapshot(s)"
    fi
}

# Command: info
cmd_info() {
    local name="${1:-}"
    
    if [ -z "$name" ]; then
        echo -e "${RED}Error: Snapshot name required${NC}"
        echo "Usage: $0 info <snapshot-name>"
        exit 1
    fi
    
    local metadata="${SNAPSHOTS_DIR}/${name}.json"
    local mem_file="${SNAPSHOTS_DIR}/${name}.mmd"
    local vmstate_file="${SNAPSHOTS_DIR}/${name}.vmstate"
    
    if [ ! -f "$metadata" ]; then
        echo -e "${RED}Error: Snapshot '$name' not found${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== Snapshot: $name ===${NC}"
    echo ""
    
    # Parse metadata
    local vm_id=$(jq -r '.vm_id' "$metadata")
    local created=$(jq -r '.created' "$metadata")
    local kernel=$(jq -r '.kernel' "$metadata")
    local rootfs=$(jq -r '.rootfs' "$metadata")
    local mem_size=$(jq -r '.memory_size' "$metadata")
    local vmstate_size=$(jq -r '.vmstate_size' "$metadata")
    local total=$((mem_size + vmstate_size))
    
    echo -e "${GREEN}Metadata:${NC}"
    echo "  Name: $name"
    echo "  VM ID: $vm_id"
    echo "  Created: $created"
    echo ""
    
    echo -e "${GREEN}Files:${NC}"
    echo "  Memory file: $mem_file ($(format_size $mem_size))"
    echo "  VM state: $vmstate_file ($(format_size $vmstate_size))"
    echo "  Total size: $(format_size $total)"
    echo ""
    
    echo -e "${GREEN}Boot Configuration:${NC}"
    echo "  Kernel: $kernel"
    echo "  Rootfs: $rootfs"
    echo ""
    
    # Check file existence
    echo -e "${GREEN}File Status:${NC}"
    if [ -f "$mem_file" ]; then
        local actual_mem=$(stat -f%z "$mem_file" 2>/dev/null || stat -c%s "$mem_file" 2>/dev/null)
        echo "  Memory file: OK ($(format_size $actual_mem))"
    else
        echo -e "  Memory file: ${RED}MISSING${NC}"
    fi
    
    if [ -f "$vmstate_file" ]; then
        local actual_vmstate=$(stat -f%z "$vmstate_file" 2>/dev/null || stat -c%s "$vmstate_file" 2>/dev/null)
        echo "  VM state file: OK ($(format_size $actual_vmstate))"
    else
        echo -e "  VM state file: ${RED}MISSING${NC}"
    fi
}

# Command: delete
cmd_delete() {
    local name="${1:-}"
    
    if [ -z "$name" ]; then
        echo -e "${RED}Error: Snapshot name required${NC}"
        echo "Usage: $0 delete <snapshot-name>"
        exit 1
    fi
    
    local metadata="${SNAPSHOTS_DIR}/${name}.json"
    
    if [ ! -f "$metadata" ]; then
        echo -e "${RED}Error: Snapshot '$name' not found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Deleting snapshot: $name${NC}"
    
    # Delete all associated files
    rm -f "${SNAPSHOTS_DIR}/${name}.json"
    rm -f "${SNAPSHOTS_DIR}/${name}.mmd"
    rm -f "${SNAPSHOTS_DIR}/${name}.vmstate"
    
    echo -e "${GREEN}Snapshot '$name' deleted${NC}"
}

# Command: copy
cmd_copy() {
    local name="${1:-}"
    local dest="${2:-$BACKUP_DIR}"
    
    if [ -z "$name" ]; then
        echo -e "${RED}Error: Snapshot name required${NC}"
        echo "Usage: $0 copy <snapshot-name> [destination]"
        exit 1
    fi
    
    local metadata="${SNAPSHOTS_DIR}/${name}.json"
    
    if [ ! -f "$metadata" ]; then
        echo -e "${RED}Error: Snapshot '$name' not found${NC}"
        exit 1
    fi
    
    mkdir -p "$dest"
    
    echo -e "${BLUE}Copying snapshot '$name' to '$dest'...${NC}"
    
    cp "${SNAPSHOTS_DIR}/${name}.json" "$dest/"
    cp "${SNAPSHOTS_DIR}/${name}.mmd" "$dest/"
    cp "${SNAPSHOTS_DIR}/${name}.vmstate" "$dest/"
    
    echo -e "${GREEN}Snapshot copied to: $dest${NC}"
}

# Command: clean-older
cmd_clean_older() {
    local days="${1:-30}"
    
    echo -e "${YELLOW}Finding snapshots older than $days days...${NC}"
    
    local count=0
    local removed=0
    local freed=0
    
    for metadata in "$SNAPSHOTS_DIR"/*.json; do
        [ -f "$metadata" ] || continue
        count=$((count + 1))
        
        local name=$(jq -r '.name' "$metadata")
        local created=$(jq -r '.created' "$metadata")
        local created_epoch=$(date -d "$created" +%s 2>/dev/null || echo "0")
        local cutoff_epoch=$(date -d "-${days} days" +%s 2>/dev/null || date -v-${days}d +%s)
        
        if [ "$created_epoch" -lt "$cutoff_epoch" ]; then
            local mem_size=$(jq -r '.memory_size // 0' "$metadata")
            local vmstate_size=$(jq -r '.vmstate_size // 0' "$metadata")
            freed=$((freed + mem_size + vmstate_size))
            
            rm -f "${SNAPSHOTS_DIR}/${name}.json"
            rm -f "${SNAPSHOTS_DIR}/${name}.mmd"
            rm -f "${SNAPSHOTS_DIR}/${name}.vmstate"
            
            echo "  Removed: $name"
            removed=$((removed + 1))
        fi
    done
    
    if [ $removed -eq 0 ]; then
        echo -e "${GREEN}No old snapshots to remove${NC}"
    else
        echo ""
        echo -e "${GREEN}Removed $removed snapshot(s), freed $(format_size $freed)${NC}"
    fi
}

# Command: sizes
cmd_sizes() {
    echo -e "${BLUE}=== Snapshot Disk Usage ===${NC}"
    echo ""
    
    local total_size=0
    local count=0
    
    for metadata in "$SNAPSHOTS_DIR"/*.json; do
        [ -f "$metadata" ] || continue
        count=$((count + 1))
        
        local name=$(basename "$metadata" .json)
        local mem_file="${SNAPSHOTS_DIR}/${name}.mmd"
        local vmstate_file="${SNAPSHOTS_DIR}/${name}.vmstate"
        
        if [ -f "$mem_file" ] && [ -f "$vmstate_file" ]; then
            local mem_size=$(stat -f%z "$mem_file" 2>/dev/null || stat -c%s "$mem_file" 2>/dev/null)
            local vmstate_size=$(stat -f%z "$vmstate_file" 2>/dev/null || stat -c%s "$vmstate_file" 2>/dev/null)
            local total=$((mem_size + vmstate_size))
            total_size=$((total_size + total))
            
            printf "%-30s %10s\n" "$name" "$(format_size $total)"
        fi
    done
    
    echo ""
    echo -e "Total: ${YELLOW}$count${NC} snapshot(s), $(format_size $total_size)"
    echo ""
    
    # Directory size
    local dir_size=$(du -sh "$SNAPSHOTS_DIR" 2>/dev/null | cut -f1)
    echo -e "Snapshot directory: ${GREEN}$dir_size${NC}"
}

# Main
command="${1:-list}"

case "$command" in
    list)
        cmd_list
        ;;
    info)
        cmd_info "$2"
        ;;
    delete)
        cmd_delete "$2"
        ;;
    copy)
        cmd_copy "$2" "$3"
        ;;
    clean-older)
        cmd_clean_older "${2:-30}"
        ;;
    sizes)
        cmd_sizes
        ;;
    *)
        echo "Unknown command: $command"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  list              - List all snapshots"
        echo "  info <name>       - Show snapshot details"
        echo "  delete <name>     - Delete a snapshot"
        echo "  copy <name> [dir] - Copy snapshot to another directory"
        echo "  clean-older <days> - Delete snapshots older than N days"
        echo "  sizes             - Show disk usage"
        exit 1
        ;;
esac