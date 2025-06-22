# C++ 开发环境配置指南

本文档介绍如何在 Ubuntu 系统上配置 C++17 开发环境，包括安装必要的编译工具和库。

## 安装基本开发工具

首先，我们需要安装 `build-essential` 软件包，它包含了编译 C/C++ 程序所需的基本工具，如 GCC/G++ 编译器、GNU Debugger、make 等。

```bash
sudo apt-get update
sudo apt-get install -y build-essential
```

## 安装 Clang 编译器和 CMake

Clang 是一个 C 语言、C++、Objective-C 和 Objective-C++ 的轻量级编译器，提供了更友好的错误提示和更快的编译速度。我们安装最新版本的 Clang 和 CMake：

```bash
sudo apt-get install -y clang cmake
```

安装完成后，可以通过以下命令检查 Clang 版本：

```bash
clang++ --version
```

输出示例：
```
Ubuntu clang version 18.1.3 (1ubuntu1)
Target: x86_64-pc-linux-gnu
Thread model: posix
InstalledDir: /usr/bin
```

## 安装 libfmt 库

libfmt 是一个现代化的格式化库，提供了类似于 Python 的字符串格式化功能，是 C++20 中 `std::format` 的原型。

```bash
sudo apt-get install -y libfmt-dev
```

## 总结

至此，我们已经完成了 C++17 开发环境的配置，包括：

- 安装 build-essential 基本开发工具
- 安装最新版本的 Clang 编译器
- 安装 libfmt 格式化库

现在可以开始进行 C++ 开发了！ 