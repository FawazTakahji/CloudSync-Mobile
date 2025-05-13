import { StorageMode } from "@/enums";
import * as legacy from "./legacy";
import * as saf from "./saf";
import * as shizuku from "./shizuku";
import { PathDoesntExistError } from "@/utils/storage/errors";
import AndroidUtils from "@/modules/android-utils/src/AndroidUtilsModule";
import { normalizePath } from "@/utils/path";
import { Paths } from "expo-file-system/next";
import { startsWithCaseInsensitive } from "@/utils/misc";

function isInAndroid(path: string): boolean {
    const primary = AndroidUtils.getPrimaryStoragePath()
    const android = normalizePath(Paths.join(primary, "Android"));
    const startsWithAndroid = startsWithCaseInsensitive(normalizePath(path), android);
    return startsWithAndroid && (path.length === android.length || path[android.length] === '/');
}

export async function requestStoragePermission(storageMode: StorageMode, inAndroid: boolean): Promise<boolean> {
    if (!inAndroid || storageMode === StorageMode.Legacy) {
        return await legacy.requestStoragePermission();
    }

    switch (storageMode) {
        case StorageMode.Saf:
            return await saf.requestStoragePermission();
        case StorageMode.Shizuku:
            return await shizuku.requestStoragePermission();
    }
}

export function getSubdirectoryNames(directory: string, storageMode: StorageMode): string[] {
    if (!isInAndroid(directory) || storageMode === StorageMode.Legacy) {
        return legacy.getSubdirectoryNames(directory);
    }

    switch (storageMode) {
        case StorageMode.Saf:
            return saf.getSubdirectoryNames(directory);
        case StorageMode.Shizuku:
            return shizuku.getSubdirectoryNames(directory);
    }
}

export function getSubdirectoryPaths(directory: string, storageMode: StorageMode): string[] {
    if (!isInAndroid(directory) || storageMode === StorageMode.Legacy) {
        return legacy.getSubdirectoryPaths(directory);
    }

    switch (storageMode) {
        case StorageMode.Saf:
            return saf.getSubdirectoryPaths(directory);
        case StorageMode.Shizuku:
            return shizuku.getSubdirectoryPaths(directory);
    }
}

export function getFilePaths(directory: string, storageMode: StorageMode): string[] {
    if (!isInAndroid(directory) || storageMode === StorageMode.Legacy) {
        return legacy.getFilePaths(directory);
    }

    switch (storageMode) {
        case StorageMode.Saf:
            return saf.getFilePaths(directory);
        case StorageMode.Shizuku:
            return shizuku.getFilePaths(directory);
    }
}

export function getFileBytes(path: string, storageMode: StorageMode): Uint8Array {
    if (!isInAndroid(path) || storageMode === StorageMode.Legacy) {
        return legacy.getFileBytes(path);
    }

    switch (storageMode) {
        case StorageMode.Saf:
            return saf.getFileBytes(path);
        case StorageMode.Shizuku:
            return shizuku.getFileBytes(path);
    }
}

export function getFileText(path: string, storageMode: StorageMode): string {
    if (!isInAndroid(path) || storageMode === StorageMode.Legacy) {
        return legacy.getFileText(path);
    }

    switch (storageMode) {
        case StorageMode.Saf:
            return saf.getFileText(path);
        case StorageMode.Shizuku:
            return shizuku.getFileText(path);
    }
}

export function writeFile(parent: string, name: string, bytes: Uint8Array, storageMode: StorageMode) {
    if (!isInAndroid(parent) || storageMode === StorageMode.Legacy) {
        legacy.writeFile(parent, name, bytes);
        return;
    }

    switch (storageMode) {
        case StorageMode.Saf:
            saf.writeFile(parent, name, bytes);
            break;
        case StorageMode.Shizuku:
            shizuku.writeFile(parent, name, bytes);
            break;
    }
}

export function deletePath(path: string, storageMode: StorageMode, safe: boolean = true) {
    try {
        if (!isInAndroid(path) || storageMode === StorageMode.Legacy) {
            legacy.deletePath(path);
            return;
        }

        switch (storageMode) {
            case StorageMode.Saf:
                saf.deletePath(path);
                break;
            case StorageMode.Shizuku:
                shizuku.deletePath(path);
                break;
        }
    } catch (e) {
        if (!(e instanceof PathDoesntExistError) || !safe) {
            throw e;
        }
    }
}

export function move(from: string, to: string, storageMode: StorageMode) {
    if ((!isInAndroid(from) && !isInAndroid(to)) || storageMode === StorageMode.Legacy) {
        legacy.move(from, to);
        return;
    }

    switch (storageMode) {
        case StorageMode.Saf:
            saf.move(from, to);
            break;
        case StorageMode.Shizuku:
            shizuku.move(from, to);
            break;
    }
}