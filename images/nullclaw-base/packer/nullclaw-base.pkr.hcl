# NullClaw Base Image - Packer Configuration
# Builds a Firecracker-compatible VM image with Qwen 3.5 + Ollama + NullClaw

packer {
  required_plugins {
    qemu = {
      source  = "github.com/hashicorp/qemu"
      version = ">= 1.0.0"
    }
  }
}

variable "vm_name" {
  type        = string
  default     = "nullclaw-base"
  description = "Name of the VM image"
}

variable "memory" {
  type        = number
  default     = 16384
  description = "Memory in MB (16GB default for Qwen 3.5)"
}

variable "cpus" {
  type        = number
  default     = 4
  description = "Number of vCPUs"
}

variable "disk_size" {
  type        = string
  default     = "30G"
  description = "Disk size for rootfs"
}

variable "output_directory" {
  type        = string
  default     = "output"
  description = "Output directory for built artifacts"
}

variable "kernel_url" {
  type        = string
  default     = "https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/netboot/vmlinuz-virt"
  description = "URL to download kernel (can use custom Firecracker kernel)"
}

variable "debian_version" {
  type        = string
  default     = "12"
  description = "Debian version to install"
}

variable "nullclaw_version" {
  type        = string
  default     = "latest"
  description = "NullClaw version to install"
}

variable "qwen_model" {
  type        = string
  default     = "qwen3.5"
  description = "Ollama model to download"
}

source "qemu" "nullclaw_base" {
  # Basic VM Configuration
  vm_name          = "${var.vm_name}"
  memory           = var.memory
  cpus             = var.cpus
  disk_size        = var.disk_size
  
  # Use Debian as base
  iso_url          = "https://cdimage.debian.org/debian-cd/${var.debian_version}/amd64/iso-cd/debian-${var.debian_version}-amd64-netinst.iso"
  iso_checksum     = "file:https://cdimage.debian.org/debian-cd/${var.debian_version}/amd64/iso-cd/SHA256SUMS"
  
  # Output configuration
  output_directory = var.output_directory
  format           = "raw"
  
  # Serial console configuration (critical for Firecracker)
  headless         = true
  serial_files     = ["${var.output_directory}/serial.log"]
  
  # Boot configuration
  boot_wait        = "5s"
  boot_command = [
    "<esc><wait>",
    "install ",
    "preseed/url=http://{{.HTTPIP}}:{{.HTTPPort}}/preseed.cfg ",
    "console=ttyS0,115200n8 ",
    "priority=critical ",
    "<enter>"
  ]
  
  # HTTP directory for preseed
  http_directory   = "http"
  http_port_min    = 8000
  http_port_max    = 8500
  
  # SSH configuration
  ssh_username     = "nullclaw"
  ssh_password     = "nullclaw"
  ssh_timeout      = "60m"
  
  # Shutdown
  shutdown_command  = "sudo systemctl poweroff"
  
  # QEMU-specific optimizations for Firecracker compatibility
  qemuargs = [
    ["-serial", "stdio"],
    ["-nographic", ""],
    ["-machine", "type=q35,accel=tcg,dump-guest-core=off"],
    ["-cpu", "host"],
  ]
}

build {
  name    = "nullclaw-base"
  sources = ["source.qemu.nullclaw_base"]
  
  # Provision with Ansible
  provisioner "ansible" {
    playbook_file   = "../ansible/site.yml"
    inventory_directory  = "../ansible"
    ansible_env_vars = [
      "ANSIBLE_HOST_KEY_CHECKING=False",
      "ANSIBLE_PIPELINING=True"
    ]
    extra_arguments = [
      "--extra-vars", "qwen_model=${var.qwen_model} nullclaw_version=${var.nullclaw_version}"
    ]
  }
  
  # Copy kernel and initramfs for Firecracker
  provisioner "shell" {
    inline = [
      "mkdir -p /tmp/firecracker",
      "cp /boot/vmlinuz-* /tmp/firecracker/vmlinux",
      "cp /boot/initrd.img-* /tmp/firecracker/initrd"
    ]
  }
  
  # Create output artifacts
  post-processor "artifice" {
    files = [
      "${var.output_directory}/${var.vm_name}",
      "/tmp/firecracker/vmlinux",
      "/tmp/firecracker/initrd"
    ]
  }
  
  # Generate Firecracker config template
  post-processor "shell-local" {
    inline = [
      "mkdir -p ${var.output_directory}/config",
      "cat > ${var.output_directory}/config/firecracker.json << 'EOF'",
      jsonencode({
        boot-source = {
          kernel_image_path = "vmlinux"
          initramfs_path   = "initrd"
        }
        machine-config = {
          vcpu_count  = var.cpus
          mem_size_mib = var.memory
        }
        drives = [{
          drive_id      = "rootfs"
          path_on_host  = "${var.vm_name}.raw"
          is_root_device = true
          is_read_only   = false
        }]
        serial = {
          enabled = true
          console = "stdio"
        }
      }),
      "EOF"
    ]
  }
}