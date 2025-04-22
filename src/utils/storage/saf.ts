import SafUtils from "@/modules/saf-utils";
import { DirectoryDoesntExistError, FileDoesntExistError, PathDoesntExistError } from "@/utils/storage/errors";
import { Paths } from "expo-file-system/next";
import { pathEqual } from "@/utils/path";
import { CodedError } from "expo-modules-core";
import { errorCodes } from "@/modules/saf-utils/src/errorCodes";

export function isStoragePermissionGranted(): boolean {
    return SafUtils.checkSAFPermission();
}

export async function requestStoragePermission(): Promise<boolean> {
    return await SafUtils.requestSAFPermission();
}

export function getSubdirectoryPaths(directory: string): string[] {
    try {
        return SafUtils.getSubDirectories(directory);
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
        return SafUtils.getSubFiles(directory);
    } catch (e) {
        if (e instanceof CodedError && e.code === errorCodes.DirectoryDoesntExist) {
            throw new DirectoryDoesntExistError(e.message);
        }

        throw e;
    }
}

export function getFileBytes(path: string): Uint8Array {
    try {
        return SafUtils.getFileBytes(path);
    } catch (e) {
        if (e instanceof CodedError && e.code === errorCodes.FileDoesntExist) {
            throw new FileDoesntExistError(e.message);
        }

        throw e;
    }
}

export function getFileText(path: string): string {
    try {
        return SafUtils.getFileText(path);
    } catch (e) {
        if (e instanceof CodedError && e.code === errorCodes.FileDoesntExist) {
            throw new FileDoesntExistError(e.message);
        }

        throw e;
    }
}

export function writeFile(parent: string, name: string, bytes: Uint8Array) {
    SafUtils.createDirectory(parent);
    SafUtils.writeFile(parent, name, bytes);
}

export function deletePath(path: string) {
    try {
        SafUtils.delete(path);
    } catch (e) {
        if (e instanceof CodedError && e.code === errorCodes.PathDoesntExist) {
            throw new PathDoesntExistError(e.message);
        }

        throw e;
    }
}

export function move(from: string, to: string) {
    const fromParent = Paths.dirname(from);
    const toParent = Paths.dirname(to);
    if (pathEqual(fromParent, toParent)) {
        SafUtils.rename(from, Paths.basename(to));
    } else {
        SafUtils.move(from, to);
    }
}