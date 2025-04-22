import { StorageMode } from "@/enums";
import * as legacy from "./legacy";
import * as saf from "./saf";
import * as shizuku from "./shizuku";
import { PathDoesntExistError } from "@/utils/storage/errors";

export async function isStoragePermissionGranted(storageMode: StorageMode): Promise<boolean> {
    switch (storageMode) {
        case StorageMode.Legacy:
            return await legacy.isStoragePermissionGranted();
        case StorageMode.Saf:
            return saf.isStoragePermissionGranted();
        case StorageMode.Shizuku:
            return shizuku.isStoragePermissionGranted();
    }
}

export async function requestStoragePermission(storageMode: StorageMode): Promise<boolean> {
    switch (storageMode) {
        case StorageMode.Legacy:
            return await legacy.requestStoragePermission();
        case StorageMode.Saf:
            return await saf.requestStoragePermission();
        case StorageMode.Shizuku:
            return await shizuku.requestStoragePermission();
    }
}

export function getSubdirectoryNames(directory: string, storageMode: StorageMode): string[] {
    switch (storageMode) {
        case StorageMode.Legacy:
            return legacy.getSubdirectoryNames(directory);
        case StorageMode.Saf:
            return saf.getSubdirectoryNames(directory);
        case StorageMode.Shizuku:
            return shizuku.getSubdirectoryNames(directory);
    }
}

export function getSubdirectoryPaths(directory: string, storageMode: StorageMode): string[] {
    switch (storageMode) {
        case StorageMode.Legacy:
            return legacy.getSubdirectoryPaths(directory);
        case StorageMode.Saf:
            return saf.getSubdirectoryPaths(directory);
        case StorageMode.Shizuku:
            return shizuku.getSubdirectoryPaths(directory);
    }
}

export function getFilePaths(directory: string, storageMode: StorageMode): string[] {
    switch (storageMode) {
        case StorageMode.Legacy:
            return legacy.getFilePaths(directory);
        case StorageMode.Saf:
            return saf.getFilePaths(directory);
        case StorageMode.Shizuku:
            return shizuku.getFilePaths(directory);
    }
}

export function getFileBytes(path: string, storageMode: StorageMode): Uint8Array {
    switch (storageMode) {
        case StorageMode.Legacy:
            return legacy.getFileBytes(path);
        case StorageMode.Saf:
            return saf.getFileBytes(path);
        case StorageMode.Shizuku:
            return shizuku.getFileBytes(path);
    }
}

export function getFileText(path: string, storageMode: StorageMode): string {
    switch (storageMode) {
        case StorageMode.Legacy:
            return legacy.getFileText(path);
        case StorageMode.Saf:
            return saf.getFileText(path);
        case StorageMode.Shizuku:
            return shizuku.getFileText(path);
    }
}

export function writeFile(parent: string, name: string, bytes: Uint8Array, storageMode: StorageMode) {
    switch (storageMode) {
        case StorageMode.Legacy:
            legacy.writeFile(parent, name, bytes);
            break;
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
        switch (storageMode) {
            case StorageMode.Legacy:
                legacy.deletePath(path);
                break;
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
    switch (storageMode) {
        case StorageMode.Legacy:
            legacy.move(from, to);
            break;
        case StorageMode.Saf:
            saf.move(from, to);
            break;
        case StorageMode.Shizuku:
            shizuku.move(from, to);
            break;
    }
}