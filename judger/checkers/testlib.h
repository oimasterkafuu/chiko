/**
 * Simplified testlib.h for checker programs
 * Adapted from the original testlib.h by Mike Mirzayanov
 */

#ifndef _TESTLIB_H_
#define _TESTLIB_H_

#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <stdexcept>
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <cstring>
#include <cctype>

/* Exit codes for checker program */
const int _ok = 0;
const int _wa = 1;
const int _pe = 2;
const int _fail = 3;
const int _dirt = 4;
const int _points = 7;

/* Global variables */
std::ifstream inf;
std::ifstream ouf;
std::ifstream ans;
std::string _input;
std::string _output;
std::string _answer;

class InStream {
private:
    std::ifstream& stream;
    std::string name;
    int readCount;
    
    void initFile(const std::string& fileName) {
        stream.open(fileName.c_str(), std::ios::in);
        if (!stream.is_open()) {
            std::cerr << "Failed to open " << name << " file: " << fileName << std::endl;
            exit(_fail);
        }
    }
    
public:
    InStream(std::ifstream& s, const std::string& name): stream(s), name(name), readCount(0) { }
    
    int readInt() {
        readCount++;
        int result;
        if (!(stream >> result)) {
            if (stream.eof()) {
                std::cerr << "Unexpected EOF when reading integer from " << name << std::endl;
            } else {
                std::cerr << "Failed to read integer from " << name << std::endl;
            }
            exit(_pe);
        }
        return result;
    }
    
    std::string readString() {
        readCount++;
        std::string result;
        if (!(stream >> result)) {
            if (stream.eof()) {
                std::cerr << "Unexpected EOF when reading string from " << name << std::endl;
            } else {
                std::cerr << "Failed to read string from " << name << std::endl;
            }
            exit(_pe);
        }
        return result;
    }

    double readDouble() {
        readCount++;
        double result;
        if (!(stream >> result)) {
            if (stream.eof()) {
                std::cerr << "Unexpected EOF when reading double from " << name << std::endl;
            } else {
                std::cerr << "Failed to read double from " << name << std::endl;
            }
            exit(_pe);
        }
        return result;
    }
    
    std::string readLine() {
        readCount++;
        std::string result;
        if (!std::getline(stream, result)) {
            if (stream.eof()) {
                std::cerr << "Unexpected EOF when reading line from " << name << std::endl;
            } else {
                std::cerr << "Failed to read line from " << name << std::endl;
            }
            exit(_pe);
        }
        return result;
    }

    bool seekEof() {
        stream >> std::ws;
        return stream.eof();
    }
};

InStream inf_("inf", _input);
InStream ouf_("ouf", _output);
InStream ans_("ans", _answer);

void registerTestlibCmd(int argc, char *argv[]) {
    if (argc != 4) {
        std::cerr << "Invalid number of arguments for checker" << std::endl;
        std::cerr << "Usage: checker <input-file> <output-file> <answer-file>" << std::endl;
        exit(_fail);
    }
    
    inf.open(argv[1], std::ios::in);
    ouf.open(argv[2], std::ios::in);
    ans.open(argv[3], std::ios::in);
    
    if (!inf.is_open()) {
        std::cerr << "Failed to open input file: " << argv[1] << std::endl;
        exit(_fail);
    }
    
    if (!ouf.is_open()) {
        std::cerr << "Failed to open output file: " << argv[2] << std::endl;
        exit(_fail);
    }
    
    if (!ans.is_open()) {
        std::cerr << "Failed to open answer file: " << argv[3] << std::endl;
        exit(_fail);
    }
}

void setName(const char *format, ...) {
    // Simplified version - just ignore the name
    (void)format;
}

void quitf(int exitCode, const char *format, ...) {
    va_list ap;
    va_start(ap, format);
    
    if (exitCode == _ok) {
        std::cout << "OK ";
    } else if (exitCode == _wa) {
        std::cout << "Wrong Answer ";
    } else if (exitCode == _pe) {
        std::cout << "Presentation Error ";
    } else if (exitCode == _fail) {
        std::cout << "FAIL ";
    } else if (exitCode == _dirt) {
        std::cout << "DIRT ";
    } else if (exitCode == _points) {
        std::cout << "points ";
    }
    
    char buffer[1024];
    vsnprintf(buffer, sizeof(buffer), format, ap);
    va_end(ap);
    
    std::cout << buffer << std::endl;
    exit(exitCode);
}

#endif 