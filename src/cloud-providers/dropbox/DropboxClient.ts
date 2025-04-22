import { ICloudClient } from "@/cloud-providers/ICloudClient";
import { Dropbox, DropboxResponseError, files } from "dropbox";
import { isFolder, isNotFoundError } from "@/cloud-providers/dropbox/utils";
import { DateTime } from "luxon";
import groupBy from "lodash/groupBy"
import { dateCompare, startsWithCaseInsensitive } from "@/utils/misc";
import { getZipFiles } from "@/utils/zip";
import { blobToUint8Array } from "@/utils/blob";
import log from "@/utils/logger";
import { getSaveInfo, getSavesPath, isExcludedName, isSaveInfo, SaveInfo } from "@/utils/saves";
import { Paths } from "expo-file-system/next";
import { StorageMode } from "@/enums";
import * as storage from "@/utils/storage";
import FolderMetadataReference = files.FolderMetadataReference;
import { SaveDoesntExistError } from "@/cloud-providers/errors";
import JSZip from "jszip";
import { AttemptContext, PartialAttemptOptions, retry } from "@lifeomic/attempt";
import pLimit from "p-limit";

const backupRegex = /^.+_\d+_\[\d{4}-\d{2}-\d{2}T\d{2}\.\d{2}\.\d{2}\+\d{4}]$/;
const dateRegex = /_\[(\d{4}-\d{2}-\d{2}T\d{2}\.\d{2}\.\d{2}\+\d{4})]$/;
const dateTimeFormat = "yyyy-MM-dd'T'HH.mm.ssZZZ";

export class DropboxClient implements ICloudClient {
    private readonly retryGeneralAttemptOptions: PartialAttemptOptions<any> = {
        maxAttempts: 3,
        delay: 1000,
        factor: 4,
        handleError: (err, context) => this.retryGeneralErrorHandler(err, context)
    };
    private readonly rateLimit = pLimit(10);

    private readonly client: Dropbox;
    public isSignedIn: boolean;

    constructor(clientId: string, refreshToken: string) {
        this.client = new Dropbox({
            clientId: clientId,
            refreshToken: refreshToken
        });
        this.isSignedIn = clientId !== "" && refreshToken !== "";
    }

    async retryGeneralErrorHandler(err: any, context: AttemptContext) {
        if (!(err instanceof DropboxResponseError) || (err.status !== 429 && err.status !== 503)) {
            context.abort();
        }
    }

    async getSaves(): Promise<{ saves: SaveInfo[], loadFailed: boolean }> {
        let zip: JSZip;
        try {
            zip = await this.getCloudZip("/Info");
        } catch (e) {
            if (e instanceof DropboxResponseError && isNotFoundError(e.error)) {
                return {
                    saves: [],
                    loadFailed: false
                };
            }

            throw e;
        }

        const files = getZipFiles(zip);
        const saves: SaveInfo[] = [];
        let loadFailed: boolean = false;
        for (const file of files) {
            try {
                const json = await zip.files[file].async("text");
                const info = JSON.parse(json);
                if (!isSaveInfo(info)) {
                    loadFailed = true;
                    log.warn(`Save info file \"${file}\" is not a valid SaveInfo.`);
                    continue;
                }

                saves.push(info);
            } catch (e) {
                loadFailed = true;
                log.warn(`Failed to parse save info file \"${file}\":`, e);
            }
        }

        return {
            saves,
            loadFailed
        };
    }

    async deleteSave(saveName: string) {
        const results = await Promise.allSettled([
            this.deleteSaveInfo(saveName),
            this.deleteSaveFolder(saveName)
        ]);
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        if (errors.length > 0) {
            throw errors.length > 1 ? new AggregateError(errors, errors.toString()) : errors[0];
        }
    }

    async uploadSave(storageMode: StorageMode, saveName: string) {
        const savesPath = getSavesPath();

        const info = getSaveInfo(saveName, storageMode);
        // upload info json file
        await retry(() =>
            this.rateLimit(() =>
                this.client.filesUpload({
                    path: `/Info/${saveName}.json`,
                    contents: JSON.stringify(info),
                    mute: true
                })), this.retryGeneralAttemptOptions);

        const folderPath = Paths.join(savesPath, saveName);
        const targetPath = Paths.join("/Saves", saveName);
        const files = this.getFiles(storageMode, folderPath, targetPath, saveName, true);

        let failed = false;
        const promises = files.map(async file => {
            if (failed) {
                return;
            }

            try {
                await this.uploadFile(storageMode, file.path, file.target);
            } catch (e) {
                failed = true;
                throw e;
            }
        });

        const results = await Promise.allSettled(promises);
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        if (errors.length > 0) {
            try {
                await this.rateLimit(() => this.deleteSave(saveName));
            } catch (e) {
                log.warn("An error occurred while deleting the save files:", e);
            }

            throw errors.length > 1 ? new AggregateError(errors, errors.toString()) : errors[0];
        }
    }

    async downloadSave(storageMode: StorageMode, saveName: string, path: string) {
        let zip: JSZip;
        try {
            zip = await this.getCloudZip(`/Saves/${saveName}`);
        } catch (e) {
            if (e instanceof DropboxResponseError && isNotFoundError(e.error)) {
                throw new SaveDoesntExistError(`The save \"${saveName}\" doesn't exist.`);
            }

            throw e;
        }

        const files = getZipFiles(zip);
        for (let file of files) {
            const content = await zip.files[file].async("uint8array");
            if (startsWithCaseInsensitive(file, `${saveName}/`)) {
                file = file.substring(saveName.length + 1);
            }

            const filePath = Paths.join(path, file);
            const parentPath = Paths.dirname(filePath);
            const name = Paths.basename(filePath);
            storage.writeFile(parentPath, name, content, storageMode);
        }
    }

