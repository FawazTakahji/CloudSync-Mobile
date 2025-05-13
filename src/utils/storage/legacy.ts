import * as Permissions from "react-native-permissions";
import { File, Directory, Paths } from "expo-file-system/next";
import { DirectoryDoesntExistError, FileDoesntExistError, PathDoesntExistError } from "@/utils/storage/errors";
import AndroidUtils from "@/modules/android-utils/src/AndroidUtilsModule";

export async function isStoragePermissionGranted(): Promise<boolean> {
    if (AndroidUtils.sdkVersion <= 29) {
        const result = await Permissions.check("android.permission.WRITE_EXTERNAL_STORAGE");
        return result === "granted";
    }

    return AndroidUtils.isExternalStorageManager();
}

export async function requestStoragePermission(): Promise<boolean> {
    if (AndroidUtils.sdkVersion <= 29) {
        const result = await Permissions.request("android.permission.WRITE_EXTERNAL_STORAGE");
        return result === "granted";
    }

    return await AndroidUtils.requestManageExternalStoragePermission();
}

export function getSubdirectoryNames(path: string): string[] {
    const directory = new Directory(`file://${path}`);
    if (!directory.exists) {
        throw new DirectoryDoesntExistError(`The directory "${path}" doesn't exist.`);
    }

    const subDirs: Directory[] = directory.list().filter((item) => item instanceof Directory);
    return subDirs.map((item: Directory) => item.name);
}

export function getSubdirectoryPaths(path: string): string[] {
    const subDirs = getSubdirectoryNames(path);
    return subDirs.map((item: string) => Paths.join(path, item));
}

export function getFileNames(path: string): string[] {
    const directory = new Directory(`file://${path}`);
    if (!directory.exists) {
        throw new DirectoryDoesntExistError(`The directory "${path}" doesn't exist.`);
    }

    const subFiles: File[] = directory.list().filter((item) => item instanceof File);
    return subFiles.map((item: File) => item.name);
}

export function getFilePaths(path: string): string[] {
    const subFiles = getFileNames(path);
    return subFiles.map((item: string) => Paths.join(path, item));
}

export function getFileBytes(path: string): Uint8Array {
    const file = new File(`file://${path}`);
    if (!file.exists) {
        throw new FileDoesntExistError(`The file \"${path}\" doesn't exist.`);
    }

    return file.bytes();
}

export function getFileText(path: string): string {
    const file = new File(`file://${path}`);
    if (!file.exists) {
        throw new FileDoesntExistError(`The file \"${path}\" doesn't exist.`);
    }

    return file.text();
}

export function writeFile(parent: string, name: string, bytes: Uint8Array) {
    const directory = new Directory(`file://${parent}`);
    if (!directory.exists) {
        createDirectoryRecursive(parent);
    }

    const file = new File(Paths.join(parent, name));
    if (file.exists) {
        file.create();
    }

    file.write(bytes);
}

export function deletePath(path: string) {
    const file = new File(`file://${path}`);
    if (file.exists) {
        file.delete();
        return;
    }

    const directory = new Directory(`file://${path}`);
    if (directory.exists) {
        directory.delete();
        return;
    }

    throw new PathDoesntExistError(`The directory/file "${path}" doesn't exist.`);
}

export function move(from: string, to: string) {
    const fromFile = new File(`file://${from}`);
    if (fromFile.exists) {
        moveFile(fromFile, to);
        return;
    }

    const fromDirectory = new Directory(`file://${from}`);
    if (fromDirectory.exists) {
        moveDirectory(fromDirectory, to);
        return;
    }

    throw new Error("The source file/directory doesn't exist.");
}

function createDirectoryRecursive(path: string) {
    const dirs = path.split(/[\/\\]/);
    let currentDir = "";
    for (const dir of dirs) {
        currentDir += `/${dir}`;
        const directory = new Directory(`file://${currentDir}`);
        if (!directory.exists) {
            directory.create();
        }
    }
}

function moveFile(from: File, to: string) {
    const toFile = new File(`file://${to}`);

    const directoryPath = Paths.dirname(to);
    const directory = new Directory(`file://${directoryPath}`);
    if (!directory.exists) {
        createDirectoryRecursive(directoryPath);
    }

    from.move(toFile);
}

function moveDirectory(from: Directory, to: string) {
    const toDirectory = new Directory(`file://${to}`);
    if(toDirectory.exists) {
        throw new Error("The destination directory already exists.");
    }

    const directoryPath = Paths.dirname(to);
    const directory = new Directory(`file://${directoryPath}`);
    if (!directory.exists) {
        createDirectoryRecursive(directoryPath);
    }

    from.move(toDirectory);
}