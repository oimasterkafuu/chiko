#include <iostream>
#include <fstream>

int main() {
    int a, b;
    
    // 从指定文件读取输入
    std::ifstream fin("input.txt");
    fin >> a >> b;
    fin.close();
    
    // 将结果写入指定文件
    std::ofstream fout("output.txt");
    fout << a + b << std::endl;
    fout.close();
    
    return 0;
} 