    async backupSave(saveName: string) {
        try {
            await retry(() =>
                this.rateLimit(() =>
                    this.client.filesCopyV2({
                        from_path: `/Saves/${saveName}`,
                        to_path: `/Backups/${saveName}_[${DateTime.now().toFormat(dateTimeFormat)}]`
                    })), this.retryGeneralAttemptOptions);
        } catch (e) {
            if (e instanceof DropboxResponseError && isNotFoundError(e.error)) {
                return;
            }

            throw e;
        }
    }

    async purgeBackups(backupsToKeep: number) {
        let entries;
        try {
            entries = await this.filesListFolderAll({
                path: "/Backups",
                include_deleted: false,
                include_non_downloadable_files: false
            });
        } catch (e) {
            if (e instanceof DropboxResponseError && isNotFoundError(e.error)) {
                return;
            }

            throw e;
        }

        const folders = entries.filter(entry => isFolder(entry) && entry.name.match(backupRegex)) as FolderMetadataReference[];
        const groups = groupBy(folders, folder => {
            const parts = folder.name.split("_");
            return parts[0] + "_" + parts[1];
        });

        const promises = [];
        for (const groupKey in groups) {
            const group = groups[groupKey];
            if (group.length <= backupsToKeep) {
                continue;
            }

            const sorted = group.sort((a, b) => {
                const aStr = a.name.match(dateRegex);
                const bStr = b.name.match(dateRegex);
                if (!aStr || !bStr) {
                    return 0;
                }

                const aDate = DateTime.fromFormat(aStr[1], dateTimeFormat);
                const bDate = DateTime.fromFormat(bStr[1], dateTimeFormat);
                if (!aDate.isValid || !bDate.isValid) {
                    return 0;
                }
                return dateCompare(bDate, aDate);
            });

            for (const backup of sorted.slice(backupsToKeep)) {
                if (!backup.path_lower) {
                    log.warn(`Failed to delete backup \"${backup.name}\ because the path is undefined."`);
                    continue;
                }

                promises.push(retry(() =>
                    this.rateLimit(() =>
                        this.client.filesDeleteV2({
                            path: backup.path_lower!
                        })), this.retryGeneralAttemptOptions));
            }
        }

        const results = await Promise.allSettled(promises);
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        for (const error of errors) {
            log.error(`Failed to delete backup:`, error);
        }
    }

    async deleteSaveInfo(saveName: string) {
        try {
            await retry(() =>
                this.rateLimit(() =>
                    this.client.filesDeleteV2({
                        path: `/Info/${saveName}.json`
                    })), this.retryGeneralAttemptOptions);
        } catch (e) {
            if (!(e instanceof DropboxResponseError) || !isNotFoundError(e.error)) {
                throw e;
            }
        }
    }

    async deleteSaveFolder(saveName: string) {
        try {
            await retry(() =>
                this.rateLimit(() =>
                    this.client.filesDeleteV2({
                        path: `/Saves/${saveName}`
                    })), this.retryGeneralAttemptOptions);
        } catch (e) {
            if (!(e instanceof DropboxResponseError) || !isNotFoundError(e.error)) {
                throw e;
            }
        }
    }

    getFiles(storageMode: StorageMode, folderPath: string, targetPath: string, saveName?: string, root: boolean = false): { path: string, target: string}[] {
        const files: { path: string, target: string}[] = [];

        const filePaths = storage.getFilePaths(folderPath, storageMode);
        for (const filePath of filePaths) {
            const fileName = Paths.basename(filePath);

            if (root && saveName && isExcludedName(fileName, saveName)) {
                continue;
            }

            files.push({
                path: filePath,
                target: Paths.join(targetPath, fileName)
            })
        }

        const subDirPaths = storage.getSubdirectoryPaths(folderPath, storageMode);
        for (const subDirPath of subDirPaths) {
            const subDirName = Paths.basename(subDirPath);
            const subDirFiles = this.getFiles(storageMode, subDirPath, Paths.join(targetPath, subDirName));
            files.push(...subDirFiles);
        }

        return files;
    }

    async uploadFile(storageMode: StorageMode, path: string, target: string) {
        const bytes = storage.getFileBytes(path, storageMode);
        await retry(() =>
            this.rateLimit(() =>
                this.client.filesUpload({
                    path: target, contents: bytes, mute: true
                })), this.retryGeneralAttemptOptions);
    }

    async filesListFolderAll(args: files.ListFolderArg): Promise<
        (files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference)[]> {
        let entries: (files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference)[];

        let result = await retry(async () =>
            await this.rateLimit(async () =>
                await this.client.filesListFolder(args)), this.retryGeneralAttemptOptions);
        entries = result.result.entries;

        while (result.result.has_more) {
            result = await retry(async () =>
                await this.rateLimit(async () =>
                    await this.client.filesListFolderContinue({
                        cursor: result.result.cursor
                    })), this.retryGeneralAttemptOptions);

            entries = entries.concat(result.result.entries);
        }

        return entries;
    }


    async getCloudZip(path: string): Promise<JSZip> {
        const response = await retry(() =>
            this.rateLimit(() =>
                this.client.filesDownloadZip({
                    path: path
                })), this.retryGeneralAttemptOptions);

        if (!("fileBlob" in response.result)) {
            throw new Error("The response doesn't contain a file blob.");
        }

        const bytes = await blobToUint8Array(response.result.fileBlob as Blob);
        if (bytes === null) {
            throw new Error("Failed to convert the blob to bytes.");
        }

        return await JSZip.loadAsync(bytes);
    }
}