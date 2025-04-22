import { StorageMode } from "@/enums/StorageMode";
import AndroidUtils from "@/modules/android-utils";

export const errorCodes = {
    ActivityNotFound: "ERR_ACTIVITY_NOT_FOUND"
}

export const allowedStorageModes: StorageMode[] = [];

export function setAllowedStorageModes() {
    // android/data can be accessed without saf or shizuku on android 10 and below
    if (AndroidUtils.sdkVersion <= 29) {
        allowedStorageModes.push(StorageMode.Legacy);
    }
    if (AndroidUtils.sdkVersion <= 32) {
        allowedStorageModes.push(StorageMode.Saf);
    }
    allowedStorageModes.push(StorageMode.Shizuku);
}