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

// 清理之前的二进制文件（如果存在）
if (fs.existsSync(stdioOutputFile)) fs.unlinkSync(stdioOutputFile);
if (fs.existsSync(fileioOutputFile)) fs.unlinkSync(fileioOutputFile);

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

// 执行测试
async function runTests() {
  try {
    await testStdIO();
    await testFileIO();
    console.log('\n所有测试已完成');
  } catch (error) {
    console.error('测试过程出错:', error);
  }
}

// 运行测试
runTests(); 