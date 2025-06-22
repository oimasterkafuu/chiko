# Simple Sandbox 安装与配置指南

您可以选择是否使用 simple-sandbox。

## 前提条件

在开始安装 simple-sandbox 前，请确保：

- 已完成 [C++ 开发环境配置](./cpp_dev_environment_setup.md)
- 已完成 [内核内存交换配置](./kernel_memory_swap_config.md)
- 已安装 [Node.js LTS 环境](./nvm_node_lts_setup.md)

## 安装 Simple Sandbox

在 ChikoOJ 项目中，simple-sandbox 作为评测端的依赖项进行安装和构建：

1. 克隆 simple-sandbox 仓库到评测端的 sandbox 目录：

```bash
cd packages/judger
git clone https://github.com/Menci/simple-sandbox sandbox
```

2. 安装依赖并编译 C++ 代码：

```bash
cd sandbox
CXX=clang++ yarn install
```

3. 编译 TypeScript 代码：

```bash
yarn run build
```

## 配置 Rootfs

沙箱运行需要一个根文件系统 (rootfs)。可以从以下地址下载预构建的 rootfs：

```bash
# 创建沙箱根目录
sudo mkdir -p /opt/sandbox/rootfs
sudo chown $(whoami) -R /opt/sandbox

# 下载并解压 rootfs
sudo curl -L https://github.com/oimoj/sandbox-rootfs/releases/download/v1.0.0/rootfs.tar.xz -o rootfs.tar.xz
sudo tar -xf rootfs.tar.xz -C /opt/sandbox
sudo rm rootfs.tar.xz
```

## 验证安装

安装完成后，可以通过运行以下命令验证 simple-sandbox 是否正常工作：

```bash
cd packages/judger
yarn dev
```

如果看到 "沙箱初始化成功" 和 "沙箱版本" 的输出，则表示安装成功。

## 故障排除

如果遇到问题，请检查：

1. 确认内核配置正确（参见[内核内存交换配置](./kernel_memory_swap_config.md)）
2. 确认使用了正确的编译器（clang++）
3. 确认安装了所有必要的依赖项

## 参考代码

因为 simple-sandbox 的接口十分神奇，故附上调用示例。

