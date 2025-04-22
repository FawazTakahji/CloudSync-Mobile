import Shizuku from "@/modules/shizuku";
import { DirectoryDoesntExistError, FileDoesntExistError, PathDoesntExistError } from "@/utils/storage/errors";
import { Paths } from "expo-file-system/next";
import { CodedError } from "expo-modules-core";
import { errorCodes } from "@/modules/shizuku/src/errorCodes";

export function isStoragePermissionGranted(): boolean {
    return Shizuku.checkPermission();
}

export async function requestStoragePermission(): Promise<boolean> {
    return await Shizuku.requestPermission();
}

export function getSubdirectoryPaths(directory: string): string[] {
    try {
        return Shizuku.getSubDirectories(directory);
    } catch (e) {
        if (e instanceof CodedError && e.code === errorCodes.DirectoryDoesntExist) {
            throw new DirectoryDoesntExistError(e.message);
        }

        throw e;
    }
}

export function getSubdirectoryNames(directory: string): string[] {
    const subDirs = getSubdirectoryPaths(directory);
    return subDirs.map((item: string) => Paths.basename(item));
}

export function getFilePaths(directory: string): string[] {
    try {
        return Shizuku.getSubFiles(directory);
    } catch (e) {
        if (e instanceof CodedError && e.code === errorCodes.DirectoryDoesntExist) {
            throw new DirectoryDoesntExistError(e.message);
        }

        throw e;
    }
}

export function getFileBytes(path: string): Uint8Array {
    try {
        return Shizuku.getFileBytes(path);
    } catch (e) {
        if (e instanceof CodedError && e.code === errorCodes.FileDoesntExist) {
            throw new FileDoesntExistError(e.message);
        }

        throw e;
    }
}

export function getFileText(path: string): string {
    try {
        return Shizuku.getFileText(path);
    } catch (e) {
        if (e instanceof CodedError && e.code === errorCodes.FileDoesntExist) {
            throw new FileDoesntExistError(e.message);
        }

        throw e;
    }
}

export function writeFile(parent: string, name: string, bytes: Uint8Array) {
    Shizuku.createDirectory(parent);
    Shizuku.writeFile(Paths.join(parent, name), bytes);
}

export function deletePath(path: string) {
    try {
        Shizuku.delete(path);
    } catch (e) {
        if (e instanceof CodedError && e.code === errorCodes.PathDoesntExist) {
            throw new PathDoesntExistError(e.message);
        }

        throw e;
    }
}

export function move(from: string, to: string) {
    Shizuku.move(from, to);
}