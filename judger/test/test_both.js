const path = require('path');
const fs = require('fs');
const sandboxTester = require('./sandbox_tester');

// 测试目录
const testDir = path.resolve(__dirname);

// 测试文件路径
const stdioSourceFile = path.resolve(testDir, 'add.cpp');
const fileioSourceFile = path.resolve(testDir, 'add_fileio.cpp');
const inputFile = path.resolve(testDir, 'input.txt');
const stdioOutputFile = path.resolve(testDir, 'add'); 
const fileioOutputFile = path.resolve(testDir, 'add_fileio');
const checkersDir = path.resolve(testDir, '../checkers');
const icmpSourceFile = path.resolve(checkersDir, 'icmp.cpp');
const icmpOutputFile = path.resolve(testDir, 'icmp');

// 清理之前的二进制文件（如果存在）
if (fs.existsSync(stdioOutputFile)) fs.unlinkSync(stdioOutputFile);
if (fs.existsSync(fileioOutputFile)) fs.unlinkSync(fileioOutputFile);
if (fs.existsSync(icmpOutputFile)) fs.unlinkSync(icmpOutputFile);

/**
 * StdIO测试
 */
async function testStdIO() {
  try {
    console.log('======== 标准输入/输出(StdIO)测试 ========');
    
    // 1. 编译
    console.log('\n[1] 编译源代码...');
    const compileResult = await sandboxTester.compile(stdioSourceFile, stdioOutputFile);
    
    if (compileResult.status !== 1 || compileResult.code !== 0) {
      console.error('编译失败:', compileResult.error);
      return;
    }
    
    console.log(`编译成功，用时 ${compileResult.time} ms，内存使用 ${Math.round(compileResult.memory / 1024)} KB`);
    
    // 2. 运行
    console.log('\n[2] 运行程序...');
    const runResult = await sandboxTester.runWithStdIO(stdioOutputFile, inputFile);
    
    console.log(`运行完成，状态码: ${runResult.result.status}, 退出码: ${runResult.result.code}`);
    console.log(`用时: ${runResult.result.time} ms, 内存: ${Math.round(runResult.result.memory / 1024)} KB`);
    
    if (runResult.result.status === 1) {
      console.log('程序输出:', runResult.output.trim());
    } else {
      console.error('程序执行出错');
      if (runResult.error) console.error('错误输出:', runResult.error);
    }
    
    console.log('\n标准输入/输出测试完成');
  } catch (error) {
    console.error('标准IO测试出错:', error);
  }
}

/**
 * FileIO测试
 */
async function testFileIO() {
  try {
    console.log('\n======== 文件输入/输出(FileIO)测试 ========');
    
    // 1. 编译
    console.log('\n[1] 编译源代码...');
    const compileResult = await sandboxTester.compile(fileioSourceFile, fileioOutputFile);
    
    if (compileResult.status !== 1 || compileResult.code !== 0) {
      console.error('编译失败:', compileResult.error);
      return;
    }
    
    console.log(`编译成功，用时 ${compileResult.time} ms，内存使用 ${Math.round(compileResult.memory / 1024)} KB`);
    
    // 2. 运行
    console.log('\n[2] 运行程序...');
    const runResult = await sandboxTester.runWithFileIO(
      fileioOutputFile, 
      inputFile, 
      'input.txt',  // 沙箱中的输入文件名
      'output.txt'  // 沙箱中的输出文件名
    );
    
    console.log(`运行完成，状态码: ${runResult.result.status}, 退出码: ${runResult.result.code}`);
    console.log(`用时: ${runResult.result.time} ms, 内存: ${Math.round(runResult.result.memory / 1024)} KB`);
    
    if (runResult.result.status === 1) {
      console.log('程序输出:', runResult.output.trim());
    } else {
      console.error('程序执行出错');
      if (runResult.error) console.error('错误输出:', runResult.error);
    }
    
    console.log('\n文件输入/输出测试完成');
  } catch (error) {
    console.error('文件IO测试出错:', error);
  }
}

/**
 * 编译并运行icmp检查器
 */
