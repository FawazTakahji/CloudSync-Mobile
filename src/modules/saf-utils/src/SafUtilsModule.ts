import { NativeModule, requireNativeModule } from 'expo';

import { SafUtilsModuleEvents } from './SafUtils.types';

declare class SafUtilsModule extends NativeModule<SafUtilsModuleEvents> {
  requestSAFPermission(): Promise<boolean>;
  checkSAFPermission(): boolean;
  requestDirectoryTemporaryPermissions(): Promise<string | null>;
  getInfo(path: string): { isFile: boolean, isDirectory: boolean }
  getSubDirectories(path: string): string[];
  getSubFiles(path: string): string[];
  getFileBytes(path: string): Uint8Array;
  getFileText(path: string): string;
  createDirectory(path: string): void;
  writeFile(parentPath: string, name: string, bytes: Uint8Array): void;
  delete(path: string): void;
  rename(path: string, newName: string): void;
  move(from: string, to: string): void;
}

export default requireNativeModule<SafUtilsModule>('SafUtils');
