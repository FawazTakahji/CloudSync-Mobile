import { NativeModule, requireNativeModule } from 'expo';
import { AndroidUtilsModuleEvents } from './AndroidUtils.types';

declare class AndroidUtilsModule extends NativeModule<AndroidUtilsModuleEvents> {
  sdkVersion: number;
  getPrimaryStoragePath(): string;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<AndroidUtilsModule>('AndroidUtils');