async function testIcmpChecker() {
  try {
    console.log('\n======== ICMP特殊评测(SPJ)测试 ========');
    
    // 1. 编译icmp
    console.log('\n[1] 编译icmp检查器...');
    
    // 确保testlib.h在同目录下可访问
    const testlibPath = path.resolve(checkersDir, 'testlib.h');
    if (!fs.existsSync(testlibPath)) {
      console.error('未找到testlib.h，请确保它在checkers目录中');
      return;
    }
    
    const compileResult = await sandboxTester.compile(icmpSourceFile, icmpOutputFile);
    
    if (compileResult.status !== 1 || compileResult.code !== 0) {
      console.error('编译失败:', compileResult.error);
      return;
    }
    
    console.log(`编译成功，用时 ${compileResult.time} ms，内存使用 ${Math.round(compileResult.memory / 1024)} KB`);
    
    // 2. 先运行add程序获取输出
    console.log('\n[2] 运行add程序获取输出...');
    const runAddResult = await sandboxTester.runWithStdIO(stdioOutputFile, inputFile);
    
    if (runAddResult.result.status !== 1) {
      console.error('add程序运行失败');
      return;
    }
    
    // 创建文件存储add程序的输出
    const outputFile = path.resolve(testDir, 'output.txt');
    fs.writeFileSync(outputFile, runAddResult.output.trim());
    
    // 创建答案文件（在这个简单例子中，答案就是579，即123+456）
    const answerFile = path.resolve(testDir, 'answer.txt');
    fs.writeFileSync(answerFile, '579');
    
    console.log('添加的输入文件:', fs.readFileSync(inputFile, 'utf8').trim());
    console.log('程序输出:', runAddResult.output.trim());
    console.log('期望答案:', '579');
    
    // 3. 运行icmp检查器比较输出和答案
    console.log('\n[3] 运行icmp检查器比较输出和答案...');
    
    // 创建一个临时目录来存放icmp运行的数据
    const taskId = require('crypto').randomBytes(16).toString('hex');
    const sandboxDir = path.resolve(testDir, 'sandbox_tmp', taskId);
    const workDir = path.resolve(sandboxDir, 'work');
    const dataDir = path.resolve(sandboxDir, 'data');
    
    fs.mkdirSync(sandboxDir, { recursive: true });
    fs.mkdirSync(workDir);
    fs.mkdirSync(dataDir);
    
    // 复制icmp到沙箱工作目录
    fs.copyFileSync(icmpOutputFile, path.resolve(workDir, 'icmp'));
    fs.chmodSync(path.resolve(workDir, 'icmp'), 0o755);
    
    // 复制输入、输出和答案文件到沙箱工作目录
    fs.copyFileSync(inputFile, path.resolve(workDir, 'input.txt'));
    fs.copyFileSync(outputFile, path.resolve(workDir, 'output.txt'));
    fs.copyFileSync(answerFile, path.resolve(workDir, 'answer.txt'));
    
    // 确保错误输出文件存在且可写
    const errorPath = path.resolve(dataDir, 'error.txt');
    const spjOutputPath = path.resolve(dataDir, 'spj_output.txt');
    fs.writeFileSync(errorPath, '');
    fs.writeFileSync(spjOutputPath, '');
    fs.chmodSync(errorPath, 0o666);
    fs.chmodSync(spjOutputPath, 0o666);
    
    // 在沙箱中运行icmp检查器
    try {
      const sandbox = require('../simple-sandbox/lib');
      const rootfsPath = '/opt/sandbox/rootfs';
      
      const sandboxedProcess = sandbox.startSandbox({
        hostname: `chiko-checker-${taskId}`,
        chroot: rootfsPath,
        mounts: [
          {
            src: workDir,
            dst: '/work',
            limit: 102400 * 1024,
          },
        ],
        executable: '/work/icmp',
        parameters: ['/work/icmp', 'input.txt', 'output.txt', 'answer.txt'],
        environments: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
        stdout: spjOutputPath,
        stderr: errorPath,
        time: 1000,
        mountProc: true,
        redirectBeforeChroot: true,
        memory: 256 * 1024 * 1024,
        process: 1,
        user: sandbox.getUidAndGidInSandbox(rootfsPath, 'sandbox'),
        cgroup: `checker-${taskId}`,
        workingDirectory: '/work',
      });
      
      const result = await sandboxedProcess.waitForStop();
      
      console.log(`检查器运行完成，状态码: ${result.status}, 退出码: ${result.code}`);
      console.log(`用时: ${result.time / 1000000} ms, 内存: ${Math.round(result.memory / 1024 / 1024)} MB`);
      
      // 读取特判程序的输出
      let spjOutput = '';
      let spjError = '';
      
      try {
        spjOutput = fs.readFileSync(spjOutputPath, 'utf8');
      } catch (err) {
        console.warn('读取SPJ输出失败:', err.message);
      }
      
      try {
        spjError = fs.readFileSync(errorPath, 'utf8');
      } catch (err) {
        console.warn('读取SPJ错误输出失败:', err.message);
      }
      
      console.log('\n特判结果输出:');
      console.log(spjOutput.trim() || '(无输出)');
      
      if (spjError) {
        console.log('\n特判错误输出:');
        console.log(spjError.trim());
      }
      
      console.log('\nSPJ测试完成');
      
    } catch (err) {
      console.error('运行SPJ出错:', err);
    } finally {
      // 清理沙箱目录
      fs.rmSync(sandboxDir, { recursive: true, force: true });
      
      // 清理临时文件
      try {
        fs.unlinkSync(outputFile);
        fs.unlinkSync(answerFile);
      } catch (err) {
        console.warn('清理临时文件失败:', err.message);
      }
    }
    
  } catch (error) {
    console.error('ICMP测试出错:', error);
  }
}

// 执行测试
async function runTests() {
  try {
    await testStdIO();
    await testFileIO();
    await testIcmpChecker(); // 添加icmp检查器测试
    console.log('\n所有测试已完成');
  } catch (error) {
    console.error('测试过程出错:', error);
  }
}

// 运行测试
runTests(); 