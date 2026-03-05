# Snapshot Optimization Guide

This document explains how Firecracker snapshots enable ~200ms boot times and best practices for optimizing snapshot creation and restoration.

## How Snapshots Work

### Memory Snapshot (.mmd)

A memory snapshot is a direct dump of the VM's physical memory. It contains:
- Guest physical memory (RAM contents)
- All loaded programs and data
- Model weights (Qwen 3.5 ~6.6GB)
- Runtime state

### VM State Snapshot (.vmstate)

The VM state snapshot contains:
- vCPU registers (general purpose, control, floating point)
- Device state (virtio devices, serial console, network)
- Interrupt controller state
- Timer state

### Boot Process Comparison

```
┌─────────────────────────────────────────────────────────────────────┐
│                         COLD BOOT                                    │
├─────────────────────────────────────────────────────────────────────┤
│  1. BIOS/UEFI initialization     ~1-2s                              │
│  2. Kernel decompression         ~500ms                             │
│  3. Kernel initialization        ~1-2s                              │
│  4. Systemd services startup     ~2-4s                              │
│  5. Ollama model load           ~5-10s (Qwen 3.5)                  │
│  6. NullClaw initialization      ~100-500ms                         │
│  ─────────────────────────────────────────                         │
│  TOTAL                           8-19 seconds                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      SNAPSHOT BOOT                                   │
├─────────────────────────────────────────────────────────────────────┤
│  1. Firecracker process start   ~10-30ms                            │
│  2. Memory snapshot load         ~100-150ms                         │
│  3. VM state restore            ~10-30ms                           │
│  4. Resume execution             <1ms                               │
│  ─────────────────────────────────────────                         │
│  TOTAL                           ~200ms                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Performance Factors

### Memory Snapshot Size

| Configuration | Snapshot Size | Load Time |
|---------------|---------------|-----------|
| 4GB RAM       | ~1-2GB (compressed) | ~50ms |
| 8GB RAM       | ~3-5GB (compressed) | ~100ms |
| 16GB RAM      | ~6-10GB (compressed) | ~200ms |
| 32GB RAM      | ~12-20GB (compressed) | ~400ms |

**Note**: Load time depends on storage speed (SSD vs NVMe).

### Storage Performance

| Storage Type | Sequential Read | Snapshot Load (16GB) |
|--------------|-----------------|---------------------|
| HDD          | ~150 MB/s       | ~100 seconds        |
| SSD          | ~500 MB/s       | ~30 seconds         |
| NVMe         | ~3000 MB/s      | ~5 seconds          |
| RAM disk     | ~10 GB/s        | ~1.6 seconds        |

**Recommendation**: Always use NVMe or RAM disk for snapshots in production.

## Optimization Strategies

### 1. Minimal Memory Footprint

```yaml
# Before snapshot, minimize memory:
- Unload unused kernel modules
- Clear filesystem caches: sync; echo 3 > /proc/sys/vm/drop_caches
- Stop non-essential services
- Compact memory: malloc_trim()
```

### 2. Lazy Restore (Optional)

```json
{
  "snapshot": {
    "lazy_restore": true,
    "lazy_pages_per_second": 1000
  }
}
```

Lazy restore loads pages on-demand, reducing initial boot time:
- Initial boot: ~100ms
- Pages loaded during runtime as accessed
- Good for large memory VMs with sparse access patterns

### 3. Snapshot Compression

```bash
# Compress snapshot for storage
gzip -k snapshots/base.mmd

# Decompress before use
gunzip snapshots/base.mmd.gz
```

Compression ratios:
- Raw: 16GB
- gzip: ~8GB (50% reduction)
- zstd: ~6GB (60% reduction)

### 4. Snapshot Pooling

Pre-create multiple snapshots for different VM types:

```
snapshots/
├── base-qwen.mmd        # Base + Qwen 3.5
├── base-qwen-codestral.mmd  # Base + Qwen + Codestral
├── base-qwen-large.mmd  # Base + Qwen 32B
└── dev-snapshot.mmd     # Development state
```

### 5. UFFD (User-Fault FD) for Fastest Boot

For the absolute fastest boot (<100ms):

```json
{
  "snapshot": {
    "enable_diff_snapshots": false,
    "use_uffd": true
  }
}
```

UFFD allows:
- Memory-mapped snapshot files
- Page faults handled by host
- Near-instant VM start

## Best Practices

### Creating Snapshots

1. **Prepare VM state**:
   ```bash
   # Run garbage collection
   sudo -E fstrim -v /
   
   # Clear caches
   sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
   
   # Pause services
   sudo systemctl stop nullclaw
   ```

2. **Pause and snapshot**:
   ```bash
   # Via Firecracker API
   curl -X PUT http://localhost/actions \
        --unix-socket /tmp/firecracker.socket \
        -d '{"action_type": "Pause"}'
   
   curl -X PUT http://localhost/snapshot/create \
        --unix-socket /tmp/firecracker.socket \
        -d '{"snapshot_path": "snap.vmstate", "mem_file_path": "snap.mmd"}'
   ```

3. **Resume VM**:
   ```bash
   curl -X PUT http://localhost/actions \
        --unix-socket /tmp/firecracker.socket \
        -d '{"action_type": "Resume"}'
   ```

### Loading Snapshots

```bash
# Start Firecracker
firecracker --api-sock /tmp/fc.sock &

# Load snapshot (with resume)
curl -X PUT http://localhost/snapshot/load \
     --unix-socket /tmp/fc.sock \
     -d '{
       "snapshot_path": "snap.vmstate",
       "mem_backend_path": "snap.mmd",
       "enable_diff_snapshots": false,
       "resume": true
     }'
```

### Managing Snapshots

```bash
# List snapshots
./scripts/manage-snapshots.sh list

# Show sizes
./scripts/manage-snapshots.sh sizes

# Clean old snapshots
./scripts/manage-snapshots.sh clean-older 30  # 30 days

# Backup snapshot
./scripts/manage-snapshots.sh copy base /backups/
```

## Monitoring

Track boot times for optimization:

```bash
scripts/boot-snapshot.sh base 2>&1 | grep "Boot time"

# All boot times are logged to:
# logs/boot-times.json

# Analyze
cat logs/boot-times.json | jq '.boot_times | .[] | .boot_ms' | \
    awk '{sum+=$1; count++} END {print "Avg boot time:", sum/count, "ms"}'
```

## Troubleshooting

### Snapshot won't load

```
Error: Snapshot version mismatch
```
**Solution**: Snapshots are tied to Firecracker version. Recreate snapshot after upgrading.

### Slow boot times

```
Boot time: 500ms (expected ~200ms)
```
**Check**:
1. Storage I/O: `iostat -x 1`
2. Memory bandwidth: `numactl --hardware`
3. CPU frequency: `cat /proc/cpuinfo | grep MHz`

### Snapshot file corrupted

```
Error: Failed to read memory file
```
**Solution**: Verify file integrity, recreate snapshot.

### Out of memory on host

```
Error: Cannot allocate memory
```
**Solution**: Each snapshot requires full memory backing. Ensure host has enough RAM + swap.

## References

- [Firecracker Snapshot API](https://github.com/firecracker-microvm/firecracker/blob/main/docs/snapshotting.md)
- [Firecracker Performance Guide](https://github.com/firecracker-microvm/firecracker/blob/main/docs/getting-started.md#performance)
- [KVM Memory Management](https://www.kernel.org/doc/html/latest/virt/kvm/index.html)