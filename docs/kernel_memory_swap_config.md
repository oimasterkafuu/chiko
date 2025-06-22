# Linux 内核内存交换配置指南

本文档介绍如何在 Linux 系统上配置内核内存交换账户，这对于某些容器化应用和系统监控工具是必需的。

## 检查内存交换账户是否启用

内存交换账户在某些 Linux 发行版（如 Debian 8）中默认是禁用的。您可以通过检查以下文件是否存在来验证是否已启用：

```bash
ls /sys/fs/cgroup/memory/memory.memsw.usage_in_bytes
```

如果该文件不存在，则需要在内核参数中启用该功能。

## 修改 GRUB 配置

需要在 GRUB 启动参数中添加 `swapaccount=1` 选项：

1. 编辑 GRUB 配置文件：

```bash
sudo nano /etc/default/grub
```

2. 在 `GRUB_CMDLINE_LINUX_DEFAULT` 部分添加 `cgroup_enable=memory swapaccount=1`：

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash cgroup_enable=memory swapaccount=1"
```

## cgroup v2 兼容性问题

某些发行版默认启用了 cgroup v2，包括：
- Arch Linux（自 2021 年 4 月起）
- Fedora（自 31 版本起）
- Debian 最新版本

如果您找不到目录 `/sys/fs/cgroup/memory/`，则说明您的系统使用的是 cgroup v2。在这种情况下，还需要添加参数 `systemd.unified_cgroup_hierarchy=0` 以启用 cgroup v1：

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash cgroup_enable=memory swapaccount=1 systemd.unified_cgroup_hierarchy=0"
```

## 应用更改

修改完 GRUB 配置后，需要更新 GRUB 并重启系统以应用更改：

```bash
sudo update-grub && sudo reboot
```

## 验证配置

系统重启后，可以再次检查以确认内存交换账户是否已启用：

```bash
ls /sys/fs/cgroup/memory/memory.memsw.usage_in_bytes
```

如果文件存在，则表示配置成功。

## 注意事项

- 启用内存交换账户可能会对系统性能产生轻微影响
- 对于生产环境，请确保在应用此配置前进行充分测试
