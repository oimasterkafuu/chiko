const path = require('path');
const fs = require('fs');
const sandbox = require('../simple-sandbox/lib');
const crypto = require('crypto');

// 配置参数
const config = {
  sandbox: {
    rootfs: '/opt/sandbox/rootfs',
    time_limit: 1000,
    memory_limit: 256, // 单位MB
    compile_time_limit: 10000,
    compile_memory_limit: 512 // 单位MB
  }
};

// 沙箱根文件系统路径
const rootfsPath = config.sandbox.rootfs;

// 当前工作目录
const workingDir = path.resolve(__dirname);

// 沙箱临时目录
const sandboxTempDir = path.resolve(workingDir, 'sandbox_tmp');

/**
 * 编译源代码
 * @param {string} sourceFile - 源代码文件路径
 * @param {string} outputFile - 输出可执行文件路径
 * @returns {Promise<{status: number, time: number, memory: number, code: number, error: string}>} 编译结果
 */
async function compile(sourceFile, outputFile) {
  try {
    const taskId = crypto.randomBytes(16).toString('hex');
    const sandboxDir = path.resolve(sandboxTempDir, taskId);
    const workDir = path.resolve(sandboxDir, 'work');
    const dataDir = path.resolve(sandboxDir, 'data');

    // 创建目录
    fs.mkdirSync(sandboxDir, { recursive: true });
    fs.mkdirSync(workDir);
    fs.mkdirSync(dataDir);

    // 复制源代码到沙箱工作目录
    const sourceFileName = path.basename(sourceFile);
    fs.copyFileSync(sourceFile, path.resolve(workDir, sourceFileName));

    console.log(`开始编译源文件: ${sourceFileName}`);

    // 设置沙箱参数
    const sandboxedProcess = sandbox.startSandbox({
      hostname: `chiko-compiler-${taskId}`,
      chroot: rootfsPath,
      mounts: [
        {
          src: workDir,
          dst: '/work',
          limit: 102400 * 1024, // 100MB
        },
      ],
      executable: 'g++',
      parameters: ['g++', sourceFileName, '-o', 'program', '-O2', '-std=c++17', '-Wall'],
      environments: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
      stderr: path.resolve(dataDir, 'error.txt'),
      time: config.sandbox.compile_time_limit,
      mountProc: true,
      redirectBeforeChroot: true,
      memory: config.sandbox.compile_memory_limit * 1024 * 1024,
      process: 64,
      user: sandbox.getUidAndGidInSandbox(rootfsPath, 'root'),
      cgroup: `compiler-${taskId}`,
      workingDirectory: '/work',
    });

    // 等待编译完成
    const result = await sandboxedProcess.waitForStop();

    console.log(`编译结果:`, result);

    // 读取错误输出
    let errorText = '';
    try {
      errorText = fs.readFileSync(path.resolve(dataDir, 'error.txt')).toString();
      
      // 限制在1MB以内
      if (errorText.length > 1024 * 1024) { 
        errorText = errorText.slice(0, 1024 * 1024);
      }
    } catch (err) {
      console.error('读取编译错误输出失败:', err);
    }

    // 如果编译成功，复制编译结果到输出文件
    if (result.status === 1 && result.code === 0) {
      fs.copyFileSync(path.resolve(workDir, 'program'), outputFile);
      fs.chmodSync(outputFile, 0o755); // 确保可执行权限
      console.log(`编译成功，可执行文件已保存到: ${outputFile}`);
    } else {
      console.error('编译失败:', errorText);
    }

    // 将时间从纳秒转换为毫秒
    result.time /= 1000000;
    result.error = errorText;

    // 清理沙箱目录
    fs.rmSync(sandboxDir, { recursive: true, force: true });

    return result;
  } catch (err) {
    console.error(`编译出错:`, err);
    throw err;
  }
}

/**
 * 在沙箱中运行程序 (使用标准输入/输出)
 * @param {string} executableFile - 可执行文件路径
 * @param {string} inputFile - 输入文件路径
 * @param {number} timeLimit - 时间限制(毫秒)
 * @param {number} memoryLimit - 内存限制(MB)
 * @returns {Promise<{result: Object, output: string, error: string}>} 运行结果
 */
