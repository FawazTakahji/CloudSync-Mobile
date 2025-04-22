import { Error, files } from "dropbox";

export function isNotFoundError(e: any): boolean {
    const error = e as Error<any>;
    return error.error_summary !== undefined && error.error_summary.includes("/not_found/");
}

export function isFolder(metadata: files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference): boolean {
    return metadata[".tag"] === "folder";
}

export function isFile(metadata: files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference): boolean {
    return metadata[".tag"] === "file";
}