```js
/**
 * 代码沙箱模块
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 安全读取配置文件
let config;
try {
  const configPath = path.resolve(process.cwd(), 'config/config.json');
  const configRaw = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configRaw);
} catch (err) {
  console.error('无法读取配置文件:', err);
  throw new Error('无法读取配置文件');
}

// 导入simple-sandbox模块
const sss = require('../simple-sandbox/lib/index.js');

// 配置路径
const rootfsPath = path.resolve(process.cwd(), config.sandbox.rootfs || 'rootfs');
const sandboxTempDir = path.resolve(process.cwd(), 'sandbox');

/**
 * 沙箱任务队列管理器
 * 控制系统中所有代码的执行，确保按顺序处理任务
 */
class SandboxTaskQueue {
  constructor() {
    // 任务队列
    this.queue = [];
    
    // 是否正在处理任务
    this.isProcessing = false;
    
    // 当前正在执行的任务ID（便于调试）
    this.currentTaskId = null;
    
    console.log('沙箱任务队列已初始化');
  }
  
  /**
   * 添加任务到队列
   * @param {string} taskId - 任务ID
   * @param {Function} taskFn - 任务函数，必须返回Promise
   * @returns {Promise} 任务执行的Promise
   */
  async addTask(taskId, taskFn) {
    if (typeof taskFn !== 'function') {
      throw new Error('任务必须是函数');
    }
    
    console.log(`添加任务到队列: ${taskId}`);
    
    // 创建一个Promise，将resolve和reject函数保存起来
    let taskResolve, taskReject;
    const taskPromise = new Promise((resolve, reject) => {
      taskResolve = resolve;
      taskReject = reject;
    });
    
    // 将任务添加到队列
    this.queue.push({
      id: taskId,
      fn: taskFn,
      resolve: taskResolve,
      reject: taskReject
    });
    
    // 如果当前没有正在处理的任务，开始处理
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    // 返回任务Promise
    return taskPromise;
  }
  
  /**
   * 处理队列中的任务
   * @private
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    // 取出队列中的第一个任务
    const task = this.queue.shift();
    this.currentTaskId = task.id;
    
    console.log(`开始处理任务: ${task.id}`);
    
    try {
      // 执行任务函数
      const result = await task.fn();
      
      // 任务成功完成
      console.log(`任务完成: ${task.id}`);
      task.resolve(result);
    } catch (error) {
      // 任务执行出错
      console.error(`任务执行出错: ${task.id}`, error);
      task.reject(error);
    } finally {
      this.isProcessing = false;
      this.currentTaskId = null;
      
      // 处理队列中的下一个任务
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }
  
  /**
   * 检查用户是否有正在执行的任务
   * @param {string} userId - 用户ID
   * @returns {boolean} 如果用户有任务在队列中或正在执行，返回true
   */
  hasUserTask(userId) {
    // 检查当前正在执行的任务
    if (this.isProcessing && this.currentTaskId && this.currentTaskId.startsWith(`user-${userId}-`)) {
      return true;
    }
    
    // 检查队列中的任务
    return this.queue.some(task => task.id.startsWith(`user-${userId}-`));
  }
  
  /**
   * 获取队列长度
   * @returns {number} 队列中等待的任务数量
   */
  getQueueLength() {
    return this.queue.length;
  }
  
  /**
   * 获取当前正在执行的任务ID
   * @returns {string|null} 当前任务ID或null
   */
  getCurrentTaskId() {
    return this.currentTaskId;
  }
  
  /**
   * 清空队列（紧急情况下使用）
   * @returns {number} 被清除的任务数量
   */
  clearQueue() {
    const count = this.queue.length;
    this.queue.forEach(task => {
      task.reject(new Error('任务队列被手动清空'));
    });
    this.queue = [];
    console.log(`清空任务队列，移除了 ${count} 个任务`);
    return count;
  }
}

// 创建沙箱任务队列单例
const sandboxTaskQueue = new SandboxTaskQueue();

/**
 * 编译源代码
 * @param {string} id - 提交ID
 * @returns {Promise<{status: number, time: number, memory: number, code: number, error: string}>} 编译结果
 * status: 1=成功, 2=超时, 3=内存超限, 4=运行错误, 5=取消, 6=输出超限
 */
exports.compile = async (id) => {
  try {
    const codeDir = path.resolve(process.cwd(), 'data/code', id);
    const taskId = crypto.randomBytes(16).toString('hex');
    const sandboxDir = path.resolve(sandboxTempDir, taskId);
    const workingDir = path.resolve(sandboxDir, 'work');
    const dataDir = path.resolve(sandboxDir, 'data');

    // 创建目录
    fs.mkdirSync(sandboxDir, { recursive: true });
    fs.mkdirSync(workingDir);
    fs.mkdirSync(dataDir);

    // 复制代码到沙箱工作目录
    fs.copyFileSync(path.resolve(codeDir, 'foo.cpp'), path.resolve(workingDir, 'foo.cpp'));

    // 设置沙箱参数
    const sandboxedProcess = sss.startSandbox({
      hostname: `chiko-compiler-${taskId}`,
      chroot: rootfsPath,
      mounts: [
        {
          src: workingDir,
          dst: '/work',
          limit: 102400 * 1024, // 100MB
        },
      ],
      executable: 'g++',
      parameters: ['g++', 'foo.cpp', '-o', 'foo', '-O2', '-std=c++14', '-Wall'],
      environments: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
      stderr: path.resolve(dataDir, 'error.txt'),
      time: config.sandbox.compile_time_limit || 5000, // 编译时间限制
      mountProc: true,
      redirectBeforeChroot: true,
      memory: config.sandbox.compile_memory_limit * 1024 * 1024 || 1024 * 1024 * 1024, // 内存限制
      process: 64,
      user: sss.getUidAndGidInSandbox(rootfsPath, 'root'),
      cgroup: `compiler-${taskId}`,
      workingDirectory: '/work',
    });

    // 等待编译完成
    const result = await sandboxedProcess.waitForStop();

    console.log(`编译提交 ${id}, 结果:`, result);

    // 读取错误输出
    let errorText = fs.readFileSync(path.resolve(dataDir, 'error.txt')).toString();
    
    // 限制在1MB以内
    if (errorText.length > 1024 * 1024) { 
      errorText = errorText.slice(0, 1024 * 1024);
    }

    // 如果编译成功，复制编译结果到代码目录
    if (result.status === 1 && result.code === 0) {
      fs.copyFileSync(path.resolve(workingDir, 'foo'), path.resolve(codeDir, 'foo'));
    }

    // 将时间从纳秒转换为毫秒
    result.time /= 1000000;
    result.error = errorText;

    // 清理沙箱目录
    fs.rmSync(sandboxDir, { recursive: true, force: true });

    return result;
  } catch (err) {
    console.error(`编译提交 ${id} 出错:`, err);
    throw err;
  }
};

/**
 * 运行编译后的程序
 * @param {string} id - 提交ID
 * @param {string} inputFile - 输入文件路径
 * @param {number} timeLimit - 时间限制(毫秒)
 * @param {number} memoryLimit - 内存限制(字节)
 * @param {string} [fileName] - 文件名(可选)
 * @param {string[]} [params] - 程序参数(可选)
 * @param {Object} [fileIO] - 文件输入输出配置(可选)
 * @param {Object} [fileIO.input] - 输入文件配置
 * @param {string} [fileIO.input.sourcePath] - 输入文件源路径
 * @param {string} [fileIO.input.filename] - 输入文件在沙箱中的名称
 * @param {Object} [fileIO.output] - 输出文件配置
 * @param {string} [fileIO.output.filename] - 输出文件在沙箱中的名称
 * @returns {Promise<{result: Object, output: string, error: string}>} 运行结果
 */
exports.run = async (id, inputFile, timeLimit, memoryLimit, fileName = null, params = [], fileIO = null) => {
  try {
    const taskId = crypto.randomBytes(16).toString('hex');
    const sandboxDir = path.resolve(sandboxTempDir, taskId);
    const workingDir = path.resolve(sandboxDir, 'work');
    const dataDir = path.resolve(sandboxDir, 'data');
    const codeDir = path.resolve(process.cwd(), 'data/code', id);

    // 创建目录
    fs.mkdirSync(sandboxDir, { recursive: true });
    fs.mkdirSync(workingDir);
    fs.mkdirSync(dataDir);

    // 复制可执行文件到沙箱工作目录
    fs.copyFileSync(path.resolve(codeDir, 'foo'), path.resolve(workingDir, 'foo'));
    fs.chmodSync(path.resolve(workingDir, 'foo'), 0o755);

    // 处理输入文件
    if (fileIO && fileIO.input) {
      // 如果提供了文件IO输入配置，将指定文件复制到工作目录下的指定名称
      fs.copyFileSync(fileIO.input.sourcePath, path.resolve(workingDir, fileIO.input.filename));
    } else if (fileName) {
      // 传统方式: 复制指定输入文件到工作目录下的指定文件名
      fs.copyFileSync(inputFile, path.resolve(workingDir, `${fileName}.in`));
    } else {
      // 默认方式: 复制输入到标准输入文件
      fs.copyFileSync(inputFile, path.resolve(dataDir, 'input.txt'));
    }

    // 使用配置中的默认值或传入的参数
    const actualTimeLimit = timeLimit || config.sandbox.time_limit || 5000; // 默认5秒
    const actualMemoryLimit = memoryLimit || config.sandbox.memory_limit * 1024 * 1024 || 256 * 1024 * 1024; // 默认256MB

    // 设置沙箱参数
    const sandboxConfig = {
      hostname: `chiko-runner-${taskId}`,
      chroot: rootfsPath,
      mounts: [
        {
          src: workingDir,
          dst: '/work',
          limit: 102400 * 1024,
        },
      ],
      executable: './foo',
      parameters: ['./foo', ...params],
      environments: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
      time: actualTimeLimit,
      mountProc: true,
      redirectBeforeChroot: true,
      memory: actualMemoryLimit,
      process: 1,
      user: sss.getUidAndGidInSandbox(rootfsPath, 'sandbox'),
      cgroup: `runner-${taskId}`,
      workingDirectory: '/work',
    };

    // 设置输入输出重定向
    if (fileIO) {
      // 使用文件IO时，标准输入重定向到/dev/null
      sandboxConfig.stdin = '/dev/null';
    } else {
      // 其他情况按原逻辑处理
      sandboxConfig.stdin = fileName ? '/dev/null' : path.resolve(dataDir, 'input.txt');
    }
    
    sandboxConfig.stdout = (fileName || fileIO) ? '/dev/null' : path.resolve(dataDir, 'output.txt');
    sandboxConfig.stderr = path.resolve(dataDir, 'error.txt');

    // 设置写入目录的权限
    fs.chmodSync(workingDir, 0o777);

    // 启动沙箱
    const sandboxedProcess = sss.startSandbox(sandboxConfig);

    // 等待程序执行完成
    const result = await sandboxedProcess.waitForStop();

    // 读取输出和错误
    let output = '';
    try {
      if (fileIO && fileIO.output) {
        // 如果提供了文件IO输出配置，读取指定输出文件
        output = fs.readFileSync(path.resolve(workingDir, fileIO.output.filename), 'utf8');
      } else if (fileName) {
        // 传统方式: 读取指定输出文件
        output = fs.readFileSync(path.resolve(workingDir, `${fileName}.out`), 'utf8');
      } else {
        // 默认方式: 读取标准输出
        output = fs.readFileSync(path.resolve(dataDir, 'output.txt'), 'utf8');
      }
      console.log(`读取output: ${output}`);
    } catch (err) {
      console.warn(`读取输出文件失败 ${id}:`, err.message);
    }

    let error = '';
    try {
      error = fs.readFileSync(path.resolve(dataDir, 'error.txt'), 'utf8');
    } catch (err) {
      console.warn(`读取错误文件失败 ${id}:`, err.message);
    }

    // 清理沙箱目录
    fs.rmSync(sandboxDir, { recursive: true, force: true });

    console.log(`运行提交 ${id}, 结果:`, result);

    // 将时间从纳秒转换为毫秒
    result.time /= 1000000;

    return {
      result,
      output,
      error,
    };
  } catch (err) {
    console.error(`运行提交 ${id} 出错:`, err);
    throw err;
  }
}; 

/**
 * 提交编译和运行任务
 * @param {Function} taskFn - 任务函数，必须返回Promise
 * @param {string} userId - 用户ID
 * @param {string} taskType - 任务类型，如'ide'或'judge'
 * @returns {Promise<any>} 任务执行结果
 */
exports.submitTask = async (taskFn, userId, taskType) => {
  const taskId = `${taskType}-${userId}-${crypto.randomBytes(8).toString('hex')}`;
  return await sandboxTaskQueue.addTask(taskId, taskFn);
};

/**
 * 检查用户是否有活跃任务
 * @param {string} userId - 用户ID
 * @returns {boolean} 如果用户有活跃任务返回true
 */
exports.hasUserTask = (userId) => {
  return sandboxTaskQueue.hasUserTask(userId);
};

// 导出任务队列实例
exports.sandboxTaskQueue = sandboxTaskQueue; 
```