# 使用 NVM 安装 Node.js LTS 环境设置

## 前提条件
确保你的系统上已安装 `curl` 和 `bash`。几乎所有现代 Linux 发行版默认都包含这些工具。

## 1. 安装 NVM (Node Version Manager)
运行 NVM 维护者提供的官方安装脚本。此命令获取最新的标记版本并执行安装脚本。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

> 如果有更新的版本发布，请替换 URL 中的版本号。

该脚本会将 NVM 仓库克隆到 `~/.nvm` 并将必要的初始化代码添加到你的 shell 启动文件（例如 `~/.bashrc`）中。

## 2. 在当前 Shell 会话中加载 NVM
安装脚本会在你的 shell 启动文件末尾添加以下代码片段。立即加载它，这样你无需启动新终端就可以使用 `nvm`：

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # 加载 nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # 加载 nvm bash 自动完成
```

你可以直接加载文件：

```bash
source ~/.bashrc    # 或 ~/.zshrc，取决于你使用的 shell
```

## 3. 安装最新的 Node.js LTS 版本
一旦 NVM 加载完成，安装最新的 Node.js LTS 版本：

```bash
nvm install --lts
```

NVM 将下载并编译（或获取预构建的二进制文件）最新的 LTS 版本，并将其设置为当前 shell 的活动版本。

## 4. 将安装的 LTS 版本设置为默认版本（可选）
如果你希望在所有未来的 shell 会话中自动使用新安装的 LTS 版本：

```bash
nvm alias default lts/*
```

## 5. 验证安装
确认 Node.js 和 npm 已正确安装并检查它们的版本：

```bash
node -v  # 应该输出类似 v18.x.x 或 v20.x.x 的内容，取决于当前的 LTS 版本
npm -v   # 应该输出捆绑的 npm 版本
```

## 6. 保持 Node.js 更新
当有新的 LTS 版本可用时，只需运行：

```bash
nvm install --lts --reinstall-packages-from=$(nvm current)
```

这将安装最新的 LTS 版本并从当前版本重新安装所有全局包。

---

**大功告成！** 你现在已经拥有一个功能完备的 NVM 环境，并安装了最新的 Node.js LTS 版本。 