async function runWithStdIO(executableFile, inputFile, timeLimit = null, memoryLimit = null) {
  try {
    const taskId = crypto.randomBytes(16).toString('hex');
    const sandboxDir = path.resolve(sandboxTempDir, taskId);
    const workDir = path.resolve(sandboxDir, 'work');
    const dataDir = path.resolve(sandboxDir, 'data');

    // 创建目录
    fs.mkdirSync(sandboxDir, { recursive: true });
    fs.mkdirSync(workDir);
    fs.mkdirSync(dataDir);

    // 复制可执行文件到沙箱工作目录
    fs.copyFileSync(executableFile, path.resolve(workDir, 'program'));
    fs.chmodSync(path.resolve(workDir, 'program'), 0o755);

    // 复制输入文件
    fs.copyFileSync(inputFile, path.resolve(dataDir, 'input.txt'));

    // 确保输出文件存在且可写
    const outputPath = path.resolve(dataDir, 'output.txt');
    const errorPath = path.resolve(dataDir, 'error.txt');
    fs.writeFileSync(outputPath, '');
    fs.writeFileSync(errorPath, '');
    fs.chmodSync(outputPath, 0o666);
    fs.chmodSync(errorPath, 0o666);

    console.log('开始运行程序 (StdIO模式)...');

    // 使用配置中的默认值或传入的参数
    const actualTimeLimit = timeLimit || config.sandbox.time_limit;
    const actualMemoryLimit = (memoryLimit || config.sandbox.memory_limit) * 1024 * 1024;

    // 设置沙箱参数
    const sandboxedProcess = sandbox.startSandbox({
      hostname: `chiko-runner-${taskId}`,
      chroot: rootfsPath,
      mounts: [
        {
          src: workDir,
          dst: '/work',
          limit: 102400 * 1024,
        },
      ],
      executable: '/work/program',
      parameters: ['/work/program'],
      environments: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
      stdin: path.resolve(dataDir, 'input.txt'),
      stdout: outputPath,
      stderr: errorPath,
      time: actualTimeLimit,
      mountProc: true,
      redirectBeforeChroot: true,
      memory: actualMemoryLimit,
      process: 1,
      user: sandbox.getUidAndGidInSandbox(rootfsPath, 'sandbox'),
      cgroup: `runner-${taskId}`,
      workingDirectory: '/work',
    });

    // 等待程序执行完成
    const result = await sandboxedProcess.waitForStop();
    console.log('程序执行结果:', result);

    // 读取输出和错误
    let output = '';
    let error = '';
    
    try {
      output = fs.readFileSync(outputPath, 'utf8');
    } catch (err) {
      console.warn('读取输出文件失败:', err.message);
    }

    try {
      error = fs.readFileSync(errorPath, 'utf8');
    } catch (err) {
      console.warn('读取错误文件失败:', err.message);
    }

    // 将时间从纳秒转换为毫秒
    result.time /= 1000000;

    // 清理沙箱目录
    fs.rmSync(sandboxDir, { recursive: true, force: true });

    return {
      result,
      output,
      error,
    };
  } catch (err) {
    console.error(`运行出错:`, err);
    throw err;
  }
}

/**
 * 在沙箱中运行程序 (使用文件输入/输出)
 * @param {string} executableFile - 可执行文件路径
 * @param {string} inputFile - 输入文件源路径
 * @param {string} inputFileName - 沙箱中的输入文件名
 * @param {string} outputFileName - 沙箱中的输出文件名
 * @param {number} timeLimit - 时间限制(毫秒)
 * @param {number} memoryLimit - 内存限制(MB)
 * @returns {Promise<{result: Object, output: string, error: string}>} 运行结果
 */
async function runWithFileIO(executableFile, inputFile, inputFileName, outputFileName, timeLimit = null, memoryLimit = null) {
  try {
    const taskId = crypto.randomBytes(16).toString('hex');
    const sandboxDir = path.resolve(sandboxTempDir, taskId);
    const workDir = path.resolve(sandboxDir, 'work');
    const dataDir = path.resolve(sandboxDir, 'data');

    // 创建目录
    fs.mkdirSync(sandboxDir, { recursive: true });
    fs.mkdirSync(workDir);
    fs.mkdirSync(dataDir);

    // 复制可执行文件到沙箱工作目录
    fs.copyFileSync(executableFile, path.resolve(workDir, 'program'));
    fs.chmodSync(path.resolve(workDir, 'program'), 0o755);

    // 复制输入文件到指定名称
    fs.copyFileSync(inputFile, path.resolve(workDir, inputFileName));

    // 确保输出文件可写
    fs.chmodSync(workDir, 0o777);

    // 确保错误输出文件存在且可写
    const errorPath = path.resolve(dataDir, 'error.txt');
    fs.writeFileSync(errorPath, '');
    fs.chmodSync(errorPath, 0o666);

    console.log(`开始运行程序 (FileIO模式)...`);
    console.log(`输入文件: ${inputFileName}, 输出文件: ${outputFileName}`);

    // 使用配置中的默认值或传入的参数
    const actualTimeLimit = timeLimit || config.sandbox.time_limit;
    const actualMemoryLimit = (memoryLimit || config.sandbox.memory_limit) * 1024 * 1024;

    // 设置沙箱参数
    const sandboxedProcess = sandbox.startSandbox({
      hostname: `chiko-runner-${taskId}`,
      chroot: rootfsPath,
      mounts: [
        {
          src: workDir,
          dst: '/work',
          limit: 102400 * 1024,
        },
      ],
      executable: '/work/program',
      parameters: ['/work/program'],
      environments: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
      stdin: '/dev/null', // 文件IO模式下不使用标准输入
      stdout: '/dev/null', // 文件IO模式下不使用标准输出
      stderr: errorPath,
      time: actualTimeLimit,
      mountProc: true,
      redirectBeforeChroot: true,
      memory: actualMemoryLimit,
      process: 1,
      user: sandbox.getUidAndGidInSandbox(rootfsPath, 'sandbox'),
      cgroup: `runner-${taskId}`,
      workingDirectory: '/work',
    });

    // 等待程序执行完成
    const result = await sandboxedProcess.waitForStop();
    console.log('程序执行结果:', result);

    // 读取输出和错误
    let output = '';
    let error = '';
    
    try {
      // 读取程序生成的输出文件
      output = fs.readFileSync(path.resolve(workDir, outputFileName), 'utf8');
    } catch (err) {
      console.warn('读取输出文件失败:', err.message);
    }

    try {
      error = fs.readFileSync(errorPath, 'utf8');
    } catch (err) {
      console.warn('读取错误文件失败:', err.message);
    }

    // 将时间从纳秒转换为毫秒
    result.time /= 1000000;

    // 清理沙箱目录
    fs.rmSync(sandboxDir, { recursive: true, force: true });

    return {
      result,
      output,
      error,
    };
  } catch (err) {
    console.error(`运行出错:`, err);
    throw err;
  }
}

module.exports = {
  compile,
  runWithStdIO,
  runWithFileIO
}; 