import JSZip from "jszip";

export function getZipFiles(zip: JSZip): string[] {
    const files: string[] = [];
    zip.forEach((relativePath, file) => {
        if (!file.dir) {
            files.push(relativePath);
        }
    });

    return files;
}

export function getZipFolders(zip: JSZip): string[] {
    const folders: string[] = [];
    zip.forEach((relativePath, file) => {
        if (file.dir) {
            folders.push(relativePath);
        }
    });

    return folders;
}