package expo.modules.shizuku;

import expo.modules.shizuku.FileInfo;

interface IStorageService {
    void destroy() = 16777114;
    FileInfo getInfo(String path) = 1;
    String[] getSubDirectories(String path) = 2;
    String[] getSubFiles(String path) = 3;
    long getFileSize(String path) = 4;
    byte[] getFileChunk(String path, long start, long end) = 5;
    void createDirectory(String path) = 6;
    void writeFileChunk(String path, in byte[] bytes, long start) = 7;
    void delete(String path) = 8;
    void move(String from, String to) = 9;
}