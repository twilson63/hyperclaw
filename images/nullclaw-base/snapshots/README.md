# Firecracker Snapshots Directory

This directory contains Firecracker VM snapshots for fast boot (~200ms).

## Structure

```
snapshots/
├── base.mmd              # Memory snapshot (memory dump)
├── base.vmstate          # VM state snapshot (registers, devices)
├── base.json             # Metadata (creation time, sizes, config)
├── YYYYMMDD-HHMMSS.mmd   # Named snapshots
├── YYYYMMDD-HHMMSS.vmstate
└── YYYYMMDD-HHMMSS.json
```

## Files

| Extension | Description |
|-----------|-------------|
| `.mmd` | Memory dump (RAM contents) |
| `.vmstate` | VM state (CPU registers, device state) |
| `.json` | Metadata (creation time, sizes, config) |

## Usage

```bash
# Create a new snapshot
../scripts/create-snapshot.sh [vm_id] [snapshot_name]

# Boot from snapshot
../scripts/boot-snapshot.sh [snapshot_name]

# List snapshots
../scripts/manage-snapshots.sh list

# Show snapshot info
../scripts/manage-snapshots.sh info base

# Delete old snapshots
../scripts/manage-snapshots.sh clean-older 30
```

## Snapshot Size

Typical snapshot sizes for a 16GB VM:
- Memory dump (.mmd): ~16GB (compressed: ~4-8GB)
- VM state (.vmstate): ~2-4MB
- Metadata (.json): ~1KB

## Boot Time Optimization

| Method | Boot Time |
|--------|-----------|
| Cold boot | 5-10 seconds |
| Snapshot boot | ~200ms |
| Snapshot + lazy restore | ~100ms |

## Notes

- Snapshots are tied to the Firecracker version
- Snapshots must be loaded on the same host architecture
- Memory snapshots can be large; consider compression for storage
- Use `manage-snapshots.sh sizes` to monitor disk usage