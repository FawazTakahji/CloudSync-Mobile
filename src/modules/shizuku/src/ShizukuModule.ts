import { NativeModule, requireNativeModule } from 'expo';

import { ShizukuModuleEvents } from './Shizuku.types';

declare class ShizukuModule extends NativeModule<ShizukuModuleEvents> {
  isInstalled(): boolean;
  openApp(): void;
  requestPermission(): Promise<boolean>;
  checkPermission(): boolean;
  ping(): boolean;
  startStorageService(): Promise<void>;
  stopStorageService(): Promise<void>;
  checkStorageService(): boolean;
  getInfo(path: string): { isFile: boolean, isDirectory: boolean }
  getSubDirectories(path: string): string[];
  getSubFiles(path: string): string[];
  getFileBytes(path: string): Uint8Array;
  getFileText(path: string): string;
  createDirectory(path: string): void;
  writeFile(path: string, bytes: Uint8Array): void;
  delete(path: string): void;
  move(from: string, to: string): void;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ShizukuModule>('Shizuku');
